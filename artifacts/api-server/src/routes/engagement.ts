import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import {
  adminsTable,
  db,
  leadsTable,
  memberBmiRecordsTable,
  memberDietPlansTable,
  memberEngagementProgramsTable,
  notificationsTable,
  ptProgramsTable,
  ptTrialFeedbackTable,
  trainerBookingsTable,
  usersTable,
} from "@workspace/db";
import {
  GetMyEngagementResponse,
  GetMyEngagementPlanResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import {
  requireStaffPermission,
  loadStaffOrUnauthorized,
} from "../lib/staffAuth";
import { requireAdmin } from "../lib/adminAuth";
import {
  ENGAGEMENT_TOTAL_DAYS,
  engagementDayNumber,
  engagementPlan,
  isEngagementLevel,
  istToday,
  type EngagementLevel,
} from "../lib/engagementPlan";
import { normalizeMobile } from "../lib/yoactiv";

/**
 * General Member Engagement (Member Success Journey steps 9–12, 16):
 * a 45-day workout program that auto-starts once a member finishes the
 * kick-starter trial without buying PT, with lazy day-7/15/30/45 follow-ups,
 * day-15/30/45 PT re-conversion reminders, dietician assignment and a 0–100
 * engagement score. Staff (pt.manage) get an overview + level assignment.
 */
const router: IRouter = Router();

const FOLLOWUP_DAYS = [7, 15, 30, 45];
const PT_REMINDER_DAYS = [15, 30, 45];

type ScoreInput = {
  hasProgram: boolean;
  dayNumber: number;
  trialDone: number; // 0..2 kick-starter sessions completed
  feedbackCount: number; // 0..2
  hasBmi: boolean;
  hasDietPlan: boolean;
  hasPaidPt: boolean;
};

/** Deterministic 0–100 engagement score (step 16). */
export function engagementScore(s: ScoreInput): number {
  let score = 5; // has an account & showed up
  if (s.hasProgram) score += 15;
  score += Math.min(20, Math.floor((s.dayNumber / ENGAGEMENT_TOTAL_DAYS) * 20));
  score += Math.min(2, s.trialDone) * 10;
  score += Math.min(2, s.feedbackCount) * 5;
  if (s.hasBmi) score += 10;
  if (s.hasDietPlan) score += 10;
  if (s.hasPaidPt) score += 10;
  return Math.min(100, score);
}

export function scoreBand(score: number): "green" | "yellow" | "red" {
  return score >= 80 ? "green" : score >= 60 ? "yellow" : "red";
}

type MemberFacts = {
  mobile: string;
  program: typeof memberEngagementProgramsTable.$inferSelect | null;
  trialDone: number;
  trialCompleted: boolean;
  feedbackCount: number;
  hasBmi: boolean;
  hasDietPlan: boolean;
  hasPaidPt: boolean;
  latestPtProgram: typeof ptProgramsTable.$inferSelect | null;
};

async function loadMemberFacts(userId: number): Promise<MemberFacts> {
  const [user] = await db
    .select({ mobile: usersTable.mobile })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const mobile = normalizeMobile(user?.mobile ?? "") ?? "";

  const phoneMatch = mobile
    ? sql`right(regexp_replace(${ptProgramsTable.memberPhone}, '\\D', '', 'g'), 10) = ${mobile}`
    : sql`false`;
  const [programRow] = await db
    .select()
    .from(memberEngagementProgramsTable)
    .where(eq(memberEngagementProgramsTable.userId, userId));
  const ptPrograms = await db
    .select()
    .from(ptProgramsTable)
    .where(sql`${ptProgramsTable.userId} = ${userId} OR ${phoneMatch}`)
    .orderBy(desc(ptProgramsTable.acceptedAt))
    .limit(5);
  const latest = ptPrograms[0] ?? null;
  // Trial progress counts across the member's whole PT-program history —
  // a newer accepted-but-unstarted program must not hide an older completed
  // trial (auto-start eligibility depends on this).
  const trialDone = ptPrograms.reduce(
    (best, p) =>
      Math.max(
        best,
        [p.session1DoneAt, p.session2DoneAt].filter(Boolean).length,
      ),
    0,
  );
  const trialCompleted =
    trialDone >= 2 || ptPrograms.some((p) => p.status === "completed");
  const [feedback, bmi, diet, paid] = await Promise.all([
    db
      .select({ id: ptTrialFeedbackTable.id })
      .from(ptTrialFeedbackTable)
      .where(eq(ptTrialFeedbackTable.userId, userId)),
    db
      .select({ id: memberBmiRecordsTable.id })
      .from(memberBmiRecordsTable)
      .where(eq(memberBmiRecordsTable.userId, userId))
      .limit(1),
    latest
      ? db
          .select({ id: memberDietPlansTable.id })
          .from(memberDietPlansTable)
          .where(eq(memberDietPlansTable.programId, latest.id))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ id: trainerBookingsTable.id })
      .from(trainerBookingsTable)
      .where(
        and(
          eq(trainerBookingsTable.userId, userId),
          eq(trainerBookingsTable.status, "paid"),
        ),
      )
      .limit(1),
  ]);
  return {
    mobile,
    program: programRow ?? null,
    trialDone,
    trialCompleted,
    feedbackCount: feedback.length,
    hasBmi: bmi.length > 0,
    hasDietPlan: diet.length > 0,
    hasPaidPt: paid.length > 0,
    latestPtProgram: latest,
  };
}

