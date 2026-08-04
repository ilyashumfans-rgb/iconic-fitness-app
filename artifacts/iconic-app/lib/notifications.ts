import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer } from "expo-audio";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { customFetch } from "@workspace/api-client-react";

import { resolveImageUrl } from "@/lib/images";

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

const SILENT_CHANNEL_ID = "reminders-silent";

/**
 * A silent channel used when the admin uploaded a custom notification sound:
 * the audio clip is played in-app while the banner itself stays silent, so the
 * member doesn't hear two sounds at once.
 */
async function ensureSilentAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(SILENT_CHANNEL_ID, {
    name: "Reminders (custom sound)",
    importance: Notifications.AndroidImportance.HIGH,
    // Explicitly silent — Android channel sound is sticky, so this channel is
    // created silent from day one and never reused for audible notifications.
    sound: null,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export type NotificationAudience = "members" | "trainers";

type NotificationSounds = { members: string | null; trainers: string | null };

let soundsCache: { at: number; value: NotificationSounds } | null = null;
const SOUNDS_CACHE_MS = 5 * 60 * 1000;

/**
 * Admin-uploaded custom notification sound for this audience, or null to use
 * the phone's default ringtone. Cached for 5 minutes; any failure → default.
 */
async function getCustomSoundUrl(
  audience: NotificationAudience,
): Promise<string | null> {
  try {
    if (!soundsCache || Date.now() - soundsCache.at > SOUNDS_CACHE_MS) {
      const value = await customFetch<NotificationSounds>(
        "/api/settings/notification-sounds",
        { method: "GET" },
      );
      soundsCache = { at: Date.now(), value };
    }
    const url = soundsCache.value[audience];
    return url ? (resolveImageUrl(url) ?? null) : null;
  } catch {
    return null;
  }
}

/** Play the uploaded clip in-app. Best-effort — failures fall back silently. */
function playCustomSound(url: string): void {
  try {
    const player = createAudioPlayer({ uri: url });
    player.play();
    // Release the player once the clip has had time to finish.
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // already removed
      }
    }, 15_000);
  } catch {
    // ignore — the notification banner still shows
  }
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
  audience: NotificationAudience = "members",
): Promise<void> {
  if (Platform.OS === "web") return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  // Admin-uploaded custom sound? Play it in-app and keep the banner silent so
  // the member hears the custom clip, not the default ringtone on top of it.
  const customSoundUrl = await getCustomSoundUrl(audience);
  const useCustom = customSoundUrl !== null;
  if (useCustom) {
    await ensureSilentAndroidChannel();
    playCustomSound(customSoundUrl);
  } else {
    await ensureAndroidChannel();
  }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: useCustom ? false : "default" },
    trigger:
      Platform.OS === "android"
        ? ({
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: useCustom ? SILENT_CHANNEL_ID : ANDROID_CHANNEL_ID,
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
  // Explicit opt-out — reminders are ON by default, so record "0" rather than
  // clearing the key (a missing key means "use the default: on").
  await AsyncStorage.setItem(REMINDERS_KEY, "0");
}

/** Reminders are on by default; only an explicit toggle-off ("0") disables them. */
export async function areRemindersOn(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const raw = await AsyncStorage.getItem(REMINDERS_KEY);
  return raw !== "0";
}

/**
 * Called on app launch: keep daily reminders scheduled for everyone who hasn't
 * explicitly turned them off. Safe to call repeatedly (reschedules in place);
 * silently does nothing if notification permission is denied.
 */
export async function ensureDefaultReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (!(await areRemindersOn())) return;
    await scheduleActionReminders();
  } catch {
    // Never let reminder scheduling break app startup.
  }
}
