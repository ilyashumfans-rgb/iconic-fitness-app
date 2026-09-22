import { Router, type RequestHandler } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, appSettingsTable, branchReviewsTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { requireUser } from "../lib/currentUser";
import { activeMemberHomeGymId } from "../lib/activeMemberHomeGym";
import { PtCheckoutError } from "../lib/ptTrainerPolicy";
import { liveTrainerProfile, trainerBranch, trainerProfileInput, trainerProfileKey, verifiedTrainer } from "../lib/liveTrainerProfiles";
import { publicReview } from "../lib/branchReviews";

const handle = (fn: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (error) {
    if (error instanceof PtCheckoutError) { res.status(error.status).json({ error: error.message }); return; }
    next(error);
  }
};
const ownReview = (row: typeof branchReviewsTable.$inferSelect | undefined) => row
  ? { id: row.id, rating: row.rating, reviewText: row.reviewText, status: row.moderationStatus, isPublished: row.isPublished }
  : null;
export const memberTrainerReviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().min(1).max(2000),
}).strict();

export function createTrainerProfileReviewsRouter(deps: {
  memberAuth?: RequestHandler;
  homeGym?: typeof activeMemberHomeGymId;
  verifyTrainer?: typeof verifiedTrainer;
} = {}) {
const router = Router();
const memberAuth = deps.memberAuth ?? requireUser;
const homeGym = deps.homeGym ?? activeMemberHomeGymId;
const verifyTrainer = deps.verifyTrainer ?? verifiedTrainer;
router.get("/admin/trainers/live/:trainerId/profile", requireAdmin, handle(async (req, res) => {
  res.json(await liveTrainerProfile(trainerBranch(req.query.gymId), String(req.params.trainerId)));
}));
router.put("/admin/trainers/live/:trainerId/profile", requireAdmin, handle(async (req, res) => {
  const profile = trainerProfileInput.safeParse(req.body);
  if (!profile.success) { res.status(400).json({ error: profile.error.issues[0]?.message ?? "Invalid profile" }); return; }
  const gymId = trainerBranch(req.query.gymId);
  const trainerId = String(req.params.trainerId);
  await verifiedTrainer(gymId, trainerId);
  const key = trainerProfileKey(gymId, trainerId);
  await db.insert(appSettingsTable).values({ key, value: JSON.stringify(profile.data) })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: JSON.stringify(profile.data) } });
  res.json(await liveTrainerProfile(gymId, trainerId));
}));
router.get("/trainers/live/:trainerId/review", memberAuth, handle(async (req, res) => {
  const [row] = await db.select().from(branchReviewsTable).where(and(
    eq(branchReviewsTable.authorUserId, req.userId!), eq(branchReviewsTable.trainerId, String(req.params.trainerId)),
    eq(branchReviewsTable.gymId, trainerBranch(req.query.gymId)),
  ));
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ review: ownReview(row) });
}));
router.put("/trainers/live/:trainerId/review", memberAuth, handle(async (req, res) => {
  const parsed = memberTrainerReviewInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose 1–5 stars and write a review of up to 2,000 characters." }); return; }
  const gymId = trainerBranch(req.query.gymId);
  if (await homeGym(req.userId!, true) !== gymId) {
    res.status(403).json({ error: "Reviews are available to active members for trainers at their home branch." }); return;
  }
  const trainerId = String(req.params.trainerId);
  const trainer = await verifyTrainer(gymId, trainerId);
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(401).json({ error: "Please sign in again." }); return; }
  const values = { ...parsed.data, reviewerName: user.name, branchName: trainer.branchName,
    trainerId, gymId, authorUserId: req.userId!, moderationStatus: "pending", isPublished: false, isSample: false };
  const [row] = await db.insert(branchReviewsTable).values(values).onConflictDoUpdate({
    target: [branchReviewsTable.authorUserId, branchReviewsTable.trainerId, branchReviewsTable.gymId],
    set: { ...values, updatedAt: sql`now()` },
  }).returning();
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ review: ownReview(row) });
}));
router.post("/admin/reviews/:id/moderation", requireAdmin, handle(async (req, res) => {
  const id = trainerBranch(req.params.id);
  const parsed = z.object({ status: z.enum(["approved", "rejected"]) }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose approve or reject." }); return; }
  const [row] = await db.update(branchReviewsTable).set({
    moderationStatus: parsed.data.status, isPublished: parsed.data.status === "approved", updatedAt: sql`now()`,
  }).where(and(eq(branchReviewsTable.id, id), sql`${branchReviewsTable.authorUserId} IS NOT NULL`)).returning();
  if (!row) { res.status(404).json({ error: "Member review not found." }); return; }
  res.json(publicReview(row));
}));
return router;
}
export default createTrainerProfileReviewsRouter();