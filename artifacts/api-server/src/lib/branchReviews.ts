import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, appSettingsTable, branchReviewsTable } from "@workspace/db";

export const reviewInput = z.object({
  reviewerName: z.string().trim().min(1).max(100),
  branchName: z.string().trim().min(1).max(150),
  trainerId: z.string().trim().min(1).max(100).nullable().optional(),
  gymId: z.number().int().positive().max(2147483647).nullable().optional(),
  reviewText: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5),
  isSample: z.boolean(),
  isPublished: z.boolean(),
  sortOrder: z.number().int().min(-2147483648).max(2147483647),
}).strict().refine(value =>
  (value.trainerId === undefined && value.gymId === undefined) ||
  (value.trainerId === null && value.gymId === null) ||
  (typeof value.trainerId === "string" && typeof value.gymId === "number"),
{ message: "Select a trainer and its branch together", path: ["trainerId"] });

export function trainerReviewSummary(reviews: { rating: number; isSample: boolean }[]) {
  const genuine = reviews.filter(review => !review.isSample);
  return {
    reviewCount: genuine.length,
    rating: genuine.length ? Math.round(genuine.reduce((sum, review) => sum + review.rating, 0) / genuine.length * 10) / 10 : null,
  };
}

// Branch labels come from the existing Iconic branch catalog. All quotes and
// names are fictional sample copy, not testimonials or verified endorsements.
const samples = [
  ["Iconic Fitness 1st Block", "The clear workout layout makes my strength sessions easy to follow."],
  ["Koramangala 4th block", "I enjoy having space to warm up before my morning workout."],
  ["Brook Field", "A welcoming place to start building a consistent fitness routine."],
  ["Marathahalli", "The mix of cardio and strength equipment keeps my sessions varied."],
  ["seegehalli", "I like fitting a focused workout into my day close to home."],
  ["JP Nagar Puttenahalli", "The stretching area is a nice way to finish a strength session."],
  ["JP Nagar 7th Phase", "A comfortable setting for working on my weekly fitness goals."],
  ["Indranagar", "I enjoy switching between weights and cardio during my visits."],
  ["Bellandur Green Glan", "The training space helps me stay focused on one exercise at a time."],
  ["Bellandur Centro", "A convenient stop for an energising workout after my workday."],
  ["BTM Tavarekere", "I appreciate a simple setup for practising my basic lifts."],
  ["BTM Marutinagar", "A positive place to keep showing up and building healthy habits."],
] as const;

export const reviewSeedMarker = "branch_reviews_samples_v1";
export const reviewLock = sql`SELECT pg_advisory_xact_lock(734281095)`;
export const sampleReviews = samples.map(([branchName, quote], i) => ({
  reviewerName: `Sample member ${i + 1}`,
  branchName,
  reviewText: `Sample review: ${quote}`,
  rating: i % 3 === 1 ? 4 : 5,
  isSample: true,
  isPublished: true,
  sortOrder: i + 1,
  seedKey: `iconic-sample-v1-${i + 1}`,
}));

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function seedReviewsInTransaction(tx: Transaction) {
  await tx.execute(reviewLock);
  const [marker] = await tx.select().from(appSettingsTable).where(eq(appSettingsTable.key, reviewSeedMarker));
  if (marker) return;
  await tx.insert(branchReviewsTable).values(sampleReviews).onConflictDoNothing({ target: branchReviewsTable.seedKey });
  await tx.insert(appSettingsTable).values({ key: reviewSeedMarker, value: "seeded" });
}

export async function ensureReviewSamples() {
  await db.transaction(seedReviewsInTransaction);
}

export function canChangeSampleFlag(seedKey: string | null, isSample: boolean) {
  return seedKey === null || isSample;
}

export function publicReview(row: typeof branchReviewsTable.$inferSelect) {
  const { seedKey: _internal, authorUserId, ...review } = row;
  return { ...review, isMemberReview: authorUserId !== null };
}