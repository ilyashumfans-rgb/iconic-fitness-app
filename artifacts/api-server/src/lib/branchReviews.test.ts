import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, branchReviewsTable, appSettingsTable } from "@workspace/db";
import { canChangeSampleFlag, publicReview, reviewInput, reviewSeedMarker, sampleReviews, seedReviewsInTransaction, trainerReviewSummary } from "./branchReviews";
import { requireAdmin } from "./adminAuth";

test("unauthenticated admin requests return a JSON 401", () => {
  let status: number | undefined;
  let body: unknown;
  const response = {
    status(code: number) { status = code; return this; },
    json(value: unknown) { body = value; return this; },
  };
  requireAdmin({ session: {} } as Request, response as Response, () => assert.fail("Unauthenticated request was allowed"));
  assert.equal(status, 401);
  assert.deepEqual(body, { error: "Unauthorized" });
});

test("review validation rejects invalid ratings, whitespace, types, lengths and seed key injection", () => {
  const { seedKey, ...input } = sampleReviews[0];
  assert.equal(reviewInput.safeParse(input).success, true);
  for (const patch of [
    { rating: 0 }, { rating: 6 }, { rating: 4.5 }, { rating: "5" },
    { reviewerName: " " }, { reviewerName: "x".repeat(101) },
    { branchName: "" }, { branchName: "x".repeat(151) },
    { reviewText: "x".repeat(2001) }, { isSample: "false" },
    { sortOrder: 1.1 }, { seedKey },
  ]) assert.equal(reviewInput.safeParse({ ...input, ...patch }).success, false);
  assert.equal(canChangeSampleFlag(seedKey, false), false);
  assert.equal(canChangeSampleFlag(seedKey, true), true);
  assert.equal(canChangeSampleFlag(null, false), true);
});

test("seed is additive, repeatable, preserves edits and deletion marker; hidden reviews stay private", async () => {
  const rollback = new Error("rollback test data");
  await assert.rejects(db.transaction(async (tx) => {
    // All changes in this integration test roll back, including existing data.
    await tx.delete(appSettingsTable).where(eq(appSettingsTable.key, reviewSeedMarker));
    await tx.delete(branchReviewsTable);
    await seedReviewsInTransaction(tx);
    let rows = await tx.select().from(branchReviewsTable);
    assert.equal(rows.length, 12);
    assert.ok(rows.every((r) => r.isSample && r.isPublished && r.reviewerName.startsWith("Sample member")));
    assert.equal("seedKey" in publicReview(rows[0]), false);
    await assert.rejects(tx.transaction(async (savepoint) => {
      await savepoint.update(branchReviewsTable).set({ isSample: false }).where(eq(branchReviewsTable.id, rows[0].id));
    }), (err: unknown) => err instanceof Error && String(err.cause).includes("branch_reviews_sample_check"));
    await tx.update(branchReviewsTable).set({ reviewText: "Edited sample", isPublished: false }).where(eq(branchReviewsTable.id, rows[0].id));
    await tx.delete(branchReviewsTable).where(eq(branchReviewsTable.id, rows[1].id));
    await seedReviewsInTransaction(tx);
    rows = await tx.select().from(branchReviewsTable);
    assert.equal(rows.length, 11);
    assert.ok(rows.some((r) => r.reviewText === "Edited sample"));
    const published = await tx.select().from(branchReviewsTable).where(eq(branchReviewsTable.isPublished, true));
    assert.equal(published.length, 10);
    assert.ok(published.every((r) => r.isPublished));
    throw rollback;
  }), (err) => err === rollback);
});

test("trainer assignment requires paired stable ID and branch, with old clients supported", () => {
  const { seedKey, ...input } = sampleReviews[0];
  assert.ok(reviewInput.safeParse(input).success);
  assert.ok(reviewInput.safeParse({ ...input, trainerId: null, gymId: null }).success);
  assert.ok(reviewInput.safeParse({ ...input, trainerId: "53938", gymId: 27 }).success);
  for (const patch of [
    { trainerId: "53938" }, { gymId: 27 }, { trainerId: null, gymId: 27 },
    { trainerId: "53938", gymId: null }, { trainerId: "", gymId: 27 },
    { trainerId: "53938", gymId: -1 },
  ]) assert.equal(reviewInput.safeParse({ ...input, ...patch }).success, false);
});

test("trainer rating includes only genuine feedback", () => {
  assert.deepEqual(trainerReviewSummary([]), { reviewCount: 0, rating: null });
  assert.deepEqual(trainerReviewSummary([{ rating: 5, isSample: true }]), { reviewCount: 0, rating: null });
  assert.deepEqual(trainerReviewSummary([
    { rating: 5, isSample: true }, { rating: 3, isSample: false }, { rating: 4, isSample: false },
  ]), { reviewCount: 2, rating: 3.5 });
});