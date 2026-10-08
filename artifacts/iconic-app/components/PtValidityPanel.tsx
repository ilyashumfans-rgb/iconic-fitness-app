import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { getGetMyPtProgramQueryKey, useGetMyPtProgram } from "@workspace/api-client-react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";
import { istDateLabel, istDateStr } from "@/lib/dates";
import { ptBadge, ptValidityHeadline, ptValidityViews, type PtValidityView } from "@/lib/ptValidity";

/** Current paid PT plan validity. Renders nothing when the member has no plan. */
export function PtValidityPanel({ tone = "card" }: { tone?: "card" | "onDark" }) {
  const colors = useColors();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const q = useGetMyPtProgram({
    query: {
      queryKey: [...getGetMyPtProgramQueryKey(), userId],
      enabled: isLoaded && !!isSignedIn && !!userId,
      staleTime: 60_000,
    },
  });
  const dark = tone === "onDark";
  const fg = dark ? "#F2F2F2" : colors.foreground;
  const muted = dark ? "#A6A6A6" : colors.mutedForeground;
  const box = { borderRadius: 12, padding: 12, gap: 8, borderWidth: 1,
    borderColor: dark ? "#2A2A2A" : colors.border, backgroundColor: dark ? "#121212" : colors.card } as const;

  if (!isSignedIn) return null;
  if (q.isLoading) return <View style={box}><AppText size={12} color={muted}>Loading personal training plan...</AppText></View>;
  if (q.isError) return (
    <Pressable style={box} onPress={() => void q.refetch()} accessibilityRole="button">
      <AppText size={12} color={muted}>Personal training plan unavailable. Tap to retry.</AppText>
    </Pressable>
  );
  const views = ptValidityViews(q.data, istDateStr());
  const sourceDown = q.data?.externalPlanSource === "unavailable";
  if (views.length === 0 && !sourceDown) return null;
  const fmt = (d: string | null) => (d ? istDateLabel(d) : "Not set");
  const row = (v: PtValidityView) => {
    const accent = v.state === "expired" ? colors.destructive : v.state === "active" ? colors.primary : colors.warning;
    const who = v.source === "external" ? "" : v.trainerName ? `Trainer: ${v.trainerName}` : "Trainer assignment pending";
    return (
      <View key={v.key} style={box}
        accessibilityLabel={`Personal training: ${v.packageName}. ${ptValidityHeadline(v)}`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name={v.state === "pending" ? "clock" : "user-check"} size={14} color={accent} />
          <AppText size={11} weight="700" color={muted} style={{ letterSpacing: 0.6 }}>PERSONAL TRAINING</AppText>
          <View style={{ marginLeft: "auto", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: accent + "26" }}>
            <AppText size={11} weight="700" color={accent} style={{ textTransform: "capitalize" }}>{ptBadge(v)}</AppText>
          </View>
        </View>
        <View>
          <AppText weight="700" size={15} color={fg}>{v.packageName}</AppText>
          <AppText size={12} color={muted}>{[who, v.branchName].filter(Boolean).join(" · ")}</AppText>
        </View>
        <AppText size={13} weight="600" color={accent}>{ptValidityHeadline(v)}</AppText>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          {v.source === "pending" ? (
            <AppText size={12} color={muted}>
              {[v.bookedAtIst ? `Booking placed ${istDateLabel(v.bookedAtIst)}` : "", v.requestedStartDate ? `Requested start ${istDateLabel(v.requestedStartDate)}` : "", "Validity dates awaiting confirmation"].filter(Boolean).join(" · ")}
            </AppText>
          ) : <AppText size={12} color={muted}>{fmt(v.startDate)} to {fmt(v.endDate)}</AppText>}
          {v.totalSessions !== null || v.sessionsDelivered !== null ? (
            <AppText size={12} color={muted}>
              {[v.totalSessions !== null ? `${v.totalSessions} sessions in plan` : "", v.sessionsDelivered !== null ? `${v.sessionsDelivered} delivered` : ""].filter(Boolean).join(" · ")}
            </AppText>
          ) : null}
        </View>
      </View>
    );
  };
  return (
    <View style={{ gap: 8 }}>
      {views.map(row)}
      {sourceDown ? <AppText size={11} color={muted}>PT records from the gym system could not be checked right now.</AppText> : null}
    </View>
  );
}
