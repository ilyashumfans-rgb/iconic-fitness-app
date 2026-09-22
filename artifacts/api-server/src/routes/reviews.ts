import { Router, type IRouter } from "express";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, branchReviewsTable, gymsTable, staffTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { canChangeSampleFlag, ensureReviewSamples, publicReview, reviewInput, reviewLock } from "../lib/branchReviews";
import { resolvePtTrainerRoster } from "../lib/ptTrainerResolver";
import { PtCheckoutError } from "../lib/ptTrainerPolicy";
import { z } from "zod";

const router: IRouter = Router();

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
  if (!data.trainerId || !data.gymId) return;
  const roster = await resolvePtTrainerRoster(data.gymId);
  if (!roster.some(trainer => trainer.id === data.trainerId)) throw new PtCheckoutError(400, "Choose an active trainer from the selected branch.");
  const [gym] = await db.select({ name: gymsTable.name }).from(gymsTable).where(eq(gymsTable.id, data.gymId));
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
  if (parsed.data.trainerId !== undefined &&
      (parsed.data.trainerId !== current.trainerId || parsed.data.gymId !== current.gymId)) {
    try { await validateTrainerAssignment(parsed.data); }
    catch (error) {
      if (!(error instanceof PtCheckoutError)) throw error;
      res.status(error.status).json({ error: error.message }); return;
    }
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

export default router;