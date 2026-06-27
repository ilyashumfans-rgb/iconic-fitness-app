// Display helpers for challenge metrics. Server stores raw values (ml, steps,
// counts); these format them for the UI without changing the underlying number.

export function challengeValue(value: number, unit: string): string {
  if (unit === "ml") return (value / 1000).toFixed(1);
  if (unit === "steps") return value.toLocaleString();
  return `${value}`;
}

export function challengeUnitLabel(unit: string): string {
  return unit === "ml" ? "L" : unit;
}

export function challengePeriodLabel(period: string): string {
  return period === "weekly" ? "This week" : "This month";
}

export function challengeProgressPct(progress: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, progress / goal);
}
