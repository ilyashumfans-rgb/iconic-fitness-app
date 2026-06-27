import type { Feather } from "@expo/vector-icons";

import { EXERCISES, getExercise, type Difficulty, type Exercise } from "@/lib/exercises";

export type WorkoutFocus =
  | "fullbody"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "core"
  | "cardio";

export type WorkoutLevel = "Beginner" | "Intermediate" | "Advanced";

export type Workout = {
  id: string;
  name: string;
  focus: WorkoutFocus;
  level: WorkoutLevel;
  icon: keyof typeof Feather.glyphMap;
  description: string;
  /** Exercise slugs in performance order. */
  exerciseSlugs: string[];
  /** Marks a generated (non-preset) routine. */
  generated?: boolean;
};

export const WORKOUT_FOCUS_LABELS: Record<WorkoutFocus, string> = {
  fullbody: "Full Body",
  upper: "Upper Body",
  lower: "Lower Body",
  push: "Push",
  pull: "Pull",
  core: "Core",
  cardio: "Cardio",
};

export const WORKOUT_TEMPLATES: Workout[] = [
  {
    id: "full-body-strength",
    name: "Full Body Strength",
    focus: "fullbody",
    level: "Intermediate",
    icon: "activity",
    description:
      "Hit every major muscle group in one efficient session — the perfect 3-day-a-week staple.",
    exerciseSlugs: ["back-squat", "bench-press", "barbell-row", "overhead-press", "plank"],
  },
  {
    id: "push-day",
    name: "Push Day",
    focus: "push",
    level: "Intermediate",
    icon: "shield",
    description: "Chest, shoulders and triceps — all the pressing muscles in one focused workout.",
    exerciseSlugs: ["bench-press", "overhead-press", "dumbbell-press", "lateral-raise", "tricep-dip"],
  },
  {
    id: "pull-day",
    name: "Pull Day",
    focus: "pull",
    level: "Intermediate",
    icon: "triangle",
    description: "Build a wide, strong back and bigger biceps with the essential pulling moves.",
    exerciseSlugs: ["deadlift", "barbell-row", "lat-pulldown", "bicep-curl"],
  },
  {
    id: "leg-day",
    name: "Leg Day",
    focus: "lower",
    level: "Advanced",
    icon: "trello",
    description: "A serious lower-body session for size, strength and power.",
    exerciseSlugs: ["back-squat", "lunge", "goblet-squat", "kettlebell-swing"],
  },
  {
    id: "beginner-foundations",
    name: "Beginner Foundations",
    focus: "fullbody",
    level: "Beginner",
    icon: "award",
    description: "New to the gym? Master the basics with this approachable full-body starter.",
    exerciseSlugs: ["goblet-squat", "push-up", "lat-pulldown", "plank"],
  },
  {
    id: "core-crusher",
    name: "Core Crusher",
    focus: "core",
    level: "Beginner",
    icon: "target",
    description: "A short, sharp midsection finisher to build a rock-solid core.",
    exerciseSlugs: ["plank", "hanging-leg-raise", "mountain-climber"],
  },
  {
    id: "hiit-burn",
    name: "HIIT Fat Burn",
    focus: "cardio",
    level: "Intermediate",
    icon: "heart",
    description: "High-intensity intervals that torch calories and boost conditioning fast.",
    exerciseSlugs: ["burpee", "jump-rope", "mountain-climber", "thruster"],
  },
];

/** Maps a workout focus to the exercise categories it should draw from. */
const FOCUS_CATEGORIES: Record<WorkoutFocus, string[]> = {
  fullbody: ["chest", "back", "legs", "shoulders", "core"],
  upper: ["chest", "back", "shoulders", "arms"],
  lower: ["legs", "core"],
  push: ["chest", "shoulders", "arms"],
  pull: ["back", "arms"],
  core: ["core"],
  cardio: ["cardio", "fullbody"],
};

const LEVEL_RANK: Record<Difficulty, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

export function getWorkout(id: string): Workout | undefined {
  return WORKOUT_TEMPLATES.find((w) => w.id === id);
}

export function workoutExercises(workout: Workout): Exercise[] {
  return workout.exerciseSlugs
    .map((slug) => getExercise(slug))
    .filter((e): e is Exercise => Boolean(e));
}

export type WorkoutStats = {
  exercises: number;
  totalSets: number;
  estCalories: number;
  estMinutes: number;
};

export function workoutStats(exercises: Exercise[]): WorkoutStats {
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const estCalories = exercises.reduce((sum, e) => sum + e.caloriesPerSet * e.sets, 0);
  // Rough estimate: ~45s work + parsed rest per set, in minutes.
  const estSeconds = exercises.reduce((sum, e) => {
    const rest = parseInt(e.rest, 10) || 60;
    return sum + e.sets * (45 + rest);
  }, 0);
  return {
    exercises: exercises.length,
    totalSets,
    estCalories,
    estMinutes: Math.max(1, Math.round(estSeconds / 60)),
  };
}

export type GenerateOptions = {
  focus: WorkoutFocus;
  level: WorkoutLevel;
  /** Target session length in minutes. */
  durationMin: number;
};

/**
 * Build a routine from the exercise library matching the chosen focus, level
 * and rough duration. Pure + deterministic-ish (shuffled per call) so it works
 * fully offline for guests.
 */
export function generateWorkout(opts: GenerateOptions): Workout {
  const categories = FOCUS_CATEGORIES[opts.focus];
  const maxRank = LEVEL_RANK[opts.level];

  const pool = EXERCISES.filter(
    (e) => categories.includes(e.categoryId) && LEVEL_RANK[e.difficulty] <= maxRank,
  );

  // Shuffle for variety.
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  // ~6 min of work budget per exercise → derive a target count.
  const targetCount = Math.min(
    shuffled.length,
    Math.max(3, Math.round(opts.durationMin / 6)),
  );

  // Spread picks across the focus categories so we don't get 5 of one thing.
  const picked: Exercise[] = [];
  const usedCats = new Set<string>();
  for (const ex of shuffled) {
    if (picked.length >= targetCount) break;
    if (!usedCats.has(ex.categoryId) || picked.length >= categories.length) {
      picked.push(ex);
      usedCats.add(ex.categoryId);
    }
  }
  // Top up if category-spreading left us short.
  if (picked.length < targetCount) {
    for (const ex of shuffled) {
      if (picked.length >= targetCount) break;
      if (!picked.includes(ex)) picked.push(ex);
    }
  }

  return {
    id: "generated",
    name: `${opts.level} ${WORKOUT_FOCUS_LABELS[opts.focus]}`,
    focus: opts.focus,
    level: opts.level,
    icon: "zap",
    description: `A custom ${opts.durationMin}-minute ${WORKOUT_FOCUS_LABELS[
      opts.focus
    ].toLowerCase()} workout generated just for you.`,
    exerciseSlugs: picked.map((e) => e.slug),
    generated: true,
  };
}
