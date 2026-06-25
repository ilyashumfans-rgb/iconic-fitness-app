import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_KEY = "iconic.reminderHour";

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedule a single repeating daily reminder at the given hour (local time).
 * Replaces any previously scheduled reminder. Returns false if unsupported or
 * permission was denied.
 */
export async function scheduleDailyReminder(
  hour: number,
  minute = 0,
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Keep your streak alive",
      body: "Log your water, meals and movement for today.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  await AsyncStorage.setItem(REMINDER_KEY, String(hour));
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(REMINDER_KEY);
}

export async function getReminderHour(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  return raw == null ? null : Number(raw);
}
