import { Router, type IRouter, type RequestHandler } from "express";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, branchReviewsTable, gymsTable, staffTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { canChangeSampleFlag, ensureReviewSamples, publicReview, reviewInput, reviewLock } from "../lib/branchReviews";
import { resolvePtTrainerRoster } from "../lib/ptTrainerResolver";
import { PtCheckoutError } from "../lib/ptTrainerPolicy";
import { z } from "zod";
import { requireUser } from "../lib/currentUser";
import { activeMemberHomeGymId } from "../lib/activeMemberHomeGym";
import { publishedReviewCondition } from "../lib/liveTrainerProfiles";

const memberBranchReviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(2000),
}).strict();
const publicGymReview = (row: typeof branchReviewsTable.$inferSelect) => ({
  ...publicReview(row), text: row.reviewText,
});

export function createReviewsRouter(deps: {
  memberAuth?: RequestHandler;
  homeGym?: typeof activeMemberHomeGymId;
} = {}): IRouter {
const router: IRouter = Router();
const memberAuth = deps.memberAuth ?? requireUser;
const homeGym = deps.homeGym ?? activeMemberHomeGymId;
function gymIdParam(raw: string | string[]): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}
async function verifiedGym(id: number) {
  const [gym] = await db.select({ id: gymsTable.id, name: gymsTable.name }).from(gymsTable)
    .where(and(eq(gymsTable.id, id), eq(gymsTable.isVerified, true)));
  return gym;
}

router.get("/gyms/:id/reviews", async (req, res) => {
  const id = gymIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid gym id" }); return; }
  if (!await verifiedGym(id)) { res.status(404).json({ error: "Gym not found" }); return; }
  const rows = await db.select().from(branchReviewsTable).where(and(
    eq(branchReviewsTable.gymId, id), isNull(branchReviewsTable.trainerId), publishedReviewCondition,
  )).orderBy(asc(branchReviewsTable.sortOrder), asc(branchReviewsTable.id));
  const genuine = rows.filter(row => !row.isSample);
  res.json({
    reviews: rows.map(publicGymReview),
    averageRating: genuine.length ? Math.round(genuine.reduce((sum, row) => sum + row.rating, 0) / genuine.length * 10) / 10 : null,
    reviewCount: genuine.length,
  });
});

router.get("/gyms/:id/reviews/mine", memberAuth, async (req, res) => {
  const id = gymIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid gym id" }); return; }
  if (!await verifiedGym(id)) { res.status(404).json({ error: "Gym not found" }); return; }
  const [row] = await db.select().from(branchReviewsTable).where(and(
    eq(branchReviewsTable.gymId, id), isNull(branchReviewsTable.trainerId),
    eq(branchReviewsTable.authorUserId, req.userId!),
  ));
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ review: row ? publicGymReview(row) : null });
});

router.put("/gyms/:id/reviews/mine", memberAuth, async (req, res) => {
  const id = gymIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid gym id" }); return; }
  const parsed = memberBranchReviewInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose 1–5 stars and write a review of up to 2,000 characters." }); return; }
  const gym = await verifiedGym(id);
  if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }
  if (await homeGym(req.userId!, true) !== id) {
    res.status(403).json({ error: "Reviews are available to active members for their home branch." }); return;
  }
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(401).json({ error: "Please sign in again." }); return; }
  const values = {
    reviewerName: user.name, branchName: gym.name, reviewText: parsed.data.text, rating: parsed.data.rating,
    gymId: id, trainerId: null, authorUserId: req.userId!, moderationStatus: "pending",
    isPublished: false, isSample: false,
  };
  const [row] = await db.insert(branchReviewsTable).values(values).onConflictDoUpdate({
    target: [branchReviewsTable.authorUserId, branchReviewsTable.gymId],
    targetWhere: sql`${branchReviewsTable.authorUserId} IS NOT NULL AND ${branchReviewsTable.trainerId} IS NULL AND ${branchReviewsTable.gymId} IS NOT NULL`,
    set: { ...values, updatedAt: sql`now()` },
  }).returning();
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ review: publicGymReview(row) });
});