/**
 * Lazy milestone notifications: fire the highest due threshold not yet sent
 * (catches up late, never fires early) via a conditional UPDATE so a racing
 * duplicate request can't double-notify.
 */
async function fireLazyMilestones(
  program: typeof memberEngagementProgramsTable.$inferSelect,
  dayNumber: number,
  hasPaidPt: boolean,
): Promise<void> {
  const dueFollowup = [...FOLLOWUP_DAYS].reverse().find((d) => d <= dayNumber);
  if (dueFollowup && dueFollowup > program.lastFollowupDay) {
    const [won] = await db
      .update(memberEngagementProgramsTable)
      .set({ lastFollowupDay: dueFollowup })
      .where(
        and(
          eq(memberEngagementProgramsTable.id, program.id),
          lt(memberEngagementProgramsTable.lastFollowupDay, dueFollowup),
        ),
      )
      .returning({ id: memberEngagementProgramsTable.id });
    if (won) {
      await db.insert(notificationsTable).values({
        recipientType: "user",
        recipientId: program.userId,
        title: `Day ${dueFollowup} check-in 🏁`,
        body:
          dueFollowup >= ENGAGEMENT_TOTAL_DAYS
            ? "You've reached the end of your 45-day plan — amazing work! Visit the gym so we can review your progress and plan what's next."
            : `You're ${dueFollowup} days into your 45-day plan. How's it going? Tell your trainer about any issues — and keep the streak alive!`,
        batchId: randomUUID(),
      });
    }
  }
  if (!hasPaidPt) {
    const duePt = [...PT_REMINDER_DAYS].reverse().find((d) => d <= dayNumber);
    if (duePt && duePt > program.lastPtReminderDay) {
      const [won] = await db
        .update(memberEngagementProgramsTable)
        .set({ lastPtReminderDay: duePt })
        .where(
          and(
            eq(memberEngagementProgramsTable.id, program.id),
            lt(memberEngagementProgramsTable.lastPtReminderDay, duePt),
          ),
        )
        .returning({ id: memberEngagementProgramsTable.id });
      if (won) {
        await db.insert(notificationsTable).values({
          recipientType: "user",
          recipientId: program.userId,
          title: "Ready to level up? 💪",
          body: `Day ${duePt} of your plan — members who train with a personal trainer see results 2–3x faster. Check the PT packages in the app or ask at the front desk.`,
          batchId: randomUUID(),
        });
      }
    }
  }
}

/** Auto-start (step 8 "if not purchased"): trial finished + no paid PT. */
async function maybeAutoStart(
  userId: number,
  facts: MemberFacts,
): Promise<typeof memberEngagementProgramsTable.$inferSelect | null> {
  if (facts.program) return facts.program;
  if (!facts.trialCompleted || facts.hasPaidPt) return null;
  const src = facts.latestPtProgram;
  try {
    const [row] = await db
      .insert(memberEngagementProgramsTable)
      .values({
        userId,
        memberPhone: facts.mobile,
        level: "beginner",
        startDate: istToday(),
        gymId: src?.gymId ?? null,
        gymName: src?.gymName ?? "",
      })
      .onConflictDoNothing()
      .returning();
    if (row) {
      await db.insert(notificationsTable).values({
        recipientType: "user",
        recipientId: userId,
        title: "Your 45-day plan is ready! 🎯",
        body: "We've set you up with a 45-day workout plan and assigned you to our in-house dietician. Open the app to see today's workout.",
        batchId: randomUUID(),
      });
      return row;
    }
  } catch {
    // Best-effort — the member can still be enrolled by staff.
  }
  const [existing] = await db
    .select()
    .from(memberEngagementProgramsTable)
    .where(eq(memberEngagementProgramsTable.userId, userId));
  return existing ?? null;
}

