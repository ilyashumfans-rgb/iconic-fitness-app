import type { HealthReading } from "./manualHealth";

export type HealthProvider = "apple-health" | "health-connect";
export type WatchRecord = { date: string; steps: number | null; activeCalories: number | null; distanceKm: number | null; sleepHours: number | null; heartRateBpm: number | null; weightKg: number | null };
export type WatchStore = { connected: boolean; requestedAt: string | null; lastReadAt: string | null; provider: HealthProvider | null; records: WatchRecord[] };
export const emptyWatchStore = (): WatchStore => ({ connected: false, requestedAt: null, lastReadAt: null, provider: null, records: [] });
export const watchStorageKey = (owner: string) => `watch-health:v1:${encodeURIComponent(owner)}`;
const ranges = { steps: [0, 200000], activeCalories: [0, 20000], distanceKm: [0, 1000], sleepHours: [0, 24], heartRateBpm: [20, 250], weightKg: [1, 500] } as const;
export function validHealthDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function sanitizeWatchRecords(raw: unknown): WatchRecord[] {
  if (!Array.isArray(raw)) return [];
  const rows = new Map<string, WatchRecord>();
  for (const item of raw) {
    if (!item || !validHealthDate(item.date)) continue;
    const row = { date: item.date } as WatchRecord;
    for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
      const n = item[key];
      row[key] = typeof n === "number" && Number.isFinite(n) && n >= ranges[key][0] && n <= ranges[key][1] && (key !== "steps" || Number.isInteger(n)) ? n : null;
    }
    rows.set(row.date, row);
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-31);
}
export function sanitizeWatchStore(raw: unknown): WatchStore {
  if (!raw || typeof raw !== "object") return emptyWatchStore();
  const value = raw as Partial<WatchStore>;
  const timestamp = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
  const provider = value.provider === "apple-health" || value.provider === "health-connect" ? value.provider : null;
  const requestedAt = timestamp(value.requestedAt);
  if (value.connected !== true || !provider || !requestedAt) return emptyWatchStore();
  return { connected: true, provider, requestedAt, lastReadAt: timestamp(value.lastReadAt), records: sanitizeWatchRecords(value.records) };
}
export const watchMetricFields: Record<string, keyof Omit<WatchRecord, "date">> = {
  steps: "steps", weight: "weightKg", sleep: "sleepHours",
  activeCalories: "activeCalories", distanceKm: "distanceKm", heartRateBpm: "heartRateBpm",
};
export type SourcedReading = HealthReading & { source: "manual" | HealthProvider };
/** Provider average HR is deliberately NOT substituted for resting HR or HRV. */
export function mergeHealthReadings(manual: HealthReading[], watch: WatchRecord[], provider: HealthProvider | null): SourcedReading[] {
  const rows = new Map<string, SourcedReading>();
  if (provider) for (const day of watch) for (const [metric, field] of Object.entries(watchMetricFields)) {
    const value = day[field];
    if (value !== null && Number.isFinite(value)) rows.set(`${day.date}:${metric}`, { date: day.date, metric, value, source: provider });
  }
  for (const row of manual) rows.set(`${row.date}:${row.metric}`, { ...row, source: "manual" });
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}
export function healthSourceLabel(source: SourcedReading["source"]) {
  return source === "manual" ? "Manual" : source === "apple-health" ? "Apple Health" : "Health Connect";
}