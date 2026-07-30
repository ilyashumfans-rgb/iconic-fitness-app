import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  gymsTable,
  ptAttendanceTable,
  ptMembershipsTable,
  staffTable,
  trainerIncentivesTable,
  trainerTargetsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import {
  loadStaffOrUnauthorized,
  requireStaffPermission,
} from "../lib/staffAuth";
import { fetchYoactivMemberList } from "../lib/yoactiv";
import { avatarsByPhone, pickAvatar } from "../lib/memberAvatars";

/**
 * Trainer PT dashboard (per the Iconic Fitness requirements doc):
 * member roster with time-based auto session deduction, revenue / target /
 * incentive dashboards, renewal alerts, and the admin manager view.
 *
 * Session deduction model: originalSessions / durationDays per elapsed day
 * (e.g. 12/30 = 0.4/day). At package expiry remaining sessions become zero
 * regardless of usage. Both time-based remaining sessions AND actual
 * delivered sessions (attendance rows) are reported for transparency.
 *
 * Incentive rule: monthly PT sales < ₹1,00,000 → 20%; ≥ ₹1,00,000 → 40%.
 */
const router: IRouter = Router();

const DAY_MS = 24 * 3600 * 1000;

/** True when an insert failed on a unique index (drizzle wraps pg errors). */
export function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const cause = (e as Error & { cause?: { code?: string } }).cause;
  if (cause?.code === "23505") return true;
  return /unique|duplicate/i.test(e.message) || /unique|duplicate/i.test(String(cause ?? ""));
}
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const INCENTIVE_THRESHOLD_INR = 100_000;

/** Today's date label in IST, YYYY-MM-DD. */
function istToday(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function isDateStr(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Whole days from `a` to `b` (both YYYY-MM-DD); negative when b < a. */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Last day of a package: start + duration - 1 (a 30-day pack spans 30 dates). */
function packageEndDate(startDate: string, durationDays: number): string {
  return addDays(startDate, durationDays - 1);
}

/** Parse a positive-integer route param, or send a 400 and return null. */
function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return null;
  }
  return id;
}

function incentivePct(salesInr: number): number {
  return salesInr >= INCENTIVE_THRESHOLD_INR ? 40 : 20;
}

type Membership = typeof ptMembershipsTable.$inferSelect;

export type ComputedMembership = Membership & {
  status: "active" | "expired";
  daysCompleted: number;
  remainingDays: number;
  /** Days until expiry (negative when already expired). */
  daysLeft: number;
  /** Time-based auto-deducted remaining sessions (0 after expiry). */
  sessionsAvailable: number;
  /** Actual delivered sessions (attendance count). */
  sessionsDelivered: number;
  lastSessionDate: string;
  todayAttendance: boolean;
};

function computeRow(
  m: Membership,
  attendance: { count: number; last: string; today: boolean },
  today: string,
): ComputedMembership {
  const duration = Math.max(m.durationDays, 1);
  const elapsed = Math.min(Math.max(daysBetween(m.startDate, today), 0), duration);
  const expired = today > m.endDate;
  const rate = m.originalSessions / duration;
  const sessionsAvailable = expired
    ? 0
    : Math.max(0, Math.round((m.originalSessions - rate * elapsed) * 10) / 10);
  return {
    ...m,
    status: expired ? "expired" : "active",
    daysCompleted: elapsed,
    remainingDays: Math.max(duration - elapsed, 0),
    daysLeft: daysBetween(today, m.endDate),
    sessionsAvailable,
    sessionsDelivered: attendance.count,
    lastSessionDate: attendance.last,
    todayAttendance: attendance.today,
  };
}

/** Attendance stats per membership id. */
async function attendanceStats(
  membershipIds: number[],
  today: string,
): Promise<Map<number, { count: number; last: string; today: boolean }>> {
  const map = new Map<number, { count: number; last: string; today: boolean }>();
  if (membershipIds.length === 0) return map;
  const rows = await db
    .select()
    .from(ptAttendanceTable)
    .where(inArray(ptAttendanceTable.membershipId, membershipIds));
  for (const r of rows) {
    const cur = map.get(r.membershipId) ?? { count: 0, last: "", today: false };
    cur.count += 1;
    if (r.date > cur.last) cur.last = r.date;
    if (r.date === today) cur.today = true;
    map.set(r.membershipId, cur);
  }
  return map;
}

