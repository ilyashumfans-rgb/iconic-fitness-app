import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer } from "expo-audio";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { customFetch } from "@workspace/api-client-react";

import { resolveImageUrl } from "@/lib/images";

const REMINDERS_KEY = "iconic.remindersOn";
const REMINDER_ACCOUNT_KEY_PREFIX = `${REMINDERS_KEY}:`;
const REMINDER_IDS_KEY_PREFIX = "iconic.actionReminderIds:";
const ACTION_REMINDER_NOTIFICATION_TYPE = "action-reminder";

type ReminderAccountId = string | null | undefined;

function accountStorageSuffix(accountId: ReminderAccountId): string {
  return accountId ? encodeURIComponent(accountId) : "default";
}

function preferenceStorageKey(accountId: ReminderAccountId): string {
  return accountId
    ? `${REMINDER_ACCOUNT_KEY_PREFIX}${accountStorageSuffix(accountId)}`
    : REMINDERS_KEY;
}

function idsStorageKey(accountId: ReminderAccountId): string {
  return `${REMINDER_IDS_KEY_PREFIX}${accountStorageSuffix(accountId)}`;
}

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

let legacyPreferenceOperation: Promise<void> = Promise.resolve();

/**
 * Reminder preferences are account-scoped where an authenticated account is
 * available. Older builds stored one device-wide value, so migrate that value
 * to the first account that reads it. This preserves an explicit old opt-out
 * without making a later member inherit another member's choice.
 */
async function readReminderPreference(
  accountId: ReminderAccountId,
): Promise<boolean> {
  const key = preferenceStorageKey(accountId);
  const raw = await AsyncStorage.getItem(key);
  if (raw !== null) return raw !== "0";

  if (accountId) {
    const migration = legacyPreferenceOperation.then(async () => {
      // Re-read inside the serialized migration so More, Profile, and the
      // launch initializer cannot race while moving the old device-wide key.
      const current = await AsyncStorage.getItem(key);
      if (current !== null) return current !== "0";
      const legacy = await AsyncStorage.getItem(REMINDERS_KEY);
      if (legacy === "0" || legacy === "1") {
        await AsyncStorage.setItem(key, legacy);
        await AsyncStorage.removeItem(REMINDERS_KEY);
        return legacy !== "0";
      }
      return true;
    });
    legacyPreferenceOperation = migration.then(
      () => undefined,
      () => undefined,
    );
    return migration;
  }

  // Daily reminders are opt-out, not opt-in. A missing preference means ON.
  return true;
}

async function writeReminderPreference(
  accountId: ReminderAccountId,
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(preferenceStorageKey(accountId), enabled ? "1" : "0");
}

async function getStoredReminderIds(
  accountId: ReminderAccountId,
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(idsStorageKey(accountId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

async function saveStoredReminderIds(
  accountId: ReminderAccountId,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) {
    await AsyncStorage.removeItem(idsStorageKey(accountId));
    return;
  }
  await AsyncStorage.setItem(idsStorageKey(accountId), JSON.stringify(ids));
}

function reminderForRequest(
  request: Notifications.NotificationRequest,
): ActionReminder | null {
  const data = request.content.data;
  if (
    data &&
    data.iconicNotification === ACTION_REMINDER_NOTIFICATION_TYPE &&
    typeof data.reminderKey === "string"
  ) {
    return (
      ACTION_REMINDERS.find((reminder) => reminder.key === data.reminderKey) ??
      null
    );
  }

  // Builds before reminder IDs were tracked did not add metadata. Recognise
  // only the exact action reminder title/body pairs so unrelated local and push
  // notifications are never cancelled.
  return (
    ACTION_REMINDERS.find(
      (reminder) =>
        request.content.title === reminder.title &&
        request.content.body === reminder.body,
    ) ?? null
  );
}

function isAccountReminder(
  request: Notifications.NotificationRequest,
  accountId: ReminderAccountId,
): boolean {
  const data = request.content.data;
  return (
    data?.iconicNotification === ACTION_REMINDER_NOTIFICATION_TYPE &&
    (data.accountId === accountId ||
      (accountId == null && data.accountId == null))
  );
}

function isCompleteReminderSet(
  requests: Notifications.NotificationRequest[],
  accountId: ReminderAccountId,
): boolean {
  const matching = requests.filter((request) => isAccountReminder(request, accountId));
  if (matching.length !== ACTION_REMINDERS.length) return false;
  const keys = new Set(
    matching
      .map((request) => request.content.data?.reminderKey)
      .filter((key): key is string => typeof key === "string"),
  );
  return (
    keys.size === ACTION_REMINDERS.length &&
    ACTION_REMINDERS.every((reminder) => keys.has(reminder.key))
  );
}

async function cancelScheduledReminderRequests(
  requests: Notifications.NotificationRequest[],
): Promise<void> {
  await Promise.all(
    requests.map(async (request) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      } catch {
        // The OS may have already removed an expired/corrupt request.
      }
    }),
  );
}

async function cancelScheduledReminderIds(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(async (identifier) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      } catch {
        // The OS may have already removed an expired/corrupt request.
      }
    }),
  );
}

// Scheduling and cancelling touch the same OS-level list. Serialise those
// operations so two screens cannot interleave a toggle and create duplicates.
let reminderOperation: Promise<void> = Promise.resolve();

function withReminderOperation<T>(operation: () => Promise<T>): Promise<T> {
  const next = reminderOperation.then(operation, operation);
  reminderOperation = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
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
 * sleep). Replaces only previously scheduled action reminders for this account.
 * Returns false if unsupported or permission was denied.
 */