router.delete("/gyms/:id/reviews/mine", memberAuth, async (req, res) => {
  const id = gymIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid gym id" }); return; }
  if (!await verifiedGym(id)) { res.status(404).json({ error: "Gym not found" }); return; }
  const [deleted] = await db.delete(branchReviewsTable).where(and(
    eq(branchReviewsTable.gymId, id), isNull(branchReviewsTable.trainerId),
    eq(branchReviewsTable.authorUserId, req.userId!),
  )).returning({ id: branchReviewsTable.id });
  if (!deleted) { res.status(404).json({ error: "Review not found" }); return; }
  res.status(204).end();
});

router.get("/reviews", async (_req, res) => {
  await ensureReviewSamples();
  const rows = await db.select().from(branchReviewsTable).where(and(eq(branchReviewsTable.isPublished, true), isNull(branchReviewsTable.trainerId)))
    .orderBy(asc(branchReviewsTable.sortOrder), asc(branchReviewsTable.id)).limit(500);
  res.json({ reviews: rows.map(publicReview) });
});

router.get("/admin/reviews", requireAdmin, async (_req, res) => {
  await ensureReviewSamples();
  const rows = await db.select().from(branchReviewsTable)
    .orderBy(asc(branchReviewsTable.sortOrder), asc(branchReviewsTable.id)).limit(500);
  res.json({ reviews: rows.map(publicReview) });
});

router.get("/admin/reviews/branches", requireAdmin, async (_req, res) => {
  const branches = await db.select({ id: gymsTable.id, name: gymsTable.name }).from(gymsTable)
    .where(eq(gymsTable.isVerified, true)).orderBy(asc(gymsTable.name));
  res.json(branches);
});

router.get("/admin/reviews/trainers", requireAdmin, async (_req, res) => {
  const staff = await db.select({ gymId: staffTable.gymId, permissions: staffTable.permissions }).from(staffTable).where(eq(staffTable.isActive, true));
  const gymIds = [...new Set(staff.filter(s => s.permissions.includes("pt.manage") && s.gymId !== null).map(s => s.gymId!))];
  try {
    const trainers = [];
    for (const gymId of gymIds) {
      const roster = await resolvePtTrainerRoster(gymId);
      const [gym] = await db.select({ name: gymsTable.name }).from(gymsTable).where(eq(gymsTable.id, gymId));
      trainers.push(...roster.map(t => ({ ...t, gymId, branchName: gym.name })));
    }
    res.json({ trainers });
  } catch (error) {
    if (!(error instanceof PtCheckoutError)) throw error;
    res.status(error.status).json({ error: error.message });
  }
});

async function validateTrainerAssignment(data: { trainerId?: string | null; gymId?: number | null; branchName: string }) {
  if (!data.gymId) return;
  const [gym] = await db.select({ name: gymsTable.name }).from(gymsTable).where(eq(gymsTable.id, data.gymId));
  if (!gym) throw new PtCheckoutError(400, "Choose an existing branch.");
  if (data.trainerId) {
    const roster = await resolvePtTrainerRoster(data.gymId);
    if (!roster.some(trainer => trainer.id === data.trainerId)) throw new PtCheckoutError(400, "Choose an active trainer from the selected branch.");
  }
  data.branchName = gym.name;
}

