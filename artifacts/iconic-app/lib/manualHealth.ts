import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { istToday } from "@/lib/dates";

export const healthMetrics: Record<string, { label: string; unit: string; max: number; integer?: boolean }> = {
  steps: { label: "Steps", unit: "steps", max: 200000, integer: true },
  weight: { label: "Weight", unit: "kg", max: 500 },
  water: { label: "Water", unit: "ml", max: 20000 },
  sleep: { label: "Sleep", unit: "hours", max: 24 },
  hrv: { label: "HRV", unit: "ms", max: 500 },
  restingHr: { label: "Resting HR", unit: "bpm", max: 250, integer: true },
  skinTemperature: { label: "Skin temperature", unit: "°C", max: 50 },
  bloodOxygen: { label: "Blood oxygen", unit: "%", max: 100 },
};
export function useHealthDay() {
  const [day, setDay] = useState(istToday);
  useEffect(() => {
    const refresh = () => setDay(istToday());
    const timer = setInterval(refresh, 30000);
    const listener = AppState.addEventListener("change", refresh);
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return day;
}
// Retain the original unpadded key format to preserve existing entries.
export function healthStorageKey(owner: string, day: string, metric: string) {
  const [year, month, date] = day.split("-").map(Number);
  return `today-manual:${owner}:${year}-${month}-${date}:${metric}`;
}
export type HealthReading = { date: string; metric: string; value: number };
export function parseHealthReading(key: string, raw: string | null, owner: string): HealthReading | null {
  const prefix = `today-manual:${owner}:`;
  if (!key.startsWith(prefix) || raw === null || !raw.trim()) return null;
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2}):(\w+)$/.exec(key.slice(prefix.length));
  if (!match) return null;
  const [, y, m, d, metric] = match;
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const rule = healthMetrics[metric];
  const value = Number(raw);
  if (!rule || !Number.isFinite(value) || value < 0 || value > rule.max ||
    (rule.integer && !Number.isInteger(value))) return null;
  return { date, metric, value };
}
export async function readHealthHistory(owner: string) {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(`today-manual:${owner}:`));
  const values = await AsyncStorage.multiGet(keys);
  return values.map(([key, value]) => parseHealthReading(key, value, owner))
    .filter((row): row is HealthReading => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function summarizeHealth(rows: HealthReading[]) {
  if (!rows.length) return null;
  const values = rows.map(r => r.value);
  const total = values.reduce((a, b) => a + b, 0);
  return { count: rows.length, average: total / rows.length, total,
    min: Math.min(...values), max: Math.max(...values),
    change: rows.length > 1 ? values[values.length - 1] - values[0] : null };
}