import { useAuth } from "@clerk/expo";
import { useCallback, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMyMemberJourneyQueryKey,
  getGetMyAssessmentQueryKey,
  useGetMyMemberJourney,
  useSaveMyMemberJourneyHealthHistory,
  useSubmitMyMemberJourneyFeedback,
} from "@workspace/api-client-react";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { ModalHeader } from "@/components/ModalHeader";
import { MemberJourneyContent, type JourneyFeedback } from "@/components/MemberJourneyContent";
import type { HealthHistoryAnswers } from "@/components/JourneyHealthHistory";
import { useColors } from "@/hooks/useColors";
import { memberAuthHref } from "@/lib/memberAuth";

export default function FitnessJourneyScreen() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <Screen><ActivityIndicator /></Screen>;
  if (!isSignedIn || !userId) return <Redirect href={memberAuthHref("/fitness-journey")} />;
  // Unmount forms and requests when the authenticated account changes.
  return <AccountJourney key={userId} accountId={userId} />;
}

function AccountJourney({ accountId }: { accountId: string }) {
  const colors = useColors();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const query = useGetMyMemberJourney({
    query: {
      queryKey: [...getGetMyMemberJourneyQueryKey(), accountId],
      enabled: !!accountId,
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: "always",
    },
  });
  useFocusEffect(useCallback(() => {
    void query.refetch({ cancelRefetch: false });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void query.refetch({ cancelRefetch: false });
    }, 30000);
    return () => clearInterval(timer);
  }, [query.refetch]));
  const health = useSaveMyMemberJourneyHealthHistory();
  const feedback = useSubmitMyMemberJourneyFeedback();
  const journey = query.data?.journey;
  const refresh = async () => {
    const result = await query.refetch();
    if (result.error) throw result.error;
  };
  const saveHealth = async (answers: HealthHistoryAnswers) => {
    if (!journey) return;
    setError("");
    try {
      await health.mutateAsync({ data: { ...answers, version: journey.version } });
      await client.invalidateQueries({ queryKey: getGetMyAssessmentQueryKey() });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save health history. Refresh and try again.");
    }
  };
  const saveFeedback = async (answers: JourneyFeedback) => {
    if (!journey) throw new Error("Your journey is not available. Please refresh.");
    await feedback.mutateAsync({ data: { ...answers, version: journey.version } });
    await refresh();
  };
  return <Screen contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
    <ModalHeader title="My fitness journey" />
    {query.isPending ? <ActivityIndicator color={colors.primary} /> : query.isError && !journey ? <View style={{ gap: 12 }}>
      <AppText>{query.error.message || "Unable to load your journey."}</AppText>
      <Button label="Retry" onPress={() => void query.refetch()} />
    </View> : !journey ? <View style={{ gap: 12 }}>
      <AppText weight="700">Your journey is not enrolled yet</AppText>
      <AppText>{query.data?.branchRequired ? "Ask your club to confirm your membership branch and enroll your journey." : "Your club can enroll your existing membership in the shared fitness journey. This does not change your plan or trial eligibility."}</AppText>
      <Button label="Refresh" variant="secondary" onPress={() => void query.refetch()} />
    </View> : <>
      {query.isError ? <AppText size={12} muted>Could not refresh. Showing your last saved progress; use Refresh journey to retry.</AppText> : null}
      {error ? <AppText color={colors.destructive}>{error}</AppText> : null}
      <MemberJourneyContent key={`${accountId}:${journey.version}:${journey.currentStage}`} journey={journey}
        busy={health.isPending || feedback.isPending} onHealthSubmit={saveHealth} onFeedback={saveFeedback} refresh={refresh} />
      <Button label="Refresh journey" variant="ghost" onPress={() => { setError(""); void query.refetch(); }} />
    </>}
  </Screen>;
}