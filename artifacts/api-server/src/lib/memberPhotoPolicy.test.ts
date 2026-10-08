import { test } from "node:test";
import assert from "node:assert/strict";
import { canSaveMemberPhoto } from "./memberPhotoPolicy";
const saved = "/api/storage/db-images/00000000-0000-0000-0000-000000000001";
test("first upload is allowed, including replacement of provider defaults", () => {
  assert.equal(canSaveMemberPhoto("", saved), true);
  assert.equal(canSaveMemberPhoto("https://img.clerk.com/default", saved), true);
});
test("saved photo cannot be replaced or removed", () => {
  for (const next of ["", null, `${saved}2`, "https://example.com/photo"]) {
    assert.equal(canSaveMemberPhoto(saved, next), false);
  }
});
test("unrelated edits and identical resaves remain allowed", () => {
  assert.equal(canSaveMemberPhoto(saved, undefined), true);
  assert.equal(canSaveMemberPhoto(saved, saved), true);
});
test("absolute and legacy uploaded URLs are locked too", () => {
  assert.equal(canSaveMemberPhoto(`https://example.com${saved}`, ""), false);
  assert.equal(canSaveMemberPhoto(saved.replace("/api/", "/"), ""), false);
});
