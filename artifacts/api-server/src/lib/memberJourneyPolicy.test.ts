import assert from "node:assert/strict";
import { test } from "node:test";
import { chartNumber, completedJourneyStages, DAY, healthHistorySchema, journeyActionSchema, journeyPlanDay, journeyStage, nextThirtyDays, permittedAction } from "./memberJourneyPolicy";

const facts = { bmi: false, trial1: false, trial2: false, feedback1: false, feedback2: false, paidPt: false };
test("structured health answers require consent and explicit answers; no extra PII fields", () => {
  const body = { version: 0, injuries: "none", conditions: "none", medications: "none", allergies: "none", exerciseRestrictions: "none", consent: true };
  assert(healthHistorySchema.safeParse(body).success);
  assert(!healthHistorySchema.safeParse({ ...body, consent: false }).success);
  assert(!healthHistorySchema.safeParse({ ...body, injuries: " " }).success);
  assert(!healthHistorySchema.safeParse({ ...body, emergencyPhone: "123" }).success);
});
test("actual prior trial facts can be backfilled without forced legacy health onboarding", () => {
  assert.equal(journeyStage({}, facts, []), "health_history");
  assert.equal(journeyStage({}, { ...facts, paidPt: true }, []), "pt_followup");
  assert.equal(journeyStage({}, { ...facts, trial1: true }, []), "rating_feedback1");
  assert.equal(journeyStage({}, { ...facts, trial2: true, feedback1: true }, []), "rating_written_feedback2");
  assert.equal(journeyStage({}, { ...facts, trial2: true, feedback1: true, feedback2: true }, []), "pt_decision");
});
test("new journey requires health then measured BMI then review then assignment", () => {
  const r = { health_history: { consent: true } };
  assert.equal(journeyStage(r, facts, []), "bca_bmi_report");
  assert.equal(journeyStage(r, { ...facts, bmi: true }, []), "health_history_review");
  assert.equal(journeyStage({ ...r, reviewed_at: new Date() }, { ...facts, bmi: true }, []), "assign_trainer");
  assert(!permittedAction("health_history", "pt_decision"));
  assert(!permittedAction("rating_feedback1", "record_trial"));
  assert(!journeyActionSchema.safeParse({ version: 1, action: "issue_chart", content: " " }).success);
});
test("IST calendar days and chart boundaries are exactly day 45 and day 90", () => {
  const start = "2026-01-01T18:29:59Z";
  assert.equal(journeyPlanDay(start, Date.parse("2026-01-01T18:30:00Z")), 2);
  const t = Date.parse("2026-01-01T00:00:00Z");
  assert.equal(chartNumber(new Date(t), t + 43 * DAY), 1);
  assert.equal(chartNumber(new Date(t), t + 44 * DAY), 2);
  assert.equal(chartNumber(new Date(t), t + 89 * DAY), 3);
  assert.equal(chartNumber(new Date(t), t + 124 * DAY), 3);
});
test("late chart issue never skips missing earlier charts and needs content records", () => {
  const now = Date.parse("2026-06-01T00:00:00Z");
  const row = { pt_decision: "no", general_trainer_id: 1, dietician_id: 2, general_started_at: "2026-01-01" };
  assert.equal(journeyStage(row, facts, [], now), "workout_chart1");
  assert.equal(journeyStage(row, facts, [1], now), "workout_chart2");
  assert.equal(journeyStage(row, facts, [1, 2], now), "workout_chart3");
  assert.equal(journeyStage(row, facts, [1, 2, 3], now), "attendance_review");
  assert.equal(journeyStage({ ...row, attendance_decision: "irregular" }, facts, [1, 2, 3], now), "attendance_followup");
});
test("30-day followups repeat across month boundaries, not same stale due date", () => {
  const first = nextThirtyDays(Date.parse("2026-01-31T10:00:00Z"));
  assert.equal(first, "2026-03-02T10:00:00.000Z");
  assert.equal(nextThirtyDays(Date.parse(first)), "2026-04-01T10:00:00.000Z");
});
test("completion ticks require evidence for each attendance and follow-up activity", () => {
  const row = { attendance_decision: "regular" };
  assert.deepEqual(completedJourneyStages(row, facts, [], []), ["attendance_review", "regular_continue"]);
  assert.deepEqual(completedJourneyStages({ attendance_decision: "irregular" }, facts, [], []), ["attendance_review"]);
  assert.deepEqual(completedJourneyStages({}, facts, [], [
    { kind: "attendance_followup", response: "Called member" },
    { kind: "member_attendance", response: "I will return" },
    { kind: "pt_followup", response: "Going well" },
    { kind: "member_pt", response: "Need a change" },
  ]), ["attendance_followup", "pt_followup"]);
});
test("completion ticks do not infer follow-ups or attendance from unrelated state", () => {
  const stages = completedJourneyStages(
    { current_stage: "attendance_followup", attendance_decision: "unknown", due_at: new Date(), pt_decision: "yes" },
    { ...facts, paidPt: true },
    [],
    [
      { kind: "other", response: "Recorded" },
      { kind: "pt_followup", response: " " },
      { kind: "member_attendance", response: null },
    ],
  );
  assert.deepEqual(stages, ["pt_decision"]);
});