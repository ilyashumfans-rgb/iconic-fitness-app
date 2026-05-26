import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  partnersTable,
  partnerDocumentsTable,
  gymsTable,
  classSessionsTable,
  bookingsTable,
  checkinsTable,
  usersTable,
  trainersTable,
  productsTable,
  productOrdersTable,
  productOrderItemsTable,
  amenitiesTable,
  gymAmenitiesTable,
  gymCustomAmenitiesTable,
  gymHoursTable,
  workoutsTable,
  gymWorkoutsTable,
  gymWorkoutSessionsTable,
} from "@workspace/db";
import {
  hashPassword,
  verifyPassword,
} from "../lib/adminAuth";
import { requirePartner } from "../lib/partnerAuth";

const router: IRouter = Router();

// ─── Auth ───

router.post(
  "/partner/login",
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = (req.body ?? {}) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.email, email.toLowerCase().trim()));
    if (!partner) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (partner.status === "suspended") {
      res.status(403).json({
        error: "Your partner account is suspended. Contact GYMCO support.",
      });
      return;
    }
    if (partner.kind === "vendor") {
      res.status(403).json({
        error:
          "This account is a store vendor. Please sign in at the vendor portal (/vendor/login).",
      });
      return;
    }
    const ok = await verifyPassword(password, partner.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.partnerId = partner.id;
    req.session.partnerEmail = partner.email;
    req.session.partnerName = partner.name;
    res.json({
      id: partner.id,
      email: partner.email,
      name: partner.name,
      phone: partner.phone,
      city: partner.city,
      status: partner.status,
      kind: partner.kind,
    });
  },
);

// ─── Vendor (store) auth ─────────────────────────────────────────────────────
// Vendors share the `partners` table but have `kind` in ("vendor", "both"). The
// vendor portal lives at /vendor and only exposes store-related screens. We
// reuse the partner session, but the dedicated /vendor/login endpoint refuses
// any partner whose kind is "gym" so gym operators can't accidentally land in
// the vendor portal.
router.post(
  "/vendor/login",
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = (req.body ?? {}) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.email, email.toLowerCase().trim()));
    if (!partner) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (partner.status === "suspended") {
      res.status(403).json({
        error: "Your vendor account is suspended. Contact GYMCO support.",
      });
      return;
    }
    if (partner.kind !== "vendor" && partner.kind !== "both") {
      res.status(403).json({
        error: "This account is not registered as a store vendor.",
      });
      return;
    }
    const ok = await verifyPassword(password, partner.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.partnerId = partner.id;
    req.session.partnerEmail = partner.email;
    req.session.partnerName = partner.name;
    res.json({
      id: partner.id,
      email: partner.email,
      name: partner.name,
      phone: partner.phone,
      city: partner.city,
      status: partner.status,
      kind: partner.kind,
    });
  },
);

router.get(
  "/vendor/me",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, req.session.partnerId!));
    if (!partner) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (partner.kind !== "vendor" && partner.kind !== "both") {
      res.status(403).json({ error: "Not a vendor account" });
      return;
    }
    res.json({
      id: partner.id,
      email: partner.email,
      name: partner.name,
      phone: partner.phone,
      city: partner.city,
      status: partner.status,
      kind: partner.kind,
      notes: partner.notes,
      createdAt: partner.createdAt,
    });
  },
);

router.post("/vendor/logout", (req: Request, res: Response): void => {
  delete req.session.partnerId;
  delete req.session.partnerEmail;
  delete req.session.partnerName;
  res.json({ ok: true });
});

router.post("/partner/logout", (req: Request, res: Response): void => {
  // Only kill partner session keys; keep admin session intact in case both exist.
  delete req.session.partnerId;
  delete req.session.partnerEmail;
  delete req.session.partnerName;
  res.json({ ok: true });
});

router.get(
  "/partner/me",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, req.session.partnerId!));
    if (!partner) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (partner.kind === "vendor") {
      res.status(403).json({ error: "Not a gym partner account" });
      return;
    }
    res.json({
      id: partner.id,
      email: partner.email,
      name: partner.name,
      phone: partner.phone,
      city: partner.city,
      status: partner.status,
      kind: partner.kind,
      avatarUrl: partner.avatarUrl,
      notes: partner.notes,
      createdAt: partner.createdAt,
    });
  },
);

router.post(
  "/partner/change-password",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = (req.body ?? {}) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res
        .status(400)
        .json({ error: "Current password and new password (6+ chars) required" });
      return;
    }
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.id, req.session.partnerId!));
    if (!partner) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await verifyPassword(currentPassword, partner.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await hashPassword(newPassword);
    await db
      .update(partnersTable)
      .set({ passwordHash })
      .where(eq(partnersTable.id, partner.id));
    res.json({ ok: true });
  },
);

