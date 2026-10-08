import { useState } from "react";
import { TextInput, View } from "react-native";
import { getListMyPtTrialFeedbackQueryKey, useSubmitPtTrialFeedback } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import type { JourneyView } from "@/components/MemberJourneyDetails";

export type JourneyFeedback = { kind: "pt" | "attendance"; response: string; rating?: number };

/** Renders only when the backend's current stage actually expects member feedback. */
export function JourneyFeedbackForm({ journey, onFeedback, refresh, busy }: {
  journey: JourneyView;
  onFeedback: (feedback: JourneyFeedback) => Promise<void>;
  refresh: () => Promise<void>;
  busy: boolean;
}) {
  const colors = useColors();
  const client = useQueryClient();
  const trialFeedback = useSubmitPtTrialFeedback();
  const [response, setResponse] = useState("");
  const [rating, setRating] = useState(0);
  const [error, setError] = useState("");
  const trialSession = journey.currentStage === "rating_feedback1" ? 1 : journey.currentStage === "rating_written_feedback2" ? 2 : null;
  const ptDue = journey.currentStage === "pt_followup" && !!journey.dueAt && new Date(journey.dueAt).getTime() <= Date.now();
  const attendanceDue = journey.currentStage === "attendance_followup";
  if (!trialSession && !ptDue && !attendanceDue) return null;
  const submit = async () => {
    setError("");
    try {
      if (trialSession) {
        await trialFeedback.mutateAsync({ data: { sessionNo: trialSession, rating, comment: response.trim() } });
        await client.invalidateQueries({ queryKey: getListMyPtTrialFeedbackQueryKey() });
        await client.invalidateQueries({ queryKey: ["/api/memberships/journey"] });
        await refresh();
      } else {
        await onFeedback({ kind: ptDue ? "pt" : "attendance", response: response.trim(), ...(rating ? { rating } : {}) });
      }
      setResponse("");
      setRating(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save feedback. Please retry.");
    }
  };
  return <View style={{ gap: 12 }}>
    <AppText weight="700">{trialSession ? `Session ${trialSession} feedback` : ptDue ? "Your 30-day PT check-in" : "Reply to attendance follow-up"}</AppText>
    <AppText size={13}>Your response is saved to your journey. Staff still confirm reviews and attendance decisions.</AppText>
    {!attendanceDue ? <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map(n => <View key={n} style={{ flex: 1 }}><Button label={`${n}/5`} size="sm" variant={rating === n ? "primary" : "secondary"} onPress={() => setRating(n)} /></View>)}
    </View> : null}
    <TextInput multiline accessibilityLabel="Journey feedback" placeholder={trialSession === 1 ? "Comments (optional)" : "Written response (required)"} placeholderTextColor={colors.mutedForeground}
      value={response} onChangeText={setResponse} maxLength={10000}
      style={{ minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.foreground, textAlignVertical: "top" }} />
    {error ? <AppText color={colors.destructive}>{error}</AppText> : null}
    <Button label="Submit feedback" loading={busy || trialFeedback.isPending}
      disabled={!!trialSession && !rating || trialSession !== 1 && !response.trim()}
      onPress={() => void submit()} />
  </View>;
}
