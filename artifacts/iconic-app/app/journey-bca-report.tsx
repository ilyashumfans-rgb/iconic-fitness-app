import { useAuth } from "@clerk/expo";
import { ActivityIndicator, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { customFetch, getGetMyAssessmentQueryKey, useGetMyAssessment } from "@workspace/api-client-react";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { ModalHeader } from "@/components/ModalHeader";
import { useColors } from "@/hooks/useColors";
import { useMyJourney } from "@/hooks/useMyJourney";
import { memberAuthHref } from "@/lib/memberAuth";
import { istDateLabel } from "@/lib/dates";

type BmiRecord = { id: number; staffName: string; heightCm: number | null; weightKg: number | null; bmi: number | null; note: string; createdAt: string };

export default function JourneyBcaReportScreen() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <Screen><ActivityIndicator /></Screen>;
  if (!isSignedIn || !userId) return <Redirect href={memberAuthHref("/journey-bca-report")} />;
  return <BcaReport key={userId} accountId={userId} />;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" });

function BcaReport({ accountId }: { accountId: string }) {
  const colors = useColors();
  const router = useRouter();
  const journey = useMyJourney(accountId);
  // Same member-owned endpoint the PT details "records" section uses; no new access.
  const records = useQuery({
    queryKey: ["/api/pt/records/mine", accountId],
    queryFn: () => customFetch<{ bmi: BmiRecord[] }>("/api/pt/records/mine"),
    staleTime: 0,
  });
  const assessment = useGetMyAssessment({ query: { queryKey: [...getGetMyAssessmentQueryKey(), accountId] } });
  const done = (journey.data?.journey?.completedStages ?? []).includes("bca_bmi_report");
  const bmi = (records.data?.bmi ?? []).filter(r => r.bmi != null || (r.heightCm != null && r.weightKg != null));
  const booking = assessment.data?.booking;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/fitness-journey"));
  return <Screen contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
    <ModalHeader title="BCA / BMI report" />
    <View style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: done ? colors.primary : colors.border, backgroundColor: done ? `${colors.primary}12` : colors.card, gap: 6 }}>
      <AppText size={12} weight="700" color={done ? colors.primary : colors.mutedForeground}>{done ? "COMPLETED" : "PENDING"}</AppText>
      <AppText size={13}>{done ? "Your measurements have been recorded by club staff." : "This activity is completed only when club staff record your measurements. Booking a slot reserves the assessment; it does not complete it."}</AppText>
    </View>
    <AppText weight="700" size={18}>Recorded measurements</AppText>
    {records.isPending ? <ActivityIndicator color={colors.primary} /> : records.isError ? <View style={{ gap: 8 }}>
      <AppText>Unable to load your records.</AppText>
      <Button label="Retry" variant="secondary" onPress={() => void records.refetch()} />
    </View> : bmi.length ? bmi.map(r => <View key={r.id} style={{ padding: 14, borderRadius: 12, backgroundColor: colors.card, gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText weight="700" size={20}>BMI {r.bmi ?? (r.heightCm && r.weightKg ? (r.weightKg / (r.heightCm / 100) ** 2).toFixed(1) : "-")}</AppText>
        <AppText size={12} muted>{fmt(r.createdAt)}</AppText>
      </View>
      <AppText size={13}>Height {r.heightCm ?? "-"} cm · Weight {r.weightKg ?? "-"} kg</AppText>
      {r.note ? <AppText size={13} selectable>{r.note}</AppText> : null}
      <AppText size={12} muted>Recorded by {r.staffName || "club staff"}</AppText>
    </View>) : <AppText size={13} muted>No measurements recorded yet.</AppText>}
    {!done ? <View style={{ gap: 10 }}>
      <AppText weight="700" size={16}>Assessment booking</AppText>
      {assessment.isPending ? <ActivityIndicator color={colors.primary} /> : booking ? <AppText size={13}>Booked for {istDateLabel(booking.slotDate)} at {booking.slotTime} IST · {booking.gymName}. Staff will record results at your visit.</AppText>
        : <AppText size={13}>{assessment.data?.eligible === false ? "Booking opens once your kick-starter trial is accepted. Contact your branch front desk." : "No assessment booked yet."}</AppText>}
      <Button label={booking ? "Manage booking" : "Book assessment"} onPress={() => router.push("/assessment")} />
    </View> : null}
    <Button label="Back to my journey" variant="ghost" onPress={back} />
  </Screen>;
}
