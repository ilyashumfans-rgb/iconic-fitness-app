import { useAuth } from "@clerk/expo";
import { useGetMyAttendance, getGetMyAttendanceQueryKey } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { LoadingView } from "@/components/ui-bits";
import { memberAuthHref } from "@/lib/memberAuth";
import { istDateStr } from "@/lib/dates";
import { attendanceDuration, attendanceTime } from "@/lib/attendance";

export default function AttendanceScreen() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const router = useRouter();
  if (!isLoaded) return <Screen><LoadingView /></Screen>;
  if (!isSignedIn || !userId) return <Screen>
    <AppText weight="700" size={28}>Attendance</AppText>
    <AppText muted style={{ marginVertical: 20 }}>Sign in to view your gym visits.</AppText>
    <Button label="Sign in" onPress={() => router.push(memberAuthHref("/attendance"))} />
  </Screen>;
  return <MemberAttendance key={userId} accountId={userId} />;
}

function MemberAttendance({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const current = istDateStr().slice(0, 7);
  const [year, monthNumber] = current.split("-").map(Number);
  const selected = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  const month = selected.toISOString().slice(0, 7);
  const query = useGetMyAttendance({ month }, {
    query: { queryKey: [...getGetMyAttendanceQueryKey({ month }), accountId] },
  });
  return <Screen refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }}
    contentContainerStyle={{ gap: 16 }}>
    <Button label="Back" icon="arrow-left" variant="ghost" full={false} onPress={() => router.back()} />
    <AppText size={28} weight="700">Attendance</AppText>
    <AppText muted>Your time at the gym, all in one place. All times are IST.</AppText>
    <Button label={query.data?.activeVisit ? "Scan to check out" : "Scan to check in"}
      icon="maximize" onPress={() => router.push({ pathname: "/check-in", params: { action: query.data?.activeVisit ? "checkout" : "checkin" } })} />
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <Button label="Previous" variant="secondary" full={false} disabled={offset <= -119} onPress={() => setOffset(value => Math.max(-119, value - 1))} />
      <AppText weight="700">{selected.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })}</AppText>
      <Button label="Next" variant="secondary" full={false} disabled={offset >= 0} onPress={() => setOffset(value => Math.min(0, value + 1))} />
    </View>
    {query.isLoading ? <LoadingView /> : query.isError ? <Card>
      <AppText accessibilityRole="alert">Could not load attendance. Please try again.</AppText>
      <Button label="Retry" onPress={() => { void query.refetch(); }} />
    </Card> : query.data ? <>
      <Card style={{ gap: 8 }}>
        <AppText size={22} weight="700">{query.data.summary.visits} visits</AppText>
        <AppText weight="600">{attendanceDuration(query.data.summary.totalMinutes)} total completed time</AppText>
        <AppText muted>{query.data.summary.completedVisits} completed visits · In-progress visits excluded from time totals.</AppText>
      </Card>
      {query.data.activeVisit ? <Card style={{ gap: 8 }}>
        <AppText weight="700">Currently checked in · {query.data.activeVisit.gymName}</AppText>
        <AppText muted>{attendanceTime(query.data.activeVisit.checkedInAt)}</AppText>
        <AppText>In progress — scan at your gym to check out.</AppText>
      </Card> : null}
      <AppText size={20} weight="700">Visits this month</AppText>
      {query.data.visits.length === 0 ? <Card><AppText muted>No visits this month. Scan your gym’s QR when you arrive.</AppText></Card> :
        query.data.visits.map(visit => <Card key={visit.id} style={{ gap: 8 }}>
          <AppText weight="700" size={17}>{visit.gymName}</AppText>
          <AppText size={13}>Check in · {attendanceTime(visit.checkedInAt)}</AppText>
          <AppText size={13}>Check out · {visit.checkedOutAt ? attendanceTime(visit.checkedOutAt) : "Pending"}</AppText>
          <AppText weight="600">{visit.checkedOutAt
            ? visit.durationMinutes !== null ? attendanceDuration(visit.durationMinutes) : "Duration unavailable"
            : "In progress"}</AppText>
        </Card>)}
    </> : null}
  </Screen>;
}