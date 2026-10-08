import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMyNetworkCoachBookingsQueryKey, getListMyNetworkCoachPlansQueryKey, useCancelNetworkCoachBooking, useListMyNetworkCoachBookings, useListMyNetworkCoachPlans, useReviewNetworkCoachBooking,
  type NetworkCoachBooking, type NetworkCoachMemberPlan,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorView, LoadingView } from "@/components/ui-bits";
import { BackHeader, errorText, inr, istDate, istTime, StatusPill } from "@/components/network-coach/shared";
import { useColors } from "@/hooks/useColors";
import { memberAuthHref } from "@/lib/memberAuth";
import { SessionReminder } from "@/components/network-coach/SessionReminder";
import { SessionReminderAlerts } from "@/components/network-coach/SessionReminderAlerts";

const confirm = (title: string, msg: string, ok: () => void) => {
  if (Platform.OS === "web") { if (window.confirm(`${title}\n\n${msg}`)) ok(); return; }
  Alert.alert(title, msg, [{ text: "Keep", style: "cancel" }, { text: "Cancel session", style: "destructive", onPress: ok }]);
};

export default function NetworkCoachSessions() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const q = useListMyNetworkCoachBookings({ query: { enabled: !!isSignedIn, queryKey: getListMyNetworkCoachBookingsQueryKey(), refetchInterval: 30_000 } });
  const pq = useListMyNetworkCoachPlans({ query: { enabled: !!isSignedIn, queryKey: getListMyNetworkCoachPlansQueryKey() } });
  const list = q.data ?? [];
  const planRows = pq.data ?? [];
  const upcoming = list.filter(b => b.status === "paid" || b.status === "held");
  const past = list.filter(b => !(b.status === "paid" || b.status === "held"));

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <BackHeader title="My online sessions" subtitle="Iconic Network Coach · IST" />
      {isLoaded && isSignedIn ? <SessionReminderAlerts /> : null}
      {!isLoaded ? <LoadingView /> : !isSignedIn ? (
        <View style={{ gap: 12 }}>
          <EmptyState icon="lock" title="Sign in to see sessions" message="Your online coaching bookings live in your member account." />
          <Button label="Sign in" onPress={() => router.push(memberAuthHref() as never)} />
        </View>
      ) : q.isLoading ? <LoadingView /> : q.isError ? <ErrorView onRetry={() => void q.refetch()} /> : list.length === 0 && planRows.length === 0 ? (
        <EmptyState icon="video" title="No sessions yet" message="Book a live 1:1 video session with an Iconic Network Coach." />
      ) : (
        <View style={{ gap: 12 }}>
          {planRows.length ? <PlanTerms plans={planRows} /> : null}
          {upcoming.length ? <AppText weight="700" size={15}>Upcoming</AppText> : null}
          {upcoming.map(b => <BookingCard key={b.id} b={b} />)}
          {past.length ? <AppText weight="700" size={15} style={{ marginTop: 8 }}>History</AppText> : null}
          {past.map(b => <BookingCard key={b.id} b={b} />)}
          <Button label="View invoices" icon="file-text" variant="secondary" onPress={() => router.push("/invoices")} />
        </View>
      )}
    </Screen>
  );
}

function PlanTerms({ plans }: { plans: NetworkCoachMemberPlan[] }) {
  const c = useColors();
  return <View style={{ gap: 8, marginBottom: 4 }}>
    <AppText weight="700" size={15}>Your prepaid plans</AppText>
    {plans.map(p => <View key={p.id} style={[styles.planCard, { backgroundColor: c.card, borderColor: p.status === "active" ? c.primary : c.border }]} testID={`member-plan-${p.id}`}>
      <Feather name={p.status === "active" ? "check-circle" : "clock"} size={18} color={p.status === "active" ? c.primary : c.mutedForeground} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="700" size={14}>{p.planName} · {p.trainerName ?? "Coach"}</AppText>
        <AppText muted size={12}>{p.duration} {p.duration === 1 ? p.durationUnit : `${p.durationUnit}s`} · {p.branchName ?? "Iconic"} · {p.status === "active" && p.endsAt ? `valid through ${istDate(p.endsAt)}` : p.status === "expired" ? "Term ended" : "Payment under admin review"}</AppText>
        <AppText size={11} color={c.mutedForeground}>Unlimited booked sessions during term · paid once · no auto-renewal</AppText>
      </View>
      <AppText size={12} weight="700" color={p.status === "active" ? c.primary : c.mutedForeground}>{p.status === "active" ? "ACTIVE" : p.status === "expired" ? "ENDED" : "REVIEW"}</AppText>
    </View>)}
  </View>;
}

