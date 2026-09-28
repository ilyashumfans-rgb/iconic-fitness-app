import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Pool } from "pg";
import { ensureSchemaAdditions } from "./schemaAdditions";

const skipUpgradeTest =
  process.env.RUN_SCHEMA_UPGRADE_TESTS !== "1" ||
  process.env.NODE_ENV === "production" ||
  !process.env.DATABASE_URL;

async function withIsolatedSchema(
  run: (connection: Pool, schema: string) => Promise<void>,
): Promise<void> {
  const schema = `schema_additions_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const isolated = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema}`,
  });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await run(isolated, schema);
  } finally {
    await isolated.end();
    try {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await admin.end();
    }
  }
}

test("PostgreSQL startup DDL upgrades old populated tables, preserves values, and is idempotent", {
  skip: skipUpgradeTest,
}, async () => {
  await withIsolatedSchema(async (connection, schema) => {
    await connection.query(`
      CREATE TABLE product_orders (
        id serial PRIMARY KEY,
        total_inr integer NOT NULL,
        token text NOT NULL,
        user_id integer NOT NULL DEFAULT 0
      );
      CREATE TABLE branch_reviews (
        id serial PRIMARY KEY,
        review_text text NOT NULL,
        is_sample boolean NOT NULL DEFAULT false,
        moderation_status text
      );
      INSERT INTO product_orders (total_inr, token, user_id)
        VALUES (850, 'existing-order', 42);
      INSERT INTO branch_reviews (review_text, is_sample, moderation_status)
        VALUES ('Existing review', true, 'approved');
    `);

    await ensureSchemaAdditions(connection);

    const order = (await connection.query(`
      SELECT total_inr, token, user_id, points_redeemed_inr,
        razorpay_order_id, razorpay_payment_id
      FROM product_orders
    `)).rows[0];
    assert.deepEqual(order, {
      total_inr: 850,
      token: "existing-order",
      user_id: 42,
      points_redeemed_inr: 0,
      razorpay_order_id: "",
      razorpay_payment_id: "",
    });
    const review = (await connection.query(`
      SELECT review_text, is_sample, trainer_id, gym_id, author_user_id, moderation_status
      FROM branch_reviews
    `)).rows[0];
    assert.deepEqual(review, {
      review_text: "Existing review",
      is_sample: true,
      trainer_id: null,
      gym_id: null,
      author_user_id: null,
      moderation_status: "approved",
    });

    const addedOrder = (await connection.query(`
      INSERT INTO product_orders (total_inr, token) VALUES (120, 'new-order')
      RETURNING user_id, points_redeemed_inr, razorpay_order_id, razorpay_payment_id
    `)).rows[0];
    assert.deepEqual(addedOrder, {
      user_id: 0,
      points_redeemed_inr: 0,
      razorpay_order_id: "",
      razorpay_payment_id: "",
    });

    const beforeRerun = await connection.query(`
      SELECT id, total_inr, token, user_id, points_redeemed_inr,
        razorpay_order_id, razorpay_payment_id
      FROM product_orders ORDER BY id
    `);
    await ensureSchemaAdditions(connection);
    const afterRerun = await connection.query(`
      SELECT id, total_inr, token, user_id, points_redeemed_inr,
        razorpay_order_id, razorpay_payment_id
      FROM product_orders ORDER BY id
    `);
    assert.deepEqual(afterRerun.rows, beforeRerun.rows);

    const uniqueIndex = await connection.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename = 'branch_reviews'
        AND indexname = 'branch_reviews_member_trainer_unique'
    `, [schema]);
    assert.equal(uniqueIndex.rowCount, 1);
  });
});

test("PostgreSQL startup DDL fails when existing review rows violate the unique index", {
  skip: skipUpgradeTest,
}, async () => {
  await withIsolatedSchema(async (connection) => {
    await connection.query(`
      CREATE TABLE product_orders (
        id serial PRIMARY KEY,
        total_inr integer NOT NULL,
        token text NOT NULL
      );
      CREATE TABLE branch_reviews (
        id serial PRIMARY KEY,
        review_text text NOT NULL,
        is_sample boolean NOT NULL DEFAULT false,
        trainer_id text,
        gym_id integer,
        author_user_id integer,
        moderation_status text
      );
      INSERT INTO branch_reviews (review_text, trainer_id, gym_id, author_user_id)
        VALUES
          ('Duplicate review one', 'trainer-1', 7, 42),
          ('Duplicate review two', 'trainer-1', 7, 42);
    `);

    await assert.rejects(
      ensureSchemaAdditions(connection),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, "23505");
        return true;
      },
    );
  });
});