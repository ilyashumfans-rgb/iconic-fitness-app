import { pool } from "@workspace/db";
import type { Pool } from "pg";

/** Additive, idempotent startup DDL; never use db push on this database. */
export async function ensureComplaintsSchema(connection: Pick<Pool, "query"> = pool): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS complaints (
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
      follow_ups jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE complaints
      ADD COLUMN IF NOT EXISTS follow_ups jsonb NOT NULL DEFAULT '[]'::jsonb;
  `);
}