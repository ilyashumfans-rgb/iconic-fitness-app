import type { YoactivMembership } from "./yoactiv";

/** True only for a real YYYY-MM-DD calendar date (rejects 2025-02-30). */
export function isCalendarDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export type PaidBookingRow = {
  id: number;
  userId: number | null;
  status: string;
  amountInr: number;
  packageName: string;
  serviceName: string;
  trainerName: string;
  gymName: string;
  preferredDate: string;
  durationDays: number;
  sessions: number;
  createdAt: Date;
};

export type PendingPtPurchase = {
  bookingId: number;
  packageName: string;
  serviceName: string;
  trainerName: string;
  gymName: string;
  bookedAt: string;
  requestedStartDate: string | null;
  durationDays: number | null;
  sessions: number | null;
};

/**
 * Newest paid in-app PT purchase owned by `userId` that has not become a paid
 * staff-dashboard plan yet. Trials are never payments: only `paid` rows with a
 * real charge count. Only an exact bookingId conversion suppresses a row.
 */
export function pickPendingPtPurchase(
  userId: number,
  bookings: PaidBookingRow[],
  convertedBookingIds: ReadonlySet<number>,
): PendingPtPurchase | null {
  const pick = bookings
    .filter((b) =>
      b.userId === userId &&
      b.status === "paid" &&
      b.amountInr > 0 &&
      !convertedBookingIds.has(b.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!pick) return null;
  return {
    bookingId: pick.id,
    packageName: pick.packageName,
    serviceName: pick.serviceName,
    trainerName: pick.trainerName,
    gymName: pick.gymName,
    bookedAt: pick.createdAt.toISOString(),
    requestedStartDate: isCalendarDate(pick.preferredDate) ? pick.preferredDate : null,
    durationDays: pick.durationDays > 0 ? pick.durationDays : null,
    sessions: pick.sessions > 0 ? pick.sessions : null,
  };
}

export type ExternalPtPlan = {
  packageName: string;
  branchName: string;
  status: "active" | "paused" | "expired";
  startDate: string | null;
  endDate: string | null;
  sessionsTotal: number | null;
  sessionsUsed: number | null;
};

const PT_NAME = /(\bpt\b|personal\s*train)/i;

/**
 * External YoActiv PT membership, identified ONLY when the row was billed on an
 * explicitly mapped, dedicated PT-sales branch (distinct from the gym's main
 * branch) AND its service/plan name is classified as PT. Ordinary gym plans can
 * never qualify. Active with the latest expiry wins, else most recent expiry.
 */
export function pickExternalPtPlan(
  memberships: YoactivMembership[],
  dedicatedPtBranchIds: ReadonlySet<number>,
): ExternalPtPlan | null {
  const rows = memberships.filter((m) =>
    dedicatedPtBranchIds.has(m.branchId) && PT_NAME.test(`${m.serviceName} ${m.planName}`));
  const end = (m: YoactivMembership) => (isCalendarDate(m.expiryDate) ? m.expiryDate : "");
  rows.sort((a, b) =>
    Number(b.status === "active") - Number(a.status === "active") || end(b).localeCompare(end(a)));
  const m = rows[0];
  if (!m) return null;
  return {
    packageName: m.planName,
    branchName: m.branchName,
    status: m.status,
    startDate: isCalendarDate(m.startDate) ? m.startDate : null,
    endDate: isCalendarDate(m.expiryDate) ? m.expiryDate : null,
    sessionsTotal: m.sessionsTotal,
    sessionsUsed: m.sessionsUsed,
  };
}

/** Branch ids that are dedicated PT-sales branches (mapped and distinct). */
export function dedicatedPtBranches(
  gyms: Array<{ yoactivBranchId: number | null; yoactivPtBranchId: number | null }>,
): Set<number> {
  const out = new Set<number>();
  for (const g of gyms) {
    if (g.yoactivPtBranchId && g.yoactivPtBranchId !== g.yoactivBranchId) out.add(g.yoactivPtBranchId);
  }
  // A branch that is also some gym's main branch sells ordinary plans too.
  for (const g of gyms) if (g.yoactivBranchId) out.delete(g.yoactivBranchId);
  return out;
}