async function computedMembershipsFor(
  staffId: number | null,
): Promise<ComputedMembership[]> {
  const today = istToday();
  const rows = staffId
    ? await db
        .select()
        .from(ptMembershipsTable)
        .where(eq(ptMembershipsTable.staffId, staffId))
        .orderBy(desc(ptMembershipsTable.createdAt))
    : await db
        .select()
        .from(ptMembershipsTable)
        .orderBy(desc(ptMembershipsTable.createdAt));
  const stats = await attendanceStats(rows.map((r) => r.id), today);
  return rows.map((m) =>
    computeRow(m, stats.get(m.id) ?? { count: 0, last: "", today: false }, today),
  );
}

/** Sales (₹) for a set of memberships in a YYYY-MM month, by start date. */
function salesInMonth(rows: Membership[], month: string): number {
  return rows
    .filter((m) => m.startDate.startsWith(month) && m.paymentStatus === "paid")
    .reduce((sum, m) => sum + m.amountPaidInr, 0);
}

type TrainerMonthStats = {
  salesInr: number;
  targetInr: number;
  achievementPct: number;
  remainingTargetInr: number;
  incentivePct: number;
  grossIncentiveInr: number;
  adjustmentsInr: number;
  netIncentiveInr: number;
  approvalStatus: string;
  incentiveNote: string;
};

async function trainerMonthStats(
  staffId: number,
  month: string,
  rows: Membership[],
): Promise<TrainerMonthStats> {
  const salesInr = salesInMonth(rows, month);
  const [target] = await db
    .select()
    .from(trainerTargetsTable)
    .where(
      and(eq(trainerTargetsTable.staffId, staffId), eq(trainerTargetsTable.month, month)),
    );
  const [inc] = await db
    .select()
    .from(trainerIncentivesTable)
    .where(
      and(
        eq(trainerIncentivesTable.staffId, staffId),
        eq(trainerIncentivesTable.month, month),
      ),
    );
  const targetInr = target?.targetInr ?? 0;
  const pct = incentivePct(salesInr);
  const gross = Math.round((salesInr * pct) / 100);
  const adjustments = inc?.adjustmentsInr ?? 0;
  return {
    salesInr,
    targetInr,
    achievementPct: targetInr > 0 ? Math.round((salesInr / targetInr) * 100) : 0,
    remainingTargetInr: Math.max(targetInr - salesInr, 0),
    incentivePct: pct,
    grossIncentiveInr: gross,
    adjustmentsInr: adjustments,
    netIncentiveInr: gross + adjustments,
    approvalStatus: inc?.approvalStatus ?? "pending",
    incentiveNote: inc?.note ?? "",
  };
}

// ═══════════════════════ Trainer endpoints (staff, pt.manage) ═══════════════

router.get(
  "/staff/pt/members",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const filter = typeof req.query.filter === "string" ? req.query.filter : "";
    let rows = await computedMembershipsFor(me.id);
    if (filter === "active" || filter === "expired") {
      rows = rows.filter((r) => r.status === filter);
    }
    // Member profile photo (uploaded in the app) so trainers can visually
    // verify the person; UI falls back to initials when null.
    const byPhone = await avatarsByPhone(rows.map((r) => r.mobile));
    res.json({
      rows: rows.map((r) => ({
        ...r,
        avatarUrl: pickAvatar(new Map(), byPhone, null, r.mobile),
      })),
    });
  },
);