function BookingCard({ b }: { b: NetworkCoachBooking }) {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const cancel = useCancelNetworkCoachBooking();
  const review = useReviewNetworkCoachBooking();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: getListMyNetworkCoachBookingsQueryKey() });
  const startsSoon = b.status === "paid" && new Date(b.startsAt).getTime() > Date.now() && !b.canJoin;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: b.canJoin ? c.primary : c.border }]} testID={`booking-${b.id}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <AppText weight="700" size={15}>{istDate(b.startsAt)} · {istTime(b.startsAt)}–{istTime(b.endsAt)}</AppText>
          <AppText muted size={12.5}>{b.trainerName} · {b.branchName} · {b.planCovered ? "Covered by prepaid plan" : inr(b.amountInr)}</AppText>
        </View>
        <StatusPill status={b.status} refund={b.refundStatus} />
      </View>
      {b.status === "held" && b.holdExpiresAt ? (
        <PaymentCountdown expiresAt={b.holdExpiresAt} />
      ) : null}
        {b.status === "paid_conflict" ? <AppText size={12} muted>Your payment arrived after the hold lapsed and the time was taken. Our team will process your refund manually.</AppText> : null}
      {startsSoon ? <AppText size={12} muted>The call opens 10 minutes before start.</AppText> : null}
      {b.status === "paid" && new Date(b.startsAt).getTime() > Date.now() ? <SessionReminder bookingId={b.id} role="member" /> : null}

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {b.status === "paid" ? (
          <View style={{ flex: 1 }}><Button label={!b.canJoin && new Date(b.endsAt).getTime() + 15 * 60_000 < Date.now() ? "Session ended" : "Connect video"} icon="video" disabled={!b.canJoin} onPress={() => router.push({ pathname: "/network-coach/call", params: { bookingId: String(b.id), role: "member" } })} /></View>
        ) : null}
        {(b.status === "held" || startsSoon) ? (
          <Pressable testID={`cancel-${b.id}`} onPress={() => confirm("Cancel this session?", b.planCovered ? "This releases the calendar time. Your prepaid plan remains active until its stated expiry." : b.status === "paid" ? "Paid sessions are flagged for a manual refund by our team — refunds are not instant." : "Your held time will be released.",
            () => cancel.mutate({ id: b.id }, { onSuccess: () => void refresh(), onError: e => Alert.alert("Couldn't cancel", errorText(e)) }))}
            style={[styles.ghost, { borderColor: c.border }]}>
            <AppText size={13} weight="600" color={c.mutedForeground}>{cancel.isPending ? "Cancelling…" : "Cancel"}</AppText>
          </Pressable>
        ) : null}
      </View>

      {b.review ? (
        <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map(n => <Feather key={n} name="star" size={13} color={n <= b.review!.rating ? c.warning : c.border} />)}
          <AppText muted size={12} style={{ marginLeft: 6 }} numberOfLines={1}>{b.review.comment || "Thanks for rating"}</AppText>
        </View>
      ) : b.canReview ? (
        <View style={{ gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 10 }}>
          <AppText weight="700" size={13}>Rate this session</AppText>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} testID={`star-${b.id}-${n}`} accessibilityLabel={`${n} stars`}>
                <Feather name="star" size={26} color={n <= rating ? c.warning : c.border} />
              </Pressable>
            ))}
          </View>
          <TextInput value={comment} onChangeText={setComment} placeholder="Optional comment (no contact details)" placeholderTextColor={c.mutedForeground}
            maxLength={1000} multiline style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.elevated }]} />
          <Button label="Submit review" size="sm" disabled={!rating} loading={review.isPending}
            onPress={() => review.mutate({ id: b.id, data: { rating, comment } }, { onSuccess: () => void refresh(), onError: e => Alert.alert("Couldn't save review", errorText(e)) })} />
        </View>
      ) : null}
    </View>
  );
}

function PaymentCountdown({ expiresAt }: { expiresAt: string }) {
  const c = useColors();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  return <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.elevated, gap: 4 }}>
    <AppText size={12}>{seconds ? "Complete payment before your reservation expires" : "Reservation expired. Refresh to see the latest payment status."}</AppText>
    <AppText size={28} weight="700" color={c.primary}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  planCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 9, flexDirection: "row", alignItems: "center" },
  ghost: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 60, fontSize: 14, textAlignVertical: "top" },
});
