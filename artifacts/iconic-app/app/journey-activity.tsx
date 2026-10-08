import { useAuth } from "@clerk/expo";
import { ActivityIndicator, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { getListMyPtTrialFeedbackQueryKey, useListMyPtTrialFeedback, useSubmitMyMemberJourneyFeedback } from "@workspace/api-client-react";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { ModalHeader } from "@/components/ModalHeader";
import { journeyStages, type JourneyView } from "@/components/MemberJourneyDetails";
import { JourneyFeedbackForm, type JourneyFeedback } from "@/components/JourneyFeedbackForm";
import { useColors } from "@/hooks/useColors";
import { useInvalidateJourney, useMyJourney } from "@/hooks/useMyJourney";
import { memberAuthHref } from "@/lib/memberAuth";
import { isJourneyStageKey, journeyActivity, relatedLinks, type JourneyStageKey } from "@/lib/journeyActivity";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" });

export default function JourneyActivityScreen() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { stage } = useLocalSearchParams<{ stage?: string }>();
  if (!isLoaded) return <Screen><ActivityIndicator /></Screen>;
  if (!isSignedIn || !userId) return <Redirect href={memberAuthHref(`/journey-activity?stage=${stage ?? ""}`)} />;
  if (!isJourneyStageKey(stage)) return <Redirect href="/fitness-journey" />;
  return <ActivityPage key={userId} accountId={userId} stage={stage} />;
}

/** Read-only facts the member is allowed to see for each stage. */
function stageFacts(stage: JourneyStageKey, j: JourneyView): string[] {
  const staff = (id?: number | null) => (id ? `#${id}` : "Not assigned yet");
  switch (stage) {
    case "health_history_review": return [j.reviewedAt ? `Reviewed on ${fmt(j.reviewedAt)}` : "Your answers are waiting for review by branch staff.", ...(j.reviewNote ? [`Review note: ${j.reviewNote}`] : [])];
    case "assign_trainer": return [`PT trainer: ${staff(j.trainerId)}`];
    case "trial1": return [j.facts.trial1 ? "Session 1 recorded by your trainer." : "Your trainer records session 1 after you attend it."];
    case "trial2": return [j.facts.trial2 ? "Session 2 recorded by your trainer." : "Your trainer records session 2 after you attend it."];
    case "rating_feedback1": return [j.facts.feedback1 ? "Your session 1 rating is saved." : "Available after session 1 is recorded."];
    case "rating_written_feedback2": return [j.facts.feedback2 ? "Your session 2 rating and written feedback are saved." : "Available after session 2 is recorded. A rating and written comment are both required."];
    case "pt_decision": return [j.ptDecision === "yes" ? "Path: personal training" : j.ptDecision === "no" ? "Path: general training" : "Your club records your personal-training decision after your trials. This is not a payment."];
    case "pt_followup": return [j.dueAt ? `Next 30-day check-in ${new Date(j.dueAt).getTime() <= Date.now() ? "is due now" : `opens ${fmt(j.dueAt)}`}` : "Check-ins begin once personal training starts."];
    case "general_trainer": return [`General trainer: ${staff(j.generalTrainerId)}`];
    case "dietician": return [`Dietician: ${staff(j.dieticianId)}`];
    case "attendance_followup": return [`${j.attendance.checkinsLast30Days} check-ins in the last 30 days`, ...(j.dueAt ? [`Follow-up date ${fmt(j.dueAt)}`] : [])];
    default: return [];
  }
}

