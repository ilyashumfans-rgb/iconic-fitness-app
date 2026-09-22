import { z } from "zod";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { db, appSettingsTable, branchReviewsTable, gymsTable } from "@workspace/db";
import { resolvePtTrainerRoster } from "./ptTrainerResolver";
import { PtCheckoutError } from "./ptTrainerPolicy";
import { trainerPhotoMap } from "./trainerPhotos";
import { publicReview, trainerReviewSummary } from "./branchReviews";

const publicUrl = z.string().trim().max(2000).refine(value => {
  if (!value) return true;
  if (/^\/(?:api\/)?storage\/db-images\/[a-zA-Z0-9-]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "Use an uploaded file or a secure HTTPS URL.");
export const trainerProfileInput = z.object({
  coverPhotoUrl: publicUrl,
  photoUrl: publicUrl,
  bio: z.string().trim().max(5000),
  qualifications: z.array(z.string().trim().min(1).max(200)).max(30),
  specialties: z.array(z.string().trim().min(1).max(100)).max(20),
  interests: z.array(z.string().trim().min(1).max(100)).max(20),
  certificates: z.array(z.object({ title: z.string().trim().min(1).max(200), url: publicUrl.refine(v => v.length > 0) }).strict()).max(20),
}).strict();
export const emptyTrainerProfile = () => ({
  coverPhotoUrl: "", photoUrl: "", bio: "",
  qualifications: [] as string[], specialties: [] as string[], interests: [] as string[],
  certificates: [] as { title: string; url: string }[],
});
export const trainerProfileKey = (gymId: number, trainerId: string) => `trainer_profile:${gymId}:${trainerId}`;
export function trainerBranch(value: unknown) {
  const parsed = z.coerce.number().int().positive().max(2147483647).safeParse(value);
  if (!parsed.success) throw new PtCheckoutError(400, "A valid branch is required.");
  return parsed.data;
}
export async function verifiedTrainer(gymId: number, trainerId: string) {
  const trainer = (await resolvePtTrainerRoster(gymId)).find(t => t.id === trainerId);
  if (!trainer) throw new PtCheckoutError(404, "Trainer is not available at this branch.");
  const [gym] = await db.select({ name: gymsTable.name }).from(gymsTable).where(eq(gymsTable.id, gymId));
  return { ...trainer, gymId, branchName: gym.name };
}
export async function trainerProfileMap(gymId: number, ids: string[]) {
  const profiles = new Map<string, ReturnType<typeof emptyTrainerProfile>>();
  if (!ids.length) return profiles;
  const keys = ids.map(id => trainerProfileKey(gymId, id));
  const rows = await db.select().from(appSettingsTable).where(inArray(appSettingsTable.key, keys));
  for (const row of rows) profiles.set(row.key.slice(`trainer_profile:${gymId}:`.length), trainerProfileInput.parse(JSON.parse(row.value ?? "null")));
  return profiles;
}
export const publishedReviewCondition = and(
  eq(branchReviewsTable.isPublished, true),
  or(isNull(branchReviewsTable.authorUserId), eq(branchReviewsTable.moderationStatus, "approved")),
);
export async function liveTrainerProfile(gymId: number, trainerId: string) {
  const trainer = await verifiedTrainer(gymId, trainerId);
  const [profiles, photos, reviews] = await Promise.all([
    trainerProfileMap(gymId, [trainerId]), trainerPhotoMap([trainerId]),
    db.select().from(branchReviewsTable).where(and(
      eq(branchReviewsTable.trainerId, trainerId), eq(branchReviewsTable.gymId, gymId), publishedReviewCondition,
    )).orderBy(asc(branchReviewsTable.sortOrder), asc(branchReviewsTable.id)).limit(500),
  ]);
  const profile = profiles.get(trainerId) ?? emptyTrainerProfile();
  return { ...trainer, profile, photoUrl: profile.photoUrl || photos.get(trainerId) || null,
    reviews: reviews.map(publicReview), ...trainerReviewSummary(reviews) };
}