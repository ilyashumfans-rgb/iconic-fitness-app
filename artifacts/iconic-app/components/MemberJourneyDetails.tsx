import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import type { MemberJourney } from "@workspace/api-client-react";

export const journeyStages: Record<string, string> = {
  health_history: "Health history",
  bca_bmi_report: "BCA / BMI report",
  health_history_review: "Staff health-history review",
  assign_trainer: "Trainer assignment",
  trial1: "Trial session 1",
  rating_feedback1: "Session 1 rating & feedback",
  trial2: "Trial session 2",
  rating_written_feedback2: "Session 2 rating & written feedback",
  pt_decision: "PT decision",
  pt_followup: "PT • recurring 30-day feedback",
  general_trainer: "General trainer assignment",
  dietician: "Dietician consultation",
  workout_chart1: "Workout chart 1 • days 1–45",
  workout_chart2: "Workout chart 2 • days 45–90",
  workout_chart3: "Workout chart 3 • days 90–125",
  attendance_review: "Attendance review",
  attendance_followup: "Attendance follow-up",
  regular_continue: "Continue regular training",
};

// Structural view model also supports staff's deliberately redacted response.
export type JourneyView = MemberJourney & { completedStages?: string[] };

export function MemberJourneyDetails({ journey: j }: { journey: JourneyView }) {
  const colors = useColors();
  const paid = j.facts.paidPt || j.ptDecision === "yes";
  // Never infer completion from stage order: legacy paid PT can skip intake.
  const completedStages = new Set(j.completedStages ?? []);
  const stages = Object.entries(journeyStages).map(([key, label]) => {
    const general = ["general_trainer", "dietician", "workout_chart1", "workout_chart2", "workout_chart3", "attendance_review", "attendance_followup", "regular_continue"].includes(key);
    return { key, label, done: completedStages.has(key), alternative: (general && paid) || (key === "pt_followup" && j.ptDecision === "no") };
  });
  const relevant = stages.filter(stage => !stage.alternative);
  const finished = relevant.filter(stage => stage.done).length;
  return (
    <View style={{ gap: 14 }}>
      <AppText weight="700" size={20}>{journeyStages[j.currentStage] ?? j.currentStage}</AppText>
      <AppText>Next: {journeyStages[j.nextAction] ?? (j.nextAction === "cycle_complete_continue_attendance" ? "Continue training and attendance follow-ups" : j.nextAction.replaceAll("_", " "))}</AppText>
      {j.dueAt ? <AppText color={j.overdue ? "#E87D65" : colors.mutedForeground}>{j.overdue ? "Overdue · " : "Due · "}{new Date(j.dueAt).toLocaleDateString()}</AppText> : null}
      <AppText size={13}>Branch #{j.gymId} · Responsible staff: {j.assigneeName || (j.assigneeId ? `#${j.assigneeId}` : "Awaiting assignment")}</AppText>
      <AppText size={13}>PT trainer: {j.trainerId ? `#${j.trainerId}` : "Not assigned"}{"\n"}General trainer: {j.generalTrainerId ? `#${j.generalTrainerId}` : "Not assigned"}{"\n"}Dietician: {j.dieticianId ? `#${j.dieticianId}` : "Not assigned"}</AppText>
      <View style={{ gap: 8 }}>
        <AppText weight="700" size={18}>Your activity checklist</AppText>
        <AppText size={13} color={colors.primary}>{finished} of {relevant.length} activities completed</AppText>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: relevant.length, now: finished }}
          style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
          <View style={{ height: 6, width: `${relevant.length ? finished / relevant.length * 100 : 0}%`, backgroundColor: colors.primary }} />
        </View>
        <AppText size={12} muted>Each activity gets its own tick when its completion is recorded. Health history, BCA and staff review are separate steps.</AppText>
      </View>
      {stages.map(({ key, label, done, alternative }) => {
        const current = key === j.currentStage;
        const recurring = ["pt_followup", "attendance_followup", "regular_continue"].includes(key);
        const status = done
          ? recurring ? "Completed · ongoing follow-ups continue" : "Completed"
          : alternative ? "Not on your selected path"
          : current ? "Next activity" : "Pending";
        return <View key={key} testID={`journey-checklist-${key}`}
          accessible accessibilityLabel={`${label}: ${status}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14,
            borderWidth: 1, borderColor: done || current ? colors.primary : colors.border,
            backgroundColor: done ? `${colors.primary}12` : colors.card }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: done ? 0 : 2,
            borderColor: current ? colors.primary : colors.border, backgroundColor: done ? colors.primary : "transparent",
            alignItems: "center", justifyContent: "center" }}>
            {done ? <Feather name="check" size={20} color="#111" /> : null}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText weight={done || current ? "700" : "500"} size={14} color={alternative && !done ? colors.mutedForeground : colors.foreground}>{label}</AppText>
            <AppText size={11} color={done || current ? colors.primary : colors.mutedForeground}>{status}</AppText>
          </View>
        </View>;
      })}
      <AppText weight="700">Workout charts</AppText>
      {j.charts.length ? j.charts.map(chart => <View key={chart.id} style={{ padding: 14, borderRadius: 12, backgroundColor: colors.card, gap: 8 }}>
        <AppText weight="700">{chart.label}</AppText>
        <AppText selectable>{chart.content ?? "Content is restricted for your role."}</AppText>
        <AppText size={12} color={colors.mutedForeground}>Issued {new Date(chart.issuedAt).toLocaleDateString()}</AppText>
      </View>) : <AppText size={13}>No workout chart issued yet. Your club will publish your actual plan here.</AppText>}
      <AppText>Attendance: {j.attendance.checkinsLast30Days} check-ins in the last 30 days</AppText>
      {j.followups.length ? <View style={{ gap: 8 }}>
        <AppText weight="700">Follow-up history</AppText>
        {j.followups.map(f => <View key={f.id} style={{ gap: 4 }}>
          <AppText size={13}>{f.kind} · {new Date(f.createdAt).toLocaleDateString()}</AppText>
          {f.response ? <AppText>{f.response}</AppText> : null}
        </View>)}
      </View> : null}
    </View>
  );
}