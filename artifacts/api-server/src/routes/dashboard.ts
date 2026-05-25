import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  bookingsTable,
  classSessionsTable,
  gymsTable,
  trainersTable,
} from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { CURRENT_USER_ID } from "../lib/currentUser";
import { buildSessionDtos } from "./classes";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, CURRENT_USER_ID));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const now = new Date();
  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.userId, CURRENT_USER_ID));

  // next booking
  const upcomingBookings = await Promise.all(
    bookings
      .filter((b) => b.status === "confirmed")
      .map(async (b) => {
        const [c] = await db
          .select()
          .from(classSessionsTable)
          .where(eq(classSessionsTable.id, b.classId));
        return { b, c };
      }),
  );
  const next = upcomingBookings
    .filter((x) => x.c && x.c.startsAt >= now)
    .sort((a, b) => a.c!.startsAt.getTime() - b.c!.startsAt.getTime())[0];
  let nextBooking: any = null;
  if (next && next.c) {
    const [g] = await db.select().from(gymsTable).where(eq(gymsTable.id, next.c.gymId));
    const [t] = await db
      .select()
      .from(trainersTable)
      .where(eq(trainersTable.id, next.c.trainerId));
    nextBooking = {
      id: next.b.id,
      classId: next.c.id,
      classTitle: next.c.title,
      gymName: g?.name ?? "GYMCO",
      gymCity: g?.city ?? "",
      startsAt: next.c.startsAt,
      durationMin: next.c.durationMin,
      status: next.b.status,
      trainerName: t?.name ?? "GYMCO Coach",
      coverImage: next.c.coverImage,
      qrCode: next.b.qrCode,
    };
  }

  const trendingClasses = await db
    .select()
    .from(classSessionsTable)
    .orderBy(desc(classSessionsTable.trendingScore))
    .limit(6);
  const recommendedClasses = await buildSessionDtos(trendingClasses);

  const nearby = await db
    .select()
    .from(gymsTable)
    .orderBy(asc(gymsTable.distanceKm))
    .limit(4);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyActivity = days.map((d, i) => ({
    day: d,
    calories: [320, 540, 410, 600, 0, 720, 480][i],
    minutes: [30, 55, 40, 60, 0, 75, 50][i],
  }));

  const workouts = bookings.filter((b) => b.status !== "cancelled").length;
  const fitnessScore = Math.min(
    100,
    Math.round(
      40 +
        user.streakDays * 1.2 +
        workouts * 3 +
        (user.dailySleepHours >= 7 ? 8 : 0) +
        (user.dailyWaterMl >= 2000 ? 6 : 0),
    ),
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Burning the midnight oil"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

  res.json(
    GetDashboardResponse.parse({
      greeting,
      fitnessScore,
      streakDays: user.streakDays,
      weeklyWorkouts: workouts,
      weeklyGoal: user.weeklyGoal,
      caloriesToday: user.dailyCalories,
      waterMl: user.dailyWaterMl,
      sleepHours: user.dailySleepHours,
      nextBooking,
      recommendedClasses,
      nearbyGyms: nearby,
      weeklyActivity,
      aiTip:
        "You hit your sleep target last night — schedule a high-intensity class today to capitalize on the recovery.",
    }),
  );
});

export default router;
