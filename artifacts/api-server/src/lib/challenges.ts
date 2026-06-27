// Challenge definitions live in code (the "code-default" pattern): there are no
// challenge rows in the DB. Only opt-in participants are persisted
// (challengeParticipantsTable). Each challenge runs on a rolling, evergreen
// window (the current Asia/Kolkata week or month) and its leaderboard is
// computed live from the tracking log tables. This keeps challenges always
// active and reaches production with no data-import step.

export type ChallengeMetric = "workouts" | "steps" | "water" | "active_days";
export type ChallengePeriod = "weekly" | "monthly";

export interface ChallengeDef {
  id: number;
  title: string;
  description: string;
  metric: ChallengeMetric;
  goal: number;
  unit: string;
  period: ChallengePeriod;
  icon: string; // Feather icon name used by the mobile app
}

export const DEFAULT_CHALLENGES: ChallengeDef[] = [
  {
    id: 1,
    title: "Weekly Workout Warrior",
    description: "Log 5 workouts before the week is out. Consistency beats intensity.",
    metric: "workouts",
    goal: 5,
    unit: "workouts",
    period: "weekly",
    icon: "zap",
  },
  {
    id: 2,
    title: "Step Master",
    description: "Rack up 70,000 steps this week. Every walk counts.",
    metric: "steps",
    goal: 70000,
    unit: "steps",
    period: "weekly",
    icon: "trending-up",
  },
  {
    id: 3,
    title: "Hydration Hero",
    description: "Drink 21 litres of water across the week. Stay topped up.",
    metric: "water",
    goal: 21000,
    unit: "ml",
    period: "weekly",
    icon: "droplet",
  },
  {
    id: 4,
    title: "Monthly Grind",
    description: "Complete 20 workouts this month. Earn your spot at the top.",
    metric: "workouts",
    goal: 20,
    unit: "workouts",
    period: "monthly",
    icon: "award",
  },
  {
    id: 5,
    title: "Consistency King",
    description: "Be active on 20 days this month. Show up, every day.",
    metric: "active_days",
    goal: 20,
    unit: "days",
    period: "monthly",
    icon: "calendar",
  },
];

export function getChallengeDef(id: number): ChallengeDef | undefined {
  return DEFAULT_CHALLENGES.find((c) => c.id === id);
}

// ── Asia/Kolkata calendar helpers ──
const IST = "Asia/Kolkata";

/** Current IST calendar date as YYYY-MM-DD. */
function istToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}

/** 1 = Monday … 7 = Sunday, for an IST calendar date. */
function istWeekday(dateStr: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    weekday: "short",
  }).format(new Date(`${dateStr}T12:00:00Z`));
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

/** Add (or subtract) whole days to a YYYY-MM-DD calendar date. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface ChallengeWindow {
  startDate: string;
  endDate: string;
}

/** The current rolling window for a period, in IST calendar dates. */
export function challengeWindow(
  period: ChallengePeriod,
  now: Date = new Date(),
): ChallengeWindow {
  const today = istToday(now);
  if (period === "weekly") {
    const startDate = addDays(today, -(istWeekday(today) - 1)); // Monday
    return { startDate, endDate: addDays(startDate, 6) }; // Sunday
  }
  // monthly
  const [y, m] = today.split("-").map(Number);
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const firstOfNext =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { startDate, endDate: addDays(firstOfNext, -1) };
}