router.patch(
  "/partner/me",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const { name, phone, city, avatarUrl } = (req.body ?? {}) as Record<
      string,
      string | undefined
    >;
    const [updated] = await db
      .update(partnersTable)
      .set({
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(city !== undefined && { city }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      })
      .where(eq(partnersTable.id, req.session.partnerId!))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    req.session.partnerName = updated.name;
    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      city: updated.city,
      status: updated.status,
      avatarUrl: updated.avatarUrl,
      kind: updated.kind,
    });
  },
);

// ─── Helpers ───

async function ownedGymIds(partnerId: number): Promise<number[]> {
  const rows = await db
    .select({ id: gymsTable.id })
    .from(gymsTable)
    .where(eq(gymsTable.ownerPartnerId, partnerId));
  return rows.map((r) => r.id);
}

// ─── Gyms ───

router.get(
  "/partner/gyms",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(gymsTable)
      .where(eq(gymsTable.ownerPartnerId, req.session.partnerId!))
      .orderBy(desc(gymsTable.id));
    res.json(rows);
  },
);

router.patch(
  "/partner/gyms/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of [
      "name",
      "address",
      "area",
      "city",
      "about",
      "hours",
      "heroImage",
      "logoUrl",
    ]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of ["priceFrom"]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    for (const k of ["lat", "lng"]) {
      if (b[k] !== undefined && b[k] !== null && b[k] !== "") {
        const n = Number(b[k]);
        if (Number.isFinite(n)) patch[k] = n;
      }
    }
    for (const k of ["openNow"]) {
      if (b[k] !== undefined) patch[k] = Boolean(b[k]);
    }
    for (const k of ["categories", "amenities", "gallery"]) {
      if (Array.isArray(b[k])) patch[k] = b[k] as string[];
    }
    // Atomic authz: only succeeds if the gym still belongs to this partner.
    const [updated] = await db
      .update(gymsTable)
      .set(patch)
      .where(
        and(
          eq(gymsTable.id, id),
          eq(gymsTable.ownerPartnerId, req.session.partnerId!),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

// ─── Stats / Dashboard ───

router.get(
  "/partner/stats",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const gymIds = await ownedGymIds(req.session.partnerId!);
    if (gymIds.length === 0) {
      res.json({
        totalGyms: 0,
        totalClasses: 0,
        totalBookings: 0,
        totalCheckins: 0,
        revenueInr: 0,
        activitySeries: [],
        topGyms: [],
        recentCheckins: [],
      });
      return;
    }

    const classRows = await db
      .select({ id: classSessionsTable.id })
      .from(classSessionsTable)
      .where(inArray(classSessionsTable.gymId, gymIds));
    const classIds = classRows.map((r) => r.id);

    const [bookingCount] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .where(
        classIds.length > 0
          ? inArray(bookingsTable.classId, classIds)
          : sql`false`,
      );
    const [checkinCount] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(checkinsTable)
      .where(inArray(checkinsTable.gymId, gymIds));

    // 7-day activity series
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const series: { day: string; checkins: number; bookings: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const [c] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(checkinsTable)
        .where(
          and(
            inArray(checkinsTable.gymId, gymIds),
            gte(checkinsTable.checkedInAt, d),
            sql`${checkinsTable.checkedInAt} < ${next}`,
          ),
        );
      const [b] =
        classIds.length > 0
          ? await db
              .select({ c: sql<number>`count(*)::int` })
              .from(bookingsTable)
              .where(
                and(
                  inArray(bookingsTable.classId, classIds),
                  gte(bookingsTable.createdAt, d),
                  sql`${bookingsTable.createdAt} < ${next}`,
                ),
              )
          : [{ c: 0 }];
      series.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        checkins: c?.c ?? 0,
        bookings: b?.c ?? 0,
      });
    }

    const topGymsRaw = await db
      .select({
        gymId: checkinsTable.gymId,
        c: sql<number>`count(*)::int`,
      })
      .from(checkinsTable)
      .where(inArray(checkinsTable.gymId, gymIds))
      .groupBy(checkinsTable.gymId)
      .orderBy(sql`count(*) desc`)
      .limit(5);
    const gymNameRows = await db
      .select({ id: gymsTable.id, name: gymsTable.name })
      .from(gymsTable)
      .where(inArray(gymsTable.id, gymIds));
    const gymName = new Map(gymNameRows.map((g) => [g.id, g.name]));
    const topGyms = topGymsRaw.map((r) => ({
      gymId: r.gymId,
      name: gymName.get(r.gymId) ?? `Gym ${r.gymId}`,
      checkins: r.c,
    }));

    const recentCheckins = await db
      .select({
        id: checkinsTable.id,
        userId: checkinsTable.userId,
        gymId: checkinsTable.gymId,
        checkedInAt: checkinsTable.checkedInAt,
        method: checkinsTable.method,
      })
      .from(checkinsTable)
      .where(inArray(checkinsTable.gymId, gymIds))
      .orderBy(desc(checkinsTable.checkedInAt))
      .limit(10);

    // Rough revenue estimate: bookings × avg priceFrom
    const [{ avg }] = await db
      .select({ avg: sql<number>`coalesce(avg(${gymsTable.priceFrom}), 0)::int` })
      .from(gymsTable)
      .where(inArray(gymsTable.id, gymIds));
    const bookings = bookingCount?.c ?? 0;
    const revenueInr = bookings * Number(avg ?? 0);

    res.json({
      totalGyms: gymIds.length,
      totalClasses: classIds.length,
      totalBookings: bookings,
      totalCheckins: checkinCount?.c ?? 0,
      revenueInr,
      activitySeries: series,
      topGyms,
      recentCheckins,
    });
  },
);

