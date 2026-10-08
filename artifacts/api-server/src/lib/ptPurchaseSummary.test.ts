import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dedicatedPtBranches, isCalendarDate, pickExternalPtPlan, pickPendingPtPurchase, type PaidBookingRow,
} from "./ptPurchaseSummary";
import type { YoactivMembership } from "./yoactiv";

const b = (p: Partial<PaidBookingRow>): PaidBookingRow => ({
  id: 1, userId: 7, status: "paid", amountInr: 8499, packageName: "PT 12 Sessions", serviceName: "Personal Training",
  trainerName: "Rohit Pawar", gymName: "Kharadi", preferredDate: "2025-04-02", durationDays: 30, sessions: 12,
  createdAt: new Date("2025-04-01T05:00:00Z"), ...p,
});

test("calendar date validation rejects impossible dates", () => {
  assert.ok(isCalendarDate("2024-02-29"));
  assert.ok(!isCalendarDate("2025-02-29"));
  assert.ok(!isCalendarDate("2025-13-01"));
  assert.ok(!isCalendarDate(""));
});

test("pending purchase: newest unconverted paid booking with real fields", () => {
  const p = pickPendingPtPurchase(7, [b({ id: 1 }), b({ id: 2, createdAt: new Date("2025-04-03T00:00:00Z") })], new Set())!;
  assert.equal(p.bookingId, 2);
  assert.equal(p.trainerName, "Rohit Pawar");
  assert.equal(p.requestedStartDate, "2025-04-02");
});

test("only an exact bookingId conversion suppresses pending", () => {
  assert.equal(pickPendingPtPurchase(7, [b({})], new Set([1])), null);
  assert.equal(pickPendingPtPurchase(7, [b({})], new Set([2]))?.bookingId, 1);
});

test("trials, unpaid rows and other accounts never count", () => {
  assert.equal(pickPendingPtPurchase(7, [b({ amountInr: 0 })], new Set()), null);
  assert.equal(pickPendingPtPurchase(7, [b({ status: "pending" })], new Set()), null);
  assert.equal(pickPendingPtPurchase(7, [b({ userId: 8 }), b({ userId: null })], new Set()), null);
});

test("invalid requested date is not surfaced", () => {
  assert.equal(pickPendingPtPurchase(7, [b({ preferredDate: "2025-02-30" })], new Set())?.requestedStartDate, null);
});

const m = (p: Partial<YoactivMembership>): YoactivMembership => ({
  branchId: 90, branchName: "Kharadi PT", serviceName: "Personal Training", planName: "PT 3 Months", status: "active",
  startDate: "2025-01-01", expiryDate: "2025-03-31", sessionsTotal: 36, sessionsUsed: 10, billId: "B1",
  invoiceDate: null, amountInr: null, discountInr: null, ...p,
});

test("dedicated PT branches exclude unmapped, shared and main branches", () => {
  const set = dedicatedPtBranches([
    { yoactivBranchId: 10, yoactivPtBranchId: 90 },
    { yoactivBranchId: 11, yoactivPtBranchId: 11 },
    { yoactivBranchId: 12, yoactivPtBranchId: null },
    { yoactivBranchId: 91, yoactivPtBranchId: null },
    { yoactivBranchId: 13, yoactivPtBranchId: 91 },
  ]);
  assert.deepEqual([...set], [90]);
});

test("external PT plan requires dedicated branch AND PT name", () => {
  const br = new Set([90]);
  assert.equal(pickExternalPtPlan([m({ branchId: 10 })], br), null);
  assert.equal(pickExternalPtPlan([m({ serviceName: "Gym", planName: "Annual Membership" })], br), null);
  const p = pickExternalPtPlan([m({ status: "expired", expiryDate: "2025-06-30" }), m({})], br)!;
  assert.equal(p.status, "active");
  assert.equal(p.endDate, "2025-03-31");
  assert.equal(pickExternalPtPlan([m({ expiryDate: "2025-02-30" })], br)!.endDate, null);
});

test("/pt/mine stays signed-in only and caller-scoped", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../routes/trainerBookings.ts", import.meta.url), "utf8");
  assert.match(src, /"\/pt\/mine",\s*requireUser,/);
  assert.match(src, /fetchPtPurchaseExtras\(req\.userId!/);
  assert.match(src, /eq\(trainerBookingsTable\.userId, userId\), eq\(trainerBookingsTable\.status, "paid"\)/);
});
