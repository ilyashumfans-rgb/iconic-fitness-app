import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { PtCheckoutError } from "./ptTrainerPolicy";
import { resolvePtTrainerRoster } from "./ptTrainerResolver";

/**
 * Coach categories live in app_settings, one row per category and one row per
 * (gym, upstream trainer id) assignment — so edits never clobber each other and
 * assignments are always scoped to the exact branch + exact upstream ID.
 */
export const CATEGORY_PREFIX = "coach_category:";
export const ASSIGN_PREFIX = "coach_category_assign:";
export const categoryKey = (id: string) => `${CATEGORY_PREFIX}${id}`;
export const assignmentKey = (gymId: number, trainerId: string) => `${ASSIGN_PREFIX}${gymId}:${trainerId}`;

const imageUrl = z.string().trim().max(2000).refine(value => {
  if (!value) return true;
  if (/^\/(?:api\/)?storage\/db-images\/[a-zA-Z0-9-]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "Use an uploaded image or a secure HTTPS URL.");
export const coachCategoryInput = z.object({
  title: z.string().trim().min(1, "Title is required.").max(80),
  summary: z.string().trim().max(500),
  benefits: z.array(z.string().trim().min(1).max(160)).max(12),
  details: z.string().trim().max(5000),
  imageUrl,
  published: z.boolean(),
}).strict();
// `networkCoach` is a stable explicit capability (Iconic Network Coach online sessions),
// toggled only by the dedicated admin endpoint — never inferred from the title at runtime.
const stored = coachCategoryInput.extend({ id: z.string(), sortOrder: z.number().int(), networkCoach: z.boolean().optional() });
export type CoachCategory = z.infer<typeof stored>;
export const assignmentInput = z.object({ categoryIds: z.array(z.string().min(1).max(64)).max(50) }).strict();
const categoryIdSchema = z.string().regex(/^[a-zA-Z0-9-]{1,64}$/);
export function categoryId(value: unknown) {
  const parsed = categoryIdSchema.safeParse(value);
  if (!parsed.success) throw new PtCheckoutError(404, "Category not found.");
  return parsed.data;
}

function parseRow(value: string | null): CoachCategory | null {
  try { const r = stored.safeParse(JSON.parse(value ?? "null")); return r.success ? r.data : null; }
  catch { return null; }
}
function parseIds(value: string | null): string[] {
  try { const r = assignmentInput.safeParse(JSON.parse(value ?? "null")); return r.success ? r.data.categoryIds : []; }
  catch { return []; }
}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Exec = typeof db | Tx;
/** Every category/assignment mutator runs inside this: one xact-scoped advisory lock serializes them. */
const COACH_CATEGORY_LOCK = 7_412_093_551;
async function locked<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(${COACH_CATEGORY_LOCK})`);
    return fn(tx);
  });
}
const json = (value: unknown) => JSON.stringify(value);

async function readCategories(ex: Exec): Promise<CoachCategory[]> {
  const rows = await ex.select().from(appSettingsTable).where(like(appSettingsTable.key, `${CATEGORY_PREFIX}%`));
  return rows.map(r => parseRow(r.value)).filter((c): c is CoachCategory => !!c)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}
async function readCategory(ex: Exec, id: string) {
  const [row] = await ex.select().from(appSettingsTable).where(eq(appSettingsTable.key, categoryKey(id)));
  return row ? parseRow(row.value) : null;
}
export const listCategories = () => readCategories(db);
export const getCategory = (id: string) => readCategory(db, id);

export function createCategory(input: z.infer<typeof coachCategoryInput>) {
  return locked(async tx => {
    const all = await readCategories(tx);
    const category: CoachCategory = { ...input, id: randomUUID(), sortOrder: all.length ? Math.max(...all.map(c => c.sortOrder)) + 1 : 0 };
    await tx.insert(appSettingsTable).values({ key: categoryKey(category.id), value: json(category) });
    return category;
  });
}
export function updateCategory(id: string, input: z.infer<typeof coachCategoryInput>) {
  return locked(async tx => {
    const current = await readCategory(tx, id);
    if (!current) throw new PtCheckoutError(404, "Category not found.");
    const next = { ...current, ...input };
    // Plain UPDATE (never upsert) so a concurrently deleted category can't be resurrected.
    const rows = await tx.update(appSettingsTable).set({ value: json(next), updatedAt: new Date() })
      .where(eq(appSettingsTable.key, categoryKey(id))).returning({ key: appSettingsTable.key });
    if (!rows.length) throw new PtCheckoutError(404, "Category not found.");
    return next;
  });
}
export function deleteCategory(id: string) {
  return locked(async tx => {
    const deleted = await tx.delete(appSettingsTable).where(eq(appSettingsTable.key, categoryKey(id))).returning();
    if (!deleted.length) throw new PtCheckoutError(404, "Category not found.");
    const rows = await tx.select().from(appSettingsTable).where(like(appSettingsTable.key, `${ASSIGN_PREFIX}%`));
    for (const row of rows) {
      const ids = parseIds(row.value);
      if (!ids.includes(id)) continue;
      await tx.update(appSettingsTable).set({ value: json({ categoryIds: ids.filter(x => x !== id) }), updatedAt: new Date() })
        .where(eq(appSettingsTable.key, row.key));
    }
  });
}
export function reorderCategories(ids: string[]) {
  return locked(async tx => {
    const all = await readCategories(tx);
    const known = new Set(all.map(c => c.id));
    if (ids.length !== all.length || new Set(ids).size !== ids.length || ids.some(id => !known.has(id))) {
      throw new PtCheckoutError(409, "Categories changed since you loaded them. Refresh and try again.");
    }
    const byId = new Map(all.map(c => [c.id, c]));
    for (const [index, id] of ids.entries()) {
      await tx.update(appSettingsTable).set({ value: json({ ...byId.get(id)!, sortOrder: index }), updatedAt: new Date() })
        .where(eq(appSettingsTable.key, categoryKey(id)));
    }
    return readCategories(tx);
  });
}

/** Assignment for one trainer at one branch, ignoring deleted category IDs. */
export async function getAssignment(gymId: number, trainerId: string) {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, assignmentKey(gymId, trainerId)));
  const known = new Set((await listCategories()).map(c => c.id));
  return { categoryIds: parseIds(row?.value ?? null).filter(id => known.has(id)) };
}
export function setAssignment(gymId: number, trainerId: string, categoryIds: string[]) {
  return locked(async tx => {
    const known = new Set((await readCategories(tx)).map(c => c.id));
    const unique = [...new Set(categoryIds)];
    if (unique.some(id => !known.has(id))) throw new PtCheckoutError(400, "One or more categories no longer exist. Refresh and try again.");
    const value = json({ categoryIds: unique });
    await tx.insert(appSettingsTable).values({ key: assignmentKey(gymId, trainerId), value })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
    return { categoryIds: unique };
  });
}

type Roster = (gymId: number) => Promise<{ id: string; name: string }[]>;
/** Eligible roster (regular + PT mapped branches, active local staff) with assignments for this branch only. */
export async function assignedRoster(gymId: number, roster: Roster = resolvePtTrainerRoster) {
  const trainers = await roster(gymId);
  const assignments = new Map<string, string[]>();
  if (trainers.length) {
    const keys = trainers.map(t => assignmentKey(gymId, t.id));
    const rows = await db.select().from(appSettingsTable).where(inArray(appSettingsTable.key, keys));
    for (const row of rows) assignments.set(row.key.slice(assignmentKey(gymId, "").length), parseIds(row.value));
  }
  return trainers.map(t => ({ ...t, categoryIds: assignments.get(t.id) ?? [] }));
}

export const NETWORK_MIGRATION_KEY = "network_coach_capability_migrated";
export const NETWORK_LEGACY_TITLE = "Iconic Network Coach";

/** Explicitly set/clear the online-coaching capability on one category. */
export function setNetworkCapability(id: string, enabled: boolean) {
  return locked(async tx => {
    const current = await readCategory(tx, id);
    if (!current) throw new PtCheckoutError(404, "Category not found.");
    const next = { ...current, networkCoach: enabled };
    await tx.update(appSettingsTable).set({ value: json(next), updatedAt: new Date() }).where(eq(appSettingsTable.key, categoryKey(id)));
    return next;
  });
}

/**
 * One-time migration: flag categories whose title is EXACTLY the legacy title.
 * A marker row guarantees it never runs again, so later renames/toggles stick.
 */
export function migrateNetworkCapabilityOnce() {
  return locked(async tx => {
    const [marker] = await tx.select().from(appSettingsTable).where(eq(appSettingsTable.key, NETWORK_MIGRATION_KEY));
    if (marker) return { migrated: false, ids: [] as string[] };
    const ids: string[] = [];
    for (const c of await readCategories(tx)) {
      if (c.title !== NETWORK_LEGACY_TITLE || c.networkCoach !== undefined) continue;
      await tx.update(appSettingsTable).set({ value: json({ ...c, networkCoach: true }), updatedAt: new Date() }).where(eq(appSettingsTable.key, categoryKey(c.id)));
      ids.push(c.id);
    }
    await tx.insert(appSettingsTable).values({ key: NETWORK_MIGRATION_KEY, value: json({ at: new Date().toISOString(), ids }) });
    return { migrated: true, ids };
  });
}
export async function networkCategoryIds() {
  return (await listCategories()).filter(c => c.networkCoach === true).map(c => c.id);
}
