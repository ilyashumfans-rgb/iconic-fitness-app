import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetNetworkCoachOverviewQueryKey, getListMyNetworkCoachBookingsQueryKey, getListNetworkCoachSlotsQueryKey, getListNetworkCoachPlansQueryKey,
  useCreateNetworkCoachBooking, useListNetworkCoachSlots, useListNetworkCoachPlans, usePurchaseNetworkCoachPlan,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { RatingDisplay } from "@/components/RatingDisplay";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { BackHeader, CoachAvatar, errorText, inr, istDate, istDayKey, istTime } from "@/components/network-coach/shared";
import { useColors } from "@/hooks/useColors";
import { openPayment } from "@/lib/links";
import { memberAuthHref } from "@/lib/memberAuth";

export default function NetworkCoachSlotsScreen() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { isSignedIn } = useAuth();
  const { trainerId, gymId: gymParam, categoryId, name, branch, photo } = useLocalSearchParams<{ trainerId: string; gymId: string; categoryId?: string; name?: string; branch?: string; photo?: string }>();
  const gymId = Number(gymParam);
  const valid = !!trainerId && Number.isInteger(gymId) && gymId > 0;
  const params = { gymId, categoryId };
  const q = useListNetworkCoachSlots(String(trainerId), params, { query: { enabled: valid, queryKey: getListNetworkCoachSlotsQueryKey(String(trainerId), params), refetchInterval: 15_000, staleTime: 0 } });
  const planQuery = useListNetworkCoachPlans(String(trainerId), params, { query: { enabled: valid, queryKey: getListNetworkCoachPlansQueryKey(String(trainerId), params), refetchInterval: isSignedIn ? 20_000 : false } });
  const book = useCreateNetworkCoachBooking();
  const buyPlan = usePurchaseNetworkCoachPlan();
  const [day, setDay] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [mode, setMode] = useState<"plan" | "single">("single");
  const [planId, setPlanId] = useState<number | null>(null);

  const days = useMemo(() => {
    const m = new Map<string, NonNullable<typeof q.data>["slots"]>();
    for (const s of q.data?.slots ?? []) { const k = istDayKey(s.startsAt); m.set(k, [...(m.get(k) ?? []), s]); }
    return [...m.entries()];
  }, [q.data]);
  const activeDay = day && days.some(([k]) => k === day) ? day : days[0]?.[0] ?? null;
  const daySlots = days.find(([k]) => k === activeDay)?.[1] ?? [];
  const selected = q.data?.slots.find(s => s.id === slotId && !s.booked) ?? null;
  const coachName = q.data?.trainer.name ?? name ?? "Coach";
  const plans = planQuery.data?.plans ?? [];
  const activePlan = planQuery.data?.entitlement ?? null;
  const selectedPlan = plans.find(p => p.id === planId) ?? plans[0] ?? null;
  const recommendedPlanId = plans.length > 1 ? plans.reduce((best, p) => {
    const units = { day: 1, week: 7, month: 30, year: 365 } as const;
    return p.priceInr / (p.duration * units[p.durationUnit]) < best.priceInr / (best.duration * units[best.durationUnit]) ? p : best;
  }).id : null;

  const reserve = () => {
    if (!selected) return;
    if (!isSignedIn) { router.push(memberAuthHref() as never); return; }
    book.mutate({ data: { slotId: selected.id, categoryId } }, {
      onSuccess: async (r) => {
        setSlotId(null);
        void qc.invalidateQueries({ queryKey: getListMyNetworkCoachBookingsQueryKey() });
        void qc.invalidateQueries({ queryKey: getListNetworkCoachSlotsQueryKey(String(trainerId), params) });
        void qc.invalidateQueries({ queryKey: getGetNetworkCoachOverviewQueryKey() });
        if (r.planCovered) {
          Alert.alert("Session booked", "Your prepaid plan covers this session. No additional payment was taken.");
          setDay(null);
          router.push("/network-coach/sessions");
        } else if (r.paymentUrl) {
          router.push("/network-coach/sessions");
          try { await openPayment(r.paymentUrl); }
          catch (e) { Alert.alert("Couldn't open payment", errorText(e)); }
        }
      },
      onError: (e) => { Alert.alert("Couldn't reserve", errorText(e)); void q.refetch(); },
    });
  };
  const purchase = () => {
    if (!selectedPlan) return;
    if (!isSignedIn) { router.push(memberAuthHref() as never); return; }
    buyPlan.mutate({ data: { planId: selectedPlan.id, trainerId: String(trainerId), gymId, categoryId } }, {
      onSuccess: async r => {
        router.push("/network-coach/sessions");
        try { await openPayment(r.paymentUrl); }
        catch (e) { Alert.alert("Couldn't open payment", errorText(e)); }
      },
      onError: e => Alert.alert("Couldn't start plan purchase", errorText(e)),
    });
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <BackHeader title="Coach profile" subtitle="Availability and private online sessions · IST" />
      <View style={[styles.coach, { backgroundColor: c.card, borderColor: c.border }]}>
        <CoachAvatar name={coachName} photoUrl={photo || null} size={40} />
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={15}>{coachName}</AppText>
          <AppText muted size={12}>{branch || "Iconic coach"} · online video</AppText>
          {q.data?.trainer.rating !== null && q.data?.trainer.rating !== undefined && q.data.trainer.reviewCount > 0
            ? <RatingDisplay rating={q.data.trainer.rating} count={q.data.trainer.reviewCount} size={12} style={{ marginTop: 3 }} />
            : <AppText muted size={11} style={{ marginTop: 3 }}>No ratings yet</AppText>}
        </View>
        <Feather name="video" size={18} color={c.primary} />
      </View>

      <View style={[styles.modeTabs, { backgroundColor: c.elevated, borderColor: c.border }]}>
        <Pressable onPress={() => setMode("plan")} style={[styles.modeTab, mode === "plan" && { backgroundColor: c.card, borderColor: c.primary }]} testID="network-plan-tab">
          <AppText size={13} weight="700" color={mode === "plan" ? c.primary : c.mutedForeground}>Prepaid plans</AppText>
        </Pressable>
        <Pressable onPress={() => setMode("single")} style={[styles.modeTab, mode === "single" && { backgroundColor: c.card, borderColor: c.primary }]} testID="network-single-session-tab">
          <AppText size={13} weight="700" color={mode === "single" ? c.primary : c.mutedForeground}>Single session</AppText>
        </Pressable>
      </View>

      {!valid ? <EmptyState icon="alert-circle" title="Coach not found" message="Go back and choose a coach." />
      : q.isLoading ? <LoadingView />
      : q.isError ? ((q.error as { status?: number })?.status === 404
          ? <EmptyState icon="eye-off" title="Not available online" message="This coach isn't offering online sessions right now." />
          : <ErrorView onRetry={() => void q.refetch()} />)
      : mode === "plan" ? (
        <View style={{ gap: 12, marginTop: 12 }}>
          {planQuery.isLoading ? <LoadingView /> : planQuery.isError ? <ErrorView onRetry={() => void planQuery.refetch()} /> : activePlan ? (
            <View style={[styles.entitlement, { backgroundColor: c.card, borderColor: c.primary }]}>
              <Feather name="check-circle" size={22} color={c.primary} />
              <View style={{ flex: 1, gap: 3 }}>
                <AppText size={15} weight="700">{activePlan.planName} active</AppText>
                <AppText muted size={12.5}>Unlimited booked sessions with {coachName} until {istDate(activePlan.endsAt)}. No renewal or rebill.</AppText>
              </View>
              <AppText size={11} weight="700" color={c.primary}>ACTIVE</AppText>
              <Button label="Choose a session" size="sm" onPress={() => setMode("single")} />
            </View>
          ) : !plans.length ? (
            <View style={[styles.planEmpty, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="layers" size={22} color={c.mutedForeground} />
              <AppText weight="700" size={15}>No prepaid plans available</AppText>
              <AppText muted size={12.5} style={{ textAlign: "center" }}>You can still book a single session. Plans are one payment, with no automatic renewal.</AppText>
              <Button label="Book a single session" variant="secondary" onPress={() => setMode("single")} />
            </View>
          ) : (
            <>
              <View style={{ gap: 3, marginTop: 8 }}>
                <AppText weight="700" size={20}>Choose your coaching term</AppText>
                <AppText muted size={12.5}>One upfront payment · unlimited booked sessions · choose times from this coach's calendar.</AppText>
              </View>
              {plans.map((p, i) => {
                const on = selectedPlan?.id === p.id;
                const unitLabel = p.duration === 1 ? p.durationUnit : `${p.durationUnit}s`;
                return (
                  <Pressable key={p.id} onPress={() => setPlanId(p.id)} accessibilityState={{ selected: on }} testID={`plan-tier-${p.id}`}
                    style={[styles.planTier, { backgroundColor: on ? c.card : c.elevated, borderColor: on ? c.primary : c.border }]}>
                    <View style={[styles.radio, { borderColor: on ? c.primary : c.mutedForeground }]}>{on ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}</View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                        <AppText weight="700" size={15}>{p.name}</AppText>
                        {p.id === recommendedPlanId ? <AppText size={10} weight="700" color={c.primary}>LOWEST DAILY RATE</AppText> : null}
                      </View>
                      <AppText muted size={12}>{p.duration} {unitLabel} · unlimited sessions with this coach</AppText>
                      <View style={styles.planBenefit}><Feather name="check" size={12} color={c.primary} /><AppText size={11.5} color={c.primary}>Private video sessions, booked from published times</AppText></View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <AppText weight="700" size={17}>{inr(p.priceInr)}</AppText>
                      <AppText muted size={10.5}>pay once · includes GST</AppText>
                    </View>
                  </Pressable>
                );
              })}
              <View style={[styles.planFootnote, { borderColor: c.border }]}>
                <Feather name="calendar" size={14} color={c.mutedForeground} />
                <AppText muted size={11.5} style={{ flex: 1 }}>Starts after payment is verified, stays linked to {coachName}, and expires at the end of the term. No auto-renewal; available times follow the coach's calendar.</AppText>
              </View>
              <Button label={isSignedIn ? `Enrol · ${selectedPlan ? inr(selectedPlan.priceInr) : ""} once` : "Sign in to enrol"} icon="lock" loading={buyPlan.isPending} disabled={!selectedPlan} onPress={purchase} />
            </>
          )}
        </View>
      )
       : (
        <View style={{ gap: 4, marginTop: 12 }}>
          <View style={{ gap: 3, marginTop: 4 }}>
            <AppText weight="700" size={18}>Available times</AppText>
            <AppText muted size={12.5}>Choose a date and an available time with {coachName}. A dash marks booked times.</AppText>
          </View>
          {days.length === 0 ? <EmptyState icon="clock" title="No open times" message="This coach has no bookable times right now. Check back soon or try another coach." /> : <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
            {days.map(([k, list]) => {
              const on = k === activeDay;
              return (
                <Pressable key={k} onPress={() => { setDay(k); setSlotId(null); }} testID={`day-${k}`}
                  style={[styles.day, { backgroundColor: on ? c.primary : c.elevated, borderColor: on ? c.primary : c.border }]}>
                  <AppText size={12} weight="700" color={on ? c.primaryForeground : c.foreground}>{istDate(list[0]!.startsAt)}</AppText>
                  <AppText size={10.5} color={on ? c.primaryForeground : c.mutedForeground}>{list.filter(s => !s.booked).length} open</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.grid}>
            {daySlots.map(s => {
              const on = s.id === slotId && !s.booked;
              return (
                <Pressable key={s.id} disabled={s.booked} onPress={() => setSlotId(on ? null : s.id)} testID={`slot-${s.id}`} accessibilityRole="button" accessibilityLabel={`${istTime(s.startsAt)}, ${s.booked ? "booked" : "available"}`} accessibilityState={{ selected: on, disabled: s.booked }}
                  style={[styles.slot, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.card : c.elevated, opacity: s.booked ? 0.5 : 1 }]}>
                  <AppText weight="700" size={14} color={on ? c.primary : c.foreground}>{istTime(s.startsAt)}</AppText>
                  <AppText muted size={11}>{s.booked ? "— Booked" : `${s.durationMinutes} min · ${activePlan ? "covered" : s.priceInr === null ? "not offered" : inr(s.priceInr)}`}</AppText>
                </Pressable>
              );
            })}
          </View>
          </>}
        </View>
      )}

      {selected ? (
        <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.primary }]}>
          <AppText weight="700" size={15}>{istDate(selected.startsAt)}, {istTime(selected.startsAt)} – {istTime(selected.endsAt)} IST</AppText>
          <AppText muted size={12.5}>{selected.durationMinutes}-minute private video session with {coachName}. {activePlan ? "This booking is covered by your prepaid term." : "Your time is held for 3 minutes while you pay."}</AppText>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginVertical: 6 }}>
            <AppText muted size={13}>Total including GST (INR)</AppText>
            <AppText weight="700" size={22}>{activePlan ? "Included" : selected.priceInr === null ? "Unavailable" : inr(selected.priceInr)}</AppText>
          </View>
          <View style={{ height: 10 }} />
          <Button label={!isSignedIn ? "Sign in to book" : activePlan ? "Book with prepaid plan" : "Reserve & pay securely"} icon="lock" loading={book.isPending} disabled={!activePlan && selected.priceInr === null} onPress={reserve} />
        </View>
      ) : null}

      {q.data?.reviews.length ? (
        <View style={{ marginTop: 22, gap: 10 }}>
          <AppText weight="700" size={16}>From completed sessions</AppText>
          {q.data.reviews.slice(0, 8).map((r, i) => (
            <View key={i} style={[styles.review, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={{ flexDirection: "row", gap: 2 }}>{[1, 2, 3, 4, 5].map(n => <Feather key={n} name="star" size={12} color={n <= r.rating ? c.warning : c.border} />)}</View>
              {r.comment ? <AppText size={13}>{r.comment}</AppText> : null}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  coach: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  modeTabs: { flexDirection: "row", borderWidth: 1, borderRadius: 14, padding: 4, marginTop: 12 },
  modeTab: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "transparent", paddingVertical: 9 },
  planTier: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 16, padding: 13 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  planBenefit: { flexDirection: "row", alignItems: "center", gap: 4 },
  planFootnote: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderTopWidth: 1, paddingTop: 10 },
  entitlement: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  planEmpty: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 10, alignItems: "center" },
  day: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, alignItems: "center", minWidth: 84 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: "31.5%", borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 2 },
  summary: { marginTop: 18, borderWidth: 1.5, borderRadius: 18, padding: 16, gap: 4 },
  review: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
});
