import assert from "node:assert/strict";
import { test } from "node:test";
import { build, type Plugin } from "esbuild";

type Row = { id: number; userId: number };
type Condition = (row: Row) => boolean;
type Handler = (req: any, res: any) => Promise<void>;
const routes = new Map<string, Handler>();
let rows: Row[] = [];
let deleteCalls = 0;
const key = Symbol.for("trackingDeletionTest");
(globalThis as any)[key] = {
  routes,
  db: {
    delete(table: unknown) {
      assert.deepEqual(table, { id: "id", userId: "userId" });
      deleteCalls++;
      return {
        where(condition: Condition) {
          return {
            async returning() {
              const removed = rows.filter(condition);
              rows = rows.filter(row => !condition(row));
              return removed.map(({ id }) => ({ id }));
            },
          };
        },
      };
    },
  },
};

// Bundle the real route with controlled boundaries, without network or database writes.
const mocks: Record<string, string> = {
  express: `
    const h = globalThis[Symbol.for("trackingDeletionTest")];
    export function Router() {
      return Object.fromEntries(["get", "post", "put", "delete", "patch"].map(method =>
        [method, (path, ...handlers) => h.routes.set(method + " " + path, handlers.at(-1))]));
    }`,
  "@workspace/db": `
    export const db = globalThis[Symbol.for("trackingDeletionTest")].db;
    export const workoutLogsTable = { id: "id", userId: "userId" };
    export const usersTable = {}, waterLogsTable = {}, mealLogsTable = {}, checkinsTable = {}, gymsTable = {};
  `,
  "drizzle-orm": `
    export const eq = (field, value) => row => row[field] === value;
    export const and = (...conditions) => row => conditions.every(condition => condition(row));
    export const gte = () => {}, desc = () => {}, sql = () => {};
  `,
  "../lib/currentUser": `export const requireUser = () => {};`,
};
// Keep response schemas and workout validation real.
const plugin: Plugin = {
  name: "tracking-test-boundaries",
  setup(builder) {
    builder.onResolve({ filter: /.*/ }, args =>
      Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "mock" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "mock" }, args => ({
      contents: mocks[args.path], loader: "js",
    }));
  },
};
const bundled = await build({
  entryPoints: [new URL("./tracking.ts", import.meta.url).pathname],
  bundle: true, format: "esm", platform: "node", write: false, plugins: [plugin],
});
await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

async function remove(id: string, userId = 1) {
  const result = { status: 200, body: undefined as unknown };
  await routes.get("delete /tracking/workouts/:id")!(
    { params: { id }, userId },
    {
      status(code: number) { result.status = code; return this; },
      json(body: unknown) { result.body = body; return this; },
    },
  );
  return result;
}

test("owned deletion succeeds once, preserves other rows, and repeated deletion is not found", async () => {
  rows = [{ id: 10, userId: 1 }, { id: 20, userId: 2 }, { id: 30, userId: 1 }];
  assert.deepEqual(await remove("10"), { status: 200, body: { ok: true } });
  assert.deepEqual(rows, [{ id: 20, userId: 2 }, { id: 30, userId: 1 }]);
  assert.deepEqual(await remove("10"), { status: 404, body: { error: "Workout not found" } });
});

test("foreign and nonexistent workouts return identical non-disclosing 404s without removing rows", async () => {
  rows = [{ id: 20, userId: 2 }];
  const foreign = await remove("20");
  assert.deepEqual(foreign, { status: 404, body: { error: "Workout not found" } });
  assert.deepEqual(await remove("999"), foreign);
  assert.deepEqual(rows, [{ id: 20, userId: 2 }]);
});

test("malformed workout IDs return 400 without attempting deletion", async () => {
  deleteCalls = 0;
  for (const id of ["abc", "1.5", "Infinity"]) {
    assert.deepEqual(await remove(id), { status: 400, body: { error: "Invalid id" } });
  }
  assert.equal(deleteCalls, 0);
});