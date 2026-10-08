import { eq } from "drizzle-orm";
import { db, gymsTable, staffTable } from "@workspace/db";
import { fetchYoactivTrainers, yoactivConfigured } from "./yoactiv";
import { eligiblePtTrainers, PtCheckoutError } from "./ptTrainerPolicy";
import { mappedPtTrainers } from "./ptTrainerDirectories";

/** Shared by roster and checkout: both explicit directories for this gym. */
export async function resolvePtTrainerRoster(gymId: number) {
  if (!yoactivConfigured()) throw new PtCheckoutError(503, "Trainer availability is temporarily unavailable.");
  const [gym] = await db.select({ branchId: gymsTable.yoactivBranchId, ptBranchId: gymsTable.yoactivPtBranchId }).from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) throw new PtCheckoutError(404, "Branch not found.");
  if (!gym.branchId && !gym.ptBranchId) return [];
  let trainers;
  try {
    // Fresh upstream membership is required at checkout; never stale-on-error.
    trainers = await mappedPtTrainers(gym.branchId, gym.ptBranchId,
      (branchId) => fetchYoactivTrainers(branchId, { strict: true }));
  } catch {
    throw new PtCheckoutError(502, "Could not verify branch trainer availability. Please retry.");
  }
  const staff = await db.select().from(staffTable).where(eq(staffTable.gymId, gymId));
  return eligiblePtTrainers(gymId, trainers, staff);
}