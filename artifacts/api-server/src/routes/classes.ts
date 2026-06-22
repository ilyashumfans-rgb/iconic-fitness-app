import { Router, type IRouter } from "express";
import { asc, desc, eq, gte, sql } from "drizzle-orm";
import { db, classSessionsTable, gymsTable, trainersTable, bookingsTable } from "@workspace/db";
import { isClassVisibleToMembers } from "../lib/classVisibility";
import {
  ListClassesQueryParams,
  ListClassesResponse,
  ListTrendingClassesResponse,
  GetClassParams,
  GetClassResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildSessionDtos(rows: typeof classSessionsTable.$inferSelect[]) {
  const gyms = await db.select().from(gymsTable);
  const trainers = await db.select().from(trainersTable);
  const bookings = await db.select().from(bookingsTable);
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
    const booked = bookings.filter((b) => b.classId === c.id && b.status !== "cancelled").length;
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

router.get("/classes", async (req, res): Promise<void> => {
  const parsed = ListClassesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, city, date } = parsed.data;
  let rows = await db
    .select()
    .from(classSessionsTable)
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

router.get("/classes/trending", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(classSessionsTable)
    .orderBy(desc(classSessionsTable.trendingScore))
    .limit(8);
  const dtos = await buildSessionDtos(rows);
  res.json(ListTrendingClassesResponse.parse(dtos));
});

router.get("/classes/:classId", async (req, res): Promise<void> => {
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
