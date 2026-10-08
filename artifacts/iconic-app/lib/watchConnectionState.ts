import type { HealthProvider } from "./watchHealth";

/**
 * Pure presentation state for the Connect watch screen. Iconic Fitness only reads
 * the phone's health store (Apple Health / Health Connect); it cannot detect
 * Bluetooth pairing, so watch pairing is always reported as "not detectable here".
 */
export type WatchStatusKind =
  | "loading" | "preview" | "signed-out" | "unavailable"
  | "not-connected" | "syncing" | "read-error" | "connected-no-records" | "connected-synced";

export type WatchStatusInput = {
  platform: "ios" | "android" | "web" | string;
  authLoaded: boolean;
  owner: string | null;
  ready: boolean;
  availability: { available: boolean; reason?: string; provider: HealthProvider } | null;
  connected: boolean;
  busy: boolean;
  error: string;
  lastReadAt: string | null;
  hasReadableRecords: boolean;
};

export type WatchStatus = {
  kind: WatchStatusKind;
  tone: "neutral" | "good" | "warn" | "bad";
  title: string;
  detail: string;
  /** Native health actions are offered only when true. */
  canUseHealth: boolean;
  showSync: boolean;
  showDisconnect: boolean;
};

export const WATCH_PAIRING_NOTE = "Check in your watch app or phone Bluetooth settings. Pairing is not detectable here.";
export const DISCONNECTED_COPY = "Watch data is not connected to Iconic Fitness. Open Bluetooth or your watch app to connect/synchronize your device, then enable health access here.";

export function formatSyncTime(iso: string | null): string {
  if (!iso) return "Not yet";
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not yet";
}

export function watchConnectionStatus(i: WatchStatusInput): WatchStatus {
  const base = { canUseHealth: false, showSync: false, showDisconnect: false };
  if (i.platform === "web") return { ...base, kind: "preview", tone: "neutral", title: "Not connected to Iconic Fitness",
    detail: "Browser preview cannot read health data. Follow the steps below on your phone with the installed Iconic Fitness app." };
  if (!i.authLoaded) return { ...base, kind: "loading", tone: "neutral", title: "Checking sign-in…", detail: "One moment." };
  if (!i.owner) return { ...base, kind: "signed-out", tone: "neutral", title: "Not connected to Iconic Fitness",
    detail: "Sign in as a member to enable health access. You can pair and set up your watch now using the steps below." };
  if (!i.ready || !i.availability) {
    if (i.error) return { ...base, kind: "read-error", tone: "bad", title: "Could not load health status", detail: i.error, showDisconnect: i.ready };
    return { ...base, kind: "loading", tone: "neutral", title: "Checking health support…", detail: "One moment." };
  }
  // Stale stored consent with no native module still offers local clearing.
  if (!i.availability.available) return { ...base, kind: "unavailable", tone: "warn", title: "Health access unavailable in this build",
    detail: i.availability.reason || "Health support is unavailable on this device.", showDisconnect: i.connected };
  const live = { canUseHealth: true, showSync: i.connected, showDisconnect: i.connected };
  if (!i.connected) return { ...live, kind: "not-connected", tone: "warn", title: "Not connected to Iconic Fitness", detail: DISCONNECTED_COPY };
  if (i.busy) return { ...live, kind: "syncing", tone: "neutral", title: "Health access enabled", detail: "Reading records from your phone's health store…" };
  if (i.error) return { ...live, kind: "read-error", tone: "bad", title: "Health access enabled · last sync failed",
    detail: `${i.error} Previously imported records are kept.` };
  if (!i.hasReadableRecords) return { ...live, kind: "connected-no-records", tone: "warn", title: "Health access enabled · no records found",
    detail: i.lastReadAt
      ? "No readable records in the last 30 days. Make sure your watch app shares data with the health store and that read permissions are allowed, then Sync now."
      : "Tap Sync now to read records." };
  return { ...live, kind: "connected-synced", tone: "good", title: "Health access enabled",
    detail: `Data synced ${formatSyncTime(i.lastReadAt)}. Records come from your phone's health store, not a live Bluetooth link.` };
}