function ActivityPage({ accountId, stage }: { accountId: string; stage: JourneyStageKey }) {
  const colors = useColors();
  const router = useRouter();
  const query = useMyJourney(accountId);
  const invalidate = useInvalidateJourney();
  const feedback = useSubmitMyMemberJourneyFeedback();
  const journey = query.data?.journey as JourneyView | null | undefined;
  const trialSessionNo = stage === "rating_feedback1" ? 1 : stage === "rating_written_feedback2" ? 2 : 0;
  const trialFeedback = useListMyPtTrialFeedback({ query: { queryKey: [...getListMyPtTrialFeedbackQueryKey(), accountId], enabled: !!trialSessionNo, staleTime: 0 } });
  const refresh = async () => {
    await invalidate();
    const result = await query.refetch();
    if (result.error) throw result.error;
  };
  const saveFeedback = async (answers: JourneyFeedback) => {
    if (!journey) throw new Error("Your journey is not available. Please refresh.");
    await feedback.mutateAsync({ data: { ...answers, version: journey.version } });
    await refresh();
  };
  const refreshAll = async () => { await refresh(); if (trialSessionNo) await trialFeedback.refetch(); };
  const label = journeyStages[stage];
  if (query.isPending) return <Screen><ModalHeader title={label} /><ActivityIndicator color={colors.primary} /></Screen>;
  if (!journey) return <Screen contentContainerStyle={{ gap: 12 }}><ModalHeader title={label} />
    <AppText>{query.isError ? query.error.message || "Unable to load your journey." : "Your journey is not enrolled yet."}</AppText>
    <Button label="Retry" onPress={() => void query.refetch()} />
  </Screen>;
  const a = journeyActivity(stage, { currentStage: journey.currentStage, completedStages: journey.completedStages, ptDecision: journey.ptDecision, paidPt: journey.facts.paidPt, dueAt: journey.dueAt });
  const statusText = a.status === "completed" ? "Completed" : a.status === "next" ? "Next activity" : a.status === "alternative" ? "Not on your selected path" : "Pending";
  const chartNo = stage.startsWith("workout_chart") ? Number(stage.slice(-1)) : 0;
  const charts = chartNo ? journey.charts.filter(c => c.chartNo === chartNo) : [];
  const followups = journey.followups.filter(f => stage === "pt_followup" ? ["pt_followup", "member_pt"].includes(f.kind) : stage === "attendance_followup" ? ["attendance_followup", "member_attendance"].includes(f.kind) : false);
  return <Screen contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
    <ModalHeader title={label} />
    <View style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: a.done ? colors.primary : colors.border, backgroundColor: a.done ? `${colors.primary}12` : colors.card, gap: 6 }}>
      <AppText size={12} color={a.done || a.status === "next" ? colors.primary : colors.mutedForeground} weight="700">{statusText.toUpperCase()}</AppText>
      <AppText weight="700" size={18}>{label}</AppText>
      {a.mode === "staff" ? <AppText size={13} muted>This step is completed by your club. You can follow its status here.</AppText> : null}
      {stageFacts(stage, journey).map(line => <AppText key={line} size={13}>{line}</AppText>)}
    </View>
    {a.mode === "edit" ? <JourneyFeedbackForm journey={journey} onFeedback={saveFeedback} refresh={refreshAll} busy={feedback.isPending} /> : null}
    {trialSessionNo ? (() => {
      const mine = (trialFeedback.data ?? []).find(f => f.sessionNo === trialSessionNo);
      return trialFeedback.isPending ? <ActivityIndicator color={colors.primary} /> : trialFeedback.isError ? <View style={{ gap: 8 }}>
        <AppText size={13}>Unable to load your saved feedback.</AppText>
        <Button label="Retry" variant="secondary" size="sm" onPress={() => void trialFeedback.refetch()} />
      </View> : mine ? <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.card, gap: 6 }}>
        <AppText size={12} muted>Your saved feedback</AppText>
        <AppText weight="700" size={16}>Rating {mine.rating}/5</AppText>
        <AppText selectable>{mine.comment?.trim() ? mine.comment : "No written comment."}</AppText>
      </View> : null;
    })() : null}
    {chartNo ? charts.length ? charts.map(chart => <View key={chart.id} style={{ padding: 14, borderRadius: 12, backgroundColor: colors.card, gap: 8 }}>
      <AppText weight="700">{chart.label}</AppText>
      <AppText selectable>{chart.content ?? "Content is restricted for your role."}</AppText>
      <AppText size={12} muted>Issued {fmt(chart.issuedAt)}</AppText>
    </View>) : <AppText size={13}>This chart has not been issued yet. Your general trainer publishes it when this phase begins.</AppText> : null}
    {followups.length ? <View style={{ gap: 8 }}>
      <AppText weight="700">History</AppText>
      {followups.map(f => <View key={f.id} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.card, gap: 4 }}>
        <AppText size={12} muted>{f.kind.startsWith("member_") ? "Your response" : "Club note"} · {fmt(f.createdAt)}</AppText>
        {f.response ? <AppText>{f.response}</AppText> : null}
      </View>)}
    </View> : null}
    {a.status !== "completed" && a.mode !== "edit" ? <View style={{ gap: 4 }}>
      <AppText weight="700" size={14}>Next step</AppText>
      <AppText size={13}>{journey.currentStage === stage ? "This is your current activity." : `Your current activity is ${journeyStages[journey.currentStage] ?? journey.currentStage}.`} Questions? Contact {journey.assigneeName || "your branch front desk"}{journey.assigneeName ? " (your responsible staff)" : ""}.</AppText>
    </View> : null}
    {relatedLinks(stage).map(l => <Button key={l.href} label={l.label} variant="secondary" onPress={() => router.push(l.href as Href)} />)}
    <Button label="Back to my journey" variant="ghost" onPress={() => router.canGoBack() ? router.back() : router.replace("/fitness-journey")} />
  </Screen>;
}
