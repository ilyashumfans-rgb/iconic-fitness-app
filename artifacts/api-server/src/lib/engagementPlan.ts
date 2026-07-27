/**
 * General Member Engagement: 45-day workout plan content (Member Success
 * Journey step 9). Plans are code-defaults — three levels, each a weekly
 * template expanded to 45 day-cards with warm-up / workout / cardio / core /
 * stretching sections. Only the member's enrolment (level + start date) is
 * stored in the DB.
 */

export const ENGAGEMENT_TOTAL_DAYS = 45;

export type EngagementLevel = "beginner" | "intermediate" | "advanced";

export const ENGAGEMENT_LEVELS: EngagementLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export type EngagementDayCard = {
  day: number; // 1..45
  title: string;
  focus: string;
  restDay: boolean;
  warmup: string[];
  workout: string[];
  cardio: string[];
  core: string[];
  stretching: string[];
};

type WeekTemplate = {
  title: string;
  focus: string;
  restDay?: boolean;
  warmup: string[];
  workout: string[];
  cardio: string[];
  core: string[];
  stretching: string[];
}[];

const COMMON_WARMUP = [
  "5 min brisk treadmill walk or cycling",
  "Arm circles, shoulder rolls — 10 each way",
  "Bodyweight squats x 10",
  "Hip openers + leg swings — 10 per side",
];

const COMMON_STRETCH = [
  "Standing hamstring stretch — 30s per side",
  "Quad stretch — 30s per side",
  "Chest doorway stretch — 30s",
  "Child's pose — 45s",
  "Deep breathing cool-down — 1 min",
];

const REST_DAY = {
  title: "Active recovery",
  focus: "Rest & recovery",
  restDay: true,
  warmup: ["10–20 min easy walk"],
  workout: ["Rest day — no training. Hydrate and sleep well."],
  cardio: [],
  core: [],
  stretching: ["Full-body gentle stretching — 10 min", "Foam rolling if available"],
};

