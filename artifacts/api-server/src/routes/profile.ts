import { Router, type IRouter } from "express";
import { and, eq, gte } from "drizzle-orm";
import { db, usersTable, bookingsTable, classSessionsTable, gymsTable } from "@workspace/db";
import { GetMeResponse, UpdateMeBody, UpdateMeResponse } from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { computeHealthMetrics } from "../lib/healthMetrics";
import { sendMemberWelcome } from "../lib/messaging";

const router: IRouter = Router();

function bmi(heightCm: number, weightKg: number) {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

async function weeklyWorkouts(userId: number) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const rows = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .innerJoin(classSessionsTable, eq(bookingsTable.classId, classSessionsTable.id))
    .where(
      and(
        eq(bookingsTable.userId, userId),
        gte(classSessionsTable.startsAt, since),
      ),
    );
  return rows.length;
}

async function loadProfile(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  const workouts = await weeklyWorkouts(userId);
  const fitnessScore = Math.min(
    100,
    Math.round(
      40 +
        user.streakDays * 1.2 +
        workouts * 4 +
        (user.dailySleepHours >= 7 ? 8 : 0) +
        (user.dailyWaterMl >= 2000 ? 6 : 0),
    ),
  );
  const metrics = computeHealthMetrics({
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    age: user.age,
    gender: user.gender,
    activityLevel: user.activityLevel,
  });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    gender: user.gender,
    age: user.age,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    fitnessGoal: user.fitnessGoal,
    avatarUrl: user.avatarUrl,
    city: user.city,
    bmi: bmi(user.heightCm, user.weightKg),
    fitnessScore,
    dailyCalories: user.dailyCalories,
    dailyWaterMl: user.dailyWaterMl,
    dailySleepHours: user.dailySleepHours,
    restingHr: user.restingHr,
    streakDays: user.streakDays,
    weeklyWorkouts: workouts,
    weeklyGoal: user.weeklyGoal,
    joinedAt: user.joinedAt,
    assessmentComplete: !!user.assessmentCompletedAt,
    experienceLevel: user.experienceLevel,
    targetWeightKg: user.targetWeightKg,
    bmr: metrics.bmr,
    tdee: metrics.tdee,
    bodyFatPct: metrics.bodyFatPct,
  };
}

router.get("/me", requireUser, async (req, res): Promise<void> => {
  const data = await loadProfile(req.userId!);
  if (!data) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetMeResponse.parse(data));
});

router.patch("/me", requireUser, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Read the user before updating so we can detect when a phone number is
  // being set for the first time and send a member welcome message.
  const [priorUser] = await db
    .select({ mobile: usersTable.mobile, welcomeSmsSent: usersTable.welcomeSmsSent, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, req.userId!));
  const data = await loadProfile(req.userId!);

  // Send a welcome message the first time a member saves their phone number.
  const newMobile =
    typeof (parsed.data as Record<string, unknown>).mobile === "string"
      ? ((parsed.data as Record<string, unknown>).mobile as string).trim()
      : "";
  const hadNoPhone = !priorUser?.mobile;
  const welcomeNotSent = !priorUser?.welcomeSmsSent;
  if (newMobile && hadNoPhone && welcomeNotSent) {
    void sendMemberWelcome({
      userId: req.userId!,
      name: priorUser?.name ?? "Member",
      phone: newMobile,
    })
      .then(() =>
        db
          .update(usersTable)
          .set({ welcomeSmsSent: true })
          .where(eq(usersTable.id, req.userId!)),
      )
      .catch(() => {/* fire-and-forget */});
  }

  res.json(UpdateMeResponse.parse(data));
});

// helper export
export { loadProfile };

export default router;
