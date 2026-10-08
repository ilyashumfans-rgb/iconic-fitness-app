import { Feather } from "@expo/vector-icons";
import { getGetNetworkCoachOverviewQueryKey, useGetNetworkCoachOverview } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { RatingDisplay } from "@/components/RatingDisplay";
import { Screen } from "@/components/Screen";
import { Chip, EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { BackHeader, CoachAvatar, inr } from "./shared";

/** Iconic Network Coach: coaches across ALL branches with a top branch filter and compact avatars. */
export function NetworkCoachBrowser({ title, initialCategoryId }: { title: string; initialCategoryId?: string }) {
  const c = useColors();
  const router = useRouter();
  const [gymId, setGymId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId);
  const params = { ...(gymId ? { gymId } : {}), ...(categoryId ? { categoryId } : {}) };
  const q = useGetNetworkCoachOverview(params, { query: { queryKey: getGetNetworkCoachOverviewQueryKey(params), staleTime: 30_000 } });
  const data = q.data;
  const prices = data ? (["30", "45", "60"] as const).filter(k => (data.prices[k] ?? 0) > 0) : [];

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <BackHeader title={data?.category?.title ?? title} subtitle="Live 1:1 video sessions · any branch"
        right={
          <Pressable onPress={() => router.push("/network-coach/sessions")} testID="button-my-sessions" accessibilityLabel="My online sessions"
            style={[styles.iconBtn, { backgroundColor: c.elevated, borderColor: c.border }]}>
            <Feather name="calendar" size={18} color={c.primary} />
          </Pressable>
        } />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }} testID="category-filter">
        {(data?.categories ?? []).map(category => <Chip key={category.id} label={category.title} active={data?.category?.id === category.id} onPress={() => setCategoryId(category.id)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }} testID="branch-filter">
        <Chip label="All branches" active={gymId === null} onPress={() => setGymId(null)} />
        {(data?.branches ?? []).map(b => <Chip key={b.id} label={b.name} active={gymId === b.id} onPress={() => setGymId(b.id)} />)}
      </ScrollView>

      {prices.length ? (
        <View style={[styles.priceBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Feather name="video" size={15} color={c.primary} />
          <AppText size={12.5} style={{ flex: 1 }}>
            {prices.map(k => `${k} min ${inr(data!.prices[k]!)}`).join("  ·  ")}
          </AppText>
        </View>
      ) : null}

      {q.isLoading ? <LoadingView /> : q.isError ? <ErrorView onRetry={() => void q.refetch()} /> : !data?.category ? (
        <EmptyState icon="video-off" title="Online coaching isn't live yet" message="Check back soon — our team is setting up online sessions." />
      ) : data.trainers.length === 0 ? (
        <EmptyState icon="users" title="No online coaches here yet" message={gymId ? "Try All branches to see coaches from every Iconic location." : "Coaches are being onboarded. Check back soon."} />
      ) : (
        <View style={{ gap: 10 }}>
          {data.partial ? <AppText muted size={12}>Some branches couldn't be reached right now — pull to refresh.</AppText> : null}
          {data.trainers.map(t => (
            <Pressable key={`${t.gymId}:${t.id}`} testID={`network-trainer-${t.id}`}
              accessibilityRole="button"
              accessibilityLabel={`View ${t.name}'s profile${t.rating !== null ? `, rated ${t.rating.toFixed(1)} out of 5` : ""}`}
              accessibilityHint="See this coach's ratings and available times before booking."
              onPress={() => router.push({ pathname: "/network-coach/[trainerId]", params: { trainerId: t.id, gymId: String(t.gymId), categoryId: t.categoryId, name: t.name, branch: t.branchName, photo: t.photoUrl ?? "" } })}
              style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 }]}>
              <CoachAvatar name={t.name} photoUrl={t.photoUrl} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText weight="700" size={15} numberOfLines={1}>{t.name}</AppText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Feather name="map-pin" size={11} color={c.mutedForeground} />
                  <AppText muted size={12} numberOfLines={1} style={{ flexShrink: 1 }}>{t.branchName}</AppText>
                </View>
                {t.rating !== null && t.reviewCount > 0
                  ? <RatingDisplay rating={t.rating} count={t.reviewCount} size={12} />
                  : <AppText muted size={11}>No ratings yet</AppText>}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <View style={[styles.slots, { backgroundColor: t.openSlots ? c.primary : c.elevated }]}>
                  <AppText size={11} weight="700" color={t.openSlots ? c.primaryForeground : c.mutedForeground}>{t.openSlots ? `${t.openSlots} open` : "Full"}</AppText>
                </View>
                <AppText size={10.5} weight="600" color={c.primary}>View profile ›</AppText>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  priceBar: { flexDirection: "row", gap: 8, alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  slots: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
