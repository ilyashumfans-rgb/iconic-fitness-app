import { useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
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

const fields: [keyof Omit<WatchRecord, "date">, string, string][] = [
  ["steps", "Steps", ""], ["distanceKm", "Distance", "km"], ["activeCalories", "Active calories", "kcal"],
  ["sleepHours", "Sleep", "hr"], ["heartRateBpm", "Average HR", "bpm"], ["weightKg", "Weight", "kg"],
];
export default function ConnectWatch() {
  const health = useWatchHealth();
  const router = useRouter();
  const colors = useColors();
  const { isLoaded } = useAuth();
  const [period, setPeriod] = useState(7);
  const [showPreviewHelp, setShowPreviewHelp] = useState(false);
  useHealthDay();
  // The entry point and preview instructions are public; actual health reads
  // remain authenticated and device-local inside the health provider.
  if (Platform.OS === "web" || !health.owner) return <Screen>
    <ModalHeader title="Connect watch" />
    <View style={{ gap: 18 }}>
      <AppText size={24} weight="700">Connect your watch</AppText>
      <AppText muted>Use Apple Health on iPhone or Health Connect on Android 14+ to share your watch's health records with Iconic Fitness.</AppText>
      <Button label="Connect watch" icon="watch"
        disabled={Platform.OS !== "web" && !isLoaded}
        onPress={() => {
          if (Platform.OS === "web") setShowPreviewHelp(true);
          else router.push(memberAuthHref("/connect-watch"));
        }} />
      <AppText muted size={13}>{Platform.OS === "web"
        ? "Browser preview: the button shows setup instructions. Health permissions and syncing are available only in an installed Iconic Fitness build with health support, not in the browser or Expo Go."
        : "Sign in to connect. Your imported health records stay private to your account on this phone."}</AppText>
      {showPreviewHelp ? <View accessibilityRole="alert" style={{ padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, gap: 12 }}>
        <AppText weight="700" size={18}>How to connect on your phone</AppText>
        <AppText>1. Pair your watch through its companion app.</AppText>
        <AppText>2. Enable sharing with Apple Health or Health Connect.</AppText>
        <AppText>3. In the installed Iconic Fitness app, sign in and open More → Connect watch.</AppText>
        <AppText>4. Tap Connect & request permissions, allow the health records you want to share, then tap Sync now.</AppText>
        <AppText muted size={12}>Preview only: no watch has been connected and no health permissions have been requested.</AppText>
      </View> : null}
    </View>
  </Screen>;
  const button = (title: string, action: () => Promise<void>, disabled = false) => (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void action()}
      style={{ padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, opacity: disabled ? 0.45 : 1 }}>
      <AppText weight="700">{title}</AppText>
    </Pressable>
  );
  return <Screen>
    <ModalHeader title="Connect watch" />
    <View style={{ gap: 14 }}>
      <AppText size={24} weight="700">Your daily health, together</AppText>
      <AppText muted>Sync your watch with its device app first, then allow Iconic Fitness to read Apple Health on iOS or Health Connect on Android 14+. This does not pair a watch over Bluetooth.</AppText>
      <AppText muted size={13}>Records may include your phone and other permitted apps, not only your watch. Health data stays on this device, separately for this account. It is not uploaded or backed up.</AppText>
      {!isLoaded ? <AppText>Sign-in is loading…</AppText> : !health.availability ? <AppText>Checking health support…</AppText> : !health.availability.available ? <>
        {button("Connect & request permissions", async () => setShowPreviewHelp(true))}
        <AppText muted size={12}>{health.availability.reason || "Health support is unavailable on this device."}</AppText>
        {showPreviewHelp ? <View accessibilityRole="alert" style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, gap: 8 }}>
          <AppText weight="700">Connect on your phone</AppText>
          <AppText size={13}>1. Pair your watch using its companion app.</AppText>
          <AppText size={13}>2. Share its records with Apple Health on iPhone or Health Connect on Android 14+.</AppText>
          <AppText size={13}>3. Open an installed Iconic Fitness build with health support, then More → Connect watch → Connect & request permissions.</AppText>
          <AppText size={13}>No watch has been connected here and no health permissions have been requested.</AppText>
        </View> : null}
      </> : <>
        <AppText weight="700">{healthSourceLabel(health.availability.provider)}</AppText>
        {button(health.connected ? "Request permissions again" : "Connect & request permissions", health.connect, health.busy || !health.ready)}
        {button(health.busy ? "Reading…" : "Sync now", health.sync, health.busy || !health.connected || !health.ready)}
        {Platform.OS === "ios"
          ? button("How to change Health permissions", async () => {
              Alert.alert("Apple Health permissions",
                "Open the Health app, tap your profile picture, then Apps (or Apps and Services) → Iconic Fitness. Choose which records to share. Apple does not let Iconic see which read permissions you have denied.");
            })
          : button("Open health settings", health.openSettings)}
      </>}
      <AppText size={13}>Permissions requested: {health.requestedAt ? new Date(health.requestedAt).toLocaleString("en-IN") : "Not yet"}</AppText>
      <AppText size={13}>Last successful read: {health.lastReadAt ? new Date(health.lastReadAt).toLocaleString("en-IN") : "Not yet"}</AppText>
      <AppText muted size={12}>A completed prompt does not confirm every permission was granted. Missing records can mean no data or no read access. While connected, reads refresh when you return to the app (at most every five minutes) and when the India date changes. No background sync is promised.</AppText>
      {health.error ? <AppText accessibilityRole="alert">{health.error}</AppText> : null}
      {health.owner && health.ready && button("Disconnect & clear imported data", health.disconnect)}
      <AppText muted size={12}>Disconnect stops automatic reads and clears this account’s imported data and connection consent. It does not erase OS health records. Revoke OS permissions separately in health settings.</AppText>
      <AppText size={20} weight="700">Daily records · IST</AppText>
      <View style={{ flexDirection: "row", gap: 12 }}>{[7, 30].map(n => <Pressable key={n} accessibilityRole="button" onPress={() => setPeriod(n)}
        style={{ padding: 12, borderRadius: 16, backgroundColor: n === period ? colors.primary : colors.card }}>
        <AppText color={n === period ? "#071407" : colors.foreground}>Last {n} days</AppText>
      </Pressable>)}</View>
      {!health.records.some(row => fields.some(([field]) => row[field] !== null)) && <AppText muted>No readable records yet. Sync your device app and check OS permissions. Missing values are shown as —, not zero.</AppText>}
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
    </View>
  </Screen>;
}