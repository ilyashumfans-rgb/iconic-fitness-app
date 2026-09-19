import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

let fitnessSetupTableEnsured = false;

/**
 * Additive deployment DDL for the first-login setup. Keep this explicit rather
 * than using db push: production has tables that are intentionally not part of
 * the Drizzle schema.
 */
export async function ensureFitnessSetupTable(): Promise<void> {
  if (fitnessSetupTableEnsured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fitness_setup (
      id serial PRIMARY KEY,
      user_id integer NOT NULL UNIQUE,
      required_for_onboarding boolean NOT NULL DEFAULT false,
      current_step integer NOT NULL DEFAULT 1,
      completed_at timestamptz,
      unit_system text,
      height_cm real,
      weight_kg real,
      age integer,
      goals jsonb,
      interests jsonb,
      experience_level text,
      activity_level text,
      self_reported_ability text,
      movement_limitations text,
      routine_days jsonb,
      preferred_time text,
      workout_location text,
      equipment jsonb,
      diet_preference text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS fitness_setup_required_progress_idx
      ON fitness_setup (required_for_onboarding, completed_at);
    ALTER TABLE users ALTER COLUMN age DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN height_cm DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN weight_kg DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN fitness_goal DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN age DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN height_cm DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN weight_kg DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN fitness_goal DROP DEFAULT;
  `);
  fitnessSetupTableEnsured = true;
}