// ─── Bookings ───

router.get(
  "/partner/bookings",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const gymIds = await ownedGymIds(req.session.partnerId!);
    if (gymIds.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        id: bookingsTable.id,
        status: bookingsTable.status,
        createdAt: bookingsTable.createdAt,
        classTitle: classSessionsTable.title,
        startsAt: classSessionsTable.startsAt,
        gymId: classSessionsTable.gymId,
        gymName: gymsTable.name,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(bookingsTable)
      .innerJoin(
        classSessionsTable,
        eq(bookingsTable.classId, classSessionsTable.id),
      )
      .innerJoin(gymsTable, eq(classSessionsTable.gymId, gymsTable.id))
      .innerJoin(usersTable, eq(bookingsTable.userId, usersTable.id))
      .where(inArray(classSessionsTable.gymId, gymIds))
      .orderBy(desc(bookingsTable.createdAt))
      .limit(200);
    res.json(rows);
  },
);

// ─── Check-ins ───

router.get(
  "/partner/checkins",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const gymIds = await ownedGymIds(req.session.partnerId!);
    if (gymIds.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        id: checkinsTable.id,
        checkedInAt: checkinsTable.checkedInAt,
        method: checkinsTable.method,
        gymId: checkinsTable.gymId,
        gymName: gymsTable.name,
        userName: usersTable.name,
        userEmail: usersTable.email,
        baseInr: checkinsTable.baseInr,
        taxPct: checkinsTable.taxPct,
        taxInr: checkinsTable.taxInr,
        payoutInr: checkinsTable.payoutInr,
      })
      .from(checkinsTable)
      .innerJoin(gymsTable, eq(checkinsTable.gymId, gymsTable.id))
      .innerJoin(usersTable, eq(checkinsTable.userId, usersTable.id))
      .where(inArray(checkinsTable.gymId, gymIds))
      .orderBy(desc(checkinsTable.checkedInAt))
      .limit(200);
    res.json(rows);
  },
);

router.get(
  "/partner/earnings",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const gymIds = await ownedGymIds(req.session.partnerId!);
    const empty = {
      today: { visits: 0, payoutInr: 0 },
      week: { visits: 0, payoutInr: 0 },
      month: { visits: 0, payoutInr: 0 },
    };
    if (gymIds.length === 0) {
      res.json(empty);
      return;
    }
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sumSince = async (since: Date) => {
      const [row] = await db
        .select({
          visits: sql<number>`count(*)::int`,
          payoutInr: sql<number>`coalesce(sum(${checkinsTable.payoutInr}), 0)::int`,
        })
        .from(checkinsTable)
        .where(
          and(
            inArray(checkinsTable.gymId, gymIds),
            gte(checkinsTable.checkedInAt, since),
          ),
        );
      return {
        visits: Number(row?.visits ?? 0),
        payoutInr: Number(row?.payoutInr ?? 0),
      };
    };

    res.json({
      today: await sumSince(startOfDay),
      week: await sumSince(startOfWeek),
      month: await sumSince(startOfMonth),
    });
  },
);

// ─── Amenities & Hours per gym ───

router.get(
  "/partner/amenities/catalog",
  requirePartner,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(amenitiesTable)
      .where(eq(amenitiesTable.isActive, true))
      .orderBy(asc(amenitiesTable.sortOrder), asc(amenitiesTable.name));
    res.json(rows);
  },
);

router.get(
  "/partner/gyms/:id/amenities",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const selected = await db
      .select({ amenityId: gymAmenitiesTable.amenityId })
      .from(gymAmenitiesTable)
      .where(eq(gymAmenitiesTable.gymId, id));
    const custom = await db
      .select()
      .from(gymCustomAmenitiesTable)
      .where(eq(gymCustomAmenitiesTable.gymId, id))
      .orderBy(asc(gymCustomAmenitiesTable.id));
    res.json({
      catalogIds: selected.map((s) => s.amenityId),
      custom,
    });
  },
);

