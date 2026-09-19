import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  autoSyncAndRefresh, automaticMobileSyncKey, createMobileSyncPendingStore,
  MOBILE_SYNC_PENDING_KEY, syncMobileAndRefresh,
} from "./syncMemberMobile";

test("sync stays pending and eligibility hidden until server receipt saves, then invalidates", async () => {
  const client = new QueryClient();
  const key = ["/api/memberships/journey", "account-a"];
  client.setQueryData(key, { eligible: true });
  await syncMobileAndRefresh(client, "9000000000", async body => {
    assert.equal(body.mobile, "9000000000");
    assert.equal(client.getQueryData(MOBILE_SYNC_PENDING_KEY), 1);
    assert.equal(client.getQueryData<{ eligible: boolean }>(key)?.eligible, false);
    assert.equal(client.getQueryState(key)?.isInvalidated, false);
    return { synced: true };
  });
  assert.equal(client.getQueryData(MOBILE_SYNC_PENDING_KEY), 0);
  assert.equal(client.getQueryState(key)?.isInvalidated, true);
  client.clear();
});
test("failed save does not re-enable cached offer or mark sync successful", async () => {
  const client = new QueryClient();
  const key = ["/api/memberships/journey", "account-a"];
  client.setQueryData(key, { eligible: true });
  await assert.rejects(syncMobileAndRefresh(client, "9000000000", async () => {
    throw new Error("Upstream unavailable");
  }));
  assert.equal(client.getQueryData(MOBILE_SYNC_PENDING_KEY), 0);
  assert.equal(client.getQueryData<{ eligible: boolean }>(key)?.eligible, false);
  assert.equal(client.getQueryState(key)?.isInvalidated, false);
  client.clear();
});
test("account switch before save prevents linking the replacement account", async () => {
  const client = new QueryClient();
  let called = false;
  await assert.rejects(syncMobileAndRefresh(client, "9000000000", async () => {
    called = true;
    return { synced: true };
  }, () => false));
  assert.equal(called, false);
  assert.equal(client.getQueryData(MOBILE_SYNC_PENDING_KEY), 0);
  client.clear();
});
test("account switch while explicit sync is in flight cannot refresh or mark either account synced", async () => {
  const client = new QueryClient();
  const journey = ["/api/memberships/journey", "account-a"];
  client.setQueryData(journey, { eligible: true });
  let current = true;
  let release!: (result: { synced: true }) => void;
  let markStarted!: () => void;
  const started = new Promise<void>(resolve => { markStarted = resolve; });
  const response = new Promise<{ synced: true }>(resolve => { release = resolve; });
  const pending = syncMobileAndRefresh(
    client, "9000000000", async () => {
      markStarted();
      return response;
    }, () => current, "account-a",
  );
  await started;
  current = false;
  release({ synced: true });

  await assert.rejects(pending, /Account changed during mobile sync/);
  assert.equal(client.getQueryData(MOBILE_SYNC_PENDING_KEY), 0);
  assert.equal(client.getQueryData(automaticMobileSyncKey("account-a")), undefined);
  assert.equal(client.getQueryState(journey)?.isInvalidated, false);
  assert.equal(client.getQueryData<{ eligible: boolean }>(journey)?.eligible, false);
  client.clear();
});
test("local sync subscription has stable primitive snapshots and never creates/fetches a query", () => {
  const client = new QueryClient();
  const store = createMobileSyncPendingStore(client);
  assert.equal(store.getSnapshot(), 0);
  assert.equal(client.getQueryCache().getAll().length, 0);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications++; });
  client.setQueryData(["unrelated"], { value: 1 });
  assert.equal(notifications, 0);
  client.setQueryData(MOBILE_SYNC_PENDING_KEY, 1);
  assert.equal(notifications, 1);
  for (let i = 0; i < 100; i++) {
    assert.equal(store.getSnapshot(), 1);
    client.setQueryData(MOBILE_SYNC_PENDING_KEY, 1);
  }
  assert.equal(notifications, 1); // unchanged writes cannot create an update loop
  client.setQueryData(MOBILE_SYNC_PENDING_KEY, 0);
  assert.equal(notifications, 2);
  client.removeQueries({ queryKey: MOBILE_SYNC_PENDING_KEY });
  assert.equal(notifications, 2);
  unsubscribe();
  client.clear();
});
test("automatic sync hides cached eligibility and refreshes only from the server endpoint", async () => {
  const client = new QueryClient();
  const journey = ["/api/memberships/journey", "account-a"];
  client.setQueryData(journey, { eligible: true });
  await autoSyncAndRefresh(client, "account-a", async () => {
    assert.equal(client.getQueryData(automaticMobileSyncKey("account-a")), "pending");
    assert.equal(client.getQueryData<{ eligible: boolean }>(journey)?.eligible, false);
    return { synced: true, reason: "synced" };
  });
  assert.equal(client.getQueryData(automaticMobileSyncKey("account-a")), "synced");
  assert.equal(client.getQueryState(journey)?.isInvalidated, true);
  client.clear();
});
test("automatic sync failure stays account-scoped, actionable, and fail-closed", async () => {
  const client = new QueryClient();
  const accountA = automaticMobileSyncKey("account-a");
  const accountB = automaticMobileSyncKey("account-b");
  client.setQueryData(["/api/memberships/journey", "account-a"], { eligible: true });
  await assert.rejects(autoSyncAndRefresh(client, "account-a", async () => {
    throw new Error("YoActiv unavailable");
  }));
  assert.equal(client.getQueryData(accountA), "error");
  assert.equal(client.getQueryData(accountB), undefined);
  assert.equal(
    client.getQueryData<{ eligible: boolean }>(["/api/memberships/journey", "account-a"])?.eligible,
    false,
  );
  client.clear();
});
test("account switch while automatic sync is in flight cannot update the replacement account", async () => {
  const client = new QueryClient();
  const journey = ["/api/memberships/journey", "account-a"];
  client.setQueryData(journey, { eligible: true });
  let current = true;
  let release!: (result: { synced: true; reason: "synced" }) => void;
  let markStarted!: () => void;
  const started = new Promise<void>(resolve => { markStarted = resolve; });
  const response = new Promise<{ synced: true; reason: "synced" }>(resolve => { release = resolve; });
  const pending = autoSyncAndRefresh(client, "account-a", async () => {
    markStarted();
    return response;
  }, () => current);
  await started;
  current = false;
  release({ synced: true, reason: "synced" });

  await assert.rejects(pending, /Account changed during automatic membership sync/);
  assert.equal(client.getQueryData(automaticMobileSyncKey("account-a")), "pending");
  assert.equal(client.getQueryData(automaticMobileSyncKey("account-b")), undefined);
  assert.equal(client.getQueryState(journey)?.isInvalidated, false);
  assert.equal(client.getQueryData<{ eligible: boolean }>(journey)?.eligible, false);
  client.clear();
});
test("a concurrent explicit sync cannot be downgraded by an older automatic result", async () => {
  const client = new QueryClient();
  const key = automaticMobileSyncKey("account-a");
  await autoSyncAndRefresh(client, "account-a", async () => {
    client.setQueryData(key, "synced");
    return { synced: false, reason: "confirmation_required" };
  });
  assert.equal(client.getQueryData(key), "synced");
  client.clear();
});