import { Router, type IRouter } from "express";
import { and, eq, gte, desc, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  waterLogsTable,
  mealLogsTable,
  workoutLogsTable,
  checkinsTable,
  gymsTable,
} from "@workspace/db";
import {
  AddWaterBody,
  GetWaterDayResponse,
  DeleteWaterResponse,
  AddMealBody,
  GetMealDayResponse,
  DeleteMealResponse,
  AddWorkoutBody,
  GetWorkoutDayResponse,
  DeleteWorkoutResponse,
  GetTrackingSummaryResponse,
  GetProgressResponse,
  GetGoalsResponse,
  UpdateGoalsBody,
  CreateCheckinBody,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";

const router: IRouter = Router();

// ── Date helpers (a "day" is an Asia/Kolkata calendar date) ──
function istDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}
function dateNDaysAgo(n: number): string {
  return istDateStr(new Date(Date.now() - n * 86_400_000));
}
function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function resolveDate(raw: unknown): string {
  return isValidDate(raw) ? raw : dateNDaysAgo(0);
}
function dayLabel(date: string): string {
  // Parse at midday UTC to avoid timezone edge cases shifting the weekday.
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

async function loadGoals(userId: number) {
  const [u] = await db
    .select({
      waterGoalMl: usersTable.waterGoalMl,
      calorieGoal: usersTable.calorieGoal,
      proteinGoalG: usersTable.proteinGoalG,
      stepGoal: usersTable.stepGoal,
      weeklyGoal: usersTable.weeklyGoal,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u ?? null;
}

// ── Day builders (shared by GET and the POST-returns-the-updated-day flow) ──
async function buildWaterDay(userId: number, date: string) {
  const goals = await loadGoals(userId);
  const entries = await db
    .select()
    .from(waterLogsTable)
    .where(and(eq(waterLogsTable.userId, userId), eq(waterLogsTable.loggedDate, date)))
    .orderBy(desc(waterLogsTable.createdAt));
  const totalMl = entries.reduce((s, e) => s + e.amountMl, 0);
  return {
    date,
    totalMl,
    goalMl: goals?.waterGoalMl ?? 3000,
    entries: entries.map((e) => ({
      id: e.id,
      amountMl: e.amountMl,
      createdAt: e.createdAt,
    })),
  };
}

async function buildMealDay(userId: number, date: string) {
  const goals = await loadGoals(userId);
  const entries = await db
    .select()
    .from(mealLogsTable)
    .where(and(eq(mealLogsTable.userId, userId), eq(mealLogsTable.loggedDate, date)))
    .orderBy(desc(mealLogsTable.createdAt));
  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const totalProteinG = entries.reduce((s, e) => s + e.proteinG, 0);
  const totalCarbsG = entries.reduce((s, e) => s + e.carbsG, 0);
  const totalFatG = entries.reduce((s, e) => s + e.fatG, 0);
  return {
    date,
    totalCalories,
    goalCalories: goals?.calorieGoal ?? 2200,
    totalProteinG,
    goalProteinG: goals?.proteinGoalG ?? 120,
    totalCarbsG,
    totalFatG,
    entries: entries.map((e) => ({
      id: e.id,
      mealType: e.mealType,
      name: e.name,
      calories: e.calories,
      proteinG: e.proteinG,
      carbsG: e.carbsG,
      fatG: e.fatG,
      createdAt: e.createdAt,
    })),
  };
}

async function buildWorkoutDay(userId: number, date: string) {
  const goals = await loadGoals(userId);
  const entries = await db
    .select()
    .from(workoutLogsTable)
    .where(
      and(eq(workoutLogsTable.userId, userId), eq(workoutLogsTable.loggedDate, date)),
    )
    .orderBy(desc(workoutLogsTable.createdAt));
  return {
    date,
    totalCalories: entries.reduce((s, e) => s + e.calories, 0),
    totalMinutes: entries.reduce((s, e) => s + e.durationMin, 0),
    totalSteps: entries.reduce((s, e) => s + e.steps, 0),
    stepGoal: goals?.stepGoal ?? 8000,
    count: entries.length,
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      durationMin: e.durationMin,
      calories: e.calories,
      steps: e.steps,
      createdAt: e.createdAt,
    })),
  };
}

