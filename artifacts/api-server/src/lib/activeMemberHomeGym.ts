import { eq } from "drizzle-orm";
import { db, gymsTable, usersTable } from "@workspace/db";
import { fetchYoactivMemberByMobile, pickPrimaryMembership, yoactivConfigured } from "./yoactiv";

/** Account identity only; never use a checkout body's mobile for entitlement. */
export async function activeMemberHomeGymId(userId: number, requireComplete = false): Promise<number | null> {
  if (!yoactivConfigured()) return null;
  try {
    const [user] = await db.select({ mobile: usersTable.mobile }).from(usersTable).where(eq(usersTable.id, userId));
    const profile = await fetchYoactivMemberByMobile(user?.mobile, { requireComplete });
    const primary = profile ? pickPrimaryMembership(profile) : null;
    if (!primary || primary.status !== "active") return null;
    const [gym] = await db.select({ id: gymsTable.id }).from(gymsTable).where(eq(gymsTable.yoactivBranchId, primary.branchId));
    return gym?.id ?? null;
  } catch {
    return null;
  }
}