function dayCardJson(level: EngagementLevel, day: number) {
  const card = engagementPlan(level)[day - 1]!;
  return card;
}

// ─── Member: my engagement program + score ──────────────────────────────────

router.get(
  "/engagement/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const facts = await loadMemberFacts(userId);
    const program = await maybeAutoStart(userId, facts);
    const dayNumber = program
      ? engagementDayNumber(program.startDate, istToday())
      : 0;
    if (program && program.status === "active") {
      // Fire-and-forget: milestones must never delay or fail the read.
      void fireLazyMilestones(program, dayNumber, facts.hasPaidPt).catch(
        () => {},
      );
    }
    const score = engagementScore({
      hasProgram: !!program,
      dayNumber,
      trialDone: facts.trialDone,
      feedbackCount: facts.feedbackCount,
      hasBmi: facts.hasBmi,
      hasDietPlan: facts.hasDietPlan,
      hasPaidPt: facts.hasPaidPt,
    });
    res.json(
      GetMyEngagementResponse.parse({
        active: !!program && program.status === "active",
        level: (program?.level ?? "beginner") as EngagementLevel,
        dayNumber,
        totalDays: ENGAGEMENT_TOTAL_DAYS,
        startDate: program?.startDate ?? "",
        gymName: program?.gymName ?? "",
        dieticianName: program?.dieticianName ?? "In-house dietician",
        score,
        scoreBand: scoreBand(score),
        showPtOffer: !facts.hasPaidPt,
        today: program
          ? dayCardJson(program.level as EngagementLevel, dayNumber)
          : null,
      }),
    );
  },
);

// Full 45-day plan for the caller's level (beginner when not enrolled yet).
router.get(
  "/engagement/plan",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const [program] = await db
      .select()
      .from(memberEngagementProgramsTable)
      .where(eq(memberEngagementProgramsTable.userId, req.userId!));
    const level = isEngagementLevel(program?.level)
      ? program!.level
      : "beginner";
    res.json(
      GetMyEngagementPlanResponse.parse({
        level,
        days: engagementPlan(level as EngagementLevel),
      }),
    );
  },
);

// ─── Staff: engagement overview + level assignment ──────────────────────────

async function buildOverviewRows() {
    const programs = await db
      .select()
      .from(memberEngagementProgramsTable)
      .orderBy(desc(memberEngagementProgramsTable.createdAt))
      .limit(500);
    const userIds = programs.map((p) => p.userId);
    const users = userIds.length
      ? await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            mobile: usersTable.mobile,
          })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const today = istToday();
    // Batched facts — one query per fact, not one set per member.
    const [ptRows, feedbackRows, bmiRows, paidRows] = userIds.length
      ? await Promise.all([
          db
            .select({
              userId: ptProgramsTable.userId,
              status: ptProgramsTable.status,
              s1: ptProgramsTable.session1DoneAt,
              s2: ptProgramsTable.session2DoneAt,
              id: ptProgramsTable.id,
            })
            .from(ptProgramsTable)
            .where(inArray(ptProgramsTable.userId, userIds)),
          db
            .select({ userId: ptTrialFeedbackTable.userId })
            .from(ptTrialFeedbackTable)
            .where(inArray(ptTrialFeedbackTable.userId, userIds)),
          db
            .selectDistinct({ userId: memberBmiRecordsTable.userId })
            .from(memberBmiRecordsTable)
            .where(inArray(memberBmiRecordsTable.userId, userIds)),
          db
            .selectDistinct({ userId: trainerBookingsTable.userId })
            .from(trainerBookingsTable)
            .where(
              and(
                inArray(trainerBookingsTable.userId, userIds),
                eq(trainerBookingsTable.status, "paid"),
              ),
            ),
        ])
      : [[], [], [], []];
    const ptProgramIds = ptRows.map((r) => r.id);
    const dietRows = ptProgramIds.length
      ? await db
          .selectDistinct({ programId: memberDietPlansTable.programId })
          .from(memberDietPlansTable)
          .where(inArray(memberDietPlansTable.programId, ptProgramIds))
      : [];
    const dietProgramIds = new Set(dietRows.map((r) => r.programId));
    const trialDoneByUser = new Map<number, number>();
    const dietUsers = new Set<number>();
    for (const r of ptRows) {
      if (r.userId === null) continue;
      const done =
        r.status === "completed" ? 2 : [r.s1, r.s2].filter(Boolean).length;
      trialDoneByUser.set(
        r.userId,
        Math.max(trialDoneByUser.get(r.userId) ?? 0, done),
      );
      if (dietProgramIds.has(r.id)) dietUsers.add(r.userId);
    }
    const feedbackByUser = new Map<number, number>();
    for (const r of feedbackRows) {
      feedbackByUser.set(r.userId, (feedbackByUser.get(r.userId) ?? 0) + 1);
    }
    const bmiUsers = new Set(bmiRows.map((r) => r.userId));
    const paidUsers = new Set(paidRows.map((r) => r.userId));

    const rows = programs.map((p) => {
      const dayNumber = engagementDayNumber(p.startDate, today);
      const hasPaidPt = paidUsers.has(p.userId);
      const score = engagementScore({
        hasProgram: true,
        dayNumber,
        trialDone: trialDoneByUser.get(p.userId) ?? 0,
        feedbackCount: feedbackByUser.get(p.userId) ?? 0,
        hasBmi: bmiUsers.has(p.userId),
        hasDietPlan: dietUsers.has(p.userId),
        hasPaidPt,
      });
      return {
        id: p.id,
        userId: p.userId,
        memberName: userById.get(p.userId)?.name ?? "Member",
        memberPhone: userById.get(p.userId)?.mobile ?? p.memberPhone,
        level: p.level,
        dayNumber,
        totalDays: ENGAGEMENT_TOTAL_DAYS,
        gymName: p.gymName,
        status: p.status,
        score,
        scoreBand: scoreBand(score),
        hasPaidPt,
      };
    });
    // Low scores first — that's the follow-up list (step 16).
    rows.sort((a, b) => a.score - b.score);
    return rows;
}

