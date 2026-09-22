import { useState } from "react";
import { Link } from "wouter";
import type { MemberJourneyAction as JourneyActionInput } from "@workspace/api-client-react";
import { buttonClass, fieldClass, journeyRequest, type Journey, type JourneyOptions, type JourneyPortal } from "@/lib/memberJourney";

const actions: Record<string, {action: JourneyActionInput["action"]; label: string; text?: string; staff?: string; choices?: NonNullable<JourneyActionInput["decision"]>[]; date?: boolean; sessionNo?: 1 | 2}> = {
  health_history_review: {action: "review_health", label: "Record health review", text: "Review note"},
  assign_trainer: {action: "assign_trainer", label: "Assign trial trainer", staff: "trainer"},
  trial1: {action: "record_trial", label: "Record completed trial session 1", sessionNo: 1},
  trial2: {action: "record_trial", label: "Record completed trial session 2", sessionNo: 2},
  pt_decision: {action: "pt_decision", label: "Record PT decision", choices: ["yes", "no"]},
  pt_followup: {action: "pt_followup", label: "Record 30-day PT follow-up", text: "Member response"},
  general_trainer: {action: "assign_general_trainer", label: "Assign general trainer", staff: "trainer"},
  dietician: {action: "dietician_review", label: "Record dietician review", staff: "dietician", text: "Dietician review note"},
  workout_chart1: {action: "issue_chart", label: "Issue chart · days 1–45", text: "Workout chart: exercises, sets, reps, schedule and guidance"},
  workout_chart2: {action: "issue_chart", label: "Issue chart · days 45–90", text: "Workout chart: exercises, sets, reps, schedule and guidance"},
  workout_chart3: {action: "issue_chart", label: "Issue chart · days 90–125", text: "Workout chart: exercises, sets, reps, schedule and guidance"},
  attendance_review: {action: "attendance_review", label: "Classify attendance", text: "Attendance review note", choices: ["regular", "irregular"]},
  regular_continue: {action: "attendance_review", label: "Review ongoing attendance", text: "Attendance review note", choices: ["regular", "irregular"]},
  attendance_followup: {action: "attendance_followup", label: "Record attendance follow-up", text: "Member response", date: true},
};

