import assert from "node:assert/strict";
import test from "node:test";
import {
  canCompleteFitnessSetup,
  canonicalMeasurements,
  coachProfileSource,
  nextPersistedSetupStep,
  ownStepFieldEntries,
  requiresFirstLoginSetup,
} from "./fitnessSetupPolicy";

test("only a successful new JIT insert requires first-login setup", () => {
  assert.equal(requiresFirstLoginSetup(true), true);
  // Existing local users and a unique-conflict winner are never retroactively
  // marked required.
  assert.equal(requiresFirstLoginSetup(false), false);
});

test("member-owned step payload ignores forged owner fields and resumes progress", () => {
  const body = {
    userId: 99999,
    clerkUserId: "another-account",
    step: 2,
    goals: ["Build strength"],
    interests: ["Yoga"],
  };
  assert.deepEqual(ownStepFieldEntries(2, body), [
    ["goals", ["Build strength"]],
    ["interests", ["Yoga"]],
  ]);
  assert.equal(nextPersistedSetupStep(1, 2), 3);
  // A Back/save request cannot erase a later persisted resume step.
  assert.equal(nextPersistedSetupStep(4, 1), 4);
});

test("measurement normalisation converts imperial, bounds values, and clears to null", () => {
  assert.deepEqual(
    canonicalMeasurements({
      unitSystem: "imperial",
      hasHeight: true,
      height: 70,
      hasWeight: true,
      weight: 154.3,
    }),
    { heightCm: 177.8, weightKg: 70 },
  );
  assert.deepEqual(
    canonicalMeasurements({
      unitSystem: "metric",
      hasHeight: true,
      height: null,
      hasWeight: true,
      weight: null,
    }),
    { heightCm: null, weightKg: null },
  );
  assert.throws(
    () =>
      canonicalMeasurements({
        unitSystem: "imperial",
        hasHeight: true,
        height: 20,
        hasWeight: false,
      }),
    /height between 80 and 260 cm/,
  );
});

test("completion requires real core values and assessment always wins overlapping context", () => {
  assert.equal(canCompleteFitnessSetup({ age: 29, heightCm: 170, weightKg: 65 }), true);
  assert.equal(canCompleteFitnessSetup({ age: null, heightCm: 170, weightKg: 65 }), false);
  assert.equal(
    coachProfileSource(new Date("2026-01-01"), new Date("2027-01-01")),
    "assessment",
  );
  assert.equal(coachProfileSource(null, new Date("2027-01-01")), "setup");
});