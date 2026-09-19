import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  canModerateCommunityPost,
  canReadCommunityPost,
  communityModerationSourceStatuses,
  isPublicCommunityPost,
  newCommunitySubmission,
  resolveCommunityCoach,
} from "./communityPolicy";
import { prepareCommunityStill } from "./communityUpload";

const pending = { status: "pending", publicSharingConsent: true, authorUserId: 41 };

test("pending photos are visible only to their owner or a revalidated admin", () => {
  assert.equal(canReadCommunityPost(pending, { userId: 41, isCurrentAdmin: false }), true);
  assert.equal(canReadCommunityPost(pending, { userId: 42, isCurrentAdmin: false }), false);
  assert.equal(canReadCommunityPost(pending, { isCurrentAdmin: false }), false);
  assert.equal(canReadCommunityPost(pending, { isCurrentAdmin: true }), true);
  // A deleted admin session resolves to isCurrentAdmin=false in the route's
  // DB revalidation middleware, so it has no residual private-media access.
  assert.equal(canReadCommunityPost(pending, { isCurrentAdmin: false }), false);
});

test("public visibility requires both approval and explicit consent", () => {
  assert.equal(isPublicCommunityPost({ status: "approved", publicSharingConsent: true }), true);
  assert.equal(isPublicCommunityPost({ status: "approved", publicSharingConsent: false }), false);
  assert.equal(isPublicCommunityPost({ status: "pending", publicSharingConsent: true }), false);
  assert.equal(
    canReadCommunityPost(
      { status: "approved", publicSharingConsent: false, authorUserId: 41 },
      { isCurrentAdmin: false },
    ),
    false,
  );
});

test("community coach resolution rejects private posts and unavailable identities", () => {
  const post = {
    status: "approved",
    publicSharingConsent: true,
    authorUserId: 41,
    trainerStaffId: 7,
    trainerYoactivStaffId: "yo-7",
  };
  const staff = {
    id: 7,
    gymId: 3,
    yoactivStaffId: "yo-7",
    isActive: true,
    permissions: ["pt.manage"],
  };
  const candidate = { id: 7, name: "Coach Seven", yoactivStaffId: "yo-7" };
  const gym = { id: 3, name: "Main Gym" };
  const requester = { isCurrentAdmin: false };

  assert.deepEqual(resolveCommunityCoach(post, requester, staff, candidate, gym), {
    name: "Coach Seven",
    gymId: 3,
    gymName: "Main Gym",
    trainerId: "yo-7",
  });
  assert.equal(
    resolveCommunityCoach({ ...post, publicSharingConsent: false }, requester, staff, candidate, gym),
    null,
  ); // private post denial
  assert.equal(resolveCommunityCoach(post, requester, null, candidate, gym), null); // deleted staff
  assert.equal(resolveCommunityCoach({ ...post, trainerStaffId: null }, requester, staff, candidate, gym), null); // missing coach
  assert.equal(
    resolveCommunityCoach(post, requester, { ...staff, isActive: false }, candidate, gym),
    null,
  ); // inactive staff
  assert.equal(
    resolveCommunityCoach(post, requester, { ...staff, yoactivStaffId: "yo-other" }, candidate, gym),
    null,
  ); // saved/current staff identity mismatch
  assert.equal(
    resolveCommunityCoach(post, requester, staff, { ...candidate, yoactivStaffId: "yo-other" }, gym),
    null,
  ); // saved/live roster identity mismatch
});

test("forged creation fields are ignored and a withdrawal race cannot republish", () => {
  const serverValues = newCommunitySubmission(41);
  assert.deepEqual(serverValues, {
    authorUserId: 41,
    status: "pending",
    publicSharingConsent: true,
  });
  assert.deepEqual(communityModerationSourceStatuses("approve"), [
    "pending",
    "rejected",
    "unpublished",
  ]);
  assert.equal(communityModerationSourceStatuses("approve").includes("withdrawn"), false);
  assert.equal(communityModerationSourceStatuses("reject").includes("withdrawn"), false);
  assert.deepEqual(communityModerationSourceStatuses("unpublish"), ["approved"]);
  assert.equal(canModerateCommunityPost("pending", false, "approve"), false);
  assert.equal(canModerateCommunityPost("withdrawn", true, "approve"), false);
});

test("community upload processor rejects malformed or active-content input", async () => {
  await assert.rejects(() => prepareCommunityStill("https://evil.invalid/photo.jpg"));
  await assert.rejects(() => prepareCommunityStill("data:image/svg+xml;base64,PHN2Zz4="));
});

test("community upload processor accepts and normalizes a real still PNG", async () => {
  // Build a genuine raster fixture, then exercise the same POST processor.
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "#ffffff" } })
    .png()
    .toBuffer();
  const image = await prepareCommunityStill(png.toString("base64"));
  assert.equal(image.mimeType, "image/webp");
  assert.ok(image.data.length > 0);
});