function parseMembershipBody(body: unknown): {
  ok: boolean;
  error?: string;
  values?: {
    source: string;
    memberName: string;
    membershipId: string;
    mobile: string;
    gymId: number | null;
    packageName: string;
    durationDays: number;
    originalSessions: number;
    amountPaidInr: number;
    paymentStatus: string;
    startDate: string;
    notes: string;
  };
} {
  const b = (body ?? {}) as Record<string, unknown>;
  const memberName = typeof b.memberName === "string" ? b.memberName.trim() : "";
  if (memberName.length < 2) return { ok: false, error: "Member name required" };
  const startDate = isDateStr(b.startDate) ? b.startDate : istToday();
  const durationDays = Number(b.durationDays);
  const originalSessions = Number(b.originalSessions);
  const amountPaidInr = Number(b.amountPaidInr);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 730) {
    return { ok: false, error: "Duration (days) must be between 1 and 730" };
  }
  if (
    !Number.isInteger(originalSessions) ||
    originalSessions < 1 ||
    originalSessions > 1000
  ) {
    return { ok: false, error: "Sessions must be between 1 and 1000" };
  }
  if (!Number.isFinite(amountPaidInr) || amountPaidInr < 0 || amountPaidInr > 10_000_000) {
    return { ok: false, error: "Enter a valid amount" };
  }
  const gymIdNum = Number(b.gymId);
  return {
    ok: true,
    values: {
      source: b.source === "yoactiv" ? "yoactiv" : "manual",
      memberName,
      membershipId: typeof b.membershipId === "string" ? b.membershipId.trim() : "",
      mobile: typeof b.mobile === "string" ? b.mobile.trim() : "",
      gymId: Number.isInteger(gymIdNum) && gymIdNum > 0 ? gymIdNum : null,
      packageName: typeof b.packageName === "string" ? b.packageName.trim() : "",
      durationDays,
      originalSessions,
      amountPaidInr: Math.round(amountPaidInr),
      paymentStatus: b.paymentStatus === "pending" ? "pending" : "paid",
      startDate,
      notes: typeof b.notes === "string" ? b.notes.trim() : "",
    },
  };
}

router.post(
  "/staff/pt/members",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const parsed = parseMembershipBody(req.body);
    if (!parsed.ok || !parsed.values) {
      res.status(400).json({ error: parsed.error ?? "Invalid input" });
      return;
    }
    const v = parsed.values;
    let gymName = "";
    if (v.gymId) {
      const [gym] = await db
        .select({ name: gymsTable.name })
        .from(gymsTable)
        .where(eq(gymsTable.id, v.gymId));
      gymName = gym?.name ?? "";
    }
    const [row] = await db
      .insert(ptMembershipsTable)
      .values({
        ...v,
        gymName,
        staffId: me.id,
        staffName: me.name,
        endDate: packageEndDate(v.startDate, v.durationDays),
      })
      .returning();
    res.status(201).json(row);
  },
);

const PATCHABLE_RENEWAL = new Set(["pending", "renewed", "lost"]);

router.patch(
  "/staff/pt/members/:id",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = parseId(req, res);
    if (id === null) return;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Partial<Membership> = {};
    if (typeof b.renewalStatus === "string" && PATCHABLE_RENEWAL.has(b.renewalStatus)) {
      patch.renewalStatus = b.renewalStatus;
    }
    if (b.paymentStatus === "paid" || b.paymentStatus === "pending") {
      patch.paymentStatus = b.paymentStatus;
    }
    if (isDateStr(b.followUpDate) || b.followUpDate === "") {
      patch.followUpDate = b.followUpDate as string;
    }
    if (typeof b.notes === "string") patch.notes = b.notes.trim();
    const amount = Number(b.amountPaidInr);
    if (Number.isFinite(amount) && amount >= 0 && amount <= 10_000_000) {
      patch.amountPaidInr = Math.round(amount);
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }
    const [updated] = await db
      .update(ptMembershipsTable)
      .set(patch)
      .where(
        and(eq(ptMembershipsTable.id, id), eq(ptMembershipsTable.staffId, me.id)),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/staff/pt/members/:id/attendance",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = parseId(req, res);
    if (id === null) return;
    const [m] = await db
      .select()
      .from(ptMembershipsTable)
      .where(
        and(eq(ptMembershipsTable.id, id), eq(ptMembershipsTable.staffId, me.id)),
      );
    if (!m) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }
    const today = istToday();
    if (today > m.endDate) {
      res.status(409).json({ error: "Package has expired — renew first" });
      return;
    }
    try {
      await db.insert(ptAttendanceTable).values({ membershipId: id, date: today });
    } catch (e) {
      if (isUniqueViolation(e)) {
        res.status(409).json({ error: "Already marked present today" });
        return;
      }
      throw e;
    }
    res.status(201).json({ ok: true, date: today });
  },
);

