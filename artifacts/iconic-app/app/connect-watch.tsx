import { useState } from "react";
import { Alert, Linking, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { ModalHeader } from "@/components/ModalHeader";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import { useWatchHealth } from "@/hooks/useWatchHealth";
import { useHealthDay } from "@/lib/manualHealth";
import { memberAuthHref } from "@/lib/memberAuth";
import { istDateLabel, istDateNDaysAgo } from "@/lib/dates";
import { healthSourceLabel, type WatchRecord } from "@/lib/watchHealth";
import { WATCH_PAIRING_NOTE, formatSyncTime, watchConnectionStatus } from "@/lib/watchConnectionState";

const fields: [keyof Omit<WatchRecord, "date">, string, string][] = [
  ["steps", "Steps", ""], ["distanceKm", "Distance", "km"], ["activeCalories", "Active calories", "kcal"],
  ["sleepHours", "Sleep", "hr"], ["heartRateBpm", "Average HR", "bpm"], ["weightKg", "Weight", "kg"],
];

/** Android: documented settings intent. iOS: no public Bluetooth deep link, so open general Settings. */
async function openBluetooth() {
  try {
    if (Platform.OS === "android") await Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
    else await Linking.openSettings();
  } catch {
    Alert.alert("Could not open settings", Platform.OS === "android"
      ? "Open Settings → Connected devices → Bluetooth on your phone."
      : "Open the Settings app → Bluetooth on your iPhone.");
  }
}

export default function ConnectWatch() {
  const health = useWatchHealth();
  const router = useRouter();
  const colors = useColors();
  const { isLoaded } = useAuth();
  const [period, setPeriod] = useState(7);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  useHealthDay();
  const isNative = Platform.OS === "ios" || Platform.OS === "android";
  const hasReadableRecords = !!health.owner && health.records.some(row => fields.some(([f]) => row[f] !== null));
  const status = watchConnectionStatus({
    platform: Platform.OS, authLoaded: isLoaded, owner: health.owner, ready: health.ready,
    availability: health.availability, connected: health.connected, busy: health.busy,
    error: health.error, lastReadAt: health.lastReadAt, hasReadableRecords,
  });
  const toneColor = { good: colors.primary, warn: "#E0A23A", bad: "#E05A4F", neutral: colors.mutedForeground }[status.tone];
  const providerName = Platform.OS === "android" ? "Health Connect" : "Apple Health";

  const card = { padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 10 } as const;
  const action = (label: string, icon: keyof typeof Feather.glyphMap, onPress: () => void, hint?: string) => (
    <Pressable accessibilityRole="button" accessibilityHint={hint} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
      <Feather name={icon} size={18} color={colors.primary} />
      <AppText weight="700" color={colors.primary} style={{ flex: 1 }}>{label}</AppText>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
  const healthSettings = () => {
    if (Platform.OS === "ios") Alert.alert("Apple Health permissions",
      "Open the Health app, tap your profile picture, then Apps (or Apps and Services) → Iconic Fitness. Choose which records to share. Apple does not let Iconic see which read permissions you have denied.");
    else void health.openSettings();
  };
  const step = (n: number, title: string, body: string, done: boolean, extra?: React.ReactNode) => (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: done ? colors.primary : colors.background, borderWidth: 1, borderColor: done ? colors.primary : colors.border }}>
        {done ? <Feather name="check" size={14} color="#071407" /> : <AppText size={12} weight="700">{n}</AppText>}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="700">{title}</AppText>
        <AppText muted size={13}>{body}</AppText>
        {extra}
      </View>
    </View>
  );

  return <Screen>
    <ModalHeader title="Connect watch" />
    <View style={{ gap: 16 }}>
      {/* Primary status: Iconic Fitness ↔ health store (truthful, never "watch connected") */}
      <View accessibilityRole="summary" style={[card, { borderColor: toneColor, borderWidth: 1.5 }]}>
        <AppText size={11} weight="700" muted style={{ letterSpacing: 1 }}>ICONIC FITNESS HEALTH ACCESS</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: toneColor }} />
          <AppText size={20} weight="700" style={{ flex: 1 }}>{status.title}</AppText>
        </View>
        <AppText muted={status.tone !== "bad"} accessibilityRole={status.tone === "bad" ? "alert" : undefined}>{status.detail}</AppText>
        {status.canUseHealth && <AppText size={13} muted>Source: {healthSourceLabel(health.availability!.provider)} · Last sync: {formatSyncTime(health.lastReadAt)}</AppText>}
        {status.canUseHealth && !health.connected && <Button label="Enable health access" icon="heart" loading={health.busy} disabled={health.busy} onPress={() => void health.connect()} />}
        {status.showSync && <Button label={health.busy ? "Syncing…" : "Sync now"} icon="refresh-cw" loading={health.busy} disabled={health.busy || !status.canUseHealth} onPress={() => void health.sync()} />}
        {status.kind === "signed-out" && <Button label="Sign in to enable health access" icon="log-in" onPress={() => router.push(memberAuthHref("/connect-watch"))} />}
      </View>

      {/* Separate watch pairing status: never inferred */}
      <View style={card}>
        <AppText size={11} weight="700" muted style={{ letterSpacing: 1 }}>WATCH PAIRING</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Feather name="bluetooth" size={18} color={colors.mutedForeground} />
          <AppText weight="700" style={{ flex: 1 }}>Not detectable here</AppText>
        </View>
        <AppText muted size={13}>{WATCH_PAIRING_NOTE}</AppText>
        {isNative && action(Platform.OS === "android" ? "Open Bluetooth settings" : "Open Settings", "bluetooth", () => void openBluetooth(),
          Platform.OS === "ios" ? "Opens the Settings app. Go back to the main Settings list, then Bluetooth." : undefined)}
        {Platform.OS === "ios" && <AppText muted size={12}>iOS has no supported link straight to Bluetooth. In Settings, go to the main list → Bluetooth, or use your watch's companion app.</AppText>}
      </View>

      {/* Next steps */}
      <View style={card}>
        <AppText size={18} weight="700">How to connect</AppText>
        {step(1, "Pair your watch", "Use your watch's companion app (or phone Bluetooth) to pair and sync it.", false,
          isNative ? action(Platform.OS === "android" ? "Open Bluetooth settings" : "Open Settings", "bluetooth", () => void openBluetooth()) : undefined)}
        {step(2, `Share with ${Platform.OS === "web" ? "Apple Health or Health Connect" : providerName}`,
          "In the companion app, turn on sharing to Apple Health (iPhone) or Health Connect (Android 14+).", false,
          status.canUseHealth ? action(Platform.OS === "ios" ? "How to change Health permissions" : "Open Health Connect settings", "settings", healthSettings) : undefined)}
        {step(3, "Enable health access here", isNative ? "Sign in, then tap Enable health access and allow the records you want to share." : "In the installed Iconic Fitness app: sign in, open More → Connect watch, tap Enable health access.", health.connected && status.canUseHealth)}
        {step(4, "Sync now", "Reads refresh when you return to the app (at most every five minutes). No background sync.", hasReadableRecords && status.kind === "connected-synced")}
        {!isNative && <AppText muted size={12}>Browser preview: no health permissions are requested and nothing is connected here. Use an installed Iconic Fitness build; Expo Go is not supported.</AppText>}
      </View>

      <AppText muted size={12}>Records may include your phone and other permitted apps, not only your watch. A completed permission prompt does not confirm every permission was granted. Health data stays on this device, separately for this account. It is not uploaded or backed up.</AppText>

      {status.showDisconnect && <View style={card}>
        {!confirmDisconnect ? <Button label="Disconnect health import" icon="x-circle" variant="secondary" onPress={() => setConfirmDisconnect(true)} />
          : <View accessibilityRole="alert" style={{ gap: 10 }}>
            <AppText weight="700">Disconnect and clear imported data?</AppText>
            <AppText muted size={13}>Stops automatic reads and clears this account's imported data and connection consent on this phone. Manual entries are kept. OS health records are not erased; revoke OS permissions separately.</AppText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Button label="Cancel" variant="ghost" onPress={() => setConfirmDisconnect(false)} /></View>
              <View style={{ flex: 1 }}><Button label="Disconnect" variant="danger" onPress={() => { setConfirmDisconnect(false); void health.disconnect(); }} /></View>
            </View>
          </View>}
      </View>}

      {health.owner && isNative && <>
        <AppText size={20} weight="700">Daily records · IST</AppText>
        <View style={{ flexDirection: "row", gap: 12 }}>{[7, 30].map(n => <Pressable key={n} accessibilityRole="button" onPress={() => setPeriod(n)}
          style={{ padding: 12, borderRadius: 16, backgroundColor: n === period ? colors.primary : colors.card }}>
          <AppText color={n === period ? "#071407" : colors.foreground}>Last {n} days</AppText>
        </Pressable>)}</View>
        {!hasReadableRecords && <AppText muted>No readable records yet. Missing values are shown as —, not zero.</AppText>}
        {Array.from({ length: period }, (_, i) => istDateNDaysAgo(i)).map(date => {
          const row = health.records.find(record => record.date === date);
          return <View key={date} style={{ padding: 16, borderRadius: 18, backgroundColor: colors.card, gap: 8 }}>
            <AppText weight="700">{istDateLabel(date)}</AppText>
            {fields.map(([field, label, unit]) => <View key={field} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText size={13} muted>{label}</AppText><AppText size={13}>{row?.[field] == null ? "—" : `${Number(row[field].toFixed(2)).toLocaleString("en-IN")} ${unit}`}</AppText>
            </View>)}
            {health.provider && row && <AppText size={11} muted>{healthSourceLabel(health.provider)}</AppText>}
          </View>;
        })}
      </>}
    </View>
  </Screen>;
}
