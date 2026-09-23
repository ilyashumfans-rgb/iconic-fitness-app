import { pool } from "@workspace/db";

/** Additive, idempotent startup migration; never use db push on this database. */
export async function ensureWhatsappOtpTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_otp_challenges (
      id uuid PRIMARY KEY, phone text NOT NULL, code_hash text NOT NULL,
      state text NOT NULL, attempts integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS whatsapp_otp_phone_created_idx
      ON whatsapp_otp_challenges(phone, created_at);
    CREATE TABLE IF NOT EXISTS whatsapp_otp_budgets (
      key text PRIMARY KEY, window_start timestamptz NOT NULL,
      count integer NOT NULL, last_sent_at timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS whatsapp_phone_links (
      phone text PRIMARY KEY, user_id integer NOT NULL UNIQUE,
      clerk_user_id text NOT NULL UNIQUE, verified_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS whatsapp_otp_continuations (
      token_hash text PRIMARY KEY, phone text NOT NULL, created_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL, consumed_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS whatsapp_otp_continuations_phone_idx
      ON whatsapp_otp_continuations(phone);
  `);
}