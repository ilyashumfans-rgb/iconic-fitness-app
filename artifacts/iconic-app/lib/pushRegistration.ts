import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPushToken, removePushToken } from "@workspace/api-client-react";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { ensureNotificationPermission } from "@/lib/notifications";

// Remote push registration for renewal alerts. Only installed builds can
// receive Expo push (not web, not Expo Go). The permission prompt is shown
// only from an explicit "Enable renewal alerts" tap; background refreshes
// never prompt. Raw tokens are never logged.

const STORAGE_KEY = "iconic.push.registration.v1";

type Stored = { accountId: string; token: string };

// The account currently signed in (set from the root layout). Every network
// call re-checks it right before sending, because the API bearer is the
// CURRENT Clerk session: if the viewer changed mid-flow, sending would bind
// this device to the wrong account.
let viewer: string | null = null;
export function setPushViewer(accountId: string | null): void {
  viewer = accountId;
}
const stillViewer = (accountId: string) => viewer === accountId;

// All registration operations run one at a time (no interleaving of a slow
// enable with a sign-out release or an account-switch refresh).
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export function pushCapable(): boolean {
  if (Platform.OS === "web") return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function readStored(): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

async function deviceToken(): Promise<string | null> {
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    return res.data || null;
  } catch {
    return null;
  }
}

function platform(): "ios" | "android" | undefined {
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : undefined;
}

export type EnableResult = "enabled" | "denied" | "unsupported" | "failed";

/** User-initiated: asks permission, fetches the token, registers it for this account. */
export function enablePushForAccount(accountId: string): Promise<EnableResult> {
  return serial(() => enableImpl(accountId));
}

async function enableImpl(accountId: string): Promise<EnableResult> {
  if (!pushCapable()) return "unsupported";
  if (!stillViewer(accountId)) return "failed";
  const granted = await ensureNotificationPermission();
  if (!granted) return "denied";
  const token = await deviceToken();
  if (!token || !stillViewer(accountId)) return "failed";
  try {
    const prior = await readStored();
    if (prior && prior.accountId !== accountId) {
      await removePushToken({ token: prior.token });
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    if (!stillViewer(accountId)) return "failed";
    await registerPushToken({ token, platform: platform() });
    if (!stillViewer(accountId)) {
      // Viewer changed while the request was in flight: undo, never leave
      // this device bound to an account that is no longer signed in.
      await removePushToken({ token }).catch(() => undefined);
      return "failed";
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ accountId, token } satisfies Stored));
    return "enabled";
  } catch {
    return "failed";
  }
}

/**
 * Silent, on sign-in/launch. If the device was registered by a DIFFERENT
 * account (shared phone), release it so the previous member's alerts never
 * land here. If it was registered by this account and permission is still
 * granted, refresh the token. Never prompts.
 */
export function refreshPushRegistration(accountId: string): Promise<void> {
  return serial(() => refreshImpl(accountId));
}

async function refreshImpl(accountId: string): Promise<void> {
  if (!pushCapable()) return;
  const stored = await readStored();
  if (!stored) return;
  try {
    if (!stillViewer(accountId)) return;
    if (stored.accountId !== accountId) {
      await removePushToken({ token: stored.token });
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const token = await deviceToken();
    if (!token || !stillViewer(accountId)) return;
    if (token !== stored.token) await removePushToken({ token: stored.token }).catch(() => undefined);
    if (!stillViewer(accountId)) return;
    await registerPushToken({ token, platform: platform() });
    if (!stillViewer(accountId)) {
      await removePushToken({ token }).catch(() => undefined);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ accountId, token } satisfies Stored));
  } catch {
    // Retry on next launch.
  }
}

/** Call BEFORE Clerk signOut while the session can still authenticate. */
export function releasePushOnSignOut(): Promise<void> {
  return serial(releaseImpl);
}

async function releaseImpl(): Promise<void> {
  const stored = await readStored();
  if (!stored) return;
  try {
    await removePushToken({ token: stored.token });
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Keep the record: the next account to sign in on this device releases it.
  }
}