router.put(
  "/partner/gyms/:id/amenities",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const b = (req.body ?? {}) as {
      catalogIds?: number[];
      custom?: { name: string; description?: string; icon?: string }[];
    };
    const rawIds = Array.isArray(b.catalogIds)
      ? Array.from(new Set(b.catalogIds.map((n) => Number(n)).filter(Boolean)))
      : [];
    let catalogIds: number[] = [];
    if (rawIds.length > 0) {
      const valid = await db
        .select({ id: amenitiesTable.id })
        .from(amenitiesTable)
        .where(
          and(
            inArray(amenitiesTable.id, rawIds),
            eq(amenitiesTable.isActive, true),
          ),
        );
      catalogIds = valid.map((v) => v.id);
    }
    const custom = Array.isArray(b.custom)
      ? b.custom
          .map((c) => ({
            name: String(c?.name ?? "").trim(),
            description: String(c?.description ?? ""),
            icon: String(c?.icon ?? "Dot"),
          }))
          .filter((c) => c.name)
      : [];

    await db.transaction(async (tx) => {
      await tx.delete(gymAmenitiesTable).where(eq(gymAmenitiesTable.gymId, id));
      if (catalogIds.length > 0) {
        await tx
          .insert(gymAmenitiesTable)
          .values(catalogIds.map((amenityId) => ({ gymId: id, amenityId })));
      }
      await tx
        .delete(gymCustomAmenitiesTable)
        .where(eq(gymCustomAmenitiesTable.gymId, id));
      if (custom.length > 0) {
        await tx
          .insert(gymCustomAmenitiesTable)
          .values(custom.map((c) => ({ gymId: id, ...c })));
      }
    });

    res.json({ ok: true });
  },
);

router.get(
  "/partner/gyms/:id/hours",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const rows = await db
      .select()
      .from(gymHoursTable)
      .where(eq(gymHoursTable.gymId, id))
      .orderBy(asc(gymHoursTable.dayOfWeek));
    // Pad with defaults for any missing day
    const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
    const out = Array.from({ length: 7 }, (_, d) =>
      byDay.get(d) ?? {
        id: 0,
        gymId: id,
        dayOfWeek: d,
        isClosed: false,
        openMinute: 360,
        closeMinute: 1380,
      },
    );
    res.json(out);
  },
);

router.put(
  "/partner/gyms/:id/hours",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const b = (req.body ?? {}) as {
      hours?: {
        dayOfWeek: number;
        isClosed: boolean;
        openMinute: number;
        closeMinute: number;
      }[];
    };
    if (!Array.isArray(b.hours)) {
      res.status(400).json({ error: "hours[] required" });
      return;
    }
    const clamp = (n: number) =>
      Math.max(0, Math.min(1440, Math.round(Number(n) || 0)));
    const byDay = new Map<number, {
      gymId: number;
      dayOfWeek: number;
      isClosed: boolean;
      openMinute: number;
      closeMinute: number;
    }>();
    for (const h of b.hours) {
      const day = Number(h.dayOfWeek);
      if (!Number.isInteger(day) || day < 0 || day > 6) continue;
      byDay.set(day, {
        gymId: id,
        dayOfWeek: day,
        isClosed: Boolean(h.isClosed),
        openMinute: clamp(h.openMinute ?? 360),
        closeMinute: clamp(h.closeMinute ?? 1380),
      });
    }
    const cleaned = Array.from(byDay.values());
    await db.transaction(async (tx) => {
      await tx.delete(gymHoursTable).where(eq(gymHoursTable.gymId, id));
      if (cleaned.length > 0) {
        await tx.insert(gymHoursTable).values(cleaned);
      }
    });
    res.json({ ok: true });
  },
);

// ─── Workouts ───

router.get(
  "/partner/workouts/catalog",
  requirePartner,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(workoutsTable)
      .where(eq(workoutsTable.isActive, true))
      .orderBy(asc(workoutsTable.sortOrder), asc(workoutsTable.name));
    res.json(rows);
  },
);

router.get(
  "/partner/gyms/:id/workouts",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const selected = await db
      .select({ workoutId: gymWorkoutsTable.workoutId })
      .from(gymWorkoutsTable)
      .where(eq(gymWorkoutsTable.gymId, id));
    res.json({ workoutIds: selected.map((s) => s.workoutId) });
  },
);

router.put(
  "/partner/gyms/:id/workouts",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const b = (req.body ?? {}) as { workoutIds?: number[] };
    const rawIds = Array.isArray(b.workoutIds)
      ? Array.from(new Set(b.workoutIds.map((n) => Number(n)).filter(Boolean)))
      : [];
    let workoutIds: number[] = [];
    if (rawIds.length > 0) {
      const valid = await db
        .select({ id: workoutsTable.id })
        .from(workoutsTable)
        .where(
          and(
            inArray(workoutsTable.id, rawIds),
            eq(workoutsTable.isActive, true),
          ),
        );
      workoutIds = valid.map((v) => v.id);
    }
    await db.transaction(async (tx) => {
      await tx.delete(gymWorkoutsTable).where(eq(gymWorkoutsTable.gymId, id));
      if (workoutIds.length > 0) {
        await tx
          .insert(gymWorkoutsTable)
          .values(workoutIds.map((workoutId) => ({ gymId: id, workoutId })));
      }
      // Drop sessions for workouts no longer offered
      if (workoutIds.length === 0) {
        await tx
          .delete(gymWorkoutSessionsTable)
          .where(eq(gymWorkoutSessionsTable.gymId, id));
      } else {
        await tx
          .delete(gymWorkoutSessionsTable)
          .where(
            and(
              eq(gymWorkoutSessionsTable.gymId, id),
              sql`${gymWorkoutSessionsTable.workoutId} NOT IN (${sql.join(
                workoutIds.map((wid) => sql`${wid}`),
                sql`, `,
              )})`,
            ),
          );
      }
    });
    res.json({ ok: true });
  },
);

