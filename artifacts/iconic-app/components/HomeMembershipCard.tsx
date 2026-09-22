import { useAuth } from "@clerk/expo";
import { getGetMyAttendanceQueryKey, useGetMyAttendance, type MyMembership } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { AppState, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { MembershipStatusCard } from "@/components/MembershipStatusCard";
import { istDateStr } from "@/lib/dates";
import { membershipGreeting } from "@/lib/membershipHome";

export function HomeMembershipCard(props: {
  membership: MyMembership;
  memberName: string;
  memberPhotoUrl?: string | null;
  onManage: () => void;
}) {
  const { userId, isSignedIn } = useAuth();
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const month = istDateStr(now).slice(0, 7);
  const history = useGetMyAttendance({ month }, {
    query: { queryKey: [...getGetMyAttendanceQueryKey({ month }), userId], enabled: !!isSignedIn, staleTime: 30_000 },
  });
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 60_000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") tick(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  const action = history.data?.activeVisit ? "checkout" : "checkin";
  return <MembershipStatusCard {...props} embedded compact greeting={membershipGreeting(now)}
    footer={<View style={{
      gap: 8, marginTop: 10, backgroundColor: "#000000",
      marginHorizontal: -14, marginBottom: -14, padding: 14, paddingTop: 10,
    }}>
      {history.isError ? <AppText size={12} muted>Attendance status unavailable. You can still scan and choose check in or check out.</AppText> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}>
      <Button size="sm" raised label={action === "checkout" ? "Check out" : "Check in"} icon="maximize"
        accessibilityLabel={action === "checkout" ? "Scan gym QR to check out" : "Scan gym QR to check in"}
        onPress={() => router.push({ pathname: "/check-in", params: { action } })} />
      </View>
      <View style={{ flex: 1.4 }}>
      <Button size="sm" raised label="Connect to watch" icon="watch" variant="secondary" onPress={() => router.push("/connect-watch")} />
      </View>
      </View>
    </View>} />;
}