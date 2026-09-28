import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, branchReviewsTable, gymsTable, usersTable } from "@workspace/db";
import { createReviewsRouter } from "../routes/reviews";
import trainerReviewsRouter from "../routes/trainerProfileReviews";

test("branch member reviews enforce ownership, home branch, moderation and concurrent uniqueness", async () => {
  const [gym] = await db.select({ id: gymsTable.id, name: gymsTable.name }).from(gymsTable)
    .where(eq(gymsTable.isVerified, true)).limit(1);
  assert.ok(gym, "A verified gym is required for this integration test");
  const tag = randomUUID();
  const users = await db.insert(usersTable).values([0, 1].map(i => ({
    name: `Review TEST ${i}`, email: `branch-review-${tag}-${i}@example.invalid`, mobile: "",
    gender: "", avatarUrl: "", city: "", memberCode: `branch-review-${tag}-${i}`,
  }))).returning({ id: usersTable.id });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = (req.headers["x-test-admin"] === "yes" ? { adminId: 1 } : {}) as typeof req.session;
    next();
  });
  app.use(createReviewsRouter({
    memberAuth: (req, res, next) => {
      const userId = Number(req.headers["x-test-member"]);
      if (!users.some(user => user.id === userId)) { res.status(401).json({ error: "Unauthorized" }); return; }
      req.userId = userId; next();
    },
    homeGym: async (userId, complete) => complete && userId === users[0].id ? gym.id : null,
  }));
  app.use(trainerReviewsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const root = `http://127.0.0.1:${address.port}`;
  async function request(path: string, method = "GET", body?: unknown, member?: number, admin = false) {
    const response = await fetch(root + path, {
      method,
      headers: { "Content-Type": "application/json",
        ...(member ? { "x-test-member": String(member) } : {}),
        ...(admin ? { "x-test-admin": "yes" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() as any };
  }
  const path = `/gyms/${gym.id}/reviews`;
  const body = { rating: 4, text: "A genuine test review" };
  let adminReviewId: number | undefined;
  try {
    assert.equal((await request(path + "/mine")).status, 401);
    assert.equal((await request(path + "/mine", "PUT", body)).status, 401);
    assert.equal((await request(path + "/mine", "PUT", body, users[1].id)).status, 403);
    assert.equal((await request(path + "/mine", "PUT", { ...body, authorUserId: users[1].id }, users[0].id)).status, 400);
    assert.equal((await request(path + "/mine", "PUT", { ...body, rating: 0 }, users[0].id)).status, 400);
    assert.equal((await request(path + "/mine", "PUT", { ...body, text: " " }, users[0].id)).status, 400);
    assert.equal((await request("/gyms/not-a-gym/reviews")).status, 400);
    assert.equal((await request("/admin/reviews/branches")).status, 401);
    assert.ok((await request("/admin/reviews/branches", "GET", undefined, undefined, true)).body.some((b: { id: number }) => b.id === gym.id));
    const adminBody = {
      reviewerName: "Review TEST admin", gymId: gym.id, branchName: "Forged branch",
      reviewText: "Admin test", rating: 5, isSample: false, isPublished: true, sortOrder: 0,
    };
    const adminCreated = await request("/admin/reviews", "POST", adminBody, undefined, true);
    assert.equal(adminCreated.status, 201);
    adminReviewId = adminCreated.body.id;
    assert.equal(adminCreated.body.branchName, gym.name);
    const adminUpdated = await request(`/admin/reviews/${adminReviewId}`, "PUT",
      { ...adminBody, branchName: "Still forged", reviewText: "Edited admin test" }, undefined, true);
    assert.equal(adminUpdated.status, 200);
    assert.equal(adminUpdated.body.branchName, gym.name);
    assert.equal((await request(path)).body.reviewCount, 1);
    assert.equal((await request(`/admin/reviews/${adminReviewId}`, "DELETE", undefined, undefined, true)).status, 200);
    adminReviewId = undefined;
    const writes = await Promise.all(Array.from({ length: 4 }, () => request(path + "/mine", "PUT", body, users[0].id)));
    assert.ok(writes.every(result => result.status === 200));
    const id = writes[0].body.review.id;
    assert.ok(writes.every(result => result.body.review.id === id));
    assert.equal(writes[0].body.review.reviewerName, "Review TEST 0");
    assert.equal(writes[0].body.review.branchName, gym.name);
    assert.equal(writes[0].body.review.moderationStatus, "pending");
    assert.equal(writes[0].body.review.isMemberReview, true);
    assert.equal(writes[0].body.review.isSample, false);
    assert.equal("authorUserId" in writes[0].body.review, false);
    assert.equal((await request(path)).body.reviewCount, 0);
    assert.equal((await request(path)).body.averageRating, null);
    assert.equal((await request(path + "/mine", "GET", undefined, users[1].id)).body.review, null);
    assert.equal((await request(path + "/mine", "DELETE", undefined, users[1].id)).status, 404);
    assert.equal((await request(`/admin/reviews/${id}/moderation`, "POST", { status: "approved" }, undefined, true)).status, 200);
    const published = await request(path);
    assert.equal(published.body.reviewCount, 1);
    assert.equal(published.body.averageRating, 4);
    assert.equal(published.body.reviews.find((r: { id: number }) => r.id === id)?.reviewText, body.text);
    assert.equal((await request(path + "/mine", "PUT", { rating: 5, text: "Updated" }, users[0].id)).body.review.moderationStatus, "pending");
    assert.equal((await request(path)).body.reviewCount, 0);
    assert.equal((await request(path + "/mine", "DELETE", undefined, users[0].id)).status, 204);
    assert.equal((await request(path + "/mine", "GET", undefined, users[0].id)).body.review, null);
    assert.equal((await db.select().from(branchReviewsTable).where(and(
      eq(branchReviewsTable.authorUserId, users[0].id), eq(branchReviewsTable.gymId, gym.id),
      isNull(branchReviewsTable.trainerId),
    ))).length, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (adminReviewId) await db.delete(branchReviewsTable).where(eq(branchReviewsTable.id, adminReviewId));
    await db.delete(usersTable).where(inArray(usersTable.id, users.map(user => user.id)));
  }
});