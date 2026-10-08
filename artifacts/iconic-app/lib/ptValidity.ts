import type { PtProgram } from "@workspace/api-client-react";

export type PtValidityState = "active" | "upcoming" | "expired" | "paused" | "unknown" | "pending";

export type PtValidityView = {
  key: string;
  source: "plan" | "external" | "pending";
  packageName: string;
  trainerName: string;
  branchName: string;
  startDate: string | null;
  endDate: string | null;
  state: PtValidityState;
  /** Whole IST days left including today; only when active with a valid end date. */
  daysLeft: number | null;
  daysUntilStart: number | null;
  /** Original sessions in the package (not a remaining balance). */
  totalSessions: number | null;
  sessionsDelivered: number | null;
  /** Pending purchase only: requested start, never treated as validity. */
  requestedStartDate: string | null;
  bookedAtIst: string | null;
};

/** Real YYYY-MM-DD calendar date (rejects 2025-02-30). */
export function isCalendarDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
const dayNum = (s: string) => Math.round(Date.parse(`${s}T00:00:00Z`) / 86_400_000);
const date = (s: string | null | undefined) => (isCalendarDate(s) ? s : null);
const count = (n: number | null | undefined) => (typeof n === "number" && n > 0 ? n : null);

function dated(start: string | null, end: string | null, today: string, fallbackExpired: boolean) {
  const t = dayNum(today);
  if (end && t > dayNum(end)) return { state: "expired" as const, daysLeft: null, daysUntilStart: null };
  if (start && t < dayNum(start)) return { state: "upcoming" as const, daysLeft: null, daysUntilStart: dayNum(start) - t };
  if (end) return { state: "active" as const, daysLeft: dayNum(end) - t + 1, daysUntilStart: null };
  return { state: fallbackExpired ? "expired" as const : "unknown" as const, daysLeft: null, daysUntilStart: null };
}

function istDay(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

/**
 * Current PT purchases from /pt/mine. Only the paid local plan, the external
 * gym-system PT plan and the pending paid purchase qualify; trial enrolments
 * and `hasPaidPlan` (historical bookings) never create an entry.
 */
export function ptValidityViews(program: PtProgram | null | undefined, todayIst: string): PtValidityView[] {
  const out: PtValidityView[] = [];
  const plan = program?.plan;
  if (plan) {
    const startDate = date(plan.startDate), endDate = date(plan.endDate);
    out.push({
      key: "plan", source: "plan",
      packageName: plan.packageName.trim() || "Personal training",
      trainerName: plan.trainerName.trim(), branchName: plan.gymName.trim(),
      startDate, endDate, ...dated(startDate, endDate, todayIst, plan.expired),
      totalSessions: count(plan.totalSessions), sessionsDelivered: Math.max(0, plan.sessionsDelivered),
      requestedStartDate: null, bookedAtIst: null,
    });
  }
  const ext = program?.externalPlan;
  if (ext) {
    const startDate = date(ext.startDate), endDate = date(ext.endDate);
    const d = dated(startDate, endDate, todayIst, ext.status === "expired");
    out.push({
      key: "external", source: "external",
      packageName: ext.packageName.trim() || "Personal training",
      trainerName: "", branchName: ext.branchName.trim(), startDate, endDate,
      ...(ext.status === "paused" && d.state !== "expired" ? { ...d, state: "paused" as const, daysLeft: null } : d),
      totalSessions: count(ext.sessionsTotal),
      sessionsDelivered: typeof ext.sessionsUsed === "number" && ext.sessionsUsed >= 0 ? ext.sessionsUsed : null,
      requestedStartDate: null, bookedAtIst: null,
    });
  }
  const p = program?.pendingPurchase;
  if (p) {
    out.push({
      key: `pending-${p.bookingId}`, source: "pending",
      packageName: p.packageName.trim() || "Personal training",
      trainerName: p.trainerName.trim(), branchName: p.gymName.trim(),
      startDate: null, endDate: null, state: "pending", daysLeft: null, daysUntilStart: null,
      totalSessions: count(p.sessions), sessionsDelivered: null,
      requestedStartDate: date(p.requestedStartDate), bookedAtIst: istDay(p.bookedAt),
    });
  }
  return out;
}

export function ptValidityHeadline(v: PtValidityView): string {
  switch (v.state) {
    case "pending": return "Payment received. Validity pending";
    case "expired": return "PT plan expired";
    case "paused": return "PT plan paused";
    case "upcoming": return v.daysUntilStart === 1 ? "PT starts tomorrow" : `PT starts in ${v.daysUntilStart} days`;
    case "active": return v.daysLeft === 1 ? "Last day of PT" : `${v.daysLeft} days of PT left`;
    default: return "PT plan dates not set";
  }
}

export function ptBadge(v: PtValidityView): string {
  return v.state === "pending" ? "Paid" : v.state === "unknown" ? "Paid" : v.state;
}
