import { request as admin } from "./adminApi";
import { request as staff } from "./staffApi";
import { request as partner } from "./partnerApi";
import { request as agency } from "./agencyApi";
import type { MemberJourney, GetMemberJourneyOptions200 } from "@workspace/api-client-react";

export type JourneyPortal = "admin" | "staff" | "partner" | "agency";
export type Journey = MemberJourney & { completedStages?: string[]; canReviewHealth?: boolean };
export type JourneyOptions = GetMemberJourneyOptions200;
export const journeyRequest = <T,>(portal: JourneyPortal, path = "", options?: RequestInit) =>
  ({admin, staff, partner, agency})[portal]<T>(`/${portal}/member-journey${path}`, options);
const stageLabels: Record<string, string> = {
  health_history: "Health history form",
  bca_bmi_report: "BCA / BMI report",
  health_history_review: "Health history review",
  assign_trainer: "Assign trainer",
  trial1: "Day 1 — Trial session",
  rating_feedback1: "Day 1 — Rating & feedback",
  trial2: "Day 2 — Second trial",
  rating_written_feedback2: "Day 2 — Rating & written feedback",
  pt_decision: "PT taken?",
  pt_followup: "PT — 30-day feedback follow-up",
  general_trainer: "General trainer",
  dietician: "Dietician",
  workout_chart1: "Chart 1: 1–45 days",
  workout_chart2: "Chart 2: 45–90 days",
  workout_chart3: "Chart 3: 90–125 days",
  attendance_review: "Attendance — Regular?",
  attendance_followup: "Follow-up — Record response & next date",
  regular_continue: "Regular — Continue",
};
export const stageLabel = (value: string) => stageLabels[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const journeyDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not scheduled";
export const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
export const buttonClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50";