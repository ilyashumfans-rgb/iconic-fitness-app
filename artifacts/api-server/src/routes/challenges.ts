import { Router, type IRouter } from "express";
import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  waterLogsTable,
  workoutLogsTable,
  mealLogsTable,
  challengeParticipantsTable,
} from "@workspace/db";
import {
  ListChallengesResponse,
  GetChallengeResponse,
  JoinChallengeResponse,
  LeaveChallengeResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import {
  DEFAULT_CHALLENGES,
  getChallengeDef,
  challengeWindow,
  type ChallengeDef,
  type ChallengeMetric,
} from "../lib/challenges";

const router: IRouter = Router();

// Per-user aggregate for a metric over an IST date window.
async function userMetricValue(
  userId: number,
  metric: ChallengeMetric,
  start: string,
  end: string,
): Promise<number> {
  if (metric === "water") {
    const [r] = await db
      .select({ v: sql<number>`coalesce(sum(${waterLogsTable.amountMl}),0)::int` })
      .from(waterLogsTable)
      .where(
        and(
          eq(waterLogsTable.userId, userId),
          gte(waterLogsTable.loggedDate, start),
          lte(waterLogsTable.loggedDate, end),
        ),
      );
    return r?.v ?? 0;
  }
  if (metric === "active_days") {
    // "Active" = any tracking activity on a day: water, meals, or workouts.
    const [water, meals, workouts] = await Promise.all([
      db
        .selectDistinct({ d: waterLogsTable.loggedDate })
        .from(waterLogsTable)
        .where(
          and(
            eq(waterLogsTable.userId, userId),
            gte(waterLogsTable.loggedDate, start),
            lte(waterLogsTable.loggedDate, end),
          ),
        ),
      db
        .selectDistinct({ d: mealLogsTable.loggedDate })
        .from(mealLogsTable)
        .where(
          and(
            eq(mealLogsTable.userId, userId),
            gte(mealLogsTable.loggedDate, start),
            lte(mealLogsTable.loggedDate, end),
          ),
        ),
      db
        .selectDistinct({ d: workoutLogsTable.loggedDate })
        .from(workoutLogsTable)
        .where(
          and(
            eq(workoutLogsTable.userId, userId),
            gte(workoutLogsTable.loggedDate, start),
            lte(workoutLogsTable.loggedDate, end),
          ),
        ),
    ]);
    const days = new Set<string>();
    for (const row of [...water, ...meals, ...workouts]) days.add(row.d);
    return days.size;
  }
  const agg =
    metric === "workouts"
      ? sql<number>`count(*)::int`
      : sql<number>`coalesce(sum(${workoutLogsTable.steps}),0)::int`; // steps
  const [r] = await db
    .select({ v: agg })
    .from(workoutLogsTable)
    .where(
      and(
        eq(workoutLogsTable.userId, userId),
        gte(workoutLogsTable.loggedDate, start),
        lte(workoutLogsTable.loggedDate, end),
      ),
    );
  return r?.v ?? 0;
}

// Grouped aggregate for a set of participants (userId → value).
async function groupMetricValues(
  ids: number[],
  metric: ChallengeMetric,
  start: string,
  end: string,
): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();
  if (metric === "water") {
    const rows = await db
      .select({
        uid: waterLogsTable.userId,
        v: sql<number>`coalesce(sum(${waterLogsTable.amountMl}),0)::int`,
      })
      .from(waterLogsTable)
      .where(
        and(
          inArray(waterLogsTable.userId, ids),
          gte(waterLogsTable.loggedDate, start),
          lte(waterLogsTable.loggedDate, end),
        ),
      )
      .groupBy(waterLogsTable.userId);
    return new Map(rows.map((r) => [r.uid, r.v]));
  }
  if (metric === "active_days") {
    const days = new Map<number, Set<string>>();
    const collect = (rows: { uid: number; d: string }[]) => {
      for (const row of rows) {
        let set = days.get(row.uid);
        if (!set) {
          set = new Set();
          days.set(row.uid, set);
        }
        set.add(row.d);
      }
    };
    const [water, meals, workouts] = await Promise.all([
      db
        .selectDistinct({ uid: waterLogsTable.userId, d: waterLogsTable.loggedDate })
        .from(waterLogsTable)
        .where(
          and(
            inArray(waterLogsTable.userId, ids),
            gte(waterLogsTable.loggedDate, start),
            lte(waterLogsTable.loggedDate, end),
          ),
        ),
      db
        .selectDistinct({ uid: mealLogsTable.userId, d: mealLogsTable.loggedDate })
        .from(mealLogsTable)
        .where(
          and(
            inArray(mealLogsTable.userId, ids),
            gte(mealLogsTable.loggedDate, start),
            lte(mealLogsTable.loggedDate, end),
          ),
        ),
      db
        .selectDistinct({
          uid: workoutLogsTable.userId,
          d: workoutLogsTable.loggedDate,
        })
        .from(workoutLogsTable)
        .where(
          and(
            inArray(workoutLogsTable.userId, ids),
            gte(workoutLogsTable.loggedDate, start),
            lte(workoutLogsTable.loggedDate, end),
          ),
        ),
    ]);
    collect(water);
    collect(meals);
    collect(workouts);
    return new Map([...days].map(([uid, set]) => [uid, set.size]));
  }
  const agg =
    metric === "workouts"
      ? sql<number>`count(*)::int`
      : sql<number>`coalesce(sum(${workoutLogsTable.steps}),0)::int`; // steps
  const rows = await db
    .select({ uid: workoutLogsTable.userId, v: agg })
    .from(workoutLogsTable)
    .where(
      and(
        inArray(workoutLogsTable.userId, ids),
        gte(workoutLogsTable.loggedDate, start),
        lte(workoutLogsTable.loggedDate, end),
      ),
    )
    .groupBy(workoutLogsTable.userId);
  return new Map(rows.map((r) => [r.uid, r.v]));
}

