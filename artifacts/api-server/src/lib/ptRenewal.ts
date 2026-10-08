import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, gymsTable, ptAttendanceTable, ptMembershipsTable, trainerBookingsTable } from "@workspace/db";
import { fetchYoactivMemberByMobile, yoactivConfigured } from "./yoactiv";
import { dedicatedPtBranches, pickExternalPtPlan } from "./ptPurchaseSummary";
import { hasPaidPtRenewal } from "./renewalStore";
import { istDateOf, pickCurrentTerm, ptTimeRemaining, renewalWindow } from "./renewalPolicy";

/**
 * The caller's newest paid, ACCOUNT-LINKED local PT plan (exact booking.userId
 * match). Only these are renewable online: phone-matched staff rows cannot be
 * safely attributed to this account for a money path.
 */
export async function findRenewablePtPlan(userId: number, today = istDateOf(new Date())) {
  const rows = await db
    .select({ m: ptMembershipsTable, booking: trainerBookingsTable })
    .from(ptMembershipsTable)
    .innerJoin(trainerBookingsTable, eq(ptMembershipsTable.bookingId, trainerBookingsTable.id))
    .where(and(eq(ptMembershipsTable.paymentStatus, "paid"), eq(trainerBookingsTable.userId, userId)))
    .orderBy(desc(ptMembershipsTable.endDate), desc(ptMembershipsTable.createdAt))
    .limit(20);
  // A paid future-start renewal never replaces the running term early.
  const pick = pickCurrentTerm(rows.map((r) => ({ ...r, startDate: r.m.startDate, endDate: r.m.endDate })), today);
  return pick ? { m: pick.m, booking: pick.booking } : null;
}

export async function ptRenewalInfo(userId: number, mobile: string, today: string) {
  const local = await findRenewablePtPlan(userId, today);
  if (local) {
    const { m, booking } = local;
    const [att] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ptAttendanceTable)
      .where(eq(ptAttendanceTable.membershipId, m.id));
    const w = renewalWindow(m.endDate, today);
    const renewalPaid = await hasPaidPtRenewal(userId, `pt-local:${m.id}`, m.endDate);
    const canRenew = !w.expired && w.daysLeft !== null && !renewalPaid;
    return {
      source: "local" as const,
      action: canRenew ? ("renew_online" as const) : ("none" as const),
      gymId: m.gymId ?? booking.gymId,
      packageName: m.packageName,
      trainerName: m.staffName || booking.trainerName,
      gymName: m.gymName,
      startDate: m.startDate,
      endDate: m.endDate,
      totalSessions: m.originalSessions,
      sessionsDelivered: att?.count ?? 0,
      timeBasedRemaining: ptTimeRemaining(m.originalSessions, m.durationDays, m.startDate, m.endDate, today),
      daysLeft: w.daysLeft,
      expired: w.expired,
      eligible: w.eligible,
      nextStartDate: w.nextStartDate,
      canRenewOnline: canRenew,
      explanation: w.expired
        ? "This PT plan has ended. Book a new PT plan to continue."
        : renewalPaid
            ? "Your PT renewal is paid and starts the day after your current plan ends."
            : "Renew now; your new PT plan starts the day after this one ends.",
      renewalPaid,
    };
  }
  // Staff-added plan with no originating booking, matched by phone exactly
  // like /pt/mine. Shown with real attendance; renewal goes via the branch.
  const last10 = mobile.replace(/\D/g, "").slice(-10);
  if (last10.length === 10) {
    const manualRows = await db
      .select()
      .from(ptMembershipsTable)
      .where(
        and(
          eq(ptMembershipsTable.paymentStatus, "paid"),
          isNull(ptMembershipsTable.bookingId),
          sql`right(regexp_replace(${ptMembershipsTable.mobile}, '\D', '', 'g'), 10) = ${last10}`,
        ),
      )
      .orderBy(desc(ptMembershipsTable.endDate), desc(ptMembershipsTable.createdAt))
      .limit(20);
    const manual = pickCurrentTerm(manualRows, today);
    if (manual) {
      const [att] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(ptAttendanceTable)
        .where(eq(ptAttendanceTable.membershipId, manual.id));
      const w = renewalWindow(manual.endDate, today);
      return {
        source: "local_manual" as const,
        action: "request_renewal" as const,
        gymId: manual.gymId,
        packageName: manual.packageName,
        trainerName: manual.staffName,
        gymName: manual.gymName,
        startDate: manual.startDate,
        endDate: manual.endDate,
        totalSessions: manual.originalSessions,
        sessionsDelivered: att?.count ?? 0,
        timeBasedRemaining: ptTimeRemaining(manual.originalSessions, manual.durationDays, manual.startDate, manual.endDate, today),
        daysLeft: w.daysLeft,
        expired: w.expired,
        eligible: w.eligible,
        nextStartDate: w.nextStartDate,
        canRenewOnline: false,
        explanation:
          "This PT plan was set up by your branch, so it can't be paid for in the app. Send a renewal request and the front desk will contact you.",
        renewalPaid: false,
      };
    }
  }
  // External YoActiv PT (dedicated PT-sales branch only): display-only. The
  // app cannot attribute or renew provider-side PT terms safely.
  if (!mobile || !yoactivConfigured()) return null;
  const gyms = await db
    .select({ yoactivBranchId: gymsTable.yoactivBranchId, yoactivPtBranchId: gymsTable.yoactivPtBranchId })
    .from(gymsTable);
  const branches = dedicatedPtBranches(gyms);
  if (branches.size === 0) return null;
  try {
    const profile = await fetchYoactivMemberByMobile(mobile, { requireComplete: true, throwOnError: true });
    const ext = profile ? pickExternalPtPlan(profile.memberships, branches) : null;
    if (!ext) return null;
    const w = renewalWindow(ext.endDate, today);
    return {
      source: "yoactiv" as const,
      action: "request_renewal" as const,
      gymId: null,
      packageName: ext.packageName,
      trainerName: "",
      gymName: ext.branchName,
      startDate: ext.startDate,
      endDate: ext.endDate,
      totalSessions: ext.sessionsTotal,
      sessionsDelivered: ext.sessionsUsed,
      timeBasedRemaining: null,
      daysLeft: w.daysLeft,
      expired: w.expired,
      eligible: w.eligible,
      nextStartDate: w.nextStartDate,
      canRenewOnline: false,
      explanation:
        "This PT plan is billed directly at your branch, so it can't be paid for in the app. Send a renewal request and the front desk will contact you.",
      renewalPaid: false,
    };
  } catch {
    return null;
  }
}
