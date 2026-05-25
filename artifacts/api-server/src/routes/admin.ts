import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  adminsTable,
  partnersTable,
  gymsTable,
  trainersTable,
  classSessionsTable,
  membershipsTable,
  userMembershipsTable,
  usersTable,
  bookingsTable,
  checkinsTable,
} from "@workspace/db";
import {
  hashPassword,
  requireAdmin,
  verifyPassword,
} from "../lib/adminAuth";

const router: IRouter = Router();

// ───────────────────────────── Auth ─────────────────────────────

router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = (req.body ?? {}) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.email, email.toLowerCase().trim()));
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  req.session.adminName = admin.name;
  res.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
});

router.post("/admin/logout", (req: Request, res: Response): void => {
  // Only clear admin keys so a separately signed-in partner on the same
  // browser session stays signed in (and vice versa).
  delete req.session.adminId;
  delete req.session.adminEmail;
  delete req.session.adminName;
  res.json({ ok: true });
});

router.get("/admin/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, req.session.adminId));
  if (!admin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
});

// ───────────────────────────── Stats ─────────────────────────────

router.get(
  "/admin/stats",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const [
      totalPartners,
      totalGyms,
      activeMemberships,
      totalActivities,
      activeMembers,
      memberships,
      userMemberships,
      recentCheckins,
    ] = await Promise.all([
      db.$count(partnersTable),
      db.$count(gymsTable),
      db.$count(userMembershipsTable, eq(userMembershipsTable.status, "active")),
      db.$count(classSessionsTable),
      db.$count(usersTable),
      db.select().from(membershipsTable),
      db.select().from(userMembershipsTable),
      db
        .select()
        .from(checkinsTable)
        .orderBy(desc(checkinsTable.checkedInAt))
        .limit(8),
    ]);

    // Revenue = sum of priceInr for each active user membership
    const planMap = new Map(memberships.map((m) => [m.id, m.priceInr]));
    const monthlyRevenue = userMemberships
      .filter((um) => um.status === "active")
      .reduce((sum, um) => sum + (planMap.get(um.planId) ?? 0), 0);

    // Activity series (last 7 days check-ins)
    const now = new Date();
    const series: { day: string; checkins: number; bookings: number }[] = [];
    const allBookings = await db.select().from(bookingsTable);
    const allCheckins = await db.select().from(checkinsTable);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const checkins = allCheckins.filter(
        (c) => c.checkedInAt >= dayStart && c.checkedInAt <= dayEnd,
      ).length;
      const bookings = allBookings.filter(
        (b) => b.createdAt >= dayStart && b.createdAt <= dayEnd,
      ).length;
      series.push({ day: label, checkins, bookings });
    }

    // Membership type distribution
    const counts = new Map<number, number>();
    for (const um of userMemberships) {
      counts.set(um.planId, (counts.get(um.planId) ?? 0) + 1);
    }
    // Top 3 memberships, then add seed counts for visual completeness if zero
    const types = memberships
      .map((m) => ({
        name: m.name,
        value: counts.get(m.id) ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    res.json({
      totalPartners,
      totalGyms,
      activeMemberships,
      totalActivities,
      activeMembers,
      monthlyRevenue,
      activitySeries: series,
      membershipTypes: types,
      recentCheckins,
    });
  },
);

// ───────────────────────────── Partners ─────────────────────────────

router.get(
  "/admin/partners",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(partnersTable)
      .orderBy(desc(partnersTable.createdAt));
    res.json(
      rows.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        city: p.city,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
    );
  },
);

router.post(
  "/admin/partners",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, phone, city, password, notes } = (req.body ?? {}) as {
      name?: string;
      email?: string;
      phone?: string;
      city?: string;
      password?: string;
      notes?: string;
    };
    if (!name || !email || !phone || !city || !password) {
      res.status(400).json({ error: "name, email, phone, city, password required" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(partnersTable)
      .values({
        name,
        email: email.toLowerCase(),
        phone,
        city,
        notes: notes ?? "",
        passwordHash,
      })
      .returning();
    res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      status: created.status,
      city: created.city,
      notes: created.notes,
      createdAt: created.createdAt,
    });
  },
);

router.patch(
  "/admin/partners/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { name, phone, status, city, notes } = (req.body ?? {}) as Record<
      string,
      string | undefined
    >;
    const [updated] = await db
      .update(partnersTable)
      .set({
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(status !== undefined && { status }),
        ...(city !== undefined && { city }),
        ...(notes !== undefined && { notes }),
      })
      .where(eq(partnersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/admin/partners/:id/reset-password",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { password } = (req.body ?? {}) as { password?: string };
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 chars" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [updated] = await db
      .update(partnersTable)
      .set({ passwordHash })
      .where(eq(partnersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  },
);

router.delete(
  "/admin/partners/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(partnersTable).where(eq(partnersTable.id, id));
    res.json({ ok: true });
  },
);

// Auto-login (impersonation): admin signs into a partner's session in the
// same browser. Partner + admin sessions are independent, so the admin
// remains signed in to /admin even after this call.
router.post(
  "/admin/partners/:id/impersonate",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, id));
    if (!partner) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }
    if (partner.status === "suspended") {
      res.status(400).json({
        error: "Cannot sign in as a suspended partner. Reactivate first.",
      });
      return;
    }
    req.session.partnerId = partner.id;
    req.session.partnerEmail = partner.email;
    req.session.partnerName = partner.name;
    res.json({ ok: true, redirectTo: "/partner" });
  },
);

