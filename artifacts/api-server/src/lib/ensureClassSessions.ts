import { eq, gte } from "drizzle-orm";
import { db, classSessionsTable, gymsTable, trainersTable } from "@workspace/db";
import { resolveGymSchedule } from "./resolveGymSchedule";

// Lazily materialise upcoming group-class sessions from each verified gym's
// weekly timetable so "Book your next session" always has real, bookable rows
// even though nothing runs in the background. Called from the class listing
// endpoints, throttled in-process.

const HORIZON_DAYS = 7;
const THROTTLE_MS = 10 * 60 * 1000;
const IST_OFFSET_MIN = 5 * 60 + 30;

let lastRunAt = 0;
let running: Promise<void> | null = null;

/** "07:00" on an IST calendar day → UTC Date. */
function istDateTimeToUtc(istYmd: string, hhmm: string): Date {
  const [y, m, d] = istYmd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  // IST wall-clock → UTC by subtracting the offset.
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MIN * 60 * 1000);
}

/** Current IST calendar day plus `offset` days, as YYYY-MM-DD + ISO weekday. */
function istDayPlus(offset: number): { ymd: string; dayOfWeek: number } {
  const ist = new Date(Date.now() + IST_OFFSET_MIN * 60 * 1000);
  ist.setUTCDate(ist.getUTCDate() + offset);
  const ymd = ist.toISOString().slice(0, 10);
  const js = ist.getUTCDay(); // 0 = Sun
  return { ymd, dayOfWeek: js === 0 ? 7 : js };
}

function durationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins : 60;
}

/** "iconic Zumba" → "Zumba" (category shown as a filter chip in the app). */
function categoryFromClassName(name: string): string {
  return name.replace(/^iconic\s+/i, "").trim() || "Group class";
}

async function materialise(): Promise<void> {
  const [gyms, trainers, upcoming] = await Promise.all([
    db.select().from(gymsTable).where(eq(gymsTable.isVerified, true)),
    db.select().from(trainersTable),
    db
      .select({
        gymId: classSessionsTable.gymId,
        startsAt: classSessionsTable.startsAt,
      })
      .from(classSessionsTable)
      .where(gte(classSessionsTable.startsAt, new Date())),
  ]);
  if (gyms.length === 0) return;

  const existing = new Set(
    upcoming.map((s) => `${s.gymId}|${s.startsAt.getTime()}`),
  );
  const fallbackTrainer = trainers[0];
  if (!fallbackTrainer) return; // trainerId is NOT NULL — need at least one

  const inserts: (typeof classSessionsTable.$inferInsert)[] = [];
  for (const gym of gyms) {
    const schedule = await resolveGymSchedule(gym.id);
    const gymTrainer =
      trainers.find((t) => t.gymId === gym.id) ?? fallbackTrainer;
    for (let offset = 0; offset <= HORIZON_DAYS; offset++) {
      const { ymd, dayOfWeek } = istDayPlus(offset);
      for (const entry of schedule) {
        if (entry.dayOfWeek !== dayOfWeek) continue;
        const startsAt = istDateTimeToUtc(ymd, entry.startTime);
        if (startsAt.getTime() <= Date.now()) continue;
        const key = `${gym.id}|${startsAt.getTime()}`;
        if (existing.has(key)) continue;
        existing.add(key);
        inserts.push({
          title: entry.className,
          category: categoryFromClassName(entry.className),
          gymId: gym.id,
          trainerId: gymTrainer.id,
          startsAt,
          durationMin: durationMinutes(entry.startTime, entry.endTime),
          capacity: 25,
          intensity: "medium",
          coverImage: "",
          description: `${entry.className} group class at ${gym.name}. All levels welcome — arrive 10 minutes early.`,
          equipmentNeeded: [],
          calorieEstimate: 300,
          trendingScore: 0,
        });
      }
    }
  }
  if (inserts.length > 0) {
    await db.insert(classSessionsTable).values(inserts);
  }
}

/**
 * Ensure the next week of group-class sessions exists. Throttled; concurrent
 * callers share one run. Never throws — listing endpoints must not fail
 * because generation hiccupped.
 */
export async function ensureUpcomingClassSessions(): Promise<void> {
  if (Date.now() - lastRunAt < THROTTLE_MS) return;
  if (!running) {
    running = materialise()
      .catch(() => {})
      .finally(() => {
        lastRunAt = Date.now();
        running = null;
      });
  }
  await running;
}