async function activeDateSet(userId: number, since: string): Promise<Set<string>> {
  const [water, meals, workouts] = await Promise.all([
    db
      .selectDistinct({ d: waterLogsTable.loggedDate })
      .from(waterLogsTable)
      .where(and(eq(waterLogsTable.userId, userId), gte(waterLogsTable.loggedDate, since))),
    db
      .selectDistinct({ d: mealLogsTable.loggedDate })
      .from(mealLogsTable)
      .where(and(eq(mealLogsTable.userId, userId), gte(mealLogsTable.loggedDate, since))),
    db
      .selectDistinct({ d: workoutLogsTable.loggedDate })
      .from(workoutLogsTable)
      .where(
        and(eq(workoutLogsTable.userId, userId), gte(workoutLogsTable.loggedDate, since)),
      ),
  ]);
  const set = new Set<string>();
  for (const r of [...water, ...meals, ...workouts]) set.add(r.d);
  return set;
}

function computeStreak(active: Set<string>): number {
  // Today not yet logged shouldn't reset the streak — start from yesterday then.
  let streak = 0;
  let i = active.has(dateNDaysAgo(0)) ? 0 : 1;
  for (; i <= 90; i++) {
    if (active.has(dateNDaysAgo(i))) streak++;
    else break;
  }
  return streak;
}

