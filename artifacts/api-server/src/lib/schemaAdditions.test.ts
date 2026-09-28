import assert from "node:assert/strict";
import { test } from "node:test";
import { ensureSchemaAdditions, type SchemaAdditionConnection } from "./schemaAdditions";

type Row = Record<string, unknown>;

// Model the pre-addition column sets and PostgreSQL's IF NOT EXISTS/default
// behavior without connecting to (or changing) any real database.
function oldSchema(): {
  connection: SchemaAdditionConnection;
  columns: Record<string, Set<string>>;
  rows: Record<string, Row[]>;
  indexes: Set<string>;
} {
  const columns = {
    product_orders: new Set(["id", "total_inr", "token"]),
    branch_reviews: new Set(["id", "review_text", "is_sample"]),
  };
  const rows: Record<string, Row[]> = {
    product_orders: [{ id: 9, total_inr: 850, token: "existing-order" }],
    branch_reviews: [{ id: 7, review_text: "Existing review", is_sample: true }],
  };
  const indexes = new Set<string>();
  const connection: SchemaAdditionConnection = {
    async query(sql) {
      const table = sql.match(/ALTER TABLE\s+(\w+)/i)?.[1];
      if (table) {
        if (!(table in columns)) throw new Error(`missing base table ${table}`);
        const additions = [...sql.matchAll(/ADD COLUMN IF NOT EXISTS\s+(\w+)\s+(integer|text)(?:\s+NOT NULL DEFAULT\s+(0|''))?/gi)];
        assert.ok(additions.length, `unrecognized DDL: ${sql}`);
        for (const [, name, , defaultValue] of additions) {
          if (columns[table as keyof typeof columns].has(name)) continue;
          columns[table as keyof typeof columns].add(name);
          for (const row of rows[table]) {
            row[name] = defaultValue === "0" ? 0 : defaultValue === "''" ? "" : null;
          }
        }
        return;
      }
      const index = sql.match(/CREATE UNIQUE INDEX IF NOT EXISTS\s+(\w+)\s+ON\s+(\w+)/i);
      if (index) {
        if (!(index[2] in columns)) throw new Error(`missing base table ${index[2]}`);
        indexes.add(index[1]);
        return;
      }
      throw new Error(`unexpected DDL: ${sql}`);
    },
  };
  return { connection, columns, rows, indexes };
}

test("upgrades populated older orders and reviews without losing rows; rerun is idempotent", async () => {
  const schema = oldSchema();
  await ensureSchemaAdditions(schema.connection);
  assert.deepEqual(schema.rows.product_orders[0], {
    id: 9, total_inr: 850, token: "existing-order",
    user_id: 0, points_redeemed_inr: 0, razorpay_order_id: "", razorpay_payment_id: "",
  });
  assert.deepEqual(schema.rows.branch_reviews[0], {
    id: 7, review_text: "Existing review", is_sample: true,
    trainer_id: null, gym_id: null, author_user_id: null, moderation_status: null,
  });
  assert.ok(schema.indexes.has("branch_reviews_member_trainer_unique"));
  const firstPass = JSON.stringify(schema.rows);
  await ensureSchemaAdditions(schema.connection);
  assert.equal(JSON.stringify(schema.rows), firstPass);
  assert.equal(schema.indexes.size, 1);
});

test("does not overwrite values already present on upgraded installations", async () => {
  const schema = oldSchema();
  schema.columns.product_orders.add("user_id");
  schema.rows.product_orders[0].user_id = 32;
  schema.columns.branch_reviews.add("moderation_status");
  schema.rows.branch_reviews[0].moderation_status = "approved";
  await ensureSchemaAdditions(schema.connection);
  assert.equal(schema.rows.product_orders[0].user_id, 32);
  assert.equal(schema.rows.branch_reviews[0].moderation_status, "approved");
});

test("fails visibly if a base table is absent rather than hiding incomplete migration", async () => {
  const queries: string[] = [];
  await assert.rejects(
    ensureSchemaAdditions({
      async query(sql) {
        queries.push(sql);
        throw new Error("relation product_orders does not exist");
      },
    }),
    /relation product_orders does not exist/,
  );
  assert.equal(queries.length, 1);
});