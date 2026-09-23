import assert from "node:assert/strict";
import { test } from "node:test";
import {
  maskMobile,
  normalizeIndianMobile,
  OtpAttempt,
  OtpAutoSubmit,
  secondsRemaining,
} from "./whatsappOtp";

test("Indian mobile validation rejects invalid numbers and normalizes +91", () => {
  assert.equal(normalizeIndianMobile("9876543210"), "+919876543210");
  assert.equal(normalizeIndianMobile("+91 98765 43210"), "+919876543210");
  for (const invalid of ["1234567890", "987654321", "98765432101", "+19876543210", "98765abc10"]) {
    assert.equal(normalizeIndianMobile(invalid), null);
  }
});

test("destination masks all but the last four digits", () => {
  assert.equal(maskMobile("+919876543210"), "+91 ••••••3210");
});

test("deadlines handle expiry and time spent in background", () => {
  assert.equal(secondsRemaining(60_000, 0), 60);
  assert.equal(secondsRemaining(60_000, 59_001), 1);
  assert.equal(secondsRemaining(60_000, 90_000), 0);
  assert.equal(secondsRemaining(600_000, 0), 600);
});

test("number/method switch or unmount aborts and rejects stale continuations", () => {
  const attempt = new OtpAttempt();
  const oldCurrent = attempt.begin();
  const oldSignal = attempt.signal;
  assert.equal(oldCurrent(), true);
  attempt.cancel();
  assert.equal(oldSignal?.aborted, true);
  assert.equal(oldCurrent(), false);
  const newCurrent = attempt.begin();
  assert.equal(newCurrent(), true);
  assert.equal(oldCurrent(), false);
  attempt.begin();
  assert.equal(newCurrent(), false);
});

test("automatic verification claims each full code once per challenge", () => {
  const autoSubmit = new OtpAutoSubmit();
  assert.equal(autoSubmit.claim("challenge-a", "12345"), false);
  assert.equal(autoSubmit.claim("challenge-a", "123456"), true);
  assert.equal(autoSubmit.claim("challenge-a", "123456"), false);
  assert.equal(autoSubmit.claim("challenge-a", "654321"), true);
  assert.equal(autoSubmit.claim("challenge-a", "123456"), false);
  assert.equal(autoSubmit.claim("challenge-b", "123456"), true);
});