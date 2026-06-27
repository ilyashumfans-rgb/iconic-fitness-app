import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

import { istDateNDaysAgo, istToday } from "@/lib/dates";

type FeatherName = keyof typeof Feather.glyphMap;

export type HabitKey =
  | "sleep"
  | "meditation"
  | "reading"
  | "stretching"
  | "water"
  | "walking";

export type Habit = {
  key: HabitKey;
  label: string;
  hint: string;
  icon: FeatherName;
};

export const HABITS: Habit[] = [
  { key: "sleep", label: "Sleep", hint: "7–8 hours", icon: "moon" },
  { key: "meditation", label: "Meditation", hint: "10 minutes", icon: "wind" },
  { key: "reading", label: "Reading", hint: "A few pages", icon: "book-open" },
  { key: "stretching", label: "Stretching", hint: "Loosen up", icon: "activity" },
  { key: "water", label: "Water", hint: "Stay hydrated", icon: "droplet" },
  { key: "walking", label: "Walking", hint: "Get your steps", icon: "navigation" },
];

const HABIT_KEYS = new Set<string>(HABITS.map((h) => h.key));

/** Completions keyed by IST calendar date (YYYY-MM-DD) → list of habit keys done. */
export type HabitData = {
  completions: Record<string, HabitKey[]>;
};

const STORAGE_KEY = "iconic.habits.v1";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const EMPTY: HabitData = { completions: {} };

function sanitize(raw: unknown): HabitData {
  if (!raw || typeof raw !== "object") return { completions: {} };
  const obj = raw as Partial<HabitData>;
  const src = obj.completions;
  const completions: Record<string, HabitKey[]> = {};
  if (src && typeof src === "object") {
    for (const [date, value] of Object.entries(src)) {
      if (!DATE_RE.test(date) || !Array.isArray(value)) continue;
      const keys = Array.from(
        new Set(value.filter((k): k is HabitKey => HABIT_KEYS.has(k as string))),
      );
      if (keys.length) completions[date] = keys;
    }
  }
  return { completions };
}

export async function loadHabitData(): Promise<HabitData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { completions: {} };
    return sanitize(JSON.parse(raw));
  } catch {
    return { completions: {} };
  }
}

async function persist(data: HabitData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Persisting failed; the in-memory copy still applies for this session.
  }
}

export function isDone(
  data: HabitData,
  key: HabitKey,
  date: string = istToday(),
): boolean {
  return (data.completions[date] ?? []).includes(key);
}

/** Toggle a habit's completion for a given day. */
export function toggleHabit(
  data: HabitData,
  key: HabitKey,
  date: string = istToday(),
): HabitData {
  const current = data.completions[date] ?? [];
  const has = current.includes(key);
  const nextDay = has
    ? current.filter((k) => k !== key)
    : [...current, key];

  const completions = { ...data.completions };
  if (nextDay.length) completions[date] = nextDay;
  else delete completions[date];

  const next: HabitData = { completions };
  void persist(next);
  return next;
}

/**
 * Consecutive-day streak for a habit, counting back from today. The streak stays
 * "alive" through the current day until missed: if today isn't done yet we start
 * counting from yesterday, so an unfinished today doesn't zero a real streak.
 */
export function habitStreak(data: HabitData, key: HabitKey): number {
  let streak = 0;
  const startOffset = isDone(data, key, istToday()) ? 0 : 1;
  for (let n = startOffset; n < 400; n++) {
    if (isDone(data, key, istDateNDaysAgo(n))) streak++;
    else break;
  }
  return streak;
}

/** Number of habits completed on a given day. */
export function dayCount(data: HabitData, date: string = istToday()): number {
  return (data.completions[date] ?? []).length;
}

/** Longest active streak across all habits (for a headline figure). */
export function bestStreak(data: HabitData): number {
  return HABITS.reduce((max, h) => Math.max(max, habitStreak(data, h.key)), 0);
}
