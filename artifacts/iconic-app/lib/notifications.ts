import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDERS_KEY = "iconic.remindersOn";

export type ActionReminder = {
  key: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

/**
 * One daily nudge per member action, spread through the day. The AI coach guides
 * the plan; these reminders make sure members actually take each action.
 */
export const ACTION_REMINDERS: ActionReminder[] = [
  {
    key: "breakfast",
    hour: 8,
    minute: 0,
    title: "Log your breakfast",
    body: "Start the day on track — add your breakfast to hit today's targets.",
  },
  {
    key: "water-am",
    hour: 11,
    minute: 0,
    title: "Hydration check",
    body: "Have a glass of water and log it. Small sips, big results.",
  },
  {
    key: "lunch",
    hour: 13,
    minute: 0,
    title: "Log your lunch",
    body: "Keep your calories and protein on point — log what you ate.",
  },
  {
    key: "water-pm",
    hour: 16,
    minute: 0,
    title: "Stay hydrated",
    body: "Top up your water and log it to stay ahead of your goal.",
  },
  {
    key: "workout",
    hour: 18,
    minute: 0,
    title: "Time to move",
    body: "Your workout window — train and log your session.",
  },
  {
    key: "dinner",
    hour: 20,
    minute: 30,
    title: "Log your dinner",
    body: "Round off the day — add dinner to close your nutrition rings.",
  },
  {
    key: "steps",
    hour: 21,
    minute: 0,
    title: "Steps check",
    body: "How are your steps today? A short walk can close the gap.",
  },
  {
    key: "sleep",
    hour: 22,
    minute: 0,
    title: "Wind down",
    body: "Good sleep builds results. Start winding down for the night.",
  },
];

const ANDROID_CHANNEL_ID = "reminders";

/**
 * On Android the notification sound + heads-up banner come from the channel, not
 * the per-notification content. Create a high-importance channel with the default
 * sound so reminders actually chime and pop up. No-op on iOS/web.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Fire a notification right now (with sound). Used when the app detects a new
 * server-side notification while open, so the member gets an audible heads-up
 * banner even without push infrastructure. No-op on web / if permission denied.
 */
export async function presentLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: "default" },
    trigger:
      Platform.OS === "android"
        ? ({
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: ANDROID_CHANNEL_ID,
          } as Notifications.TimeIntervalTriggerInput)
        : null,
  });
}

/**
 * Schedule the full set of daily action reminders (water, meals, workout, steps,
 * sleep). Replaces any previously scheduled reminders. Returns false if
 * unsupported or permission was denied.
 */
export async function scheduleActionReminders(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of ACTION_REMINDERS) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, sound: "default" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
  await AsyncStorage.setItem(REMINDERS_KEY, "1");
  return true;
}

export async function cancelActionReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(REMINDERS_KEY);
}

export async function areRemindersOn(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(REMINDERS_KEY);
  return raw === "1";
}
