import { watchConnectionStatus, DISCONNECTED_COPY, type WatchStatusInput } from "./watchConnectionState";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const base: WatchStatusInput = {
  platform: "android", authLoaded: true, owner: "user_1", ready: true,
  availability: { available: true, provider: "health-connect" },
  connected: false, busy: false, error: "", lastReadAt: null, hasReadableRecords: false,
};
/** Synthetic presentation cases only; no device health reads or writes. */
export function runWatchConnectionStateRegressionTests() {
  const off = watchConnectionStatus(base);
  assert(off.kind === "not-connected" && off.detail === DISCONNECTED_COPY, "Disconnected shows required copy");
  assert(off.title === "Not connected to Iconic Fitness" && !off.showSync && !off.showDisconnect, "Disconnected hides sync/disconnect");
  for (const s of [off, watchConnectionStatus({ ...base, connected: true, hasReadableRecords: true, lastReadAt: new Date().toISOString() })])
    assert(!/watch connected|bluetooth connected/i.test(s.title), "Never claims watch/Bluetooth connection");

  const empty = watchConnectionStatus({ ...base, connected: true, lastReadAt: "2026-02-01T10:00:00Z" });
  assert(empty.kind === "connected-no-records" && empty.showSync && empty.showDisconnect, "Connected, no records");

  const synced = watchConnectionStatus({ ...base, connected: true, lastReadAt: "2026-02-01T10:00:00Z", hasReadableRecords: true });
  assert(synced.kind === "connected-synced" && /Data synced/.test(synced.detail) && synced.tone === "good", "Synced shows date");

  const err = watchConnectionStatus({ ...base, connected: true, hasReadableRecords: true, error: "Read failed." });
  assert(err.kind === "read-error" && /kept/.test(err.detail) && err.showDisconnect, "Sync error keeps records and disconnect");

  const unavailable = watchConnectionStatus({ ...base, availability: { available: false, provider: "health-connect", reason: "Expo Go is not supported." } });
  assert(unavailable.kind === "unavailable" && !unavailable.canUseHealth && unavailable.detail.includes("Expo Go"), "Unavailable/Expo Go");
  const staleUnavailable = watchConnectionStatus({ ...base, connected: true, availability: { available: false, provider: "apple-health" } });
  assert(staleUnavailable.showDisconnect && !staleUnavailable.showSync, "Stale consent can still be cleared");

  const preview = watchConnectionStatus({ ...base, platform: "web", connected: true, hasReadableRecords: true });
  assert(preview.kind === "preview" && !preview.canUseHealth && !preview.showSync, "Browser never fakes connection");

  const loggedOut = watchConnectionStatus({ ...base, owner: null, connected: true, hasReadableRecords: true, lastReadAt: "2026-02-01T10:00:00Z" });
  assert(loggedOut.kind === "signed-out" && !loggedOut.showDisconnect && !loggedOut.canUseHealth, "Logout ignores stale records");

  assert(watchConnectionStatus({ ...base, authLoaded: false }).kind === "loading", "Auth loading");
  assert(watchConnectionStatus({ ...base, connected: true, busy: true }).kind === "syncing", "Syncing");
}
runWatchConnectionStateRegressionTests();
