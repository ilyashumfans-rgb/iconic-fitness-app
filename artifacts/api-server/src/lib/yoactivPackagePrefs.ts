import { and, eq } from "drizzle-orm";
import { db, yoactivPackagePrefsTable } from "@workspace/db";

/**
 * Admin curation layer over the live YoActiv package catalog: YoActiv stays
 * the source of truth for names/prices, we only remember which package
 * variations an admin hid from the member-facing purchase flows.
 */

/** Package variation ids hidden for a branch. */
export async function hiddenPackageIds(branchId: number): Promise<Set<number>> {
  const rows = await db
    .select({ packageId: yoactivPackagePrefsTable.packageId })
    .from(yoactivPackagePrefsTable)
    .where(
      and(
        eq(yoactivPackagePrefsTable.branchId, branchId),
        eq(yoactivPackagePrefsTable.hidden, true),
      ),
    );
  return new Set(rows.map((r) => r.packageId));
}

/** Upsert the hidden flag for one (branch, package variation). */
export async function setPackageHidden(
  branchId: number,
  packageId: number,
  hidden: boolean,
): Promise<void> {
  await db
    .insert(yoactivPackagePrefsTable)
    .values({ branchId, packageId, hidden, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [
        yoactivPackagePrefsTable.branchId,
        yoactivPackagePrefsTable.packageId,
      ],
      set: { hidden, updatedAt: new Date() },
    });
}
