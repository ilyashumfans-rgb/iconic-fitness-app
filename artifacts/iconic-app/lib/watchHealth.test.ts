import { emptyWatchStore, mergeHealthReadings, sanitizeWatchRecords, sanitizeWatchStore, watchStorageKey } from "./watchHealth";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
/** Synthetic boundary cases only; no device health reads or API writes. */
export function runWatchHealthRegressionTests() {
  const records = sanitizeWatchRecords([
    { date: "2026-02-01", steps: 123, sleepHours: null, weightKg: 65, heartRateBpm: 70 },
    { date: "2026-02-02", steps: 0, sleepHours: 0, distanceKm: Infinity },
    { date: "2026-02-30", steps: 8 },
  ]);
  assert(records.length === 2, "Reject nonexistent calendar dates");
  assert(records[1].steps === 0 && records[1].distanceKm === null, "Preserve zero; reject nonfinite");
  assert(records[0].sleepHours === null && records[0].activeCalories === null, "Missing fields remain null");
  const merged = mergeHealthReadings([{ date: "2026-02-01", metric: "steps", value: 0 }], records, "apple-health");
  const steps = merged.filter(row => row.metric === "steps");
  assert(steps.length === 2 && steps[0].value === 0 && steps[0].source === "manual", "Manual zero wins without duplicate totals");
  assert(!merged.some(row => row.metric === "restingHr" || row.metric === "hrv"), "Average HR never becomes resting HR");
  assert(!merged.some(row => row.date === "2026-02-01" && row.metric === "sleep"), "Null is not fabricated as zero");
  assert(sanitizeWatchStore({ connected: true, records }).connected === false, "Invalid consent metadata rejected");
  assert(sanitizeWatchStore({ ...emptyWatchStore(), records }).records.length === 0, "Disconnected data not restored");
  assert(watchStorageKey("a:b") !== watchStorageKey("a"), "Account storage isolated");
  assert(mergeHealthReadings([], records, null).length === 0, "No provenance means no imported readings");
}
runWatchHealthRegressionTests();