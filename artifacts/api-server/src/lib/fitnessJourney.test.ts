import assert from "node:assert/strict";
import { test } from "node:test";
import {
  journeyDecision, JOURNEY_WINDOW_MS, matchingMobileSync, planStartTimestamp,
  recentTimestamp, trustedMobileSyncIdentity,
} from "./fitnessJourney";

const now = Date.parse("2026-09-19T10:00:00Z");
const base = {
  synced: true, active: true, accountCreatedAt: now - 1000,
  planStartedOn: "2026-09-18", now, hasPaidPt: false,
  trialCompleted: false, trialInProgress: false,
};
test("both actual account birth and approved membership plan start must be recent", () => {
  assert.equal(journeyDecision(base), "new_offer");
  assert.equal(journeyDecision({ ...base, accountCreatedAt: now - JOURNEY_WINDOW_MS }), "account_not_recent");
  assert.equal(journeyDecision({ ...base, planStartedOn: "2026-09-09" }), "plan_not_recent");
  assert.equal(journeyDecision({ ...base, accountCreatedAt: now + 1 }), "account_not_recent");
  assert.equal(journeyDecision({ ...base, planStartedOn: "2026-09-20" }), "plan_not_recent");
});
test("window boundary is exclusive, plan dates start at midnight IST", () => {
  assert.equal(planStartTimestamp("2026-09-19"), Date.parse("2026-09-18T18:30:00Z"));
  assert.equal(recentTimestamp(now - JOURNEY_WINDOW_MS + 1, now), true);
  assert.equal(recentTimestamp(now - JOURNEY_WINDOW_MS, now), false);
  for (const date of [null, "", "2026-02-30", "2026-13-01", "19-09-2026"]) {
    assert.equal(Number.isNaN(planStartTimestamp(date)), true);
    assert.equal(journeyDecision({ ...base, planStartedOn: date }), "plan_not_recent");
  }
  assert.equal(recentTimestamp(NaN, now), false);
});
test("missing explicit sync, inactive membership, paid or completed trials fail closed", () => {
  assert.equal(journeyDecision({ ...base, synced: false }), "mobile_sync_required");
  assert.equal(journeyDecision({ ...base, active: false }), "active_membership_required");
  assert.equal(journeyDecision({ ...base, hasPaidPt: true }), "paid_pt");
  assert.equal(journeyDecision({ ...base, trialCompleted: true }), "trial_completed");
});
test("only confirmed in-progress trial preserves continuity beyond recency", () => {
  const progress = { ...base, trialInProgress: true, accountCreatedAt: 0, planStartedOn: null };
  assert.equal(journeyDecision(progress), "in_progress");
  assert.equal(journeyDecision({ ...progress, hasPaidPt: true }), "paid_pt");
  assert.equal(journeyDecision({ ...progress, trialCompleted: true }), "trial_completed");
  assert.equal(journeyDecision({ ...progress, synced: false }), "mobile_sync_required");
  assert.equal(journeyDecision({ ...progress, active: false }), "active_membership_required");
});
test("sync receipt must match both mobile and live vendor identity; no email-only shortcut", () => {
  const receipt = { version: 1, mobile: "9000000000", memberId: 42, syncedAt: now - 1 };
  assert.equal(matchingMobileSync(receipt, "9000000000", 42, now), true);
  assert.equal(matchingMobileSync(receipt, "9000000001", 42, now), false);
  assert.equal(matchingMobileSync(receipt, "9000000000", 43, now), false);
  for (const bad of [undefined, null, true, {}, { ...receipt, version: 2 }, { ...receipt, syncedAt: now + 1 }]) {
    assert.equal(matchingMobileSync(bad, "9000000000", 42, now), false);
  }
});
test("automatic refresh accepts only a complete server receipt identity", () => {
  const receipt = { version: 1, mobile: "9000000000", memberId: 42, syncedAt: now - 1 };
  assert.deepEqual(trustedMobileSyncIdentity(receipt, now), {
    mobile: "9000000000", memberId: 42,
  });
  for (const bad of [
    undefined, {}, { ...receipt, mobile: "919000000000" },
    { ...receipt, mobile: "90000abc00" }, { ...receipt, memberId: 0 },
    { ...receipt, memberId: 42.5 }, { ...receipt, syncedAt: now + 1 },
  ]) assert.equal(trustedMobileSyncIdentity(bad, now), null);
});
test("completed trial can finish feedback but never becomes a fresh offer", () => {
  const completed = { ...base, trialCompleted: true, trialNeedsFeedback: true, accountCreatedAt: 0 };
  assert.equal(journeyDecision(completed), "feedback_only");
  assert.equal(journeyDecision({ ...completed, trialNeedsFeedback: false }), "trial_completed");
  assert.equal(journeyDecision({ ...completed, hasPaidPt: true }), "paid_pt");
});