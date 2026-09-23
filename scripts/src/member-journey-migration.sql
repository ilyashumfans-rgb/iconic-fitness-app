-- Additive publish migration. Apply explicitly before deploying; never startup DDL.
BEGIN;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS journey_gym_ids integer[] NOT NULL DEFAULT '{}';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS journey_role text;
CREATE TABLE IF NOT EXISTS member_journey_branch_links (
 user_id integer PRIMARY KEY REFERENCES users(id), gym_id integer NOT NULL REFERENCES gyms(id)
);
CREATE TABLE IF NOT EXISTS member_journeys (
 user_id integer PRIMARY KEY REFERENCES users(id), gym_id integer NOT NULL REFERENCES gyms(id),
 version integer NOT NULL DEFAULT 0, health_history jsonb, reviewed_at timestamptz, review_note text,
 trainer_id integer, general_trainer_id integer, dietician_id integer, dietician_note text,
 pt_decision text CHECK(pt_decision IN ('yes','no')), general_started_at timestamptz,
 due_at timestamptz, attendance_decision text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS member_journey_events (
 id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES member_journeys(user_id),
 version integer NOT NULL, action text NOT NULL, actor text NOT NULL, payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, version)
);
CREATE TABLE IF NOT EXISTS member_journey_charts (
 id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES member_journeys(user_id),
 chart_no integer NOT NULL CHECK(chart_no BETWEEN 1 AND 3), label text NOT NULL, content text NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS member_journey_followups (
 id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES member_journeys(user_id),
 kind text NOT NULL, response text NOT NULL, next_date timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_journeys_gym ON member_journeys(gym_id);
CREATE UNIQUE INDEX IF NOT EXISTS member_journey_chart_unique ON member_journey_charts(user_id,chart_no);
COMMIT;