router.post("/admin/reviews", requireAdmin, async (req, res) => {
  const parsed = reviewInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid review", details: parsed.error.flatten() }); return; }
  try { await validateTrainerAssignment(parsed.data); }
  catch (error) {
    if (!(error instanceof PtCheckoutError)) throw error;
    res.status(error.status).json({ error: error.message }); return;
  }
  await ensureReviewSamples();
  const row = await db.transaction(async (tx) => {
    await tx.execute(reviewLock);
    const [count] = await tx.select({ value: sql<number>`count(*)::int` }).from(branchReviewsTable);
    if (count.value >= 500) return null;
    const [created] = await tx.insert(branchReviewsTable).values(parsed.data).returning();
    return created;
  });
  if (!row) { res.status(400).json({ error: "Maximum of 500 reviews reached" }); return; }
  res.status(201).json(publicReview(row));
});

router.put("/admin/reviews/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({ error: "Invalid review id" }); return;
  }
  const [memberReview] = await db.select().from(branchReviewsTable).where(eq(branchReviewsTable.id, id));
  if (memberReview?.authorUserId !== null && memberReview?.authorUserId !== undefined) {
    for (const field of ["reviewerName", "branchName", "trainerId", "gymId", "isSample"] as const) {
      if (req.body?.[field] !== undefined && req.body[field] !== memberReview[field]) {
        res.status(400).json({ error: "Member identity, trainer assignment and submission type cannot be changed." }); return;
      }
    }
    const edit = z.object({
      reviewText: z.string().trim().min(1).max(2000), rating: z.number().int().min(1).max(5),
      sortOrder: z.number().int().min(-2147483648).max(2147483647), isPublished: z.boolean(),
    }).safeParse(req.body);
    if (!edit.success) { res.status(400).json({ error: "Invalid review" }); return; }
    const [row] = await db.update(branchReviewsTable).set({
      ...edit.data, ...(edit.data.isPublished ? { moderationStatus: "approved" } : {}), updatedAt: sql`now()`,
    }).where(eq(branchReviewsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Review not found" }); return; }
    res.json(publicReview(row)); return;
  }
  const parsed = reviewInput.safeParse(req.body);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647 || !parsed.success) {
    res.status(400).json({ error: "Invalid review or id" }); return;
  }
  const [current] = await db.select().from(branchReviewsTable).where(eq(branchReviewsTable.id, id));
  if (!current) { res.status(404).json({ error: "Review not found" }); return; }
  // Unchanged assignments remain editable/hideable if a trainer retires.
  if (parsed.data.gymId && (parsed.data.trainerId !== current.trainerId || parsed.data.gymId !== current.gymId)) {
    try { await validateTrainerAssignment(parsed.data); }
    catch (error) {
      if (!(error instanceof PtCheckoutError)) throw error;
      res.status(error.status).json({ error: error.message }); return;
    }
  }
  if (parsed.data.gymId && parsed.data.gymId === current.gymId && parsed.data.trainerId === current.trainerId) {
    const [gym] = await db.select({ name: gymsTable.name }).from(gymsTable).where(eq(gymsTable.id, parsed.data.gymId));
    if (!gym) { res.status(400).json({ error: "Choose an existing branch." }); return; }
    parsed.data.branchName = gym.name;
  }
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(branchReviewsTable).where(eq(branchReviewsTable.id, id)).for("update");
    if (!existing) return { status: 404, body: { error: "Review not found" } };
    if (!canChangeSampleFlag(existing.seedKey, parsed.data.isSample)) {
      return { status: 400, body: { error: "Seeded sample reviews must remain labelled as samples" } };
    }
    const [row] = await tx.update(branchReviewsTable).set({ ...parsed.data, updatedAt: sql`now()` })
      .where(eq(branchReviewsTable.id, id)).returning();
    return { status: 200, body: publicReview(row) };
  });
  res.status(result.status).json(result.body);
});

router.delete("/admin/reviews/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({ error: "Invalid id" }); return;
  }
  const [row] = await db.delete(branchReviewsTable).where(eq(branchReviewsTable.id, id)).returning({ id: branchReviewsTable.id });
  if (!row) { res.status(404).json({ error: "Review not found" }); return; }
  res.json({ ok: true });
});

return router;
}
export default createReviewsRouter();