router.get(
  "/partner/gyms/:id/workouts/sessions",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const rows = await db
      .select()
      .from(gymWorkoutSessionsTable)
      .where(eq(gymWorkoutSessionsTable.gymId, id))
      .orderBy(
        asc(gymWorkoutSessionsTable.workoutId),
        asc(gymWorkoutSessionsTable.dayOfWeek),
        asc(gymWorkoutSessionsTable.startMinute),
      );
    res.json(rows);
  },
);

router.put(
  "/partner/gyms/:id/workouts/sessions",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!(await ensureOwnsGym(req.session.partnerId!, id))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const b = (req.body ?? {}) as {
      sessions?: {
        workoutId: number;
        dayOfWeek: number;
        startMinute: number;
        endMinute: number;
        instructor?: string;
      }[];
    };
    if (!Array.isArray(b.sessions)) {
      res.status(400).json({ error: "sessions[] required" });
      return;
    }
    // Constrain workoutIds to those this gym actually offers
    const owned = await db
      .select({ workoutId: gymWorkoutsTable.workoutId })
      .from(gymWorkoutsTable)
      .where(eq(gymWorkoutsTable.gymId, id));
    const allowed = new Set(owned.map((o) => o.workoutId));
    const clamp = (n: number) =>
      Math.max(0, Math.min(1440, Math.round(Number(n) || 0)));
    const cleaned = b.sessions
      .map((s) => ({
        gymId: id,
        workoutId: Number(s.workoutId),
        dayOfWeek: Number(s.dayOfWeek),
        startMinute: clamp(s.startMinute ?? 0),
        endMinute: clamp(s.endMinute ?? 0),
        instructor: String(s.instructor ?? "").trim(),
      }))
      .filter(
        (s) =>
          allowed.has(s.workoutId) &&
          Number.isInteger(s.dayOfWeek) &&
          s.dayOfWeek >= 0 &&
          s.dayOfWeek <= 6 &&
          s.endMinute > s.startMinute,
      );
    await db.transaction(async (tx) => {
      await tx
        .delete(gymWorkoutSessionsTable)
        .where(eq(gymWorkoutSessionsTable.gymId, id));
      if (cleaned.length > 0) {
        await tx.insert(gymWorkoutSessionsTable).values(cleaned);
      }
    });
    res.json({ ok: true });
  },
);

// ─── Classes ───

router.get(
  "/partner/classes",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const gymIds = await ownedGymIds(req.session.partnerId!);
    if (gymIds.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        id: classSessionsTable.id,
        title: classSessionsTable.title,
        category: classSessionsTable.category,
        startsAt: classSessionsTable.startsAt,
        durationMin: classSessionsTable.durationMin,
        capacity: classSessionsTable.capacity,
        intensity: classSessionsTable.intensity,
        gymId: classSessionsTable.gymId,
        gymName: gymsTable.name,
        trainerId: classSessionsTable.trainerId,
        trainerName: trainersTable.name,
        coverImage: classSessionsTable.coverImage,
        description: classSessionsTable.description,
        calorieEstimate: classSessionsTable.calorieEstimate,
      })
      .from(classSessionsTable)
      .innerJoin(gymsTable, eq(classSessionsTable.gymId, gymsTable.id))
      .leftJoin(
        trainersTable,
        eq(classSessionsTable.trainerId, trainersTable.id),
      )
      .where(inArray(classSessionsTable.gymId, gymIds))
      .orderBy(desc(classSessionsTable.startsAt))
      .limit(200);

    // Per-class booking counts (active = not cancelled).
    const classIds = rows.map((r) => r.id);
    const counts = classIds.length
      ? await db
          .select({
            classId: bookingsTable.classId,
            total: sql<number>`count(*)::int`,
            active: sql<number>`sum(case when ${bookingsTable.status} <> 'cancelled' then 1 else 0 end)::int`,
            completed: sql<number>`sum(case when ${bookingsTable.status} = 'completed' then 1 else 0 end)::int`,
          })
          .from(bookingsTable)
          .where(inArray(bookingsTable.classId, classIds))
          .groupBy(bookingsTable.classId)
      : [];
    const byClass = new Map(counts.map((c) => [c.classId, c]));
    res.json(
      rows.map((r) => {
        const c = byClass.get(r.id);
        return {
          ...r,
          bookedCount: c?.active ?? 0,
          completedCount: c?.completed ?? 0,
          totalBookings: c?.total ?? 0,
        };
      }),
    );
  },
);

