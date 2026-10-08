import type { PtProgram } from "@workspace/api-client-react";
import { isCalendarDate, ptValidityHeadline, ptValidityViews } from "./ptValidity";

function assert(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }

const base: PtProgram = {
  active: true, kickstarterCompleted: true, hasPaidPlan: true, trainerName: "Trial Coach", gymName: "Kharadi",
  packageName: "Personal training", totalSessions: 12, completedCount: 2, sessions: [],
};
const plan = (p: Partial<NonNullable<PtProgram["plan"]>>): PtProgram => ({ ...base, plan: {
  packageName: "PT 12 Sessions", gymName: "Kharadi", trainerName: "Rohit Pawar", totalSessions: 12,
  sessionsDelivered: 5, startDate: "2025-03-01", endDate: "2025-03-30", expired: false, ...p } });
const pending: NonNullable<PtProgram["pendingPurchase"]> = {
  bookingId: 41, packageName: "PT 3 Months", serviceName: "Personal Training", trainerName: "",
  gymName: "Baner", bookedAt: "2025-04-01T20:00:00Z", requestedStartDate: "2025-04-05", durationDays: 90, sessions: 36,
};

export function runPtValidityTests() {
  assert(ptValidityViews(undefined, "2025-03-10").length === 0, "no program");
  assert(ptValidityViews({ ...base, plan: null }, "2025-03-10").length === 0, "trial/hasPaidPlan alone is not a plan");
  const [a] = ptValidityViews(plan({}), "2025-03-10");
  assert(a!.state === "active" && a!.daysLeft === 21, "active days");
  assert(a!.totalSessions === 12 && a!.sessionsDelivered === 5 && !("sessionsRemaining" in a!), "original + delivered only");
  assert(ptValidityViews(plan({}), "2025-03-30")[0]!.daysLeft === 1, "last day");
  assert(ptValidityViews(plan({}), "2025-03-31")[0]!.state === "expired", "expired");
  const [u] = ptValidityViews(plan({}), "2025-02-27");
  assert(u!.state === "upcoming" && u!.daysUntilStart === 2, "upcoming");
  const [m] = ptValidityViews(plan({ startDate: "", endDate: "2025-02-30" }), "2025-03-10");
  assert(m!.state === "unknown" && m!.endDate === null && ptValidityHeadline(m!) === "PT plan dates not set", "missing/invalid dates");
  assert(!isCalendarDate("2025-02-29") && isCalendarDate("2024-02-29"), "calendar check");
  // Paid, no assignment: pending summary, no invented validity.
  const [p] = ptValidityViews({ ...base, plan: null, pendingPurchase: pending }, "2025-04-02");
  assert(p!.state === "pending" && p!.endDate === null && p!.daysLeft === null, "pending has no validity");
  assert(p!.requestedStartDate === "2025-04-05" && p!.bookedAtIst === "2025-04-02", "pending real fields, IST booking day");
  assert(ptValidityHeadline(p!) === "Payment received. Validity pending", "pending copy");
  // Expired plan does not hide newer pending purchase.
  const both = ptValidityViews({ ...plan({}), pendingPurchase: pending }, "2025-04-10");
  assert(both.length === 2 && both[0]!.state === "expired" && both[1]!.state === "pending", "expired + pending");
  const [e] = ptValidityViews({ ...base, externalPlan: { packageName: "PT Monthly", branchName: "Kharadi PT", status: "paused",
    startDate: "2025-03-01", endDate: "2025-03-30", sessionsTotal: 12, sessionsUsed: 3 } }, "2025-03-10");
  assert(e!.source === "external" && e!.state === "paused" && e!.sessionsDelivered === 3, "external paused");
}
runPtValidityTests();
