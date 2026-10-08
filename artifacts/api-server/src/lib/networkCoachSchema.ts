/**
 * Additive startup DDL for Iconic Network Coach. Mirrors lib/db/src/schema/networkCoach.ts.
 * CREATE ... IF NOT EXISTS only — never alters or drops existing data.
 */
export async function ensureNetworkCoachSchema(connection: { query(sql: string): Promise<unknown> }): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS network_coach_slots (
      id serial PRIMARY KEY,
      gym_id integer NOT NULL,
      trainer_id text NOT NULL,
      staff_id integer NOT NULL,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_slots_trainer_start_unique ON network_coach_slots (trainer_id, starts_at);
    CREATE INDEX IF NOT EXISTS network_coach_slots_gym_start_idx ON network_coach_slots (gym_id, starts_at);
    CREATE TABLE IF NOT EXISTS network_coach_bookings (
      id serial PRIMARY KEY,
      slot_id integer NOT NULL,
      user_id integer NOT NULL,
      gym_id integer NOT NULL,
      trainer_id text NOT NULL,
      staff_id integer NOT NULL,
      category_id text NOT NULL,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      amount_inr integer NOT NULL,
      status text NOT NULL,
      hold_expires_at timestamptz NOT NULL,
      pay_token text NOT NULL,
      airpay_order_ref text NOT NULL DEFAULT '',
      airpay_txn_id text NOT NULL DEFAULT '',
      room_name text NOT NULL,
      plan_entitlement_id integer,
      refund_status text NOT NULL DEFAULT '',
      admin_note text NOT NULL DEFAULT '',
      paid_at timestamptz,
      completed_at timestamptz,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_bookings_active_slot_unique ON network_coach_bookings (slot_id) WHERE status IN ('held','paid','completed');
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_bookings_pay_token_unique ON network_coach_bookings (pay_token);
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_bookings_room_unique ON network_coach_bookings (room_name);
    CREATE INDEX IF NOT EXISTS network_coach_bookings_user_idx ON network_coach_bookings (user_id);
    CREATE TABLE IF NOT EXISTS network_coach_reviews (
      id serial PRIMARY KEY,
      booking_id integer NOT NULL,
      user_id integer NOT NULL,
      gym_id integer NOT NULL,
      trainer_id text NOT NULL,
      rating integer NOT NULL,
      comment text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_reviews_booking_unique ON network_coach_reviews (booking_id);
    ALTER TABLE network_coach_bookings ADD COLUMN IF NOT EXISTS plan_entitlement_id integer;
    CREATE TABLE IF NOT EXISTS network_coach_plans (
      id serial PRIMARY KEY,
      name text NOT NULL,
      duration integer NOT NULL CHECK (duration > 0),
      duration_unit text NOT NULL CHECK (duration_unit IN ('day','week','month','year')),
      price_inr integer NOT NULL CHECK (price_inr > 0),
      published boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS network_coach_plan_purchases (
      id serial PRIMARY KEY,
      plan_id integer NOT NULL,
      plan_name text NOT NULL,
      duration integer NOT NULL,
      duration_unit text NOT NULL,
      amount_inr integer NOT NULL,
      user_id integer NOT NULL,
      gym_id integer NOT NULL,
      trainer_id text NOT NULL,
      staff_id integer NOT NULL,
      category_id text NOT NULL,
      status text NOT NULL DEFAULT 'held',
      hold_expires_at timestamptz NOT NULL,
      pay_token text NOT NULL,
      airpay_order_ref text NOT NULL DEFAULT '',
      airpay_txn_id text NOT NULL DEFAULT '',
      starts_at timestamptz,
      ends_at timestamptz,
      paid_at timestamptz,
      refund_status text NOT NULL DEFAULT '',
      admin_note text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_plan_token_unique ON network_coach_plan_purchases(pay_token);
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_plan_order_unique ON network_coach_plan_purchases(airpay_order_ref) WHERE airpay_order_ref <> '';
    CREATE INDEX IF NOT EXISTS network_coach_plan_user_trainer_idx ON network_coach_plan_purchases(user_id, trainer_id, ends_at);
    ALTER TABLE network_coach_plan_purchases ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '';
    ALTER TABLE network_coach_plans ADD COLUMN IF NOT EXISTS category_id text;
    CREATE UNIQUE INDEX IF NOT EXISTS network_coach_trainer_category_hold_unique ON network_coach_plan_purchases(user_id,trainer_id,category_id) WHERE status='held';
    DROP INDEX IF EXISTS network_coach_one_plan_hold_unique;
    ALTER TABLE network_coach_bookings ADD COLUMN IF NOT EXISTS tax jsonb NOT NULL DEFAULT '{}';
    ALTER TABLE network_coach_plan_purchases ADD COLUMN IF NOT EXISTS tax jsonb NOT NULL DEFAULT '{}';
  `);
}
