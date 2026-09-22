import { z } from "zod";

export const journeyRoles = ["club_manager", "trainer", "member_coordinator", "corporate", "dietician"] as const;
const note = z.string().trim().min(1).max(10000);
export const healthHistorySchema = z.object({
  version: z.number().int().nonnegative(),
  injuries: note, conditions: note, medications: note, allergies: note,
  exerciseRestrictions: note, notes: z.string().trim().max(10000).optional(),
  consent: z.literal(true),
}).strict();
const base = { version: z.number().int().nonnegative() };
export const journeyActionSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("review_health"), note }),
  z.object({ ...base, action: z.literal("assign_trainer"), staffId: z.number().int().positive() }),
  z.object({ ...base, action: z.literal("record_trial"), sessionNo: z.union([z.literal(1), z.literal(2)]) }),
  z.object({ ...base, action: z.literal("pt_decision"), decision: z.enum(["yes", "no"]) }),
  z.object({ ...base, action: z.literal("pt_followup"), response: note }),
  z.object({ ...base, action: z.literal("assign_general_trainer"), staffId: z.number().int().positive() }),
  z.object({ ...base, action: z.literal("dietician_review"), staffId: z.number().int().positive(), note }),
  z.object({ ...base, action: z.literal("issue_chart"), content: note }),
  z.object({ ...base, action: z.literal("attendance_review"), decision: z.enum(["regular", "irregular"]), note, response: note.optional(), nextDate: z.string().datetime({ offset: true }).optional() }),
  z.object({ ...base, action: z.literal("attendance_followup"), response: note, nextDate: z.string().datetime({ offset: true }) }),
]);
export const DAY = 86400000;
export function journeyPlanDay(start: Date | string | null, now = Date.now()): number {
  if (!start) return 1;
  const istDate = (time: number) => Math.floor((time + 330 * 60000) / DAY);
  return Math.max(1, istDate(now) - istDate(new Date(start).getTime()) + 1);
}
export function chartNumber(start: Date | string | null, now = Date.now()): number {
  const days = journeyPlanDay(start, now);
  return days >= 90 ? 3 : days >= 45 ? 2 : 1;
}
export const chartLabels = ["", "Workout chart 1 (1-45 days)", "Workout chart 2 (45-90 days)", "Workout chart 3 (90-125 days)"];
export function nextThirtyDays(now = Date.now()): string { return new Date(now + 30 * DAY).toISOString(); }
export type JourneyFacts = { bmi: boolean; trial1: boolean; trial2: boolean; feedback1: boolean; feedback2: boolean; paidPt: boolean };
export type JourneyCompletionFollowup = { kind: unknown; response: unknown };
export function completedJourneyStages(
  row: any,
  facts: JourneyFacts,
  chartNos: number[],
  followups: JourneyCompletionFollowup[],
): string[] {
  const hasResponse = (kinds: string[]) => followups.some(followup =>
    kinds.includes(String(followup.kind)) &&
    typeof followup.response === "string" &&
    followup.response.trim().length > 0
  );
  const attendanceDecision = row.attendance_decision === "regular" || row.attendance_decision === "irregular";
  return [
    row.health_history && "health_history", facts.bmi && "bca_bmi_report", row.reviewed_at && "health_history_review",
    row.trainer_id && "assign_trainer", facts.trial1 && "trial1", facts.feedback1 && "rating_feedback1",
    facts.trial2 && "trial2", facts.feedback2 && "rating_written_feedback2",
    (row.pt_decision || facts.paidPt) && "pt_decision", row.general_trainer_id && "general_trainer",
    row.dietician_id && "dietician", ...chartNos.map(no => `workout_chart${no}`),
    attendanceDecision && "attendance_review",
    row.attendance_decision === "regular" && "regular_continue",
    hasResponse(["attendance_followup", "member_attendance"]) && "attendance_followup",
    hasResponse(["pt_followup", "member_pt"]) && "pt_followup",
  ].filter((value): value is string => typeof value === "string");
}
export function journeyStage(row: any, facts: JourneyFacts, chartNos: number[], now = Date.now()): string {
  // Existing completed/paid facts are never reset by missing newly introduced forms.
  if (facts.paidPt || row.pt_decision === "yes") return "pt_followup";
  const finished = facts.trial2 && facts.feedback2 && facts.feedback1;
  if (!finished && row.pt_decision !== "no") {
    if (facts.trial2) return !facts.feedback1 ? "rating_feedback1" : "rating_written_feedback2";
    if (facts.trial1) return !facts.feedback1 ? "rating_feedback1" : "trial2";
    if (!row.health_history) return "health_history";
    if (!facts.bmi) return "bca_bmi_report";
    if (!row.reviewed_at) return "health_history_review";
    if (!row.trainer_id) return "assign_trainer";
    return "trial1";
  }
  if (!row.pt_decision) return "pt_decision";
  if (!row.general_trainer_id) return "general_trainer";
  if (!row.dietician_id) return "dietician";
  const chart = chartNumber(row.general_started_at, now);
  for (let i = 1; i <= chart; i++) if (!chartNos.includes(i)) return `workout_chart${i}`;
  if (row.attendance_decision === "irregular") return "attendance_followup";
  if (row.attendance_decision === "regular") return "regular_continue";
  return "attendance_review";
}
export function permittedAction(stage: string, action: string): boolean {
  const expected: Record<string, string[]> = {
    review_health: ["health_history_review"], assign_trainer: ["assign_trainer"], record_trial: ["trial1", "trial2"],
    pt_decision: ["pt_decision"], pt_followup: ["pt_followup"],
    assign_general_trainer: ["general_trainer"], dietician_review: ["dietician"],
    issue_chart: ["workout_chart1", "workout_chart2", "workout_chart3"],
    attendance_review: ["attendance_review", "regular_continue", "attendance_followup"],
    attendance_followup: ["attendance_followup"],
  };
  return expected[action]?.includes(stage) ?? false;
}