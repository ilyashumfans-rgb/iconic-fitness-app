import { inArray, eq } from "drizzle-orm";
import { db, trainerPhotosTable } from "@workspace/db";

/** Map of YoActiv staff id -> uploaded photo URL for the given trainer ids. */
export async function trainerPhotoMap(
  trainerIds: string[],
): Promise<Map<string, string>> {
  if (trainerIds.length === 0) return new Map();
  const rows = await db
    .select({
      yoactivTrainerId: trainerPhotosTable.yoactivTrainerId,
      imageUrl: trainerPhotosTable.imageUrl,
    })
    .from(trainerPhotosTable)
    .where(inArray(trainerPhotosTable.yoactivTrainerId, trainerIds));
  return new Map(rows.map((r) => [r.yoactivTrainerId, r.imageUrl]));
}

export async function setTrainerPhoto(
  trainerId: string,
  imageUrl: string,
): Promise<void> {
  await db
    .insert(trainerPhotosTable)
    .values({ yoactivTrainerId: trainerId, imageUrl, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: trainerPhotosTable.yoactivTrainerId,
      set: { imageUrl, updatedAt: new Date() },
    });
}

export async function removeTrainerPhoto(trainerId: string): Promise<void> {
  await db
    .delete(trainerPhotosTable)
    .where(eq(trainerPhotosTable.yoactivTrainerId, trainerId));
}
