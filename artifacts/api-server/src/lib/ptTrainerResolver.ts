import { eq } from "drizzle-orm";
import { db, gymsTable, staffTable } from "@workspace/db";
import { fetchYoactivTrainers, yoactivConfigured } from "./yoactiv";
import { eligiblePtTrainers, PtCheckoutError } from "./ptTrainerPolicy";

/** Shared by roster and checkout: membership branch, never PT-sales branch. */
export async function resolvePtTrainerRoster(gymId: number) {
  if (!yoactivConfigured()) throw new PtCheckoutError(503, "Trainer availability is temporarily unavailable.");
  const [gym] = await db.select({ branchId: gymsTable.yoactivBranchId }).from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) throw new PtCheckoutError(404, "Branch not found.");
  if (!gym.branchId) return [];
  let trainers;
  try {
    // Fresh upstream membership is required at checkout; never stale-on-error.
    trainers = await fetchYoactivTrainers(gym.branchId, { strict: true });
  } catch {
    throw new PtCheckoutError(502, "Could not verify branch trainer availability. Please retry.");
  }
  const staff = await db.select().from(staffTable).where(eq(staffTable.gymId, gymId));
  return eligiblePtTrainers(gymId, trainers, staff);
}