// ── Summary ──
router.get("/tracking/summary", requireUser, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const date = resolveDate(req.query["date"]);
  const goals = await loadGoals(userId);
  const since = dateNDaysAgo(89);
  const weekSince = dateNDaysAgo(6);

  const [water, meals, workouts, weekWorkouts, active] = await Promise.all([
    db
      .select({ ml: sql<number>`coalesce(sum(${waterLogsTable.amountMl}),0)::int` })
      .from(waterLogsTable)
      .where(and(eq(waterLogsTable.userId, userId), eq(waterLogsTable.loggedDate, date))),
    db
      .select({
        cals: sql<number>`coalesce(sum(${mealLogsTable.calories}),0)::int`,
        protein: sql<number>`coalesce(sum(${mealLogsTable.proteinG}),0)::int`,
      })
      .from(mealLogsTable)
      .where(and(eq(mealLogsTable.userId, userId), eq(mealLogsTable.loggedDate, date))),
    db
      .select({
        cals: sql<number>`coalesce(sum(${workoutLogsTable.calories}),0)::int`,
        steps: sql<number>`coalesce(sum(${workoutLogsTable.steps}),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(workoutLogsTable)
      .where(
        and(eq(workoutLogsTable.userId, userId), eq(workoutLogsTable.loggedDate, date)),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutLogsTable)
      .where(
        and(
          eq(workoutLogsTable.userId, userId),
          gte(workoutLogsTable.loggedDate, weekSince),
        ),
      ),
    activeDateSet(userId, since),
  ]);

  res.json(
    GetTrackingSummaryResponse.parse({
      date,
      waterMl: water[0]?.ml ?? 0,
      waterGoalMl: goals?.waterGoalMl ?? 3000,
      caloriesIn: meals[0]?.cals ?? 0,
      calorieGoal: goals?.calorieGoal ?? 2200,
      caloriesOut: workouts[0]?.cals ?? 0,
      proteinG: meals[0]?.protein ?? 0,
      proteinGoalG: goals?.proteinGoalG ?? 120,
      steps: workouts[0]?.steps ?? 0,
      stepGoal: goals?.stepGoal ?? 8000,
      workouts: workouts[0]?.count ?? 0,
      weeklyGoal: goals?.weeklyGoal ?? 5,
      streakDays: computeStreak(active),
      weeklyWorkouts: weekWorkouts[0]?.count ?? 0,
    }),
  );
});

// ── Water ──
router.get("/tracking/water", requireUser, async (req, res): Promise<void> => {
  const date = resolveDate(req.query["date"]);
  res.json(GetWaterDayResponse.parse(await buildWaterDay(req.userId!, date)));
});

router.post("/tracking/water", requireUser, async (req, res): Promise<void> => {
  const parsed = AddWaterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.amountMl <= 0) {
    res.status(400).json({ error: "amountMl must be positive" });
    return;
  }
  const date = resolveDate(parsed.data.date);
  await db.insert(waterLogsTable).values({
    userId: req.userId!,
    loggedDate: date,
    amountMl: parsed.data.amountMl,
  });
  res.status(201).json(GetWaterDayResponse.parse(await buildWaterDay(req.userId!, date)));
});

router.delete("/tracking/water/:id", requireUser, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(waterLogsTable)
    .where(and(eq(waterLogsTable.id, id), eq(waterLogsTable.userId, req.userId!)));
  res.json(DeleteWaterResponse.parse({ ok: true }));
});

// ── Meals ──
router.get("/tracking/meals", requireUser, async (req, res): Promise<void> => {
  const date = resolveDate(req.query["date"]);
  res.json(GetMealDayResponse.parse(await buildMealDay(req.userId!, date)));
});

router.post("/tracking/meals", requireUser, async (req, res): Promise<void> => {
  const parsed = AddMealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, mealType, calories, proteinG, carbsG, fatG, date } = parsed.data;
  if (calories < 0) {
    res.status(400).json({ error: "calories must be >= 0" });
    return;
  }
  const day = resolveDate(date);
  await db.insert(mealLogsTable).values({
    userId: req.userId!,
    loggedDate: day,
    mealType,
    name: name.trim() || "Meal",
    calories,
    proteinG: proteinG ?? 0,
    carbsG: carbsG ?? 0,
    fatG: fatG ?? 0,
  });
  res.status(201).json(GetMealDayResponse.parse(await buildMealDay(req.userId!, day)));
});

router.delete("/tracking/meals/:id", requireUser, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(mealLogsTable)
    .where(and(eq(mealLogsTable.id, id), eq(mealLogsTable.userId, req.userId!)));
  res.json(DeleteMealResponse.parse({ ok: true }));
});

// ── Workouts ──
router.get("/tracking/workouts", requireUser, async (req, res): Promise<void> => {
  const date = resolveDate(req.query["date"]);
  res.json(GetWorkoutDayResponse.parse(await buildWorkoutDay(req.userId!, date)));
});

router.post("/tracking/workouts", requireUser, async (req, res): Promise<void> => {
  const parsed = AddWorkoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { type, durationMin, calories, steps, date } = parsed.data;
  if (durationMin < 0 || (steps ?? 0) < 0 || (calories ?? 0) < 0) {
    res.status(400).json({ error: "Values must be non-negative" });
    return;
  }
  const day = resolveDate(date);
  await db.insert(workoutLogsTable).values({
    userId: req.userId!,
    loggedDate: day,
    type,
    durationMin,
    calories: calories ?? 0,
    steps: steps ?? 0,
  });
  res
    .status(201)
    .json(GetWorkoutDayResponse.parse(await buildWorkoutDay(req.userId!, day)));
});

router.delete("/tracking/workouts/:id", requireUser, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(workoutLogsTable)
    .where(and(eq(workoutLogsTable.id, id), eq(workoutLogsTable.userId, req.userId!)));
  res.json(DeleteWorkoutResponse.parse({ ok: true }));
});

// ── Progress (multi-day series for charts) ──
router.get("/tracking/progress", requireUser, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawDays = Number(req.query["days"]);
  const days = Number.isInteger(rawDays) ? Math.min(31, Math.max(1, rawDays)) : 7;
  const since = dateNDaysAgo(days - 1);

  const [waterRows, mealRows, workoutRows, active] = await Promise.all([
    db
      .select({
        d: waterLogsTable.loggedDate,
        ml: sql<number>`coalesce(sum(${waterLogsTable.amountMl}),0)::int`,
      })
      .from(waterLogsTable)
      .where(and(eq(waterLogsTable.userId, userId), gte(waterLogsTable.loggedDate, since)))
      .groupBy(waterLogsTable.loggedDate),
    db
      .select({
        d: mealLogsTable.loggedDate,
        cals: sql<number>`coalesce(sum(${mealLogsTable.calories}),0)::int`,
      })
      .from(mealLogsTable)
      .where(and(eq(mealLogsTable.userId, userId), gte(mealLogsTable.loggedDate, since)))
      .groupBy(mealLogsTable.loggedDate),
    db
      .select({
        d: workoutLogsTable.loggedDate,
        cals: sql<number>`coalesce(sum(${workoutLogsTable.calories}),0)::int`,
        steps: sql<number>`coalesce(sum(${workoutLogsTable.steps}),0)::int`,
        mins: sql<number>`coalesce(sum(${workoutLogsTable.durationMin}),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(workoutLogsTable)
      .where(
        and(eq(workoutLogsTable.userId, userId), gte(workoutLogsTable.loggedDate, since)),
      )
      .groupBy(workoutLogsTable.loggedDate),
    activeDateSet(userId, dateNDaysAgo(89)),
  ]);

  const waterMap = new Map(waterRows.map((r) => [r.d, r.ml]));
  const mealMap = new Map(mealRows.map((r) => [r.d, r.cals]));
  const workoutMap = new Map(workoutRows.map((r) => [r.d, r]));

  const series: {
    date: string;
    label: string;
    waterMl: number;
    caloriesIn: number;
    caloriesOut: number;
    steps: number;
    workouts: number;
    activeMinutes: number;
  }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dateNDaysAgo(i);
    const w = workoutMap.get(date);
    series.push({
      date,
      label: dayLabel(date),
      waterMl: waterMap.get(date) ?? 0,
      caloriesIn: mealMap.get(date) ?? 0,
      caloriesOut: w?.cals ?? 0,
      steps: w?.steps ?? 0,
      workouts: w?.count ?? 0,
      activeMinutes: w?.mins ?? 0,
    });
  }

  const totalWorkouts = series.reduce((s, d) => s + d.workouts, 0);
  const totalSteps = series.reduce((s, d) => s + d.steps, 0);
  const avgCaloriesIn = series.length
    ? Math.round(series.reduce((s, d) => s + d.caloriesIn, 0) / series.length)
    : 0;

  res.json(
    GetProgressResponse.parse({
      days: series,
      streakDays: computeStreak(active),
      totalWorkouts,
      totalSteps,
      avgCaloriesIn,
    }),
  );
});

// ── Goals ──
router.get("/tracking/goals", requireUser, async (req, res): Promise<void> => {
  const goals = await loadGoals(req.userId!);
  if (!goals) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetGoalsResponse.parse(goals));
});

