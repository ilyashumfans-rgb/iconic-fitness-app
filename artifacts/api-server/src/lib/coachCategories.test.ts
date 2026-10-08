import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { like } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { createCoachCategoriesRouter } from "../routes/coachCategories";
import { PtCheckoutError } from "./ptTrainerPolicy";
import { assignmentKey } from "./coachCategories";

test("coach categories: admin auth, branch-scoped assignments, hidden/deleted, same-name IDs, persistence", async () => {
  const tag = randomUUID().slice(0, 8);
  const GYM_A = 900000001, GYM_B = 900000002;
  // Two distinct upstream IDs share a display name; only GYM_A has both.
  const rosters: Record<number, { id: string; name: string }[]> = {
    [GYM_A]: [{ id: `t1-${tag}`, name: "Same Name" }, { id: `t2-${tag}`, name: "Same Name" }],
    [GYM_B]: [{ id: `t1-${tag}`, name: "Same Name" }],
  };
  const roster = async (gymId: number) => rosters[gymId] ?? [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.session = (req.headers["x-admin"] ? { adminId: 1 } : {}) as typeof req.session; next(); });
  app.use(createCoachCategoriesRouter({
    roster: roster as never,
    verifyTrainer: async (gymId, id) => { if (!(await roster(gymId)).some(t => t.id === id)) throw new PtCheckoutError(404, "Trainer is not available at this branch."); },
    photos: async () => new Map(), profiles: async () => new Map(),
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(r => server.once("listening", r));
  const addr = server.address(); assert.ok(addr && typeof addr !== "string");
  const call = async (path: string, method = "GET", body?: unknown, admin = false) => {
    const r = await fetch(`http://127.0.0.1:${addr.port}${path}`, { method,
      headers: { "Content-Type": "application/json", ...(admin ? { "x-admin": "1" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, body: r.status === 204 ? null : await r.json() as any };
  };
  const created: string[] = [];
  const base = { summary: "", benefits: ["One"], details: "", imageUrl: "", published: true };
  try {
    assert.equal((await call("/admin/coach-categories")).status, 401);
    assert.equal((await call("/admin/coach-categories", "POST", { ...base, title: "x" })).status, 401);
    assert.equal((await call(`/admin/trainers/live/t1-${tag}/categories?gymId=${GYM_A}`, "PUT", { categoryIds: [] })).status, 401);
    assert.equal((await call("/admin/coach-categories", "POST", { ...base, title: "x", imageUrl: "http://bad" }, true)).status, 400);

    const online = await call("/admin/coach-categories", "POST", { ...base, title: `Online ${tag}` }, true);
    const hidden = await call("/admin/coach-categories", "POST", { ...base, title: `Hidden ${tag}`, published: false }, true);
    assert.equal(online.status, 201); created.push(online.body.id, hidden.body.id);

    assert.equal((await call(`/admin/trainers/live/t1-${tag}/categories?gymId=${GYM_A}`, "PUT", { categoryIds: [online.body.id, hidden.body.id] }, true)).status, 200);
    // Trainer not at branch → rejected; unknown category → rejected.
    assert.equal((await call(`/admin/trainers/live/t2-${tag}/categories?gymId=${GYM_B}`, "PUT", { categoryIds: [online.body.id] }, true)).status, 404);
    assert.equal((await call(`/admin/trainers/live/t2-${tag}/categories?gymId=${GYM_A}`, "PUT", { categoryIds: ["nope"] }, true)).status, 400);

    // Persistence across reads.
    assert.deepEqual((await call(`/admin/trainers/live/t1-${tag}/categories?gymId=${GYM_A}`, "GET", undefined, true)).body.categoryIds.sort(), [online.body.id, hidden.body.id].sort());

    const rosterA = await call(`/coach-categories/${online.body.id}/trainers?gymId=${GYM_A}`);
    assert.deepEqual(rosterA.body.map((t: any) => t.id), [`t1-${tag}`]); // same-name t2 not leaked
    const rosterB = await call(`/coach-categories/${online.body.id}/trainers?gymId=${GYM_B}`);
    assert.deepEqual(rosterB.body, []); // no all-branch leak
    const listA = await call(`/coach-categories?gymId=${GYM_A}`);
    const mine = listA.body.filter((c: any) => created.includes(c.id));
    assert.deepEqual(mine.map((c: any) => [c.title, c.coachCount]), [[`Online ${tag}`, 1]]);
    assert.equal((await call(`/coach-categories/${hidden.body.id}/trainers?gymId=${GYM_A}`)).status, 404);
    assert.equal((await call(`/coach-categories?`)).status, 400);

    // Unpublish takes effect immediately.
    await call(`/admin/coach-categories/${online.body.id}`, "PUT", { ...base, title: `Online ${tag}`, published: false }, true);
    assert.equal((await call(`/coach-categories/${online.body.id}/trainers?gymId=${GYM_A}`)).status, 404);

    // Delete cleans assignments.
    assert.equal((await call(`/admin/coach-categories/${hidden.body.id}`, "DELETE", undefined, true)).status, 204);
    created.splice(created.indexOf(hidden.body.id), 1);
    const [row] = await db.select().from(appSettingsTable).where(like(appSettingsTable.key, assignmentKey(GYM_A, `t1-${tag}`)));
    assert.deepEqual(JSON.parse(row.value!).categoryIds, [online.body.id]);
  } finally {
    for (const id of created) await call(`/admin/coach-categories/${id}`, "DELETE", undefined, true);
    await db.delete(appSettingsTable).where(like(appSettingsTable.key, `coach_category_assign:%:%${tag}`));
    server.close();
  }
});

test("coach categories: concurrent mutators are serialized without lost edits or resurrection", async () => {
  const { createCategory, updateCategory, deleteCategory, reorderCategories, setAssignment, getCategory, listCategories } = await import("./coachCategories");
  const tag = randomUUID().slice(0, 8);
  const base = { summary: "", benefits: [], details: "", imageUrl: "", published: true };
  const a = await createCategory({ ...base, title: `RaceA ${tag}` });
  const b = await createCategory({ ...base, title: `RaceB ${tag}` });
  const GYM = 900000003;
  try {
    // Reorder racing an edit: the edit must survive (reorder reads inside the lock).
    const ids = (await listCategories()).map(c => c.id);
    const swapped = [...ids]; const ia = swapped.indexOf(a.id), ib = swapped.indexOf(b.id);
    [swapped[ia], swapped[ib]] = [swapped[ib], swapped[ia]];
    await Promise.all([updateCategory(a.id, { ...base, title: `RaceA edited ${tag}` }), reorderCategories(swapped)]);
    assert.equal((await getCategory(a.id))?.title, `RaceA edited ${tag}`);

    // Delete racing assignment writes: no stale reference survives and no unrelated assignment is lost.
    const results = await Promise.allSettled([
      deleteCategory(b.id),
      setAssignment(GYM, `x-${tag}`, [a.id]),
      setAssignment(GYM, `y-${tag}`, [a.id, b.id]),
    ]);
    assert.equal(results[0].status, "fulfilled");
    const [x] = await db.select().from(appSettingsTable).where(like(appSettingsTable.key, assignmentKey(GYM, `x-${tag}`)));
    assert.deepEqual(JSON.parse(x.value!).categoryIds, [a.id]);
    const [y] = await db.select().from(appSettingsTable).where(like(appSettingsTable.key, assignmentKey(GYM, `y-${tag}`)));
    if (y) assert.ok(!JSON.parse(y.value!).categoryIds.includes(b.id));

    // Update racing delete must not resurrect the category.
    const c = await createCategory({ ...base, title: `RaceC ${tag}` });
    await Promise.allSettled([deleteCategory(c.id), updateCategory(c.id, { ...base, title: "revived" })]);
    assert.equal(await getCategory(c.id), null);
  } finally {
    for (const id of [a.id, b.id]) await deleteCategory(id).catch(() => undefined);
    await db.delete(appSettingsTable).where(like(appSettingsTable.key, `coach_category_assign:%:%${tag}`));
  }
});
