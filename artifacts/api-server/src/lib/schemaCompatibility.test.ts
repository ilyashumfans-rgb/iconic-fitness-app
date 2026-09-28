import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSchemaCompatibility, findSchemaDrift, requiredColumns } from "./schemaCompatibility";
import type { Pool } from "pg";

test("requirements include complaints follow-ups and all schema barrel tables", () => {
  const required = requiredColumns();
  assert.ok(required.length > 500);
  assert.ok(required.some(c => c.table === "complaints" && c.column === "follow_ups" && c.type === "jsonb"));
  assert.equal(new Set(required.map(c => `${c.table}.${c.column}`)).size, required.length);
  assert.deepEqual(findSchemaDrift(required, required.map(c => ({
    table_name: c.table, column_name: c.column, sql_type: c.type,
  }))), []);
});

test("flags missing tables once, missing columns, and incompatible types", () => {
  assert.deepEqual(findSchemaDrift([
    { table: "complaints", column: "id", type: "integer" },
    { table: "complaints", column: "follow_ups", type: "jsonb" },
    { table: "absent", column: "id", type: "integer" },
    { table: "absent", column: "name", type: "text" },
  ], [{ table_name: "complaints", column_name: "id", sql_type: "text" }]), [
    "Incompatible type: public.complaints.id (expected integer, found text)",
    "Missing column: public.complaints.follow_ups (expected jsonb)",
    "Missing table: public.absent",
  ]);
});

test("extra database objects are never drift requiring deletion", () => {
  assert.deepEqual(findSchemaDrift([{ table: "users", column: "id", type: "serial" }], [
    { table_name: "users", column_name: "id", sql_type: "integer" },
    { table_name: "users", column_name: "legacy", sql_type: "text" },
    { table_name: "user_sessions", column_name: "sid", sql_type: "text" },
  ]), []);
});

test("catalog check uses read-only transaction and releases even on query failure", async () => {
  for (const fail of [false, true]) {
    const queries: string[] = [];
    let released = false;
    const connection = {
      connect: async () => ({
        query: async (sql: string) => {
          queries.push(sql);
          if (fail && sql.includes("SELECT")) throw new Error("catalog unavailable");
          return { rows: requiredColumns().map(c => ({
            table_name: c.table, column_name: c.column, sql_type: c.type,
          })) };
        },
        release: () => { released = true; },
      }),
    } as unknown as Pick<Pool, "connect">;
    if (fail) await assert.rejects(checkSchemaCompatibility(connection), /catalog unavailable/);
    else assert.deepEqual(await checkSchemaCompatibility(connection), []);
    assert.equal(queries[0], "BEGIN READ ONLY");
    assert.equal(queries.at(-1), "ROLLBACK");
    assert.ok(queries.every(sql => !/\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(sql)));
    assert.ok(released);
  }
});