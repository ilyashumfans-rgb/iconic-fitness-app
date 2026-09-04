import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db, classSessionsTable, gymsTable, trainersTable, bookingsTable } from "@workspace/db";
import { isClassVisibleToMembers } from "../lib/classVisibility";
import { ensureUpcomingClassSessions } from "../lib/ensureClassSessions";
import { microCache } from "../lib/microCache";
import {
  ListClassesQueryParams,
  ListClassesResponse,
  ListTrendingClassesResponse,
  GetClassParams,
  GetClassResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildSessionDtos(rows: typeof classSessionsTable.$inferSelect[]) {
  // Aggregate booked counts in SQL instead of loading the whole bookings
  // table into memory — with lakhs of members the bookings table is by far
  // the largest of the three, and we only ever need per-class counts.
  const [gyms, trainers, bookedCounts] = await Promise.all([
    db.select().from(gymsTable),
    db.select().from(trainersTable),
    rows.length === 0
      ? Promise.resolve([] as { classId: number; booked: number }[])
      : db
          .select({
            classId: bookingsTable.classId,
            booked: sql<number>`count(*)::int`,
          })
          .from(bookingsTable)
          .where(
            and(
              inArray(
                bookingsTable.classId,
                rows.map((row) => row.id),
              ),
              ne(bookingsTable.status, "cancelled"),
            ),
          )
          .groupBy(bookingsTable.classId),
  ]);
  const bookedByClass = new Map(bookedCounts.map((b) => [b.classId, b.booked]));
  const now = Date.now();
  return rows
    .filter((c) => {
      const g = gyms.find((x) => x.id === c.gymId);
      if (g?.isVerified !== true) return false;
      // Only surface classes inside the member visibility window (1 day before).
      return isClassVisibleToMembers(c.startsAt, now);
    })
    .map((c) => {
    const g = gyms.find((x) => x.id === c.gymId);
    const t = trainers.find((x) => x.id === c.trainerId);
    const booked = bookedByClass.get(c.id) ?? 0;
    return {
      id: c.id,
      title: c.title,
      category: c.category,
      gymId: c.gymId,
      gymName: g?.name ?? "GYMCO Studio",
      gymCity: g?.city ?? "",
      trainerName: t?.name ?? "GYMCO Coach",
      startsAt: c.startsAt,
      durationMin: c.durationMin,
      capacity: c.capacity,
      booked,
      intensity: c.intensity,
      coverImage: c.coverImage,
    };
  });
}

// 30s micro-cache: class listings are hot, public, and identical for every
// member; booked counts being up to 30s stale is invisible in the UI.
const CLASSES_TTL_MS = 30_000;

router.get("/classes", microCache(CLASSES_TTL_MS), async (req, res): Promise<void> => {
  const parsed = ListClassesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, city, date } = parsed.data;
  await ensureUpcomingClassSessions();
  let rows = await db
    .select()
    .from(classSessionsTable)
    .where(gte(classSessionsTable.startsAt, new Date()))
    .orderBy(asc(classSessionsTable.startsAt));
  if (category)
    rows = rows.filter((c) => c.category.toLowerCase() === category.toLowerCase());
  let dtos = await buildSessionDtos(rows);
  if (city) dtos = dtos.filter((d) => d.gymCity.toLowerCase() === city.toLowerCase());
  if (date) {
    const day = date.toString().slice(0, 10);
    dtos = dtos.filter((d) => d.startsAt.toISOString().slice(0, 10) === day);
  }
  res.json(ListClassesResponse.parse(dtos));
});

router.get("/classes/trending", microCache(CLASSES_TTL_MS), async (_req, res): Promise<void> => {
  await ensureUpcomingClassSessions();
  const rows = await db
    .select()
    .from(classSessionsTable)
    .where(gte(classSessionsTable.startsAt, new Date()))
    .orderBy(desc(classSessionsTable.trendingScore), asc(classSessionsTable.startsAt))
    .limit(8);
  const dtos = await buildSessionDtos(rows);
  res.json(ListTrendingClassesResponse.parse(dtos));
});

router.get("/classes/:classId", microCache(CLASSES_TTL_MS), async (req, res): Promise<void> => {
  const params = GetClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [c] = await db
    .select()
    .from(classSessionsTable)
    .where(eq(classSessionsTable.id, params.data.classId));
  if (!c) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const [base] = await buildSessionDtos([c]);
  if (!base) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(
    GetClassResponse.parse({
      ...base,
      description: c.description,
      equipmentNeeded: c.equipmentNeeded,
      calorieEstimate: c.calorieEstimate,
    }),
  );
});

export default router;
export { buildSessionDtos };