// ───────────────────────────── Gyms ─────────────────────────────

router.get(
  "/admin/gyms",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db.select().from(gymsTable).orderBy(desc(gymsTable.id));
    res.json(rows);
  },
);

router.post(
  "/admin/gyms",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name || !b.city || !b.area) {
      res.status(400).json({ error: "name, city, area required" });
      return;
    }
    const slug =
      (b.slug as string | undefined) ??
      String(b.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const [created] = await db
      .insert(gymsTable)
      .values({
        name: String(b.name),
        slug,
        city: String(b.city),
        area: String(b.area),
        address: String(b.address ?? ""),
        heroImage: String(
          b.heroImage ??
            "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
        ),
        rating: Number(b.rating ?? 4.5),
        reviewsCount: Number(b.reviewsCount ?? 0),
        priceFrom: Number(b.priceFrom ?? 999),
        categories: Array.isArray(b.categories)
          ? (b.categories as string[])
          : ["gym"],
        amenities: Array.isArray(b.amenities)
          ? (b.amenities as string[])
          : [],
        distanceKm: Number(b.distanceKm ?? 2.5),
        isPremium: Boolean(b.isPremium ?? false),
        openNow: Boolean(b.openNow ?? true),
        about: String(b.about ?? ""),
        gallery: Array.isArray(b.gallery) ? (b.gallery as string[]) : [],
        hours: String(b.hours ?? "6am – 11pm"),
        lat: Number(b.lat ?? 12.97),
        lng: Number(b.lng ?? 77.59),
        featured: Boolean(b.featured ?? false),
        ownerPartnerId:
          b.ownerPartnerId === undefined || b.ownerPartnerId === null || b.ownerPartnerId === ""
            ? null
            : Number(b.ownerPartnerId),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/gyms/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of [
      "name",
      "slug",
      "city",
      "area",
      "address",
      "heroImage",
      "about",
      "hours",
    ]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of ["rating", "reviewsCount", "priceFrom", "distanceKm", "lat", "lng"]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    for (const k of ["isPremium", "openNow", "featured"]) {
      if (b[k] !== undefined) patch[k] = Boolean(b[k]);
    }
    for (const k of ["categories", "amenities", "gallery"]) {
      if (Array.isArray(b[k])) patch[k] = b[k] as string[];
    }
    if (b.ownerPartnerId !== undefined) {
      patch.ownerPartnerId =
        b.ownerPartnerId === null || b.ownerPartnerId === ""
          ? null
          : Number(b.ownerPartnerId);
    }
    const [updated] = await db
      .update(gymsTable)
      .set(patch)
      .where(eq(gymsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/gyms/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(gymsTable).where(eq(gymsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Trainers ─────────────────────────────

router.get(
  "/admin/trainers",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(
      await db.select().from(trainersTable).orderBy(desc(trainersTable.id)),
    );
  },
);

router.post(
  "/admin/trainers",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name || !b.specialty || !b.city) {
      res.status(400).json({ error: "name, specialty, city required" });
      return;
    }
    const [created] = await db
      .insert(trainersTable)
      .values({
        name: String(b.name),
        specialty: String(b.specialty),
        bio: String(b.bio ?? ""),
        photoUrl: String(
          b.photoUrl ??
            "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400",
        ),
        rating: Number(b.rating ?? 4.7),
        sessionsCount: Number(b.sessionsCount ?? 0),
        pricePerSession: Number(b.pricePerSession ?? 1500),
        certifications: Array.isArray(b.certifications)
          ? (b.certifications as string[])
          : [],
        city: String(b.city),
        gymId: b.gymId == null ? null : Number(b.gymId),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/trainers/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "specialty", "bio", "photoUrl", "city"]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of ["rating", "sessionsCount", "pricePerSession", "gymId"]) {
      if (b[k] !== undefined) patch[k] = b[k] == null ? null : Number(b[k]);
    }
    if (Array.isArray(b.certifications))
      patch.certifications = b.certifications as string[];
    const [updated] = await db
      .update(trainersTable)
      .set(patch)
      .where(eq(trainersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/trainers/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(trainersTable).where(eq(trainersTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Classes ─────────────────────────────

router.get(
  "/admin/classes",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(
      await db
        .select()
        .from(classSessionsTable)
        .orderBy(desc(classSessionsTable.startsAt)),
    );
  },
);

router.post(
  "/admin/classes",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.title || !b.gymId || !b.trainerId) {
      res.status(400).json({ error: "title, gymId, trainerId required" });
      return;
    }
    const [created] = await db
      .insert(classSessionsTable)
      .values({
        title: String(b.title),
        category: String(b.category ?? "gym"),
        gymId: Number(b.gymId),
        trainerId: Number(b.trainerId),
        startsAt: b.startsAt ? new Date(String(b.startsAt)) : new Date(),
        durationMin: Number(b.durationMin ?? 60),
        capacity: Number(b.capacity ?? 20),
        intensity: String(b.intensity ?? "medium"),
        coverImage: String(
          b.coverImage ??
            "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200",
        ),
        description: String(b.description ?? ""),
        equipmentNeeded: Array.isArray(b.equipmentNeeded)
          ? (b.equipmentNeeded as string[])
          : [],
        calorieEstimate: Number(b.calorieEstimate ?? 350),
        trendingScore: Number(b.trendingScore ?? 50),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/classes/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of [
      "title",
      "category",
      "intensity",
      "coverImage",
      "description",
    ]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of [
      "gymId",
      "trainerId",
      "durationMin",
      "capacity",
      "calorieEstimate",
      "trendingScore",
    ]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    if (b.startsAt !== undefined) patch.startsAt = new Date(String(b.startsAt));
    if (Array.isArray(b.equipmentNeeded))
      patch.equipmentNeeded = b.equipmentNeeded as string[];
    const [updated] = await db
      .update(classSessionsTable)
      .set(patch)
      .where(eq(classSessionsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/classes/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(classSessionsTable).where(eq(classSessionsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── Memberships ─────────────────────────────

router.get(
  "/admin/memberships",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(
      await db
        .select()
        .from(membershipsTable)
        .orderBy(membershipsTable.priceInr),
    );
  },
);

router.post(
  "/admin/memberships",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name || !b.priceInr) {
      res.status(400).json({ error: "name and priceInr required" });
      return;
    }
    const [created] = await db
      .insert(membershipsTable)
      .values({
        name: String(b.name),
        tagline: String(b.tagline ?? ""),
        billingPeriod: String(b.billingPeriod ?? "monthly"),
        priceInr: Number(b.priceInr),
        originalPriceInr: Number(b.originalPriceInr ?? b.priceInr),
        gymsIncluded: Number(b.gymsIncluded ?? 50),
        classesPerMonth: Number(b.classesPerMonth ?? 12),
        perks: Array.isArray(b.perks) ? (b.perks as string[]) : [],
        badge: String(b.badge ?? ""),
        popular: Boolean(b.popular ?? false),
      })
      .returning();
    res.status(201).json(created);
  },
);

router.patch(
  "/admin/memberships/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "tagline", "billingPeriod", "badge"]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of [
      "priceInr",
      "originalPriceInr",
      "gymsIncluded",
      "classesPerMonth",
    ]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    if (b.popular !== undefined) patch.popular = Boolean(b.popular);
    if (Array.isArray(b.perks)) patch.perks = b.perks as string[];
    const [updated] = await db
      .update(membershipsTable)
      .set(patch)
      .where(eq(membershipsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  "/admin/memberships/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db.delete(membershipsTable).where(eq(membershipsTable.id, id));
    res.json({ ok: true });
  },
);

// ───────────────────────────── User Management ─────────────────────────────

router.get(
  "/admin/users",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.joinedAt));
    const ums = await db.select().from(userMembershipsTable);
    const plans = await db.select().from(membershipsTable);
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const umMap = new Map<number, (typeof ums)[number]>();
    for (const um of ums) umMap.set(um.userId, um);
    res.json(
      users.map((u) => {
        const um = umMap.get(u.id);
        const plan = um ? planMap.get(um.planId) : undefined;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          city: u.city,
          joinedAt: u.joinedAt,
          streakDays: u.streakDays,
          planName: plan?.name ?? null,
          planStatus: um?.status ?? "none",
        };
      }),
    );
  },
);

router.get(
  "/admin/user-memberships",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const ums = await db
      .select()
      .from(userMembershipsTable)
      .orderBy(desc(userMembershipsTable.renewsOn));
    const users = await db.select().from(usersTable);
    const plans = await db.select().from(membershipsTable);
    const uMap = new Map(users.map((u) => [u.id, u]));
    const pMap = new Map(plans.map((p) => [p.id, p]));
    res.json(
      ums.map((um) => ({
        id: um.id,
        userId: um.userId,
        userName: uMap.get(um.userId)?.name ?? "Unknown",
        userEmail: uMap.get(um.userId)?.email ?? "",
        planId: um.planId,
        planName: pMap.get(um.planId)?.name ?? "Unknown",
        renewsOn: um.renewsOn,
        classesUsed: um.classesUsed,
        gymsAccessed: um.gymsAccessed,
        status: um.status,
      })),
    );
  },
);

router.patch(
  "/admin/user-memberships/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const { status } = (req.body ?? {}) as { status?: string };
    if (!status) {
      res.status(400).json({ error: "status required" });
      return;
    }
    const [updated] = await db
      .update(userMembershipsTable)
      .set({ status })
      .where(eq(userMembershipsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

export default router;
