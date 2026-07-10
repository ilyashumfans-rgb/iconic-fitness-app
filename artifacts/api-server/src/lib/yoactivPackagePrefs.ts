import { and, eq } from "drizzle-orm";
import { db, yoactivPackagePrefsTable } from "@workspace/db";

/**
 * Admin curation layer over the live YoActiv package catalog: YoActiv stays
 * the source of truth for prices (payment happens on YoActiv's side), we
 * remember which package variations an admin hid from the member-facing
 * purchase flows plus optional display-only overrides (name, description,
 * image). Empty-string override = use the live YoActiv value.
 */

export type PackagePref = {
  hidden: boolean;
  displayName: string;
  description: string;
  imageUrl: string;
};

/** All stored prefs for a branch, keyed by package variation id. */
export async function packagePrefs(
  branchId: number,
): Promise<Map<number, PackagePref>> {
  const rows = await db
    .select({
      packageId: yoactivPackagePrefsTable.packageId,
      hidden: yoactivPackagePrefsTable.hidden,
      displayName: yoactivPackagePrefsTable.displayName,
      description: yoactivPackagePrefsTable.description,
      imageUrl: yoactivPackagePrefsTable.imageUrl,
    })
    .from(yoactivPackagePrefsTable)
    .where(eq(yoactivPackagePrefsTable.branchId, branchId));
  return new Map(
    rows.map((r) => [
      r.packageId,
      {
        hidden: r.hidden,
        displayName: r.displayName,
        description: r.description,
        imageUrl: r.imageUrl,
      },
    ]),
  );
}

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

/**
 * Overlay display overrides onto a live YoActiv package. Never touches the
 * price. Returns the package unchanged when there is no pref row.
 */
export function applyPackagePref<
  T extends { id: number; name: string },
>(pkg: T, prefs: Map<number, PackagePref>): T & { description: string; imageUrl: string } {
  const pref = prefs.get(pkg.id);
  return {
    ...pkg,
    name: pref?.displayName.trim() ? pref.displayName.trim() : pkg.name,
    description: pref?.description ?? "",
    imageUrl: pref?.imageUrl ?? "",
  };
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

/** Upsert the display-only content overrides for one (branch, package variation). */
export async function setPackageContent(
  branchId: number,
  packageId: number,
  content: { displayName: string; description: string; imageUrl: string },
): Promise<void> {
  await db
    .insert(yoactivPackagePrefsTable)
    .values({
      branchId,
      packageId,
      displayName: content.displayName,
      description: content.description,
      imageUrl: content.imageUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        yoactivPackagePrefsTable.branchId,
        yoactivPackagePrefsTable.packageId,
      ],
      set: {
        displayName: content.displayName,
        description: content.description,
        imageUrl: content.imageUrl,
        updatedAt: new Date(),
      },
    });
}