router.post(
  "/staff/pt/members/:id/renew",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = parseId(req, res);
    if (id === null) return;
    const [old] = await db
      .select()
      .from(ptMembershipsTable)
      .where(
        and(eq(ptMembershipsTable.id, id), eq(ptMembershipsTable.staffId, me.id)),
      );
    if (!old) {
      res.status(404).json({ error: "Membership not found" });
      return;
    }
    const parsed = parseMembershipBody({
      // Carry the member identity; the body supplies the new package terms.
      memberName: old.memberName,
      membershipId: old.membershipId,
      mobile: old.mobile,
      gymId: old.gymId,
      source: old.source,
      ...(req.body as Record<string, unknown>),
    });
    if (!parsed.ok || !parsed.values) {
      res.status(400).json({ error: parsed.error ?? "Invalid input" });
      return;
    }
    const v = parsed.values;
    // Atomic + idempotent: flipping the old row to "renewed" is the one-shot
    // guard — a concurrent/double submit finds it already renewed and aborts,
    // and the transaction rolls the insert back so no duplicate row inflates
    // sales/incentive numbers.
    const created = await db.transaction(async (tx) => {
      const [flipped] = await tx
        .update(ptMembershipsTable)
        .set({ renewalStatus: "renewed" })
        .where(
          and(
            eq(ptMembershipsTable.id, id),
            eq(ptMembershipsTable.staffId, me.id),
            inArray(ptMembershipsTable.renewalStatus, ["pending", "lost"]),
          ),
        )
        .returning();
      if (!flipped) return null;
      const [row] = await tx
        .insert(ptMembershipsTable)
        .values({
          ...v,
          gymName: old.gymName,
          staffId: me.id,
          staffName: me.name,
          endDate: packageEndDate(v.startDate, v.durationDays),
        })
        .returning();
      return row ?? null;
    });
    if (!created) {
      res.status(409).json({ error: "This membership was already renewed" });
      return;
    }
    res.status(201).json(created);
  },
);

// YoActiv member roster for prefilling a new PT membership. Strict branch
// scoping: an unmapped gym returns an empty list (never another branch's
// members).
router.get(
  "/staff/pt/yoactiv-members",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const gymId = Number(req.query.gymId);
    if (!Number.isInteger(gymId) || gymId <= 0) {
      res.status(400).json({ error: "gymId required" });
      return;
    }
    const [gym] = await db
      .select({ yoactivBranchId: gymsTable.yoactivBranchId, name: gymsTable.name })
      .from(gymsTable)
      .where(eq(gymsTable.id, gymId));
    if (!gym?.yoactivBranchId) {
      res.json({ members: [], mapped: false });
      return;
    }
    const members = await fetchYoactivMemberList(gym.yoactivBranchId);
    res.json({
      mapped: true,
      members: members.map((m) => ({
        memberId: m.memberId,
        name: m.name,
        mobile: m.mobile,
        status: m.status,
      })),
    });
  },
);

