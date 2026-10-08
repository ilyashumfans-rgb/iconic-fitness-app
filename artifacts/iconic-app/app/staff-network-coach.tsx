import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Chip, EmptyState, ErrorView, LoadingView, Segmented } from "@/components/ui-bits";
import { BackHeader, inr, istDate, istDayKey, istTime, StatusPill } from "@/components/network-coach/shared";
import { useColors } from "@/hooks/useColors";
import { staffFetch } from "@/lib/staffSession";
import { SessionReminder } from "@/components/network-coach/SessionReminder";
import { useStaffNotificationPolling } from "@/lib/staffPt";

type Me = { name: string; gymId: number; branchName: string; categoryReady?: boolean; prices: Record<"30" | "45" | "60", number | null> };
type Slot = { id: number; startsAt: string; endsAt: string; bookingStatus: string | null; locked: boolean };
type Booking = { id: number; status: string; startsAt: string; endsAt: string; memberName: string | null; amountInr: number; canJoin: boolean; refundStatus: string | null };

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await staffFetch(path, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, body.error ?? "Request failed.");
  return body as T;
}
const tomorrowIst = () => new Date(Date.now() + 86_400_000 + 330 * 60_000).toISOString().slice(0, 10);
const TIMES = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

/** Trainer-managed online availability for Iconic Network Coach. Identity comes from the studio session only. */
export default function StaffNetworkCoach() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"availability" | "sessions">("availability");
  const me = useQuery({ queryKey: ["staff-nc", "me"], queryFn: () => api<Me>("/staff/network-coach/me"), retry: false, staleTime: 0, refetchInterval: 30_000 });
  const authorized = me.isSuccess;
  useStaffNotificationPolling(authorized);
  const slots = useQuery({ queryKey: ["staff-nc", "slots"], queryFn: () => api<Slot[]>("/staff/network-coach/slots"), enabled: authorized });
  const bookings = useQuery({ queryKey: ["staff-nc", "bookings"], queryFn: () => api<Booking[]>("/staff/network-coach/bookings"), enabled: authorized, refetchInterval: 30_000 });

  const [date, setDate] = useState(tomorrowIst());
  const [time, setTime] = useState("07:00");
  const [duration, setDuration] = useState<30 | 45 | 60>(60);
  const [repeat, setRepeat] = useState(0);
  const add = useMutation({
    mutationFn: () => api<{ created: number; skipped: string[] }>("/staff/network-coach/slots", { method: "POST", body: JSON.stringify({ date, startTime: time, durationMinutes: duration, repeatWeeks: repeat }) }),
    onSuccess: r => {
      void qc.invalidateQueries({ queryKey: ["staff-nc", "slots"] });
      Alert.alert(r.created ? "Availability added" : "Nothing added", `${r.created} slot${r.created === 1 ? "" : "s"} added${r.skipped.length ? `, ${r.skipped.length} skipped (overlap or too soon)` : ""}.`);
    },
    onError: e => Alert.alert("Couldn't add", (e as Error).message),
  });
  const del = useMutation({
    mutationFn: (id: number) => api<void>(`/staff/network-coach/slots/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["staff-nc", "slots"] }),
    onError: e => Alert.alert("Can't remove", (e as Error).message),
  });
  const complete = useMutation({
    mutationFn: (id: number) => api<{ ok: boolean }>(`/staff/network-coach/bookings/${id}/complete`, { method: "POST", body: "{}" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["staff-nc", "bookings"] }),
    onError: e => Alert.alert("Couldn't complete", (e as Error).message),
  });
  const confirmComplete = (id: number) => {
    const msg = "Confirm this session actually took place. The member can then rate it.";
    if (Platform.OS === "web") { if (window.confirm(msg)) complete.mutate(id); return; }
    Alert.alert("Mark completed?", msg, [{ text: "Not yet", style: "cancel" }, { text: "Completed", onPress: () => complete.mutate(id) }]);
  };

  const grouped = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots.data ?? []) { if (new Date(s.endsAt).getTime() < Date.now()) continue; const k = istDayKey(s.startsAt); m.set(k, [...(m.get(k) ?? []), s]); }
    return [...m.entries()];
  }, [slots.data]);
  const unauthorized = me.error instanceof HttpError && (me.error.status === 401 || me.error.status === 403);

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }} refreshing={slots.isRefetching || bookings.isRefetching} onRefresh={() => { void me.refetch(); void slots.refetch(); void bookings.refetch(); }}>
      <BackHeader title="Online coaching" subtitle={me.data ? `${me.data.name} · ${me.data.branchName} · IST` : "Iconic Network Coach"} />
      {me.isLoading ? <LoadingView /> : unauthorized ? (
        <View style={{ gap: 12 }}>
          <EmptyState icon="lock" title="Not set up for online coaching" message={(me.error as Error).message} />
          {(me.error as HttpError).status === 401 ? <Button label="Studio login" onPress={() => router.replace("/staff-login")} /> : null}
        </View>
      ) : me.isError ? <ErrorView onRetry={() => void me.refetch()} /> : (
        <>
          <Segmented value={tab} onChange={setTab} options={[{ value: "availability", label: "Availability" }, { value: "sessions", label: `Sessions${bookings.data?.filter(b => b.status === "paid").length ? ` (${bookings.data.filter(b => b.status === "paid").length})` : ""}` }]} />
          <View style={{ height: 14 }} />
          {me.data?.categoryReady === false ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginBottom: 14 }]}>
              <AppText weight="700" size={14}>You can manage your timings here</AppText>
              <AppText muted size={12}>Your times are saved, but are not visible for member booking yet. Admin must assign your trainer profile to a published online coaching category and configure its prices or plans.</AppText>
            </View>
          ) : null}
          {tab === "availability" ? (
            <View style={{ gap: 14 }}>
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <AppText weight="700" size={15}>Add open time</AppText>
                <AppText muted size={12}>Date (IST, YYYY-MM-DD)</AppText>
                <TextInput value={date} onChangeText={setDate} autoCapitalize="none" maxLength={10} testID="input-slot-date"
                  style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.elevated }]} />
                <AppText muted size={12}>Start time (IST)</AppText>
                <View style={styles.wrap}>{TIMES.map(t => <Chip key={t} label={t} active={time === t} onPress={() => setTime(t)} />)}</View>
                <TextInput value={time} onChangeText={setTime} placeholder="HH:MM (15-min steps)" placeholderTextColor={c.mutedForeground} maxLength={5}
                  style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.elevated }]} />
                <AppText muted size={12}>Duration</AppText>
                <View style={styles.wrap}>{([30, 45, 60] as const).map(d => <Chip key={d} label={`${d} min`} active={duration === d} onPress={() => setDuration(d)} />)}</View>
                <AppText muted size={12}>Admin sets prices for each category. Members choose a category when booking your available time.</AppText>
                <AppText muted size={12}>Repeat weekly</AppText>
                <View style={styles.wrap}>{[0, 3, 7, 11].map(r => <Chip key={r} label={r === 0 ? "Just once" : `${r + 1} weeks`} active={repeat === r} onPress={() => setRepeat(r)} />)}</View>
                <Button label="Add availability" icon="plus" loading={add.isPending} onPress={() => add.mutate()} />
              </View>
              {slots.isLoading ? <LoadingView /> : slots.isError ? <ErrorView onRetry={() => void slots.refetch()} /> : grouped.length === 0 ? (
                <EmptyState icon="calendar" title="No open times" message="Add your first online slot above. Members across all branches can book it." />
              ) : grouped.map(([k, list]) => (
                <View key={k} style={{ gap: 8 }}>
                  <AppText weight="700" size={14}>{istDate(list[0]!.startsAt)}</AppText>
                  {list.map(s => (
                    <View key={s.id} style={[styles.slotRow, { backgroundColor: c.card, borderColor: s.bookingStatus ? c.primary : c.border }]}>
                      <Feather name="clock" size={14} color={c.mutedForeground} />
                      <AppText size={14} weight="600" style={{ flex: 1 }}>{istTime(s.startsAt)} – {istTime(s.endsAt)}</AppText>
                      {s.bookingStatus ? <StatusPill status={s.bookingStatus} /> : null}
                      {s.locked ? <Feather name="lock" size={15} color={c.mutedForeground} accessibilityLabel="Booked — can't edit" /> : (
                        <Pressable onPress={() => del.mutate(s.id)} hitSlop={8} accessibilityLabel="Remove slot" testID={`delete-slot-${s.id}`}>
                          <Feather name="trash-2" size={16} color={c.destructive} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {bookings.isLoading ? <LoadingView /> : bookings.isError ? <ErrorView onRetry={() => void bookings.refetch()} /> : !bookings.data?.length ? (
                <EmptyState icon="video" title="No booked sessions yet" message="Paid bookings appear here with a Join button 10 minutes before start." />
              ) : bookings.data.map(b => (
                <View key={b.id} style={[styles.card, { backgroundColor: c.card, borderColor: b.canJoin ? c.primary : c.border }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <AppText weight="700" size={15}>{istDate(b.startsAt)} · {istTime(b.startsAt)}–{istTime(b.endsAt)}</AppText>
                      <AppText muted size={12.5}>{b.memberName ?? "Member"} · online</AppText>
                    </View>
                    <StatusPill status={b.status} refund={b.refundStatus} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {b.canJoin ? <View style={{ flex: 1 }}><Button label="Join call" icon="video" onPress={() => router.push({ pathname: "/network-coach/call", params: { bookingId: String(b.id), role: "trainer" } })} /></View> : null}
                    {b.status === "paid" && new Date(b.startsAt).getTime() <= Date.now() ? (
                      <View style={{ flex: 1 }}><Button label="Mark completed" variant="secondary" loading={complete.isPending} onPress={() => confirmComplete(b.id)} /></View>
                    ) : null}
                  </View>
                  {b.status === "paid" && new Date(b.startsAt).getTime() > Date.now() ? <SessionReminder bookingId={b.id} role="trainer" /> : null}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
});
