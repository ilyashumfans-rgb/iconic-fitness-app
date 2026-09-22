import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { ModalHeader } from "@/components/ModalHeader";
import { Screen } from "@/components/Screen";
import { MemberJourneyDetails, journeyStages, type JourneyView } from "@/components/MemberJourneyDetails";
import { staffFetch } from "@/lib/staffSession";
import { useColors } from "@/hooks/useColors";

export default function StaffJourneyScreen() {
  const router = useRouter();
  const colors = useColors();
  const [journeys, setJourneys] = useState<JourneyView[]>([]);
  const [selected, setSelected] = useState<JourneyView | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setSelected(null);
    setJourneys([]);
    void (async () => {
      try {
        // Always verify current permissions; never trust the locally stored profile.
        const me = await staffFetch("/staff/me");
        if (me.status === 401) { if (active) router.replace("/staff-login"); return; }
        if (!me.ok) throw new Error("Unable to verify your staff access.");
        const profile = await me.json();
        if (!profile.permissions?.some((p: string) => p === "journey.view" || p === "journey.manage")) throw new Error("You do not have access to member journeys.");
        const response = await staffFetch(`/staff/member-journey${selectedId ? `/${encodeURIComponent(selectedId)}` : ""}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load member journeys.");
        if (!active) return;
        if (selectedId) setSelected(data);
        else setJourneys(data.journeys);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load member journeys.");
      } finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [revision, selectedId, router]);
  return <Screen contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
    <ModalHeader title="Member journeys" />
    {selectedId ? <Button variant="ghost" label="Back to overview" onPress={() => setSelectedId(null)} /> : null}
    <AppText size={13} color={colors.mutedForeground}>Read-only studio overview. Assignments and reviews are managed in your web staff dashboard. Only members within your server-authorized scope are shown.</AppText>
    {busy ? <ActivityIndicator color={colors.primary} /> : error ? <View style={{ gap: 12 }}><AppText>{error}</AppText><Button label="Retry" onPress={() => setRevision(r => r + 1)} /></View> : selected ? <MemberJourneyDetails journey={selected} /> : <>
      <AppText weight="700">{journeys.length} members · {journeys.filter(j => j.overdue).length} overdue</AppText>
      {Object.entries(journeyStages).filter(([stage]) => journeys.some(j => j.currentStage === stage)).map(([stage, title]) => <AppText key={stage} size={13}>{title}: {journeys.filter(j => j.currentStage === stage).length}</AppText>)}
      {!journeys.length ? <AppText>No member journeys in your assigned scope.</AppText> : journeys.map(j => <Pressable key={j.userId} onPress={() => setSelectedId(j.userId)} style={{ padding: 16, borderRadius: 14, backgroundColor: colors.card, gap: 8 }}>
        <AppText weight="700">{j.memberName}</AppText>
        <AppText>{journeyStages[j.currentStage] ?? j.currentStage}</AppText>
        <AppText size={13}>{j.nextAction}</AppText>
        <AppText size={12} color={colors.mutedForeground}>Branch #{j.gymId}{j.overdue ? " · Overdue" : ""}</AppText>
      </Pressable>)}
      <Button label="Refresh" variant="secondary" onPress={() => setRevision(r => r + 1)} />
    </>}
  </Screen>;
}