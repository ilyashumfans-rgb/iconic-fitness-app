import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  partnersTable,
  gymsTable,
  classSessionsTable,
  bookingsTable,
  checkinsTable,
  usersTable,
  trainersTable,
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
    });
  },
);

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
    res.json({
      id: partner.id,
      email: partner.email,
      name: partner.name,
      phone: partner.phone,
      city: partner.city,
      status: partner.status,
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
    const { name, phone, city } = (req.body ?? {}) as Record<
      string,
      string | undefined
    >;
    const [updated] = await db
      .update(partnersTable)
      .set({
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(city !== undefined && { city }),
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
    ]) {
      if (b[k] !== undefined) patch[k] = String(b[k]);
    }
    for (const k of ["priceFrom"]) {
      if (b[k] !== undefined) patch[k] = Number(b[k]);
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
        trainerName: trainersTable.name,
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
    res.json(rows);
  },
);

export default router;
