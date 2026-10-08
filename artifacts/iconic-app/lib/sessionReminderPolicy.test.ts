import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionReminderKey, shouldShowSessionAlert } from "./sessionReminderPolicy";

const now = Date.parse("2026-10-08T09:00:00Z");
const base = { link: "/network-coach/call?bookingId=42&role=member", createdAt: new Date(now - 30_000).toISOString(), now, alreadyShown: false, pushRegistered: false };

test("web and Expo Go show in-app alerts; registered native push does not double-alert", () => {
  assert.equal(shouldShowSessionAlert(base), true);
  assert.equal(shouldShowSessionAlert({ ...base, link: "/network-coach/call?bookingId=42&role=trainer" }), true);
  assert.equal(shouldShowSessionAlert({ ...base, pushRegistered: true }), false);
  assert.equal(shouldShowSessionAlert({ ...base, alreadyShown: true }), false);
});
test("expired, malformed and external links do not alert", () => {
  assert.equal(shouldShowSessionAlert({ ...base, createdAt: new Date(now - 600_000).toISOString() }), false);
  assert.equal(shouldShowSessionAlert({ ...base, createdAt: "invalid" }), false);
  assert.equal(shouldShowSessionAlert({ ...base, link: "https://example.com" }), false);
  assert.equal(sessionReminderKey(base.link), "nc.push.member.42");
  assert.equal(sessionReminderKey("/network-coach/call?bookingId=42&role=trainer"), "nc.push.trainer.42");
});
