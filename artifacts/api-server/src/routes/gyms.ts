import { Router, type IRouter } from "express";
import { and, eq, sql, asc, desc } from "drizzle-orm";
import {
  db,
  gymsTable,
  classSessionsTable,
  trainersTable,
  amenitiesTable,
  gymAmenitiesTable,
  gymCustomAmenitiesTable,
  gymHoursTable,
  workoutsTable,
  gymWorkoutsTable,
  gymWorkoutSessionsTable,
} from "@workspace/db";
import {
  ListGymsQueryParams,
  ListGymsResponse,
  ListFeaturedGymsResponse,
  ListGymCategoriesResponse,
  GetGymParams,
  GetGymResponse,
  ListGymClassesParams,
  ListGymClassesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/gyms", async (req, res): Promise<void> => {
  const parsed = ListGymsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { q, city, category, amenity, sort, lat, lng } = parsed.data;
  let rows = await db
    .select()
    .from(gymsTable)
    .where(eq(gymsTable.isVerified, true));

  // When the user shares their coordinates, replace the static distanceKm with
  // the real great-circle distance from the user to each gym (haversine).
  if (typeof lat === "number" && typeof lng === "number") {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    rows = rows.map((g) => {
      const dLat = toRad(g.lat - lat);
      const dLng = toRad(g.lng - lng);
      const a = Math.min(
        1,
        Math.max(
          0,
          Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat)) *
              Math.cos(toRad(g.lat)) *
              Math.sin(dLng / 2) ** 2,
        ),
      );
      const distanceKm =
        R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...g, distanceKm: Math.round(distanceKm * 10) / 10 };
    });
  }
  if (q) {
    const ql = q.toLowerCase();
    rows = rows.filter(
      (g) =>
        g.name.toLowerCase().includes(ql) ||
        g.area.toLowerCase().includes(ql) ||
        g.city.toLowerCase().includes(ql),
    );
  }
  if (city) rows = rows.filter((g) => g.city.toLowerCase() === city.toLowerCase());
  if (category)
    rows = rows.filter((g) =>
      g.categories.map((c) => c.toLowerCase()).includes(category.toLowerCase()),
    );
  if (amenity)
    rows = rows.filter((g) =>
      g.amenities.map((a) => a.toLowerCase()).includes(amenity.toLowerCase()),
    );
  if (sort === "rating") rows.sort((a, b) => b.rating - a.rating);
  else if (sort === "price") rows.sort((a, b) => a.priceFrom - b.priceFrom);
  else rows.sort((a, b) => a.distanceKm - b.distanceKm);
  res.json(ListGymsResponse.parse(rows));
});

router.get("/gyms/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(gymsTable)
    .where(and(eq(gymsTable.featured, true), eq(gymsTable.isVerified, true)));
  res.json(ListFeaturedGymsResponse.parse(rows));
});

router.get("/gyms/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(gymsTable)
    .where(eq(gymsTable.isVerified, true));
  const counts = new Map<string, number>();
  for (const g of rows) {
    for (const c of g.categories) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  const iconMap: Record<string, string> = {
    gym: "Dumbbell",
    yoga: "Flower2",
    crossfit: "Flame",
    pilates: "Sparkles",
    mma: "Swords",
    swimming: "Waves",
    zumba: "Music2",
    boxing: "Swords",
    cycling: "Bike",
    functional: "Activity",
  };
  const list = Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      count,
      icon: iconMap[category.toLowerCase()] ?? "Dumbbell",
    }))
    .sort((a, b) => b.count - a.count);
  res.json(ListGymCategoriesResponse.parse(list));
});

router.get("/gyms/:gymId", async (req, res): Promise<void> => {
  const params = GetGymParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [gym] = await db
    .select()
    .from(gymsTable)
    .where(
      and(
        eq(gymsTable.id, params.data.gymId),
        eq(gymsTable.isVerified, true),
      ),
    );
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  const trainers = await db
    .select()
    .from(trainersTable)
    .where(eq(trainersTable.gymId, gym.id));
  const upcoming = await db
    .select()
    .from(classSessionsTable)
    .where(eq(classSessionsTable.gymId, gym.id))
    .orderBy(asc(classSessionsTable.startsAt))
    .limit(6);
  const upcomingClasses = await Promise.all(
    upcoming.map(async (c) => {
      const trainer = trainers.find((t) => t.id === c.trainerId);
      const booked = await db.$count(
        sql`(select 1 from bookings where class_id = ${c.id})`,
      );
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        gymId: gym.id,
        gymName: gym.name,
        gymCity: gym.city,
        trainerName: trainer?.name ?? "GYMCO Coach",
        startsAt: c.startsAt,
        durationMin: c.durationMin,
        capacity: c.capacity,
        booked: Number(booked) || 0,
        intensity: c.intensity,
        coverImage: c.coverImage,
      };
    }),
  );
  res.json(
    GetGymResponse.parse({
      ...gym,
      trainers,
      upcomingClasses,
    }),
  );
});

async function assertVerifiedGym(gymId: number): Promise<boolean> {
  const [g] = await db
    .select({ isVerified: gymsTable.isVerified })
    .from(gymsTable)
    .where(eq(gymsTable.id, gymId));
  return !!g && g.isVerified === true;
}