const BEGINNER_WEEK: WeekTemplate = [
  {
    title: "Full body basics",
    focus: "Machines & form",
    warmup: COMMON_WARMUP,
    workout: [
      "Leg press — 3 x 12 (light)",
      "Chest press machine — 3 x 12",
      "Lat pulldown — 3 x 12",
      "Seated shoulder press machine — 2 x 12",
    ],
    cardio: ["10 min incline walk"],
    core: ["Plank — 3 x 20s", "Dead bug — 2 x 10 per side"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Cardio & core",
    focus: "Stamina",
    warmup: COMMON_WARMUP,
    workout: ["Cross-trainer — 15 min steady", "Cycling — 10 min easy"],
    cardio: ["Treadmill walk with 1-min brisk intervals — 10 min"],
    core: ["Crunches — 3 x 12", "Side plank — 2 x 15s per side", "Bird dog — 2 x 10"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Lower body",
    focus: "Legs & glutes",
    warmup: COMMON_WARMUP,
    workout: [
      "Bodyweight squats — 3 x 12",
      "Leg press — 3 x 12",
      "Leg curl machine — 3 x 12",
      "Standing calf raises — 3 x 15",
    ],
    cardio: ["8 min cycling cool-down"],
    core: ["Plank — 3 x 25s"],
    stretching: COMMON_STRETCH,
  },
  REST_DAY,
  {
    title: "Upper body",
    focus: "Push & pull",
    warmup: COMMON_WARMUP,
    workout: [
      "Chest press machine — 3 x 12",
      "Seated row — 3 x 12",
      "Dumbbell curls — 2 x 12",
      "Triceps pushdown — 2 x 12",
    ],
    cardio: ["10 min cross-trainer"],
    core: ["Crunches — 3 x 12", "Plank — 2 x 25s"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Cardio mix",
    focus: "Fat burn",
    warmup: COMMON_WARMUP,
    workout: ["Treadmill walk/jog intervals — 20 min (1 min jog / 2 min walk)"],
    cardio: ["Cycling — 10 min easy"],
    core: ["Mountain climbers — 3 x 20s", "Dead bug — 2 x 10 per side"],
    stretching: COMMON_STRETCH,
  },
  REST_DAY,
];

const INTERMEDIATE_WEEK: WeekTemplate = [
  {
    title: "Push day",
    focus: "Chest, shoulders, triceps",
    warmup: COMMON_WARMUP,
    workout: [
      "Barbell bench press — 4 x 10",
      "Incline dumbbell press — 3 x 10",
      "Dumbbell shoulder press — 3 x 10",
      "Lateral raises — 3 x 12",
      "Triceps pushdown — 3 x 12",
    ],
    cardio: ["10 min incline walk"],
    core: ["Plank — 3 x 40s", "Hanging knee raises — 3 x 10"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Pull day",
    focus: "Back & biceps",
    warmup: COMMON_WARMUP,
    workout: [
      "Lat pulldown — 4 x 10",
      "Seated row — 3 x 10",
      "Single-arm dumbbell row — 3 x 10 per side",
      "Face pulls — 3 x 12",
      "Barbell curls — 3 x 10",
    ],
    cardio: ["8 min cycling"],
    core: ["Russian twists — 3 x 20", "Side plank — 3 x 20s per side"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Leg day",
    focus: "Quads, hamstrings, glutes",
    warmup: COMMON_WARMUP,
    workout: [
      "Barbell back squats — 4 x 8",
      "Romanian deadlift — 3 x 10",
      "Walking lunges — 3 x 10 per leg",
      "Leg curl — 3 x 12",
      "Calf raises — 4 x 15",
    ],
    cardio: [],
    core: ["Plank — 3 x 40s"],
    stretching: COMMON_STRETCH,
  },
  REST_DAY,
  {
    title: "Upper body volume",
    focus: "Push + pull mix",
    warmup: COMMON_WARMUP,
    workout: [
      "Incline bench press — 3 x 10",
      "Pull-ups or assisted pull-ups — 3 x 8",
      "Dumbbell shoulder press — 3 x 10",
      "Cable row — 3 x 12",
      "Biceps + triceps superset — 3 x 12",
    ],
    cardio: ["10 min cross-trainer intervals"],
    core: ["Hanging knee raises — 3 x 12", "Cable crunch — 3 x 12"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Conditioning",
    focus: "HIIT & core",
    warmup: COMMON_WARMUP,
    workout: [
      "Kettlebell swings — 4 x 15",
      "Box step-ups — 3 x 10 per leg",
      "Burpees — 3 x 10",
    ],
    cardio: ["Treadmill sprints — 8 x 30s (90s walk between)"],
    core: ["Ab wheel or plank walkouts — 3 x 8", "Side plank — 3 x 25s per side"],
    stretching: COMMON_STRETCH,
  },
  REST_DAY,
];

const ADVANCED_WEEK: WeekTemplate = [
  {
    title: "Heavy push",
    focus: "Strength — chest & shoulders",
    warmup: COMMON_WARMUP,
    workout: [
      "Barbell bench press — 5 x 5 (heavy)",
      "Overhead press — 4 x 6",
      "Incline dumbbell press — 4 x 8",
      "Weighted dips — 3 x 8",
      "Lateral raises — 4 x 12",
    ],
    cardio: [],
    core: ["Weighted plank — 3 x 45s", "Hanging leg raises — 4 x 10"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Heavy pull",
    focus: "Strength — back",
    warmup: COMMON_WARMUP,
    workout: [
      "Deadlift — 5 x 5 (heavy)",
      "Weighted pull-ups — 4 x 6",
      "Barbell row — 4 x 8",
      "Face pulls — 3 x 15",
      "Barbell curls — 4 x 8",
    ],
    cardio: ["8 min easy cycling flush"],
    core: ["Russian twists — 4 x 20", "Back extensions — 3 x 12"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Heavy legs",
    focus: "Strength — lower body",
    warmup: COMMON_WARMUP,
    workout: [
      "Barbell back squats — 5 x 5 (heavy)",
      "Front squats — 3 x 8",
      "Bulgarian split squats — 3 x 8 per leg",
      "Romanian deadlift — 4 x 8",
      "Standing calf raises — 5 x 15",
    ],
    cardio: [],
    core: ["Weighted plank — 3 x 45s"],
    stretching: COMMON_STRETCH,
  },
  REST_DAY,
  {
    title: "Hypertrophy upper",
    focus: "Volume — arms & shoulders",
    warmup: COMMON_WARMUP,
    workout: [
      "Incline bench press — 4 x 10",
      "Cable row — 4 x 10",
      "Arnold press — 4 x 10",
      "Superset: curls + skullcrushers — 4 x 12",
      "Cable lateral raises — 4 x 15",
    ],
    cardio: ["10 min stair-climber"],
    core: ["Cable crunch — 4 x 15", "Hanging leg raises — 3 x 12"],
    stretching: COMMON_STRETCH,
  },
  {
    title: "Athletic conditioning",
    focus: "Power & engine",
    warmup: COMMON_WARMUP,
    workout: [
      "Power cleans or KB swings — 5 x 5",
      "Sled push or farmer's carry — 4 rounds",
      "Box jumps — 4 x 8",
      "Battle ropes — 5 x 30s",
    ],
    cardio: ["Rower intervals — 6 x 250m"],
    core: ["Ab wheel — 4 x 10", "Pallof press — 3 x 12 per side"],
    stretching: COMMON_STRETCH,
  },
  REST_DAY,
];

const WEEK_BY_LEVEL: Record<EngagementLevel, WeekTemplate> = {
  beginner: BEGINNER_WEEK,
  intermediate: INTERMEDIATE_WEEK,
  advanced: ADVANCED_WEEK,
};

export function isEngagementLevel(v: unknown): v is EngagementLevel {
  return v === "beginner" || v === "intermediate" || v === "advanced";
}

/** The full 45-day plan for a level, expanded from the weekly template. */
export function engagementPlan(level: EngagementLevel): EngagementDayCard[] {
  const week = WEEK_BY_LEVEL[level];
  const days: EngagementDayCard[] = [];
  for (let d = 1; d <= ENGAGEMENT_TOTAL_DAYS; d++) {
    const t = week[(d - 1) % 7]!;
    days.push({
      day: d,
      title: t.title,
      focus: t.focus,
      restDay: t.restDay ?? false,
      warmup: t.warmup,
      workout: t.workout,
      cardio: t.cardio,
      core: t.core,
      stretching: t.stretching,
    });
  }
  return days;
}

/** Today's YYYY-MM-DD in IST (members and gyms are all India-based). */
export function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

/** 1-based day number of the program for an IST date; clamps to 1..45. */
export function engagementDayNumber(startDate: string, today: string): number {
  const ms = Date.parse(today) - Date.parse(startDate);
  const day = Math.floor(ms / 86_400_000) + 1;
  return Math.max(1, Math.min(ENGAGEMENT_TOTAL_DAYS, day));
}
