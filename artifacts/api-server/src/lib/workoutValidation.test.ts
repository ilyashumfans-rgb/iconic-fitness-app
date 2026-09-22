import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { workoutInputSchema } from "./workoutValidation";
import { GetWorkoutDayResponse } from "@workspace/api-zod";

const strength = { type: "strength", exerciseName: " Squat ", sets: 3, reps: 12 };

test("strength-only entries trim names and default legacy metrics to zero", () => {
  const value = workoutInputSchema.parse(strength);
  assert.equal(value.exerciseName, "Squat");
  assert.equal(value.durationMin, 0);
  assert.equal(value.calories, 0);
  assert.equal(value.steps, 0);
});

test("historical duration-only input remains supported with nullable strength fields", () => {
  const value = workoutInputSchema.parse({ type: "run", durationMin: 30, calories: 250, steps: 2000 });
  assert.equal(value.durationMin, 30);
  assert.equal(value.calories, 250);
  assert.equal(value.steps, 2000);
  assert.equal(value.exerciseName, null);
  assert.equal(value.sets, null);
  assert.equal(value.reps, null);
});

test("reject invalid counts and metrics without coercing strings or fractions", () => {
  for (const field of ["sets", "reps", "durationMin", "calories", "steps"]) {
    for (const bad of [-1, 1.5, NaN, Infinity, "3"]) {
      assert.equal(workoutInputSchema.safeParse({ ...strength, [field]: bad }).success, false, `${field}: ${bad}`);
    }
  }
  for (const [field, max] of [["sets", 100], ["reps", 1000]] as const) {
    assert.equal(workoutInputSchema.safeParse({ ...strength, [field]: max }).success, true);
    for (const bad of [0, max + 1]) {
      assert.equal(workoutInputSchema.safeParse({ ...strength, [field]: bad }).success, false);
    }
  }
});

test("requires positive duration or complete strength details and rejects partial details", () => {
  for (const input of [
    { type: "walk" }, { type: "walk", durationMin: 0, steps: 100 },
    { ...strength, exerciseName: " " }, { ...strength, sets: null },
    { ...strength, reps: undefined }, { ...strength, exerciseName: undefined },
    { type: "run", durationMin: 30, sets: 2 },
    { type: "run", durationMin: 30, exerciseName: "Squat" },
  ]) assert.equal(workoutInputSchema.safeParse(input).success, false, JSON.stringify(input));
});

test("day DTO preserves legacy totals and nullable details on old rows", () => {
  const day = GetWorkoutDayResponse.parse({
    date: "2026-06-01", totalCalories: 250, totalMinutes: 30, totalSteps: 2000, stepGoal: 8000, count: 1,
    entries: [{ id: 1, type: "run", durationMin: 30, calories: 250, steps: 2000,
      exerciseName: null, sets: null, reps: null, createdAt: new Date() }],
  });
  assert.equal(day.entries[0].sets, null);
  assert.equal(day.totalMinutes, 30);
});

// Ownership/date route-wiring regressions without touching live member data.
const route = readFileSync(new URL("../routes/tracking.ts", import.meta.url), "utf8");
const update = route.slice(route.indexOf('router.put("/tracking/workouts/:id"'), route.indexOf('router.delete("/tracking/workouts/:id"'));

test("update is authenticated and mutation is atomically scoped to id AND current owner", () => {
  assert.match(update, /requireUser/);
  assert.match(update, /workoutInputSchema\.safeParse\(req\.body\)/);
  assert.match(update, /\.where\(and\(eq\(workoutLogsTable\.id, id\), eq\(workoutLogsTable\.userId, req\.userId!\)\)\)/);
  assert.match(update, /if \(!updated\)[\s\S]*?res\.status\(404\)/);
  assert.doesNotMatch(update, /req\.body\.userId/);
});

test("update drops client date and returns original day without changing timestamps", () => {
  assert.match(update, /const \{ date: _ignoredDate, \.\.\.values \} = parsed\.data/);
  assert.match(update, /\.set\(values\)/);
  assert.match(update, /\.returning\(\{ loggedDate: workoutLogsTable\.loggedDate \}\)/);
  assert.match(update, /buildWorkoutDay\(req\.userId!, updated\.loggedDate\)/);
});