router.get(
  "/staff/pt/summary",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const today = istToday();
    const month =
      typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
        ? req.query.month
        : today.slice(0, 7);
    const rows = await computedMembershipsFor(me.id);
    const active = rows.filter((r) => r.status === "active");
    const expired = rows.filter((r) => r.status === "expired");
    const year = month.slice(0, 4);
    const stats = await trainerMonthStats(me.id, month, rows);

    const expiringWithin = (days: number) =>
      active.filter((r) => r.daysLeft >= 0 && r.daysLeft <= days && r.renewalStatus === "pending");
    const pendingPaymentsInr = rows
      .filter((r) => r.paymentStatus === "pending")
      .reduce((s, r) => s + r.amountPaidInr, 0);
    const lostRevenueInr = expired
      .filter((r) => r.renewalStatus !== "renewed")
      .reduce((s, r) => s + r.amountPaidInr, 0);

    const alerts: { kind: string; message: string }[] = [];
    for (const r of expiringWithin(0)) {
      alerts.push({ kind: "expiry", message: `${r.memberName}'s PT expires TODAY` });
    }
    for (const r of active.filter((x) => x.daysLeft === 1 && x.renewalStatus === "pending")) {
      alerts.push({ kind: "expiry", message: `${r.memberName}'s PT expires tomorrow` });
    }
    for (const r of active.filter((x) => x.daysLeft > 1 && x.daysLeft <= 3 && x.renewalStatus === "pending")) {
      alerts.push({ kind: "expiry", message: `${r.memberName}'s PT expires in ${r.daysLeft} days` });
    }
    for (const r of active.filter((x) => x.daysLeft > 3 && x.daysLeft <= 7 && x.renewalStatus === "pending")) {
      alerts.push({ kind: "expiry", message: `${r.memberName}'s PT expires in ${r.daysLeft} days` });
    }
    if (pendingPaymentsInr > 0) {
      alerts.push({ kind: "payment", message: `₹${pendingPaymentsInr.toLocaleString("en-IN")} in pending payments` });
    }
    if (stats.targetInr > 0 && stats.achievementPct < 50) {
      alerts.push({ kind: "target", message: `Target achievement below 50% (${stats.achievementPct}%)` });
    }
    if (stats.salesInr >= INCENTIVE_THRESHOLD_INR) {
      alerts.push({ kind: "incentive", message: "₹1 lakh crossed — 40% incentive unlocked! 🎉" });
    }

    res.json({
      month,
      summary: {
        activeMembers: active.length,
        expiredMembers: expired.length,
        revenueTodayInr: rows
          .filter((r) => r.startDate === today && r.paymentStatus === "paid")
          .reduce((s, r) => s + r.amountPaidInr, 0),
        revenueMonthInr: stats.salesInr,
        revenueYearInr: rows
          .filter((r) => r.startDate.startsWith(year) && r.paymentStatus === "paid")
          .reduce((s, r) => s + r.amountPaidInr, 0),
        pendingPaymentsInr,
        lostRevenueInr,
        todaysSessions: rows.filter((r) => r.todayAttendance).length,
        pendingRenewals: expiringWithin(7).length,
        sevenDayExpiry: expiringWithin(7).map((r) => ({
          id: r.id,
          memberName: r.memberName,
          mobile: r.mobile,
          endDate: r.endDate,
          daysLeft: r.daysLeft,
          amountPaidInr: r.amountPaidInr,
        })),
      },
      target: stats,
      alerts,
    });
  },
);

// ═══════════════════════ Admin (manager) endpoints ══════════════════════════

async function ptTrainers(): Promise<{ id: number; name: string }[]> {
  const staff = await db
    .select({ id: staffTable.id, name: staffTable.name, permissions: staffTable.permissions, isActive: staffTable.isActive })
    .from(staffTable);
  return staff
    .filter((s) => s.isActive && (s.permissions ?? []).includes("pt.manage"))
    .map((s) => ({ id: s.id, name: s.name }));
}