// Attendees for a single class (partner must own the class's gym).
router.get(
  "/partner/classes/:id/attendees",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const id = Number(req.params.id);
    const [cls] = await db
      .select()
      .from(classSessionsTable)
      .where(eq(classSessionsTable.id, id));
    if (!cls) {
      res.status(404).json({ error: "Class not found" });
      return;
    }
    if (!(await ensureOwnsGym(partnerId, cls.gymId))) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
    const rows = await db
      .select({
        id: bookingsTable.id,
        status: bookingsTable.status,
        createdAt: bookingsTable.createdAt,
        userId: usersTable.id,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userPhone: usersTable.mobile,
        userAvatar: usersTable.avatarUrl,
      })
      .from(bookingsTable)
      .innerJoin(usersTable, eq(bookingsTable.userId, usersTable.id))
      .where(eq(bookingsTable.classId, id))
      .orderBy(desc(bookingsTable.createdAt));
    res.json(rows);
  },
);

// Partner updates a booking status (confirmed / completed / cancelled).
router.patch(
  "/partner/bookings/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const id = Number(req.params.id);
    const status = String((req.body ?? {}).status ?? "");
    if (!["confirmed", "completed", "cancelled"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const [booking] = await db
      .select({
        id: bookingsTable.id,
        classId: bookingsTable.classId,
        currentStatus: bookingsTable.status,
        gymId: classSessionsTable.gymId,
        capacity: classSessionsTable.capacity,
      })
      .from(bookingsTable)
      .innerJoin(
        classSessionsTable,
        eq(bookingsTable.classId, classSessionsTable.id),
      )
      .where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    if (!(await ensureOwnsGym(partnerId, booking.gymId))) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
    // Block over-booking when moving back into an active state.
    const wasActive = booking.currentStatus !== "cancelled";
    const willBeActive = status !== "cancelled";
    if (!wasActive && willBeActive) {
      const [count] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.classId, booking.classId),
            sql`${bookingsTable.status} <> 'cancelled'`,
          ),
        );
      if ((count?.c ?? 0) >= booking.capacity) {
        res
          .status(409)
          .json({ error: "Class is full — cannot restore this booking." });
        return;
      }
    }
    const [updated] = await db
      .update(bookingsTable)
      .set({ status })
      .where(eq(bookingsTable.id, id))
      .returning();
    res.json(updated);
  },
);

// ─── Trainers (read-only list scoped to partner's gyms) ───────────────────

router.get(
  "/partner/trainers",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const gymIds = await ownedGymIds(req.session.partnerId!);
    if (gymIds.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        id: trainersTable.id,
        name: trainersTable.name,
        specialty: trainersTable.specialty,
        gymId: trainersTable.gymId,
      })
      .from(trainersTable)
      .where(inArray(trainersTable.gymId, gymIds));
    res.json(rows);
  },
);

// ─── Class session CRUD (partner-scoped) ──────────────────────────────────

async function ensureOwnsGym(
  partnerId: number,
  gymId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: gymsTable.id })
    .from(gymsTable)
    .where(
      and(eq(gymsTable.id, gymId), eq(gymsTable.ownerPartnerId, partnerId)),
    );
  return !!row;
}

async function trainerBelongsToGym(
  trainerId: number,
  gymId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: trainersTable.id })
    .from(trainersTable)
    .where(
      and(eq(trainersTable.id, trainerId), eq(trainersTable.gymId, gymId)),
    );
  return !!row;
}

router.post(
  "/partner/classes",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const b = (req.body ?? {}) as Record<string, any>;
    const gymId = Number(b.gymId);
    const trainerId = Number(b.trainerId);
    if (!b.title || !b.category || !gymId || !trainerId || !b.startsAt) {
      res.status(400).json({
        error: "title, category, gymId, trainerId, startsAt required",
      });
      return;
    }
    if (!(await ensureOwnsGym(partnerId, gymId))) {
      res.status(403).json({ error: "You don't own this gym" });
      return;
    }
    if (!(await trainerBelongsToGym(trainerId, gymId))) {
      res.status(400).json({
        error: "That trainer isn't attached to this gym.",
      });
      return;
    }
    const [row] = await db
      .insert(classSessionsTable)
      .values({
        title: String(b.title),
        category: String(b.category),
        gymId,
        trainerId,
        startsAt: new Date(String(b.startsAt)),
        durationMin: Number(b.durationMin ?? 60),
        capacity: Number(b.capacity ?? 20),
        intensity: String(b.intensity ?? "medium"),
        coverImage: String(b.coverImage ?? ""),
        description: String(b.description ?? ""),
        equipmentNeeded: Array.isArray(b.equipmentNeeded)
          ? b.equipmentNeeded.map(String)
          : [],
        calorieEstimate: Number(b.calorieEstimate ?? 0),
      })
      .returning();
    res.json(row);
  },
);