// Enrol a member (by phone) or change their level. Body: { phone, level }.
async function assignEngagement(
  assigner: { id: number | null; name: string },
  req: Request,
  res: Response,
): Promise<void> {
    const me = assigner;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const phone = normalizeMobile(String(b.phone ?? ""));
    const level = b.level;
    if (!phone || !isEngagementLevel(level)) {
      res
        .status(400)
        .json({ error: "phone and level (beginner|intermediate|advanced) required" });
      return;
    }
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(
        sql`right(regexp_replace(${usersTable.mobile}, '\\D', '', 'g'), 10) = ${phone}`,
      );
    if (!user) {
      res.status(404).json({ error: "No app member found with that phone" });
      return;
    }
    const [existing] = await db
      .select()
      .from(memberEngagementProgramsTable)
      .where(eq(memberEngagementProgramsTable.userId, user.id));
    let row: typeof memberEngagementProgramsTable.$inferSelect;
    if (existing) {
      const [updated] = await db
        .update(memberEngagementProgramsTable)
        .set({ level, status: "active" })
        .where(eq(memberEngagementProgramsTable.id, existing.id))
        .returning();
      row = updated!;
    } else {
      const [created] = await db
        .insert(memberEngagementProgramsTable)
        .values({
          userId: user.id,
          memberPhone: phone,
          level,
          startDate: istToday(),
          assignedByStaffId: me.id,
          assignedByStaffName: me.name,
        })
        .returning();
      row = created!;
    }
    try {
      await db.insert(notificationsTable).values({
        recipientType: "user",
        recipientId: user.id,
        title: existing ? "Your workout plan was updated 📋" : "Your 45-day plan is ready! 🎯",
        body: existing
          ? `${me.name} set your 45-day plan level to ${level}. Open the app to see today's workout.`
          : `${me.name} enrolled you in the 45-day ${level} workout plan and assigned you to our in-house dietician. Open the app to see today's workout.`,
        batchId: randomUUID(),
      });
    } catch {
      // Best-effort only.
    }
    res.status(existing ? 200 : 201).json(row);
}

router.get(
  "/staff/engagement/overview",
  requireStaffPermission("pt.manage"),
  async (_req: Request, res: Response): Promise<void> => {
    res.json(await buildOverviewRows());
  },
);

router.post(
  "/staff/engagement/assign",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    await assignEngagement({ id: me.id, name: me.name }, req, res);
  },
);

// ─── Admin (GYMCO web admin): same overview + assignment ────────────────────

router.get(
  "/admin/engagement/overview",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(await buildOverviewRows());
  },
);

router.post(
  "/admin/engagement/assign",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.session.adminId!;
    const [admin] = await db
      .select({ name: adminsTable.name })
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId));
    // Enrolled-by is recorded as admin; staff FK column stays null.
    await assignEngagement(
      { id: null, name: admin?.name ?? "GYMCO admin" },
      req,
      res,
    );
  },
);

export default router;
