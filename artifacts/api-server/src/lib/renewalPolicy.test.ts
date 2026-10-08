import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideCheckout,
  dueMilestone,
  istDateOf,
  ptTimeRemaining,
  reminderBatchId,
  renewalWindow,
} from "./renewalPolicy";

test("day 10 eligible, day 11 not", () => {
  assert.equal(renewalWindow("2025-03-11", "2025-03-01").eligible, true);
  assert.equal(renewalWindow("2025-03-12", "2025-03-01").eligible, false);
});

test("expiry day eligible, day after expired and hidden", () => {
  const onDay = renewalWindow("2025-03-01", "2025-03-01");
  assert.equal(onDay.eligible, true);
  assert.equal(onDay.nextStartDate, "2025-03-02");
  const after = renewalWindow("2025-03-01", "2025-03-02");
  assert.equal(after.expired, true);
  assert.equal(after.eligible, false);
  assert.equal(dueMilestone("2025-03-01", "2025-03-02"), null);
});

test("IST year rollover", () => {
  // 2024-12-31 19:00 UTC is already 2025-01-01 in IST.
  assert.equal(istDateOf(new Date("2024-12-31T19:00:00Z")), "2025-01-01");
  const w = renewalWindow("2024-12-31", "2024-12-25");
  assert.equal(w.daysLeft, 6);
  assert.equal(w.nextStartDate, "2025-01-01");
  assert.equal(dueMilestone("2025-01-03", "2024-12-27"), 7);
});

test("upgrade charges full listed price and starts after expiry", () => {
  const d = decideCheckout({
    mode: "upgrade",
    expiry: "2025-06-10",
    today: "2025-06-05",
    listedPriceInr: 14999.4,
    alreadyPaidForNextStart: false,
  });
  assert.deepEqual(d, { ok: true, startDate: "2025-06-11", amountInr: 14999 });
});

test("expired, missing expiry and duplicate paid are refused", () => {
  const base = { mode: "renew" as const, today: "2025-06-05", listedPriceInr: 1000, alreadyPaidForNextStart: false };
  assert.equal(decideCheckout({ ...base, expiry: "2025-06-04" }).ok, false);
  // Far from expiry is still allowed: only reminders use the 10-day window.
  assert.equal(decideCheckout({ ...base, expiry: "2025-06-30" }).ok, true);
  assert.equal(decideCheckout({ ...base, expiry: null }).ok, false);
  assert.equal(decideCheckout({ ...base, expiry: "2025-06-06", alreadyPaidForNextStart: true }).ok, false);
});

test("milestones fire latest reached only, never early", () => {
  assert.equal(dueMilestone("2025-03-11", "2025-03-01"), 10);
  assert.equal(dueMilestone("2025-03-12", "2025-03-01"), null);
  assert.equal(dueMilestone("2025-03-06", "2025-03-01"), 7);
  assert.equal(dueMilestone("2025-03-02", "2025-03-01"), 1);
  assert.equal(dueMilestone("2025-03-01", "2025-03-01"), 0);
});

test("reminder dedupe keys are source-specific", () => {
  const a = reminderBatchId(1, "yoactiv", "12:Gym:Gold", "2025-03-01", 7);
  const b = reminderBatchId(1, "pt-local", "55", "2025-03-01", 7);
  assert.notEqual(a, b);
  assert.notEqual(a, reminderBatchId(2, "yoactiv", "12:Gym:Gold", "2025-03-01", 7));
});

test("PT time-based remaining is independent of delivered sessions", () => {
  assert.equal(ptTimeRemaining(12, 30, "2025-01-01", "2025-01-30", "2025-01-16"), 6);
  assert.equal(ptTimeRemaining(12, 30, "2025-01-01", "2025-01-30", "2025-02-01"), 0);
});

import { resolveCheckoutPackage, snapshotOwnedBy } from "./renewalPolicy";

const catalog = [
  { id: 1, name: "Gold 3 Months", serviceName: "Gym", amountInr: 6000 },
  { id: 2, name: "Gold 12 Months", serviceName: "Gym", amountInr: 18000 },
  { id: 3, name: "PT 12", serviceName: "PT", amountInr: 9000, pt: true },
];
const src = { serviceName: "Gym", planName: "gold 3  months" };

test("renew resolves the exact source plan only", () => {
  const all = () => true;
  assert.equal(resolveCheckoutPackage({ mode: "renew", packages: catalog, source: src, isVisible: all })?.id, 1);
  assert.equal(resolveCheckoutPackage({ mode: "renew", packages: catalog, source: src, packageId: 2, isVisible: all }), null);
});

test("upgrade tampering: other-branch id, PT, hidden, or same plan refused", () => {
  const all = () => true;
  assert.equal(resolveCheckoutPackage({ mode: "upgrade", packages: catalog, source: src, packageId: 2, isVisible: all })?.id, 2);
  assert.equal(resolveCheckoutPackage({ mode: "upgrade", packages: catalog, source: src, packageId: 999, isVisible: all }), null);
  assert.equal(resolveCheckoutPackage({ mode: "upgrade", packages: catalog, source: src, packageId: 3, isVisible: all }), null);
  assert.equal(resolveCheckoutPackage({ mode: "upgrade", packages: catalog, source: src, packageId: 2, isVisible: () => false }), null);
  assert.equal(resolveCheckoutPackage({ mode: "upgrade", packages: catalog, source: src, packageId: 1, isVisible: all }), null);
});

test("cross-user snapshot access refused", () => {
  const s = { kind: "membership" as const, mode: "renew" as const, userId: 7, bookingId: 1, sourceIdentity: "x", sourceExpiry: "2025-01-01", nextStartDate: "2025-01-02", packageId: 1, listedPriceInr: 1, createdAt: "" };
  assert.equal(snapshotOwnedBy(s, 7), true);
  assert.equal(snapshotOwnedBy(s, 8), false);
  assert.equal(snapshotOwnedBy(null, 7), false);
});

import { landingTransition, reminderDue } from "./renewalPolicy";

test("reminders stop after a verified paid renewal; pending/failed do not stop them", () => {
  assert.equal(reminderDue("2025-03-04", "2025-03-01", true), null);
  assert.equal(reminderDue("2025-03-04", "2025-03-01", false), 3);
});

test("duplicate payment callbacks are idempotent", () => {
  assert.equal(landingTransition("pending", "paid"), "paid");
  assert.equal(landingTransition("paid", "paid"), null);
  assert.equal(landingTransition("paid", "failed"), null);
  assert.equal(landingTransition("failed", "paid"), null);
});

import { pickCurrentTerm } from "./renewalPolicy";

test("current term stays authoritative until the paid future renewal starts", () => {
  const current = { id: 1, startDate: "2025-02-01", endDate: "2025-03-02" };
  const future = { id: 2, startDate: "2025-03-03", endDate: "2025-04-01" };
  assert.equal(pickCurrentTerm([future, current], "2025-02-25")?.id, 1);
  assert.equal(pickCurrentTerm([future, current], "2025-03-02")?.id, 1, "expiry day still current");
  assert.equal(pickCurrentTerm([future, current], "2025-03-03")?.id, 2, "switches on next start");
  assert.equal(pickCurrentTerm([future], "2025-02-25")?.id, 2, "only-future fallback");
  const old = { id: 3, startDate: "2024-01-01", endDate: "2024-02-01" };
  assert.equal(pickCurrentTerm([old, future], "2025-02-25")?.id, 3, "ended term beats unstarted for context");
});
