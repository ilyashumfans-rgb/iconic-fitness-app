import { useAuth } from "@clerk/expo";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyAssessmentQueryKey, useSaveMyMemberJourneyHealthHistory } from "@workspace/api-client-react";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { ModalHeader } from "@/components/ModalHeader";
import { JourneyHealthHistory, type HealthHistoryAnswers, type SavedHealthHistory } from "@/components/JourneyHealthHistory";
import { useColors } from "@/hooks/useColors";
import { useInvalidateJourney, useMyJourney } from "@/hooks/useMyJourney";
import { memberAuthHref } from "@/lib/memberAuth";

export default function JourneyHealthHistoryScreen() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <Screen><ActivityIndicator /></Screen>;
  if (!isSignedIn || !userId) return <Redirect href={memberAuthHref("/journey-health-history")} />;
  return <HealthHistoryPage key={userId} accountId={userId} />;
}

function HealthHistoryPage({ accountId }: { accountId: string }) {
  const colors = useColors();
  const router = useRouter();
  const client = useQueryClient();
  const query = useMyJourney(accountId);
  const invalidate = useInvalidateJourney();
  const save = useSaveMyMemberJourneyHealthHistory();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  // Form key changes ONLY after our own successful save, so periodic/focus
  // refetches (e.g. a staff review bumping version) never reset a dirty draft.
  const [formKey, setFormKey] = useState(0);
  const journey = query.data?.journey;
  const initial = journey?.healthHistory as SavedHealthHistory;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/fitness-journey"));
  const submittedAt = typeof initial?.submittedAt === "string" ? initial.submittedAt : null;
  const submit = async (answers: HealthHistoryAnswers) => {
    if (!journey) return;
    setError(""); setSaved(false);
    try {
      await save.mutateAsync({ data: { ...answers, version: journey.version } });
      await Promise.all([invalidate(), client.invalidateQueries({ queryKey: getGetMyAssessmentQueryKey() })]);
      await query.refetch();
      setFormKey(k => k + 1);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save health history. Refresh and try again.");
    }
  };
  return <Screen contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
    <ModalHeader title="Health history" />
    {query.isPending ? <ActivityIndicator color={colors.primary} /> : !journey ? <View style={{ gap: 12 }}>
      <AppText>{query.isError ? query.error.message || "Unable to load your journey." : "Your journey is not enrolled yet. Ask your club to confirm your membership branch."}</AppText>
      <Button label="Retry" onPress={() => void query.refetch()} />
    </View> : <>
      {submittedAt ? <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.card, gap: 4 }}>
        <AppText size={13} weight="700">Last submitted {new Date(submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</AppText>
        <AppText size={12} muted>{journey.reviewedAt ? "Reviewed by your club." : "Awaiting staff review."}</AppText>
      </View> : null}
      {saved ? <View style={{ gap: 8 }}>
        <AppText color={colors.primary} weight="700">Saved. Your club will review your answers.</AppText>
        <Button label="Back to my journey" variant="secondary" onPress={back} />
      </View> : null}
      {error ? <AppText color={colors.destructive}>{error}</AppText> : null}
      <JourneyHealthHistory key={formKey} initial={initial && Object.keys(initial).length ? initial : null} busy={save.isPending} onSubmit={submit} />
    </>}
  </Screen>;
}
