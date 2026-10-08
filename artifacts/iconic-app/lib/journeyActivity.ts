// Pure routing/status model for the member fitness-journey checklist.
// Ticks come ONLY from backend completedStages; never from stage order.

export const JOURNEY_STAGE_KEYS = [
  "health_history", "bca_bmi_report", "health_history_review", "assign_trainer",
  "trial1", "rating_feedback1", "trial2", "rating_written_feedback2", "pt_decision",
  "pt_followup", "general_trainer", "dietician", "workout_chart1", "workout_chart2",
  "workout_chart3", "attendance_review", "attendance_followup", "regular_continue",
] as const;
export type JourneyStageKey = typeof JOURNEY_STAGE_KEYS[number];

export type JourneyActivityInput = {
  currentStage: string;
  completedStages?: string[];
  ptDecision?: string | null;
  paidPt?: boolean;
  dueAt?: string | null;
};

export type ActivityStatus = "completed" | "next" | "pending" | "alternative";
/** edit: member can open and change; view: member opens a read-only page; staff: club-owned step (status + contact only). */
export type ActivityMode = "edit" | "view" | "staff";

export type JourneyActivity = {
  key: JourneyStageKey;
  status: ActivityStatus;
  done: boolean;
  mode: ActivityMode;
  href: string;
  cta: string;
};

const GENERAL_PATH = ["general_trainer", "dietician", "workout_chart1", "workout_chart2", "workout_chart3", "attendance_review", "attendance_followup", "regular_continue"];
const detail = (key: string) => `/journey-activity?stage=${key}`;

export function isAlternativePath(key: string, j: JourneyActivityInput): boolean {
  const paid = !!j.paidPt || j.ptDecision === "yes";
  return (GENERAL_PATH.includes(key) && paid) || (key === "pt_followup" && j.ptDecision === "no");
}

export function feedbackDue(key: string, j: JourneyActivityInput, now = Date.now()): boolean {
  if (key !== j.currentStage) return false;
  if (key === "rating_feedback1" || key === "rating_written_feedback2" || key === "attendance_followup") return true;
  if (key === "pt_followup") return !!j.dueAt && new Date(j.dueAt).getTime() <= now;
  return false;
}

export function journeyActivity(key: JourneyStageKey, j: JourneyActivityInput, now = Date.now()): JourneyActivity {
  const done = (j.completedStages ?? []).includes(key);
  const alternative = isAlternativePath(key, j);
  const status: ActivityStatus = done ? "completed" : alternative ? "alternative" : key === j.currentStage ? "next" : "pending";
  const due = feedbackDue(key, j, now);
  switch (key) {
    case "health_history":
      return { key, status, done, mode: "edit", href: "/journey-health-history", cta: done ? "View or update answers" : "Fill in health history" };
    case "bca_bmi_report":
      return { key, status, done, mode: done ? "view" : "edit", href: "/journey-bca-report", cta: done ? "View BCA / BMI report" : "Book assessment (staff record results)" };
    case "rating_feedback1":
    case "rating_written_feedback2":
    case "pt_followup":
    case "attendance_followup":
      return { key, status, done, mode: due ? "edit" : "view", href: detail(key), cta: due ? "Give feedback" : done ? "View feedback status" : "View details" };
    case "attendance_review":
    case "regular_continue":
      return { key, status, done, mode: "view", href: "/attendance", cta: "Open attendance history" };
    case "workout_chart1":
    case "workout_chart2":
    case "workout_chart3":
      return { key, status, done, mode: "view", href: detail(key), cta: done ? "Open workout chart" : "View chart status" };
    default:
      return { key, status, done, mode: "staff", href: detail(key), cta: "View status & contact" };
  }
}

export function journeyActivities(j: JourneyActivityInput, now = Date.now()): JourneyActivity[] {
  return JOURNEY_STAGE_KEYS.map(key => journeyActivity(key, j, now));
}

/** Related real pages linked from the activity detail screen. */
export function relatedLinks(key: string): { label: string; href: string }[] {
  if (["assign_trainer", "trial1", "trial2", "rating_feedback1", "rating_written_feedback2", "pt_decision", "pt_followup"].includes(key)) return [{ label: "Personal training details", href: "/pt-details" }];
  if (["general_trainer", "dietician", "workout_chart1", "workout_chart2", "workout_chart3"].includes(key)) return [{ label: "Engagement plan", href: "/engagement-plan" }];
  if (["attendance_review", "attendance_followup", "regular_continue"].includes(key)) return [{ label: "Attendance history", href: "/attendance" }];
  if (key === "health_history_review") return [{ label: "Your health history", href: "/journey-health-history" }, { label: "BCA / BMI report", href: "/assessment" }];
  return [];
}

export function isJourneyStageKey(value: unknown): value is JourneyStageKey {
  return typeof value === "string" && (JOURNEY_STAGE_KEYS as readonly string[]).includes(value);
}