router.get("/gyms/:gymId/amenities", async (req, res): Promise<void> => {
  const gymId = Number(req.params.gymId);
  if (!gymId) {
    res.status(400).json({ error: "Invalid gymId" });
    return;
  }
  if (!(await assertVerifiedGym(gymId))) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  const selected = await db
    .select({
      id: amenitiesTable.id,
      name: amenitiesTable.name,
      slug: amenitiesTable.slug,
      description: amenitiesTable.description,
      icon: amenitiesTable.icon,
      category: amenitiesTable.category,
    })
    .from(gymAmenitiesTable)
    .innerJoin(
      amenitiesTable,
      eq(gymAmenitiesTable.amenityId, amenitiesTable.id),
    )
    .where(
      and(
        eq(gymAmenitiesTable.gymId, gymId),
        eq(amenitiesTable.isActive, true),
      ),
    )
    .orderBy(asc(amenitiesTable.sortOrder), asc(amenitiesTable.name));
  const custom = await db
    .select()
    .from(gymCustomAmenitiesTable)
    .where(eq(gymCustomAmenitiesTable.gymId, gymId))
    .orderBy(asc(gymCustomAmenitiesTable.id));
  res.json({ catalog: selected, custom });
});

router.get("/gyms/:gymId/hours", async (req, res): Promise<void> => {
  const gymId = Number(req.params.gymId);
  if (!gymId) {
    res.status(400).json({ error: "Invalid gymId" });
    return;
  }
  if (!(await assertVerifiedGym(gymId))) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  const rows = await db
    .select()
    .from(gymHoursTable)
    .where(eq(gymHoursTable.gymId, gymId))
    .orderBy(asc(gymHoursTable.dayOfWeek));
  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
  const out = Array.from({ length: 7 }, (_, d) =>
    byDay.get(d) ?? {
      id: 0,
      gymId,
      dayOfWeek: d,
      isClosed: false,
      openMinute: 300,
      closeMinute: 1380,
    },
  );
  res.json(out);
});

router.get("/gyms/:gymId/workouts", async (req, res): Promise<void> => {
  const gymId = Number(req.params.gymId);
  if (!gymId) {
    res.status(400).json({ error: "Invalid gymId" });
    return;
  }
  if (!(await assertVerifiedGym(gymId))) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  const rows = await db
    .select({
      id: workoutsTable.id,
      name: workoutsTable.name,
      slug: workoutsTable.slug,
      description: workoutsTable.description,
      icon: workoutsTable.icon,
      color: workoutsTable.color,
      imageUrl: workoutsTable.imageUrl,
    })
    .from(gymWorkoutsTable)
    .innerJoin(
      workoutsTable,
      eq(gymWorkoutsTable.workoutId, workoutsTable.id),
    )
    .where(
      and(
        eq(gymWorkoutsTable.gymId, gymId),
        eq(workoutsTable.isActive, true),
      ),
    )
    .orderBy(asc(workoutsTable.sortOrder), asc(workoutsTable.name));
  res.json(rows);
});

router.get(
  "/gyms/:gymId/workouts/sessions",
  async (req, res): Promise<void> => {
    const gymId = Number(req.params.gymId);
    if (!gymId) {
      res.status(400).json({ error: "Invalid gymId" });
      return;
    }
    if (!(await assertVerifiedGym(gymId))) {
      res.status(404).json({ error: "Gym not found" });
      return;
    }
    const rows = await db
      .select({
        id: gymWorkoutSessionsTable.id,
        gymId: gymWorkoutSessionsTable.gymId,
        workoutId: gymWorkoutSessionsTable.workoutId,
        dayOfWeek: gymWorkoutSessionsTable.dayOfWeek,
        startMinute: gymWorkoutSessionsTable.startMinute,
        endMinute: gymWorkoutSessionsTable.endMinute,
        instructor: gymWorkoutSessionsTable.instructor,
      })
      .from(gymWorkoutSessionsTable)
      .innerJoin(
        gymWorkoutsTable,
        and(
          eq(gymWorkoutsTable.gymId, gymWorkoutSessionsTable.gymId),
          eq(gymWorkoutsTable.workoutId, gymWorkoutSessionsTable.workoutId),
        ),
      )
      .innerJoin(
        workoutsTable,
        eq(workoutsTable.id, gymWorkoutSessionsTable.workoutId),
      )
      .where(
        and(
          eq(gymWorkoutSessionsTable.gymId, gymId),
          eq(workoutsTable.isActive, true),
        ),
      )
      .orderBy(
        asc(gymWorkoutSessionsTable.dayOfWeek),
        asc(gymWorkoutSessionsTable.startMinute),
      );
    res.json(rows);
  },
);

router.get("/gyms/:gymId/classes", async (req, res): Promise<void> => {
  const params = ListGymClassesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [gym] = await db
    .select()
    .from(gymsTable)
    .where(
      and(
        eq(gymsTable.id, params.data.gymId),
        eq(gymsTable.isVerified, true),
      ),
    );
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  const rows = await db
    .select()
    .from(classSessionsTable)
    .where(eq(classSessionsTable.gymId, gym.id))
    .orderBy(asc(classSessionsTable.startsAt));
  const trainers = await db.select().from(trainersTable);
  const out = rows.map((c) => {
    const trainer = trainers.find((t) => t.id === c.trainerId);
    return {
      id: c.id,
      title: c.title,
      category: c.category,
      gymId: gym.id,
      gymName: gym.name,
      gymCity: gym.city,
      trainerName: trainer?.name ?? "GYMCO Coach",
      startsAt: c.startsAt,
      durationMin: c.durationMin,
      capacity: c.capacity,
      booked: Math.floor(c.capacity * 0.6),
      intensity: c.intensity,
      coverImage: c.coverImage,
    };
  });
  res.json(ListGymClassesResponse.parse(out));
});

export default router;
