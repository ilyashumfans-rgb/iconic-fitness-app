import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, usersTable, branchReviewsTable } from "@workspace/db";
import { createTrainerProfileReviewsRouter, memberTrainerReviewInput } from "../routes/trainerProfileReviews";
import adminReviewsRouter from "../routes/reviews";
import { emptyTrainerProfile, publishedReviewCondition, trainerProfileInput } from "./liveTrainerProfiles";
import { publicReview } from "./branchReviews";
import { PtCheckoutError } from "./ptTrainerPolicy";

test("profile input validates file links and bounded rich content", () => {
  assert.ok(trainerProfileInput.safeParse(emptyTrainerProfile()).success);
  assert.ok(trainerProfileInput.safeParse({ ...emptyTrainerProfile(), photoUrl: "/api/storage/db-images/123" }).success);
  for (const photoUrl of ["javascript:alert(1)", "data:text/html,evil", "//evil.example/a", "https://user:pass@example.org/a"]) {
    assert.equal(trainerProfileInput.safeParse({ ...emptyTrainerProfile(), photoUrl }).success, false);
  }
  assert.equal(memberTrainerReviewInput.safeParse({ rating: 6, reviewText: "invalid" }).success, false);
  assert.equal(memberTrainerReviewInput.safeParse({ rating: 4, reviewText: " ", authorUserId: 1 }).success, false);
});

test("member ownership, branch gating, moderation, resubmission and concurrent uniqueness", async () => {
  const tag = randomUUID();
  const users = await db.insert(usersTable).values([0, 1].map(i => ({
    name: `TEST review member ${i}`, email: `review-${tag}-${i}@example.invalid`, mobile: "",
    gender: "", avatarUrl: "", city: "", memberCode: `test-${tag}-${i}`,
  }))).returning({ id: usersTable.id });
  const app = express();
  app.use(express.json());
  // Auth and external membership are controlled ONLY in this isolated test server.
  app.use((req, _res, next) => {
    if (req.headers["x-test-admin"] === "yes") req.session = { adminId: 1 } as typeof req.session;
    else req.session = {} as typeof req.session;
    next();
  });
  app.use(createTrainerProfileReviewsRouter({
    memberAuth: (req, res, next) => {
      const id = Number(req.headers["x-test-member"]);
      if (!users.some(u => u.id === id)) { res.status(401).json({ error: "Unauthorized" }); return; }
      req.userId = id; next();
    },
    homeGym: async () => 27,
    verifyTrainer: async (gymId, trainerId) => {
      if (trainerId !== "test-coach" || gymId !== 27) throw new PtCheckoutError(404, "Unavailable");
      return { id: trainerId, name: "Test coach", gymId, branchName: "Test branch", staffId: 0 };
    },
  }));
  app.use(adminReviewsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  async function request(path: string, method = "GET", body?: unknown, member?: number, admin = false) {
    const response = await fetch(base + path, {
      method, headers: { "Content-Type": "application/json",
        ...(member ? { "x-test-member": String(member) } : {}), ...(admin ? { "x-test-admin": "yes" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() as {
      review: { id: number; status: string; isPublished: boolean };
      error?: string;
    } };
  }
  const path = "/trainers/live/test-coach/review?gymId=27";
  const body = { rating: 4, reviewText: "TEST feedback, removed after test." };
  try {
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, "PUT", body)).status, 401);
    assert.equal((await request(path.replace("=27", "=28"), "PUT", body, users[0].id)).status, 403);
    assert.equal((await request(path.replace("test-coach", "wrong"), "PUT", body, users[0].id)).status, 404);
    const created = await request(path, "PUT", body, users[0].id);
    assert.equal(created.status, 200);
    assert.equal(created.body.review.status, "pending");
    assert.equal(created.body.review.isPublished, false);
    const id = created.body.review.id;
    assert.equal((await request(path, "GET", undefined, users[1].id)).body.review, null);
    const visible = () => db.select().from(branchReviewsTable).where(and(eq(branchReviewsTable.id, id), publishedReviewCondition));
    assert.equal((await visible()).length, 0);
    assert.equal((await request(`/admin/reviews/${id}/moderation`, "POST", { status: "approved" })).status, 401);
    assert.equal((await request(`/admin/reviews/${id}/moderation`, "POST", { status: "approved" }, undefined, true)).status, 200);
    assert.equal((await visible()).length, 1);
    assert.equal("authorUserId" in publicReview((await visible())[0]), false);
    const edited = await request(path, "PUT", { ...body, reviewText: "Edited TEST feedback" }, users[0].id);
    assert.equal(edited.body.review.id, id);
    assert.equal(edited.body.review.status, "pending");
    assert.equal((await visible()).length, 0);
    const writes = await Promise.all(Array.from({ length: 5 }, () => request(path, "PUT", body, users[0].id)));
    assert.ok(writes.every(r => r.status === 200 && r.body.review.id === id));
    assert.equal((await db.select().from(branchReviewsTable).where(eq(branchReviewsTable.authorUserId, users[0].id))).length, 1);
    assert.equal((await request(`/admin/reviews/${id}`, "PUT", {
      ...body, reviewerName: "Impersonation", isPublished: false, sortOrder: 0,
    }, undefined, true)).status, 400);
    assert.equal((await request(`/admin/reviews/${id}/moderation`, "POST", { status: "rejected" }, undefined, true)).status, 200);
    assert.equal((await request(path, "GET", undefined, users[0].id)).body.review.status, "rejected");
    assert.equal((await visible()).length, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    await db.delete(usersTable).where(inArray(usersTable.id, users.map(u => u.id)));
  }
});