router.patch(
  "/partner/classes/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, any>;
    const [existing] = await db
      .select()
      .from(classSessionsTable)
      .where(eq(classSessionsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Class not found" });
      return;
    }
    if (!(await ensureOwnsGym(partnerId, existing.gymId))) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
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
    for (const k of ["durationMin", "capacity", "calorieEstimate"]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
    }
    if (b.startsAt !== undefined) patch.startsAt = new Date(String(b.startsAt));
    let effectiveGymId = existing.gymId;
    if (b.gymId !== undefined) {
      const newGymId = Number(b.gymId);
      if (!(await ensureOwnsGym(partnerId, newGymId))) {
        res.status(403).json({ error: "You don't own the target gym" });
        return;
      }
      patch.gymId = newGymId;
      effectiveGymId = newGymId;
    }
    if (b.trainerId !== undefined) {
      const newTrainerId = Number(b.trainerId);
      if (!(await trainerBelongsToGym(newTrainerId, effectiveGymId))) {
        res.status(400).json({
          error: "That trainer isn't attached to this gym.",
        });
        return;
      }
      patch.trainerId = newTrainerId;
    }
    if (Array.isArray(b.equipmentNeeded)) {
      patch.equipmentNeeded = b.equipmentNeeded.map(String);
    }
    const [row] = await db
      .update(classSessionsTable)
      .set(patch)
      .where(eq(classSessionsTable.id, id))
      .returning();
    res.json(row);
  },
);

router.delete(
  "/partner/classes/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const id = Number(req.params.id);
    const [existing] = await db
      .select()
      .from(classSessionsTable)
      .where(eq(classSessionsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Class not found" });
      return;
    }
    if (!(await ensureOwnsGym(partnerId, existing.gymId))) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
    await db
      .delete(classSessionsTable)
      .where(eq(classSessionsTable.id, id));
    res.json({ ok: true });
  },
);

// ─── Partner products (multi-vendor) ───

function slugifyP(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

router.get(
  "/partner/products",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.vendorPartnerId, partnerId))
      .orderBy(desc(productsTable.id));
    res.json(rows);
  },
);

router.post(
  "/partner/products",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const b = (req.body ?? {}) as Record<string, any>;
    if (!b.name || !b.priceInr || !b.imageUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const slug = b.slug
      ? slugifyP(String(b.slug))
      : `${slugifyP(String(b.name))}-${Date.now().toString(36)}`;
    const [row] = await db
      .insert(productsTable)
      .values({
        vendorPartnerId: partnerId, // always self — vendor scope is enforced server-side
        name: String(b.name),
        slug,
        description: String(b.description ?? ""),
        category: String(b.category ?? "apparel"),
        priceInr: Number(b.priceInr),
        originalPriceInr: Number(b.originalPriceInr ?? b.priceInr),
        imageUrl: String(b.imageUrl),
        gallery: Array.isArray(b.gallery) ? b.gallery.map(String) : [],
        stock: Number(b.stock ?? 0),
        status: String(b.status ?? "active"),
      })
      .returning();
    res.json(row);
  },
);

router.patch(
  "/partner/products/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const id = Number(req.params.id);
    const b = (req.body ?? {}) as Record<string, any>;
    const patch: Record<string, unknown> = {};
    if (b.name !== undefined) patch.name = String(b.name);
    if (b.description !== undefined) patch.description = String(b.description);
    if (b.category !== undefined) patch.category = String(b.category);
    if (b.priceInr !== undefined) patch.priceInr = Number(b.priceInr);
    if (b.originalPriceInr !== undefined)
      patch.originalPriceInr = Number(b.originalPriceInr);
    if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl);
    if (b.stock !== undefined) patch.stock = Number(b.stock);
    if (b.status !== undefined) patch.status = String(b.status);
    // vendorPartnerId is NOT patchable — locks ownership to the authenticated partner.
    const [row] = await db
      .update(productsTable)
      .set(patch)
      .where(
        and(
          eq(productsTable.id, id),
          eq(productsTable.vendorPartnerId, partnerId),
        ),
      )
      .returning();
    if (!row) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/partner/products/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const id = Number(req.params.id);
    const deleted = await db
      .delete(productsTable)
      .where(
        and(
          eq(productsTable.id, id),
          eq(productsTable.vendorPartnerId, partnerId),
        ),
      )
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ ok: true });
  },
);

router.get(
  "/partner/orders",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const partnerId = req.session.partnerId!;
    const myItems = await db
      .select()
      .from(productOrderItemsTable)
      .where(eq(productOrderItemsTable.vendorPartnerId, partnerId));
    if (myItems.length === 0) {
      res.json([]);
      return;
    }
    const orderIds = Array.from(new Set(myItems.map((i) => i.orderId)));
    const orders = await db
      .select()
      .from(productOrdersTable)
      .where(inArray(productOrdersTable.id, orderIds))
      .orderBy(desc(productOrdersTable.id));
    const byOrder = new Map<number, typeof myItems>();
    for (const it of myItems) {
      const list = byOrder.get(it.orderId) ?? [];
      list.push(it);
      byOrder.set(it.orderId, list);
    }
    // Only return this vendor's items (not other vendors' items in the same order)
    res.json(orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] })));
  },
);

