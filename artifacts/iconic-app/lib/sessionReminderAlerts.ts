import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Alert, Platform } from "react-native";
import { pushCapable } from "./pushRegistration";
import { sessionReminderKey, shouldShowSessionAlert } from "./sessionReminderPolicy";

type Reminder = { id: number; title: string; body: string; link?: string; createdAt: string };
const presenting = new Set<number>();

export async function rememberSessionPush(link: string, enabled: boolean) {
  const key = sessionReminderKey(link);
  if (key) await AsyncStorage.setItem(key, enabled ? "1" : "0");
}

/** In-app fallback works even without OS notification permission (including web
 * and Expo Go). Only suppress where this device actually opted into native push.
 * Shared persisted IDs prevent home + session-screen pollers double-alerting.
 */
export async function presentSessionReminder(n: Reminder): Promise<void> {
  const key = sessionReminderKey(n.link);
  if (!key || presenting.has(n.id)) return;
  presenting.add(n.id);
  try {
    const shownKey = `nc.alert.${n.id}`;
    const alreadyShown = await AsyncStorage.getItem(shownKey) === "1";
    const pushRegistered = pushCapable() && await AsyncStorage.getItem(key) === "1"
      && (await Notifications.getPermissionsAsync()).granted;
    if (!shouldShowSessionAlert({ ...n, alreadyShown, pushRegistered })) return;
    await AsyncStorage.setItem(shownKey, "1");
    const open = () => router.push(n.link as never);
    if (Platform.OS === "web") {
      if (window.confirm(`${n.title}\n\n${n.body}\n\nOpen session?`)) open();
    } else {
      Alert.alert(n.title, n.body, [{ text: "Later", style: "cancel" }, { text: "Open session", onPress: open }]);
    }
  } finally { presenting.delete(n.id); }
}