export function MemberJourneyAction({journey, options, portal, onSaved}: {journey: Journey; options: JourneyOptions; portal: JourneyPortal; onSaved: (value: Journey) => void}) {
  const [text, setText] = useState("");
  const [staffId, setStaffId] = useState("");
  const [decision, setDecision] = useState<NonNullable<JourneyActionInput["decision"]> | "">("");
  const [response, setResponse] = useState("");
  const [date, setDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(journey.version);
  if (!journey.canManage || portal === "agency") return <p className="text-sm text-slate-500">Read-only access. Sensitive information may be withheld.</p>;
  const config = actions[journey.currentStage];
  const irregular = config?.action === "attendance_review" && decision === "irregular";
  const followupNotDue = config?.action === "pt_followup" && !!journey.dueAt && new Date(journey.dueAt).getTime() > Date.now();
  if (!journey.canReviewHealth && (config?.action === "review_health" || config?.action === "dietician_review")) return <p className="text-sm text-slate-500">This clinical review must be completed by authorized clinical staff. Your account does not have permission to record this review.</p>;
  if (!config) return <div className="space-y-2 text-sm">
    <p>Next: {journey.nextAction}. This step is verified from the existing member health, assessment, booking or feedback tools; it cannot be marked complete here.</p>
    {journey.currentStage === "health_history" && <p>Ask the member to submit their health history in the member app.</p>}
    {portal === "admin" && <Link data-testid="link-journey-assessments" className="underline" href="/admin/member-engagement?tab=assessments">Open fitness assessments</Link>}
    <Link data-testid="link-journey-pt" className="ml-3 underline" href={portal === "partner" ? "/partner/trainer-bookings" : `/${portal}/pt`}>Open PT tools</Link>
  </div>;
  const candidates = options.assignees.filter(a => a.gymId === journey.gymId && a.journeyRole === config.staff);
  return <form className="space-y-3" onSubmit={async e => {
    e.preventDefault();
    if (followupNotDue) return;
    setPending(true); setError("");
    const body: JourneyActionInput = {version, action: config.action};
    if (config.staff) body.staffId = Number(staffId);
    if (config.sessionNo) body.sessionNo = config.sessionNo;
    if (config.choices && decision) body.decision = decision;
    if (config.text) body[config.action === "issue_chart" ? "content" : config.action.endsWith("followup") ? "response" : "note"] = text.trim();
    if (config.date || irregular) body.nextDate = new Date(date).toISOString();
    if (irregular) body.response = response.trim();
    try {
      const saved = await journeyRequest<Journey>(portal, `/${journey.userId}/actions`, {method: "POST", body: JSON.stringify(body)});
      setText(""); setResponse(""); setStaffId(""); setDecision(""); setDate(""); setVersion(saved.version); onSaved(saved);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save. Retry or refresh the journey."); }
    finally { setPending(false); }
  }}>
    <fieldset disabled={pending} className="space-y-3">
    <h3 className="font-semibold">{config.label}</h3>
    {config.action === "pt_followup" && journey.dueAt && <p data-testid="text-journey-monthly-followup-due" className="text-sm">Monthly PT follow-up due: {new Date(journey.dueAt).toLocaleString()}.{followupNotDue ? " Recording will be available when due; refresh the journey then." : ""}</p>}
    {config.sessionNo && <p className="text-sm">Confirm only after the assigned trainer has delivered this session. This records the actual PT program session{journey.trialProgramId ? ` (program #${journey.trialProgramId})` : ""}; member rating and written feedback remain separate prerequisites.</p>}
    {version !== journey.version && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">This journey changed. Your draft is preserved. Review the latest details before continuing.<button type="button" data-testid="button-journey-accept-version" className={`${buttonClass} mt-2`} onClick={() => {setVersion(journey.version); setError("");}}>I reviewed the latest version; keep my draft</button></div>}
    {config.staff && <label className="block text-sm">Branch {config.staff}<select data-testid="select-journey-assignee" required className={fieldClass} value={staffId} onChange={e => setStaffId(e.target.value)}><option value="">Select an eligible assignee</option>{candidates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>{!candidates.length && <span className="text-amber-700">No eligible assignee. Ask an administrator to configure branch and role access.</span>}</label>}
    {config.choices && <label className="block text-sm">Decision<select data-testid="select-journey-decision" required className={fieldClass} value={decision} onChange={e => setDecision(e.target.value as typeof decision)}><option value="">Select decision</option>{config.choices.map(c => <option key={c}>{c}</option>)}</select></label>}
    {config.text && <label className="block text-sm">{config.text}<textarea data-testid="input-journey-note" required maxLength={10000} rows={5} className={fieldClass} value={text} onChange={e => setText(e.target.value)} /></label>}
    {irregular && <label className="block text-sm">Member response<textarea data-testid="input-journey-attendance-response" required maxLength={10000} rows={3} className={fieldClass} value={response} onChange={e => setResponse(e.target.value)} /></label>}
    {(config.date || irregular) && <label className="block text-sm">Next follow-up date and time<input data-testid="input-journey-next-date" required type="datetime-local" className={fieldClass} value={date} onChange={e => setDate(e.target.value)} /></label>}
    {error && <p role="alert" data-testid="status-journey-action-error" className="text-red-700">{error} Refresh to load the latest version if another person changed this journey.</p>}
    <button data-testid="button-journey-save" className={buttonClass} disabled={pending || followupNotDue || version !== journey.version || (!!config.text && !text.trim()) || (irregular && !response.trim())}>{pending ? "Saving…" : error ? "Retry save" : config.label}</button>
    </fieldset>
  </form>;
}