export async function scheduleActionReminders(
  accountId?: string | null,
): Promise<boolean> {
  // Web has no native scheduler in this app. Still persist the member's
  // preference so the same account sees the correct value on another session;
  // the UI explicitly explains that delivery is mobile-only.
  if (Platform.OS === "web") {
    await writeReminderPreference(accountId, true);
    return true;
  }

  return withReminderOperation(async () => {
    const granted = await ensureNotificationPermission();
    if (!granted) return false;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const accountRequests = scheduled.filter((request) =>
      isAccountReminder(request, accountId),
    );
    const legacyRequests = scheduled.filter(
      (request) =>
        reminderForRequest(request) !== null &&
        request.content.data?.iconicNotification !==
          ACTION_REMINDER_NOTIFICATION_TYPE,
    );

    // A launch/toggle can safely call this repeatedly. Do not recreate an
    // already-complete set, and never touch unrelated push/local notifications.
    if (
      legacyRequests.length === 0 &&
      isCompleteReminderSet(accountRequests, accountId)
    ) {
      await writeReminderPreference(accountId, true);
      return true;
    }

    // Remove only action reminders. Legacy reminders are unscoped because old
    // builds did not record an account, but their exact title/body identifies
    // them without affecting any other notification.
    const existingToReplace = [
      ...accountRequests,
      ...legacyRequests.filter(
        (request) => !accountRequests.some((item) => item.identifier === request.identifier),
      ),
    ];
    await cancelScheduledReminderRequests(existingToReplace);
    await saveStoredReminderIds(accountId, []);

    await ensureAndroidChannel();
    const createdIds: string[] = [];
    try {
      for (const r of ACTION_REMINDERS) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: r.title,
            body: r.body,
            sound: "default",
            data: {
              iconicNotification: ACTION_REMINDER_NOTIFICATION_TYPE,
              reminderKey: r.key,
              accountId: accountId ?? null,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: r.hour,
            minute: r.minute,
            channelId: ANDROID_CHANNEL_ID,
          },
        });
        createdIds.push(identifier);
      }
    } catch (error) {
      await cancelScheduledReminderIds(createdIds).catch(() => {});
      throw error;
    }
    await saveStoredReminderIds(accountId, createdIds);
    await writeReminderPreference(accountId, true);
    return true;
  });
}

export async function cancelActionReminders(
  accountId?: string | null,
): Promise<void> {
  if (Platform.OS === "web") {
    await writeReminderPreference(accountId, false);
    return;
  }

  await withReminderOperation(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const storedIds = await getStoredReminderIds(accountId);
    const requestsToCancel = scheduled.filter(
      (request) =>
        storedIds.includes(request.identifier) ||
        isAccountReminder(request, accountId) ||
        // Clean up reminders created by a pre-metadata build, but leave every
        // unrelated local/push notification untouched.
        (reminderForRequest(request) !== null &&
          request.content.data?.iconicNotification !==
            ACTION_REMINDER_NOTIFICATION_TYPE),
    );
    await cancelScheduledReminderRequests(requestsToCancel);
    await saveStoredReminderIds(accountId, []);
    // Explicit opt-out — a missing key means the default: on.
    await writeReminderPreference(accountId, false);
  });
}

/** Reminders are on by default; only an explicit toggle-off ("0") disables them. */
export async function areRemindersOn(
  accountId?: string | null,
): Promise<boolean> {
  return readReminderPreference(accountId);
}

/**
 * Called once when an authenticated member session becomes available. Native
 * sessions get real OS reminders only after permission is granted; web sessions
 * only retain the preference because this app does not deliver web reminders.
 */
export async function ensureDefaultReminders(
  accountId?: string | null,
): Promise<void> {
  try {
    await withReminderOperation(async () => {
      if (!(await readReminderPreference(accountId))) return;
      if (Platform.OS === "web") return;

      const granted = await ensureNotificationPermission();
      if (!granted) return;

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const accountRequests = scheduled.filter((request) =>
        isAccountReminder(request, accountId),
      );
      const legacyRequests = scheduled.filter(
        (request) =>
          reminderForRequest(request) !== null &&
          request.content.data?.iconicNotification !==
            ACTION_REMINDER_NOTIFICATION_TYPE,
      );
      if (
        legacyRequests.length === 0 &&
        isCompleteReminderSet(accountRequests, accountId)
      ) {
        return;
      }

      const existingToReplace = [
        ...accountRequests,
        ...legacyRequests.filter(
          (request) =>
            !accountRequests.some((item) => item.identifier === request.identifier),
        ),
      ];
      await cancelScheduledReminderRequests(existingToReplace);
      await saveStoredReminderIds(accountId, []);
      await ensureAndroidChannel();
      const createdIds: string[] = [];
      try {
        for (const r of ACTION_REMINDERS) {
          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: r.title,
              body: r.body,
              sound: "default",
              data: {
                iconicNotification: ACTION_REMINDER_NOTIFICATION_TYPE,
                reminderKey: r.key,
                accountId: accountId ?? null,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: r.hour,
              minute: r.minute,
              channelId: ANDROID_CHANNEL_ID,
            },
          });
          createdIds.push(identifier);
        }
      } catch (error) {
        await cancelScheduledReminderIds(createdIds).catch(() => {});
        throw error;
      }
      await saveStoredReminderIds(accountId, createdIds);
    });
  } catch {
    // Reminder scheduling must never prevent the member app from starting.
  }
}