// ── List: every challenge with the current user's progress + counts ──
router.get("/challenges", requireUser, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const [joinedRows, countRows] = await Promise.all([
    db
      .select({ challengeId: challengeParticipantsTable.challengeId })
      .from(challengeParticipantsTable)
      .where(eq(challengeParticipantsTable.userId, userId)),
    db
      .select({
        challengeId: challengeParticipantsTable.challengeId,
        count: sql<number>`count(*)::int`,
      })
      .from(challengeParticipantsTable)
      .groupBy(challengeParticipantsTable.challengeId),
  ]);
  const joinedSet = new Set(joinedRows.map((r) => r.challengeId));
  const countMap = new Map(countRows.map((r) => [r.challengeId, r.count]));

  const list = await Promise.all(
    DEFAULT_CHALLENGES.map(async (c) => {
      const { startDate, endDate } = challengeWindow(c.period);
      const myProgress = await userMetricValue(userId, c.metric, startDate, endDate);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        metric: c.metric,
        goal: c.goal,
        unit: c.unit,
        period: c.period,
        icon: c.icon,
        startDate,
        endDate,
        joined: joinedSet.has(c.id),
        participantCount: countMap.get(c.id) ?? 0,
        myProgress,
      };
    }),
  );

  res.json(ListChallengesResponse.parse(list));
});

// Build the full detail payload (challenge + leaderboard) for one challenge.
async function buildDetail(def: ChallengeDef, userId: number) {
  const { startDate, endDate } = challengeWindow(def.period);

  const participants = await db
    .select({ userId: challengeParticipantsTable.userId })
    .from(challengeParticipantsTable)
    .where(eq(challengeParticipantsTable.challengeId, def.id));
  const participantIds = participants.map((p) => p.userId);
  const joined = participantIds.includes(userId);

  const [values, users] = await Promise.all([
    groupMetricValues(participantIds, def.metric, startDate, endDate),
    participantIds.length
      ? db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            avatarUrl: usersTable.avatarUrl,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, participantIds))
      : Promise.resolve([] as { id: number; name: string; avatarUrl: string }[]),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = participantIds
    .map((pid) => {
      const u = userMap.get(pid);
      return {
        pid, // internal sort tiebreak only; not exposed in the payload
        name: u?.name ?? "Member",
        avatarUrl: u?.avatarUrl ?? "",
        progress: values.get(pid) ?? 0,
        isMe: pid === userId,
      };
    })
    .sort((a, b) => b.progress - a.progress || a.pid - b.pid)
    .map(({ pid: _pid, ...e }, i) => ({ rank: i + 1, ...e }));

  const myProgress = joined
    ? values.get(userId) ?? 0
    : await userMetricValue(userId, def.metric, startDate, endDate);

  return {
    id: def.id,
    title: def.title,
    description: def.description,
    metric: def.metric,
    goal: def.goal,
    unit: def.unit,
    period: def.period,
    icon: def.icon,
    startDate,
    endDate,
    joined,
    participantCount: participantIds.length,
    myProgress,
    leaderboard,
  };
}

function parseChallengeId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

// ── Detail with leaderboard ──
router.get("/challenges/:challengeId", requireUser, async (req, res): Promise<void> => {
  const id = parseChallengeId(String(req.params.challengeId));
  const def = id === null ? undefined : getChallengeDef(id);
  if (!def) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }
  res.json(GetChallengeResponse.parse(await buildDetail(def, req.userId!)));
});

// ── Join ──
router.post(
  "/challenges/:challengeId/join",
  requireUser,
  async (req, res): Promise<void> => {
    const id = parseChallengeId(String(req.params.challengeId));
    const def = id === null ? undefined : getChallengeDef(id);
    if (!def) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }
    await db
      .insert(challengeParticipantsTable)
      .values({ challengeId: def.id, userId: req.userId! })
      .onConflictDoNothing();
    res.json(JoinChallengeResponse.parse(await buildDetail(def, req.userId!)));
  },
);

// ── Leave ──
router.post(
  "/challenges/:challengeId/leave",
  requireUser,
  async (req, res): Promise<void> => {
    const id = parseChallengeId(String(req.params.challengeId));
    const def = id === null ? undefined : getChallengeDef(id);
    if (!def) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }
    await db
      .delete(challengeParticipantsTable)
      .where(
        and(
          eq(challengeParticipantsTable.challengeId, def.id),
          eq(challengeParticipantsTable.userId, req.userId!),
        ),
      );
    res.json(LeaveChallengeResponse.parse(await buildDetail(def, req.userId!)));
  },
);

export default router;