router.get(
  "/partner/documents",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const docs = await db
      .select()
      .from(partnerDocumentsTable)
      .where(eq(partnerDocumentsTable.partnerId, req.session.partnerId!))
      .orderBy(desc(partnerDocumentsTable.uploadedAt));
    res.json(docs);
  },
);

router.post(
  "/partner/documents",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const { name, url, notes } = (req.body ?? {}) as {
      name?: string;
      url?: string;
      notes?: string;
    };
    if (!name || !url) {
      res.status(400).json({ error: "Document name and file required" });
      return;
    }
    const [created] = await db
      .insert(partnerDocumentsTable)
      .values({
        partnerId: req.session.partnerId!,
        name,
        url,
        notes: notes ?? "",
        uploadedByKind: "partner",
        uploadedByEmail: req.session.partnerEmail ?? "",
      })
      .returning();
    res.status(201).json(created);
  },
);

router.delete(
  "/partner/documents/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(partnerDocumentsTable)
      .where(
        and(
          eq(partnerDocumentsTable.id, id),
          eq(partnerDocumentsTable.partnerId, req.session.partnerId!),
        ),
      );
    res.json({ ok: true });
  },
);

const seenQrTokens = new Map<string, number>();

router.post(
  "/partner/checkins/scan",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const { token, gymId } = req.body ?? {};
    if (typeof token !== "string" || !token || typeof gymId !== "number") {
      res.status(400).json({ error: "token and gymId are required" });
      return;
    }
    // Token format: GYMCO|memberCode|slot|rand
    const parts = token.split("|");
    if (parts.length < 4 || parts[0] !== "GYMCO") {
      res.status(400).json({ error: "Invalid QR code" });
      return;
    }
    const memberCode = parts[1];
    const slot = Number(parts[2]);
    const nowSlot = Math.floor(Date.now() / 60000);
    if (!Number.isFinite(slot) || Math.abs(nowSlot - slot) > 1) {
      res.status(400).json({ error: "QR code expired — ask the member to refresh" });
      return;
    }
    // Replay protection: each token can only be used once across the system
    const seenAt = seenQrTokens.get(token);
    if (seenAt && Date.now() - seenAt < 5 * 60 * 1000) {
      res.status(409).json({ error: "QR code already used — ask the member to refresh" });
      return;
    }
    seenQrTokens.set(token, Date.now());
    if (seenQrTokens.size > 5000) {
      const cutoff = Date.now() - 5 * 60 * 1000;
      for (const [k, t] of seenQrTokens) {
        if (t < cutoff) seenQrTokens.delete(k);
      }
    }
    const gymIds = await ownedGymIds(req.session.partnerId!);
    if (!gymIds.includes(gymId)) {
      res.status(403).json({ error: "This gym is not in your account" });
      return;
    }
    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym) {
      res.status(404).json({ error: "Gym not found" });
      return;
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.memberCode, memberCode));
    if (!user) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    // One paid check-in per user per gym per IST day
    const istParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const part = (t: string) =>
      istParts.find((p) => p.type === t)?.value ?? "00";
    const istMs =
      (Number(part("hour")) * 3600 +
        Number(part("minute")) * 60 +
        Number(part("second"))) *
      1000;
    const startOfIstDay = new Date(Date.now() - istMs);
    const [recent] = await db
      .select({ id: checkinsTable.id })
      .from(checkinsTable)
      .where(
        and(
          eq(checkinsTable.userId, user.id),
          eq(checkinsTable.gymId, gymId),
          gte(checkinsTable.checkedInAt, startOfIstDay),
        ),
      )
      .limit(1);
    if (recent) {
      res.status(409).json({ error: "Member already checked in to this gym today" });
      return;
    }
    const base = Number(gym.payoutPerVisitInr ?? 0);
    const taxPct = Number(gym.payoutTaxPct ?? 0);
    const taxInr = Math.round((base * taxPct) / 100);
    const payoutInr = base + taxInr;
    let row;
    try {
      [row] = await db
        .insert(checkinsTable)
        .values({
          userId: user.id,
          gymId,
          method: "qr",
          baseInr: base,
          taxPct,
          taxInr,
          payoutInr,
        })
        .returning();
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "23505") {
        res.status(409).json({ error: "Member already checked in to this gym today" });
        return;
      }
      throw e;
    }
    res.status(201).json({
      id: row.id,
      gymId,
      gymName: gym.name,
      memberCode: user.memberCode,
      userName: user.name,
      checkedInAt: row.checkedInAt,
    });
  },
);

export default router;
