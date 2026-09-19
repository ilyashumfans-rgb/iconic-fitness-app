import assert from "node:assert/strict";
import { test } from "node:test";
import { showFitnessJourney } from "./fitnessJourneyVisibility";

const ready = {
  signedIn: true, ready: true, pendingSync: 0, ownerId: "account-a",
  accountId: "account-a", success: true, fetching: false, eligible: true,
  automaticSyncState: "synced",
};
test("journey visible only after successful owner-bound eligibility and sync settlement", () => {
  assert.equal(showFitnessJourney(ready), true);
  for (const blocked of [
    { signedIn: false }, { ready: false }, { pendingSync: 1 }, { success: false },
    { fetching: true }, { eligible: false }, { accountId: "account-b" },
    { accountId: null }, { ownerId: undefined }, { automaticSyncState: "idle" },
    { automaticSyncState: "pending" }, { automaticSyncState: "error" },
  ]) assert.equal(showFitnessJourney({ ...ready, ...blocked }), false);
});