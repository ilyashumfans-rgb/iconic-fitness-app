import { useJoinNetworkCoachCall } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { CallView } from "@/components/network-coach/CallView";
import { BackHeader, errorText, PrivacyNotice } from "@/components/network-coach/shared";
import { LoadingView } from "@/components/ui-bits";
import { useColors } from "@/hooks/useColors";
import { staffFetch } from "@/lib/staffSession";

type Grant = { token: string; url: string; endsAt: string };

/** Private 1:1 call for a paid booking. Tokens are minted server-side per join; nothing is recorded. */
export default function NetworkCoachCall() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId, role } = useLocalSearchParams<{ bookingId: string; role?: "member" | "trainer" }>();
  const isTrainer = role === "trainer";
  const join = useJoinNetworkCoachCall();
  const joinRef = useRef(join.mutateAsync);
  joinRef.current = join.mutateAsync;
  const [grant, setGrant] = useState<Grant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const leaving = useRef(false);

  useEffect(() => {
    let alive = true;
    const id = Number(bookingId);
    if (!Number.isInteger(id) || id <= 0) { setError("Session not found."); return; }
    setError(null); setGrant(null);
    (async () => {
      try {
        let g: Grant;
        if (isTrainer) {
          const res = await staffFetch(`/staff/network-coach/bookings/${id}/join`, { method: "POST", body: "{}" });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error ?? "Couldn't join this call.");
          g = body as Grant;
        } else {
          g = await joinRef.current({ id });
        }
        if (alive) setGrant(g);
      } catch (e) { if (alive) setError(errorText(e)); }
    })();
    return () => { alive = false; };
  }, [bookingId, isTrainer, attempt]);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    setGrant(null);
    if (router.canGoBack()) router.back();
    else router.replace(isTrainer ? "/staff-network-coach" : "/network-coach/sessions");
  }, [router, isTrainer]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 4, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 8, paddingHorizontal: 16, gap: 10 }}>
      <BackHeader title="Private session" subtitle={isTrainer ? "Member call · not recorded" : "With your coach · not recorded"} />
      <PrivacyNotice compact audience={isTrainer ? "staff" : "member"} />
      <View style={{ flex: 1 }}>
        {error ? (
          <View style={{ gap: 12, marginTop: 24 }}>
            <AppText weight="700" size={16}>Can't join right now</AppText>
            <AppText muted size={13}>{error}</AppText>
            <Button label="Try again" onPress={() => setAttempt(a => a + 1)} />
            <Button label="Back" variant="secondary" onPress={leave} />
          </View>
        ) : !grant ? <LoadingView /> : (
          <CallView token={grant.token} url={grant.url} peerLabel={isTrainer ? "your member" : "your coach"} onLeave={leave} />
        )}
      </View>
    </View>
  );
}
