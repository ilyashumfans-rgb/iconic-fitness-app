import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eligiblePtTrainers, PtCheckoutError, requirePtHomeGym, selectPtTrainer } from "./ptTrainerPolicy";

const staff = { id: 7, gymId: 2, isActive: true, permissions: ["pt.manage"], yoactivStaffId: "yo-7" };
const live = [{ id: "yo-7", name: "Authoritative name" }];
const rejects = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof PtCheckoutError && e.status === status);

test("selection requires exact stable ID; snapshots authoritative name and staff reference", () => {
  const roster = eligiblePtTrainers(2, live, [staff]);
  assert.deepEqual(selectPtTrainer("yo-7", roster), { ...live[0], staffId: 7 });
  for (const id of [undefined, null, "", " "]) rejects(() => selectPtTrainer(id, roster), 400);
  for (const id of ["7", "Authoritative name", " yo-7", "unknown"]) rejects(() => selectPtTrainer(id, roster), 409);
});

test("foreign, inactive, unlinked, permission-revoked and ambiguous staff are hidden and rejected", () => {
  for (const candidate of [
    { ...staff, gymId: 3 }, { ...staff, isActive: false },
    { ...staff, yoactivStaffId: null }, { ...staff, yoactivStaffId: "other" },
    { ...staff, permissions: [] },
  ]) {
    const roster = eligiblePtTrainers(2, live, [candidate]);
    assert.deepEqual(roster, []);
    rejects(() => selectPtTrainer("yo-7", roster), 409);
  }
  assert.deepEqual(eligiblePtTrainers(2, live, [staff, { ...staff, id: 8 }]), []);
});

test("stale same-branch selection fails when upstream trainer disappears", () => {
  rejects(() => selectPtTrainer("yo-7", eligiblePtTrainers(2, [], [staff])), 409);
});

test("active account home branch is mandatory and authoritative", () => {
  requirePtHomeGym(2, 2);
  rejects(() => requirePtHomeGym(null, 2), 403);
  rejects(() => requirePtHomeGym(3, 2), 403);
});

// No provider or database calls: guard the route ordering and existing money
// validation while exercising policy above with fixtures only.
test("checkout gates precede all writes and preserve existing package/payment validation", () => {
  const route = readFileSync(new URL("../routes/trainerBookings.ts", import.meta.url), "utf8");
  const checkout = route.slice(route.indexOf('  "/trainer-bookings",'), route.indexOf("// The caller's PT bookings"));
  for (const write of ["await ensureYoactivMemberId(", ".insert(trainerBookingsTable)", "await createYoactivPaymentUrl("]) {
    assert.ok(checkout.indexOf("requirePtHomeGym(") < checkout.indexOf(write));
    assert.ok(checkout.indexOf("await resolvePtTrainerRoster(") < checkout.indexOf(write));
  }
  assert.match(checkout, /isPackageVisible\(p.id, prefs\)/);
  assert.match(checkout, /p.id === body.packageId/);
  assert.match(checkout, /p.pt \|\|/);
  assert.match(checkout, /gym.yoactivPtBranchId \?\? gym.yoactivBranchId/);
  assert.match(checkout, /trainerName: selectedTrainer.name/);
  assert.match(checkout, /normalizeMobile\(account\?\.mobile\)/);
  assert.doesNotMatch(checkout, /trainerName: body.trainerName/);
});