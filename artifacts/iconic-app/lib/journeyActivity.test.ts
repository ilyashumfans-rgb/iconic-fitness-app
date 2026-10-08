import assert from "node:assert/strict";
import { test } from "node:test";
import { JOURNEY_STAGE_KEYS, journeyActivity, journeyActivities, relatedLinks, isJourneyStageKey } from "./journeyActivity";

const expectedHref: Record<string, string> = {
  health_history: "/journey-health-history", bca_bmi_report: "/journey-bca-report",
  attendance_review: "/attendance", regular_continue: "/attendance",
};
const staffOnly = ["health_history_review", "assign_trainer", "trial1", "trial2", "pt_decision", "general_trainer", "dietician"];

test("every one of the 18 stages routes to a real page", () => {
  assert.equal(JOURNEY_STAGE_KEYS.length, 18);
  for (const key of JOURNEY_STAGE_KEYS) {
    const a = journeyActivity(key, { currentStage: "health_history" });
    assert.equal(a.href, expectedHref[key] ?? `/journey-activity?stage=${key}`, key);
    assert.ok(a.cta.length > 0);
    assert.equal(a.mode, staffOnly.includes(key) ? "staff" : key === "health_history" || key === "bca_bmi_report" ? "edit" : "view", key);
  }
});

test("ticks come only from completedStages, never stage order", () => {
  for (const key of JOURNEY_STAGE_KEYS) {
    const done = journeyActivity(key, { currentStage: "regular_continue", completedStages: [key] });
    assert.equal(done.done, true); assert.equal(done.status, "completed");
    const pending = journeyActivity(key, { currentStage: "regular_continue", completedStages: [] });
    assert.equal(pending.done, false, key);
    assert.notEqual(pending.status, "completed");
  }
  // Late stage does not imply earlier stages are complete.
  const all = journeyActivities({ currentStage: "pt_followup", paidPt: true, completedStages: ["pt_decision"] });
  assert.deepEqual(all.filter(a => a.done).map(a => a.key), ["pt_decision"]);
});

test("current stage is next; paid PT marks general path alternative; no-PT marks pt_followup alternative", () => {
  assert.equal(journeyActivity("trial1", { currentStage: "trial1" }).status, "next");
  assert.equal(journeyActivity("trial2", { currentStage: "trial1" }).status, "pending");
  assert.equal(journeyActivity("dietician", { currentStage: "pt_followup", paidPt: true }).status, "alternative");
  assert.equal(journeyActivity("pt_followup", { currentStage: "general_trainer", ptDecision: "no" }).status, "alternative");
  assert.equal(journeyActivity("dietician", { currentStage: "pt_followup", paidPt: true, completedStages: ["dietician"] }).status, "completed");
});

test("completed rows stay openable; editable ones stay editable", () => {
  const h = journeyActivity("health_history", { currentStage: "trial1", completedStages: ["health_history"] });
  assert.equal(h.mode, "edit"); assert.match(h.cta, /update/);
  const b = journeyActivity("bca_bmi_report", { currentStage: "trial1", completedStages: ["bca_bmi_report"] });
  assert.equal(b.mode, "view"); assert.match(b.cta, /View/); assert.equal(b.href, "/journey-bca-report");
  const bp = journeyActivity("bca_bmi_report", { currentStage: "bca_bmi_report" });
  assert.equal(bp.mode, "edit"); assert.match(bp.cta, /staff record/); assert.equal(bp.href, "/journey-bca-report");
  const c = journeyActivity("workout_chart1", { currentStage: "workout_chart2", completedStages: ["workout_chart1"] });
  assert.equal(c.mode, "view"); assert.match(c.cta, /Open/);
});

test("feedback rows are editable only when actually due", () => {
  const now = Date.parse("2026-10-07T00:00:00Z");
  assert.equal(journeyActivity("rating_feedback1", { currentStage: "rating_feedback1" }, now).mode, "edit");
  assert.equal(journeyActivity("rating_feedback1", { currentStage: "trial2", completedStages: ["rating_feedback1"] }, now).mode, "view");
  assert.equal(journeyActivity("rating_written_feedback2", { currentStage: "rating_written_feedback2" }, now).mode, "edit");
  assert.equal(journeyActivity("attendance_followup", { currentStage: "attendance_followup" }, now).mode, "edit");
  assert.equal(journeyActivity("attendance_followup", { currentStage: "attendance_review" }, now).mode, "view");
  assert.equal(journeyActivity("pt_followup", { currentStage: "pt_followup", dueAt: "2026-10-01T00:00:00Z" }, now).mode, "edit");
  assert.equal(journeyActivity("pt_followup", { currentStage: "pt_followup", dueAt: "2026-11-01T00:00:00Z" }, now).mode, "view");
  assert.equal(journeyActivity("pt_followup", { currentStage: "pt_followup", dueAt: null }, now).mode, "view");
});

test("staff-only steps never become member-editable, in any state", () => {
  for (const key of staffOnly) for (const completedStages of [[], [key]]) for (const currentStage of [key, "health_history"]) {
    assert.equal(journeyActivity(key as never, { currentStage, completedStages }).mode, "staff");
  }
});

test("related links and stage key guard", () => {
  for (const key of JOURNEY_STAGE_KEYS) for (const l of relatedLinks(key)) assert.match(l.href, /^\/[a-z-]+$/);
  assert.ok(relatedLinks("trial1").some(l => l.href === "/pt-details"));
  assert.ok(relatedLinks("workout_chart2").some(l => l.href === "/engagement-plan"));
  assert.equal(isJourneyStageKey("trial1"), true);
  assert.equal(isJourneyStageKey("../admin"), false);
});