router.patch("/tracking/goals", requireUser, async (req, res): Promise<void> => {
  const parsed = UpdateGoalsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates = parsed.data;
  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!));
  }
  const goals = await loadGoals(req.userId!);
  res.json(GetGoalsResponse.parse(goals));
});

// ── Check-ins ──
router.get("/checkins", requireUser, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: checkinsTable.id,
      gymId: checkinsTable.gymId,
      gymName: gymsTable.name,
      gymCity: gymsTable.city,
      checkedInAt: checkinsTable.checkedInAt,
      method: checkinsTable.method,
    })
    .from(checkinsTable)
    .innerJoin(gymsTable, eq(checkinsTable.gymId, gymsTable.id))
    .where(eq(checkinsTable.userId, req.userId!))
    .orderBy(desc(checkinsTable.checkedInAt))
    .limit(50);
  res.json(rows);
});

router.post("/checkins", requireUser, async (req, res): Promise<void> => {
  const parsed = CreateCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { gymId, method } = parsed.data;
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }
  const baseInr = gym.payoutPerVisitInr;
  const taxPct = gym.payoutTaxPct;
  const taxInr = Math.round((baseInr * taxPct) / 100);
  const payoutInr = baseInr - taxInr;

  await db
    .insert(checkinsTable)
    .values({
      userId: req.userId!,
      gymId,
      method: method ?? "qr",
      baseInr,
      taxPct,
      taxInr,
      payoutInr,
    })
    .onConflictDoNothing();

  // Return the check-in for today at this gym (whether just created or already present).
  const [row] = await db
    .select({
      id: checkinsTable.id,
      gymId: checkinsTable.gymId,
      gymName: gymsTable.name,
      gymCity: gymsTable.city,
      checkedInAt: checkinsTable.checkedInAt,
      method: checkinsTable.method,
    })
    .from(checkinsTable)
    .innerJoin(gymsTable, eq(checkinsTable.gymId, gymsTable.id))
    .where(and(eq(checkinsTable.userId, req.userId!), eq(checkinsTable.gymId, gymId)))
    .orderBy(desc(checkinsTable.checkedInAt))
    .limit(1);

  res.status(201).json(row);
});

export default router;