router.get(
  "/admin/pt/overview",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const today = istToday();
    const month =
      typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
        ? req.query.month
        : today.slice(0, 7);
    const trainers = await ptTrainers();
    const all = await computedMembershipsFor(null);
    const byTrainer = new Map<number, ComputedMembership[]>();
    for (const r of all) {
      const list = byTrainer.get(r.staffId) ?? [];
      list.push(r);
      byTrainer.set(r.staffId, list);
    }

    const rows = await Promise.all(
      trainers.map(async (t) => {
        const mine = byTrainer.get(t.id) ?? [];
        const stats = await trainerMonthStats(t.id, month, mine);
        return {
          staffId: t.id,
          staffName: t.name,
          activeMembers: mine.filter((r) => r.status === "active").length,
          expiredMembers: mine.filter((r) => r.status === "expired").length,
          renewalsPending: mine.filter(
            (r) => r.status === "active" && r.daysLeft <= 7 && r.daysLeft >= 0 && r.renewalStatus === "pending",
          ).length,
          ...stats,
        };
      }),
    );

    const branchRevenue = new Map<string, number>();
    for (const r of all) {
      if (r.startDate.startsWith(month) && r.paymentStatus === "paid") {
        const key = r.gymName || "Unassigned";
        branchRevenue.set(key, (branchRevenue.get(key) ?? 0) + r.amountPaidInr);
      }
    }
    const sorted = [...rows].sort((a, b) => b.salesInr - a.salesInr);
    res.json({
      month,
      trainers: rows,
      branchRevenue: [...branchRevenue.entries()].map(([gymName, revenueInr]) => ({
        gymName,
        revenueInr,
      })),
      bestPerformer: sorted[0]?.staffName ?? "",
      lowestPerformer: sorted.length > 1 ? sorted[sorted.length - 1]!.staffName : "",
      totalIncentivePayableInr: rows.reduce((s, r) => s + r.netIncentiveInr, 0),
      totalRevenueInr: rows.reduce((s, r) => s + r.salesInr, 0),
    });
  },
);

router.get(
  "/admin/pt/targets",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const month =
      typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
        ? req.query.month
        : istToday().slice(0, 7);
    const trainers = await ptTrainers();
    const targets = await db
      .select()
      .from(trainerTargetsTable)
      .where(eq(trainerTargetsTable.month, month));
    const byStaff = new Map(targets.map((t) => [t.staffId, t.targetInr]));
    res.json({
      month,
      targets: trainers.map((t) => ({
        staffId: t.id,
        staffName: t.name,
        targetInr: byStaff.get(t.id) ?? 0,
      })),
    });
  },
);

router.put(
  "/admin/pt/targets",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const staffId = Number(b.staffId);
    const month = typeof b.month === "string" && /^\d{4}-\d{2}$/.test(b.month) ? b.month : "";
    const targetInr = Number(b.targetInr);
    if (!Number.isInteger(staffId) || !month || !Number.isFinite(targetInr) || targetInr < 0) {
      res.status(400).json({ error: "staffId, month (YYYY-MM) and targetInr required" });
      return;
    }
    await db
      .insert(trainerTargetsTable)
      .values({ staffId, month, targetInr: Math.round(targetInr) })
      .onConflictDoUpdate({
        target: [trainerTargetsTable.staffId, trainerTargetsTable.month],
        set: { targetInr: Math.round(targetInr) },
      });
    res.json({ ok: true });
  },
);

router.put(
  "/admin/pt/incentives",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const staffId = Number(b.staffId);
    const month = typeof b.month === "string" && /^\d{4}-\d{2}$/.test(b.month) ? b.month : "";
    const adjustmentsInr = Number(b.adjustmentsInr ?? 0);
    const approvalStatus = b.approvalStatus === "approved" ? "approved" : "pending";
    const note = typeof b.note === "string" ? b.note.trim() : "";
    if (!Number.isInteger(staffId) || !month || !Number.isFinite(adjustmentsInr)) {
      res.status(400).json({ error: "staffId, month and adjustmentsInr required" });
      return;
    }
    await db
      .insert(trainerIncentivesTable)
      .values({ staffId, month, adjustmentsInr: Math.round(adjustmentsInr), approvalStatus, note })
      .onConflictDoUpdate({
        target: [trainerIncentivesTable.staffId, trainerIncentivesTable.month],
        set: { adjustmentsInr: Math.round(adjustmentsInr), approvalStatus, note },
      });
    res.json({ ok: true });
  },
);

export default router;
