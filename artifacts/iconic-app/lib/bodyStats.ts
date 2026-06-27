import AsyncStorage from "@react-native-async-storage/async-storage";

import { istToday } from "@/lib/dates";

/** A single weigh-in. `date` is an IST calendar date (YYYY-MM-DD). */
export type WeightEntry = {
  date: string;
  kg: number;
};

/** Body part measurements, in centimetres. All optional until logged. */
export type Measurements = {
  chest?: number;
  waist?: number;
  hips?: number;
  neck?: number;
  arms?: number;
  thigh?: number;
  calf?: number;
};

/** Standing goals the tracker reasons against. */
export type BodyProfile = {
  heightCm?: number;
  startKg?: number;
  goalKg?: number;
};

export type BodyData = {
  profile: BodyProfile;
  weightLog: WeightEntry[];
  measurements: Measurements;
};

export const MEASUREMENT_FIELDS: {
  key: keyof Measurements;
  label: string;
  icon: string;
}[] = [
  { key: "chest", label: "Chest", icon: "shield" },
  { key: "waist", label: "Waist", icon: "minus" },
  { key: "hips", label: "Hips", icon: "circle" },
  { key: "neck", label: "Neck", icon: "chevron-up" },
  { key: "arms", label: "Arms", icon: "zap" },
  { key: "thigh", label: "Thigh", icon: "trending-up" },
  { key: "calf", label: "Calf", icon: "anchor" },
];

const STORAGE_KEY = "iconic.bodyStats.v1";

const EMPTY: BodyData = {
  profile: {},
  weightLog: [],
  measurements: {},
};

/** A finite, strictly-positive number, or undefined for anything else. */
function posNum(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeProfile(raw: unknown): BodyProfile {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: BodyProfile = {};
  const heightCm = posNum(obj.heightCm);
  const startKg = posNum(obj.startKg);
  const goalKg = posNum(obj.goalKg);
  if (heightCm != null) out.heightCm = heightCm;
  if (startKg != null) out.startKg = startKg;
  if (goalKg != null) out.goalKg = goalKg;
  return out;
}

function sanitizeMeasurements(raw: unknown): Measurements {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: Measurements = {};
  for (const f of MEASUREMENT_FIELDS) {
    const v = posNum(obj[f.key]);
    if (v != null) out[f.key] = v;
  }
  return out;
}

function sanitize(raw: unknown): BodyData {
  if (!raw || typeof raw !== "object") return { ...EMPTY };
  const obj = raw as Partial<BodyData>;
  const weightLog = Array.isArray(obj.weightLog)
    ? obj.weightLog
        .filter(
          (e): e is WeightEntry =>
            !!e &&
            typeof e.date === "string" &&
            DATE_RE.test(e.date) &&
            typeof e.kg === "number" &&
            Number.isFinite(e.kg) &&
            e.kg > 0,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  return {
    profile: sanitizeProfile(obj.profile),
    weightLog,
    measurements: sanitizeMeasurements(obj.measurements),
  };
}

export async function loadBodyData(): Promise<BodyData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...EMPTY };
  }
}

async function persist(data: BodyData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Persisting failed; the in-memory copy still applies for this session.
  }
}

/** Add or replace today's weigh-in (one entry per calendar day). */
export function upsertWeight(
  data: BodyData,
  kg: number,
  date: string = istToday(),
): BodyData {
  // Defensive: ignore junk values that slipped past UI parsing.
  if (!Number.isFinite(kg) || kg <= 0) return data;
  const rest = data.weightLog.filter((e) => e.date !== date);
  const weightLog = [...rest, { date, kg }].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const next: BodyData = {
    ...data,
    weightLog,
    // Seed a starting weight the first time the user logs anything.
    profile:
      data.profile.startKg == null
        ? { ...data.profile, startKg: kg }
        : data.profile,
  };
  void persist(next);
  return next;
}

export function removeWeight(data: BodyData, date: string): BodyData {
  const next: BodyData = {
    ...data,
    weightLog: data.weightLog.filter((e) => e.date !== date),
  };
  void persist(next);
  return next;
}

export function saveProfile(data: BodyData, profile: BodyProfile): BodyData {
  // Merge as-is (callers pass positive numbers or undefined to clear a field).
  // Corrupt values are still caught at load-time sanitize + UI render guards.
  const next: BodyData = { ...data, profile: { ...data.profile, ...profile } };
  void persist(next);
  return next;
}

export function saveMeasurements(
  data: BodyData,
  measurements: Measurements,
): BodyData {
  const next: BodyData = {
    ...data,
    measurements: { ...data.measurements, ...measurements },
  };
  void persist(next);
  return next;
}

// ---- Derived stats ---------------------------------------------------------

export function latestWeight(data: BodyData): number | null {
  const log = data.weightLog;
  return log.length ? log[log.length - 1].kg : null;
}

export function computeBmi(kg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return kg / (m * m);
}

export function bmiCategory(bmi: number): {
  label: string;
  tone: "warning" | "success" | "destructive";
} {
  if (bmi < 18.5) return { label: "Underweight", tone: "warning" };
  if (bmi < 25) return { label: "Healthy", tone: "success" };
  if (bmi < 30) return { label: "Overweight", tone: "warning" };
  return { label: "Above range", tone: "destructive" };
}

/** Progress from start → goal, clamped 0..1. Returns null if not computable. */
export function goalProgress(data: BodyData): number | null {
  const { startKg, goalKg } = data.profile;
  const current = latestWeight(data);
  if (startKg == null || goalKg == null || current == null) return null;
  const span = startKg - goalKg;
  if (span === 0) return 1;
  const done = (startKg - current) / span;
  if (!Number.isFinite(done)) return null;
  return Math.max(0, Math.min(1, done));
}
