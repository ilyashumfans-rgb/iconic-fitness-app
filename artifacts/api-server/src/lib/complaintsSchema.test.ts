import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { ensureComplaintsSchema } from "./complaintsSchema";

test("complaints startup DDL upgrades populated old tables and creates clean tables", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  // All test writes are confined to a unique schema, never public/customer rows.
  const schema = `complaints_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const isolated = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema}`,
  });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await isolated.query(`
      CREATE TABLE complaints (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        member_name text NOT NULL DEFAULT '',
        mobile text NOT NULL DEFAULT '',
        gym_id integer,
        gym_name text NOT NULL DEFAULT '',
        subject text NOT NULL,
        message text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        response text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO complaints (user_id, subject, message)
        VALUES (42, 'Existing issue', 'Please keep this ticket');
    `);
    await ensureComplaintsSchema(isolated);
    let rows = (await isolated.query(
      "SELECT id, user_id, subject, message, follow_ups FROM complaints",
    )).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, 42);
    assert.equal(rows[0].subject, "Existing issue");
    assert.equal(rows[0].message, "Please keep this ticket");
    assert.deepEqual(rows[0].follow_ups, []);

    const followUps = [{ message: "Still waiting", reopened: true, at: "2026-01-01T00:00:00.000Z" }];
    await isolated.query("UPDATE complaints SET follow_ups = $1::jsonb WHERE id = $2", [
      JSON.stringify(followUps), rows[0].id,
    ]);
    await ensureComplaintsSchema(isolated);
    rows = (await isolated.query("SELECT follow_ups FROM complaints")).rows;
    assert.deepEqual(rows[0].follow_ups, followUps);

    // Dropping only the isolated test table exercises the fresh-install path.
    await isolated.query("DROP TABLE complaints");
    await ensureComplaintsSchema(isolated);
    const result = await isolated.query(
      "INSERT INTO complaints (user_id, subject, message) VALUES (7, 'New issue', 'New ticket') RETURNING *",
    );
    assert.equal(result.rows[0].user_id, 7);
    assert.equal(result.rows[0].status, "open");
    assert.deepEqual(result.rows[0].follow_ups, []);
    const columns = (await isolated.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'complaints'
    `, [schema])).rows;
    assert.deepEqual(columns.map((column) => column.column_name).sort(), [
      "created_at", "follow_ups", "gym_id", "gym_name", "id", "member_name",
      "message", "mobile", "response", "status", "subject", "updated_at", "user_id",
    ]);
    const followUpsColumn = columns.find((column) => column.column_name === "follow_ups");
    assert.equal(followUpsColumn.is_nullable, "NO");
    assert.match(followUpsColumn.column_default, /\[\]/);
  } finally {
    await isolated.end();
    try {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await admin.end();
    }
  }
});