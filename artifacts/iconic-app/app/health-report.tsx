import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { useFocusEffect, Redirect } from "expo-router";
import { useGuest } from "@/hooks/useGuest";
import { useColors } from "@/hooks/useColors";
import { memberAuthHref } from "@/lib/memberAuth";
import { Screen } from "@/components/Screen";
import { ModalHeader } from "@/components/ModalHeader";
import { AppText } from "@/components/AppText";
import { istDateLabel, istDateNDaysAgo } from "@/lib/dates";
import { healthMetrics, readHealthHistory, summarizeHealth, useHealthDay, type HealthReading } from "@/lib/manualHealth";

export default function HealthReport() {
  const colors = useColors();
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { isGuest } = useGuest();
  const owner = isGuest ? "guest" : isSignedIn && userId ? userId : null;
  const today = useHealthDay();
  const [period, setPeriod] = useState(7);
  const [metric, setMetric] = useState("steps");
  const [data, setData] = useState<{ owner: string; rows: HealthReading[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!owner) return;
    readHealthHistory(owner).then(rows => {
      if (active) setData({ owner, rows });
    }).catch(() => {
      if (active) setError("Could not load your readings. Please try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner, today, retry]));
  if (isLoaded && !owner) {
    return <Redirect href={memberAuthHref("/health-report")} />;
  }
  const start = istDateNDaysAgo(period - 1);
  const rows = data?.owner === owner ? data.rows.filter(r => r.date >= start && r.date <= today) : [];
  const selected = rows.filter(r => r.metric === metric);
  const stats = summarizeHealth(selected);
  const config = healthMetrics[metric];
  const days = new Set(rows.map(r => r.date)).size;
  const format = (n: number) => `${Number(n.toFixed(2)).toLocaleString("en-IN")} ${config.unit}`;
  const dates = Array.from({ length: period }, (_, index) => istDateNDaysAgo(period - index - 1));
  const max = Math.max(1, ...selected.map(r => r.value));
  return (
    <Screen>
      <ModalHeader title="Health Report" />
      <AppText muted size={12}>Manual readings • Dates in India time (IST). Saved on this device, not synced or backed up. No automatic watch tracking.</AppText>
      <View style={{ flexDirection: "row", gap: 10, marginVertical: 18 }}>
        {[7, 30].map(n => (
          <Pressable key={n} accessibilityRole="button" onPress={() => setPeriod(n)}
            style={{ padding: 12, borderRadius: 20, backgroundColor: n === period ? colors.primary : colors.card }}>
            <AppText weight="700" color={n === period ? "#071407" : colors.foreground}>Last {n} days</AppText>
          </Pressable>
        ))}
      </View>
      {loading ? <AppText>Loading readings…</AppText> : error ? (
        <Pressable onPress={() => setRetry(n => n + 1)}><AppText>{error} Tap to retry.</AppText></Pressable>
      ) : <>
        <AppText size={20} weight="700">{days} of {period} days logged</AppText>
        <AppText muted size={12} style={{ marginTop: 6 }}>Only logged days count toward averages. Missing entries are not counted as zero.</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 18, flexGrow: 0 }}>
          {Object.entries(healthMetrics).map(([key, item]) => (
            <Pressable key={key} onPress={() => setMetric(key)}
              style={{ padding: 12, marginRight: 8, borderRadius: 16, borderWidth: 1, borderColor: metric === key ? colors.primary : colors.border }}>
              <AppText weight={metric === key ? "700" : "400"}>{item.label}</AppText>
            </Pressable>
          ))}
        </ScrollView>
        {!stats ? <AppText muted>No {config.label.toLowerCase()} readings for this period. Use + Add on Home to begin.</AppText> : (
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12 }}>
            <AppText size={18} weight="700">{config.label} summary</AppText>
            <AppText>Daily average: {format(stats.average)}</AppText>
            <AppText>Range: {format(stats.min)} – {format(stats.max)}</AppText>
            {(metric === "steps" || metric === "water") && <AppText>Total logged: {format(stats.total)}</AppText>}
            <AppText>First-to-last change: {stats.change === null ? "Needs two logged days" : `${stats.change > 0 ? "+" : ""}${format(stats.change)}`}</AppText>
            <AppText muted size={12}>{stats.count} days recorded. Values are self-reported, not medical advice.</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingVertical: 12 }}>
                {dates.map(date => {
                  const row = selected.find(r => r.date === date);
                  return <View key={date} accessibilityLabel={`${istDateLabel(date)}: ${row ? format(row.value) : "Not logged"}`} style={{ width: 36, alignItems: "center", gap: 6 }}>
                    <View style={{ height: 100, justifyContent: "flex-end" }}>
                      <View style={{ width: 18, borderRadius: 4, height: row ? Math.max(3, row.value / max * 100) : 2, backgroundColor: row ? colors.primary : colors.border }} />
                    </View>
                    <AppText size={10}>{Number(date.slice(-2))}</AppText>
                  </View>;
                })}
              </View>
            </ScrollView>
          </View>
        )}
        <AppText size={18} weight="700" style={{ marginTop: 24, marginBottom: 12 }}>Daily history — {config.label}</AppText>
        {[...dates].reverse().map(date => {
          const row = selected.find(r => r.date === date);
          return <View key={date} style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12 }}>
            <AppText size={13}>{istDateLabel(date)}</AppText>
            <AppText size={13} weight="700">{row ? format(row.value) : "Not logged"}</AppText>
          </View>;
        })}
      </>}
    </Screen>
  );
}