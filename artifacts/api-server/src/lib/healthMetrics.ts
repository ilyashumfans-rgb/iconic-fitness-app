// Shared health-metrics + goal-derivation helpers.
// Used by the AI coach assessment (ai.ts) and the profile endpoint (profile.ts)
// so the numbers a member sees and the goals we set always agree.

export const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface MetricsInput {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: string | null;
  activityLevel?: string | null;
}

export interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  bodyFatPct: number;
  bmr: number;
  tdee: number;
  idealWeightLowKg: number;
  idealWeightHighKg: number;
  hydrationMl: number;
}

function round(n: number, step = 1): number {
  return Math.round(n / step) * step;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isMale(gender: string | null): boolean {
  return (gender ?? "").trim().toLowerCase().startsWith("m");
}

function activityFactor(level?: string | null): number {
  return ACTIVITY_FACTORS[(level ?? "").trim().toLowerCase()] ?? 1.55;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/**
 * Compute BMI, body-fat %, BMR (Mifflin-St Jeor), TDEE, ideal weight range and
 * hydration target. Returns zeros when height/weight/age are missing so callers
 * can treat "no real data yet" gracefully.
 */
export function computeHealthMetrics(input: MetricsInput): HealthMetrics {
  const heightCm = input.heightCm;
  const weightKg = input.weightKg;
  const age = input.age;

  if (!(heightCm > 0) || !(weightKg > 0) || !(age > 0)) {
    return {
      bmi: 0,
      bmiCategory: "Unknown",
      bodyFatPct: 0,
      bmr: 0,
      tdee: 0,
      idealWeightLowKg: 0,
      idealWeightHighKg: 0,
      hydrationMl: 0,
    };
  }

  const m = heightCm / 100;
  const bmi = round(weightKg / (m * m), 0.1);
  const sex = isMale(input.gender) ? 1 : 0;

  // Deurenberg body-fat estimate from BMI/age/sex.
  const bodyFatPct = round(clamp(1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4, 3, 60), 0.1);

  // Mifflin-St Jeor BMR.
  const bmr = round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex ? 5 : -161));
  const tdee = round(bmr * activityFactor(input.activityLevel));

  const idealWeightLowKg = round(18.5 * m * m, 0.1);
  const idealWeightHighKg = round(24.9 * m * m, 0.1);
  const hydrationMl = clamp(round(weightKg * 35, 50), 2000, 4000);

  return {
    bmi,
    bmiCategory: bmiCategory(bmi),
    bodyFatPct,
    bmr,
    tdee,
    idealWeightLowKg,
    idealWeightHighKg,
    hydrationMl,
  };
}

export interface WeightPlan {
  direction: "lose" | "gain" | "maintain";
  targetWeightKg: number;
  deltaKg: number;
  weeklyRateKg: number;
  estWeeks: number;
  summary: string;
}

/**
 * Translate height + current weight (and optional explicit target) into a
 * concrete, safe recommendation: which direction to move, how many kg, at what
 * weekly pace, and a rough timeframe. Anchors on the healthy BMI range when the
 * member hasn't set a target. Returns null when there isn't enough data.
 */
export function weightPlan(
  input: MetricsInput & { targetWeightKg?: number | null },
): WeightPlan | null {
  const metrics = computeHealthMetrics(input);
  if (metrics.bmi <= 0) return null;

  const weightKg = input.weightKg;
  const { idealWeightLowKg, idealWeightHighKg } = metrics;

  // Pick a target: an explicit member target if sensible, else the nearest edge
  // of the healthy range (or current weight when already inside it).
  let target: number;
  const explicit = input.targetWeightKg;
  if (explicit != null && explicit > 0) {
    target = explicit;
  } else if (weightKg > idealWeightHighKg) {
    target = idealWeightHighKg;
  } else if (weightKg < idealWeightLowKg) {
    target = idealWeightLowKg;
  } else {
    target = weightKg;
  }
  target = round(target, 0.1);

  const deltaKg = round(weightKg - target, 0.1); // positive → need to lose
  const direction: WeightPlan["direction"] =
    deltaKg > 1 ? "lose" : deltaKg < -1 ? "gain" : "maintain";

  // Safe pace: ~0.5 kg/week for loss, ~0.25 kg/week for gain.
  const weeklyRateKg = direction === "lose" ? 0.5 : direction === "gain" ? 0.25 : 0;
  const estWeeks = weeklyRateKg > 0 ? Math.ceil(Math.abs(deltaKg) / weeklyRateKg) : 0;

  let summary: string;
  if (direction === "maintain") {
    summary = `Maintain around ${weightKg} kg (already in the healthy ${idealWeightLowKg}-${idealWeightHighKg} kg range) — focus on body composition and consistency.`;
  } else {
    const verb = direction === "lose" ? "Lose" : "Gain";
    summary = `${verb} about ${Math.abs(deltaKg)} kg (from ${weightKg} kg toward ${target} kg) at a safe ~${weeklyRateKg} kg/week — roughly ${estWeeks} weeks. Healthy range for their height is ${idealWeightLowKg}-${idealWeightHighKg} kg.`;
  }

  return { direction, targetWeightKg: target, deltaKg, weeklyRateKg, estWeeks, summary };
}

export type GoalIntent = "loss" | "gain" | "maintain";

/** Map a free-text fitness goal to a calorie/training intent. */
export function classifyGoal(goal: string | null): GoalIntent {
  const g = (goal ?? "").toLowerCase();
  if (/(loss|lose|fat|cut|slim|weight\s*down)/.test(g)) return "loss";
  if (/(muscle|gain|bulk|strength|mass|build)/.test(g)) return "gain";
  return "maintain";
}

export interface GoalsInput extends MetricsInput {
  fitnessGoal?: string | null;
  experienceLevel?: string | null;
}

export interface DerivedGoals {
  calorieGoal: number;
  proteinGoalG: number;
  waterGoalMl: number;
  stepGoal: number;
  weeklyGoal: number;
}

/**
 * Derive sensible daily/weekly goals from a member's metrics + intent.
 * Falls back to the app defaults when metrics are missing.
 */
export function deriveGoals(input: GoalsInput): DerivedGoals {
  const metrics = computeHealthMetrics(input);
  const intent = classifyGoal(input.fitnessGoal ?? null);
  const weightKg = input.weightKg;

  let calorieGoal: number;
  if (metrics.tdee > 0) {
    if (intent === "loss") calorieGoal = Math.max(1200, round(metrics.tdee * 0.8, 10));
    else if (intent === "gain") calorieGoal = round(metrics.tdee + 300, 10);
    else calorieGoal = round(metrics.tdee, 10);
  } else {
    calorieGoal = 2200;
  }

  let proteinGoalG: number;
  if (weightKg > 0) {
    const perKg = intent === "maintain" ? 1.4 : 1.8;
    proteinGoalG = clamp(round(weightKg * perKg, 5), 40, 250);
  } else {
    proteinGoalG = 120;
  }

  const waterGoalMl = metrics.hydrationMl > 0 ? metrics.hydrationMl : 3000;

  const stepByActivity: Record<string, number> = {
    sedentary: 6000,
    light: 8000,
    moderate: 10000,
    active: 12000,
    very_active: 13000,
  };
  const stepGoal = stepByActivity[(input.activityLevel ?? "").trim().toLowerCase()] ?? 8000;

  const exp = (input.experienceLevel ?? "").trim().toLowerCase();
  const weeklyGoal = exp === "experienced" ? 5 : exp === "new" ? 3 : 4;

  return { calorieGoal, proteinGoalG, waterGoalMl, stepGoal, weeklyGoal };
}
