-- Development-only additive migration. Never run against production.
-- Production receives schema changes through the normal Publish schema diff.
ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS exercise_name text,
  ADD COLUMN IF NOT EXISTS sets integer,
  ADD COLUMN IF NOT EXISTS reps integer;