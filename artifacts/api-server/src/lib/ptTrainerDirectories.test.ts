import { test } from "node:test";
import assert from "node:assert/strict";
import { mappedPtTrainers } from "./ptTrainerDirectories";
import { eligiblePtTrainers } from "./ptTrainerPolicy";

test("includes regular and PT IDs, retaining photo lookup identity", async () => {
  const calls: number[] = [];
  const roster = await mappedPtTrainers(5472, 6794, async id => {
    calls.push(id);
    return id === 5472 ? [{ id: "regular", name: "Same name" }] : [{ id: "pt", name: "Same name" }];
  });
  assert.deepEqual(calls, [5472, 6794]);
  assert.deepEqual(roster.map(t => t.id), ["regular", "pt"]);
  const staff = ["regular", "pt"].map((id, index) => ({
    id: index + 1, gymId: 25, isActive: true, permissions: ["pt.manage"], yoactivStaffId: id,
  }));
  assert.deepEqual(eligiblePtTrainers(25, roster, staff).map(t => t.id), ["regular", "pt"]);
  const photos = new Map([["regular", "regular-photo"], ["pt", "pt-photo"]]);
  assert.deepEqual(roster.map(t => photos.get(t.id)), ["regular-photo", "pt-photo"]);
  assert.deepEqual(eligiblePtTrainers(26, roster, staff), []);
  assert.deepEqual(eligiblePtTrainers(25, roster, staff.map(s => ({ ...s, isActive: false }))), []);
});

test("unmapped gyms never fetch a default directory; either mapping alone works", async () => {
  const calls: number[] = [];
  const fetchBranch = async (id: number) => { calls.push(id); return [{ id: String(id), name: "Trainer" }]; };
  assert.deepEqual(await mappedPtTrainers(null, null, fetchBranch), []);
  assert.deepEqual(calls, []);
  await mappedPtTrainers(5472, null, fetchBranch);
  await mappedPtTrainers(null, 6794, fetchBranch);
  assert.deepEqual(calls, [5472, 6794]);
});

test("duplicate mapping is fetched once and duplicate staff IDs appear once", async () => {
  let calls = 0;
  const fetchBranch = async () => { calls++; return [{ id: "same", name: "Trainer" }]; };
  assert.equal((await mappedPtTrainers(1, 1, fetchBranch)).length, 1);
  assert.equal(calls, 1);
  assert.equal((await mappedPtTrainers(1, 2, fetchBranch)).length, 1);
});

test("failure in either mapped branch is not silently ignored", async () => {
  for (const failing of [1, 2]) {
    await assert.rejects(mappedPtTrainers(1, 2, async id => {
      if (id === failing) throw new Error("Directory unavailable");
      return [];
    }), /Directory unavailable/);
  }
});
