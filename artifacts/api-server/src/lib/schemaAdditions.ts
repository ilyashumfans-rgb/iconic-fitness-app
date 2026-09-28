/**
 * Repairs additive columns omitted by the older deployment DDL.
 * Run after base tables have been provisioned, before accepting requests.
 * This intentionally does not create missing base tables or alter existing data.
 */
export type SchemaAdditionConnection = {
  query(sql: string): Promise<unknown>;
};

export async function ensureSchemaAdditions(connection: SchemaAdditionConnection): Promise<void> {
  // ensureStoreColumns covers payment/GST fields, but not these later additions.
  await connection.query(`
    ALTER TABLE product_orders
      ADD COLUMN IF NOT EXISTS user_id integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS points_redeemed_inr integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS razorpay_order_id text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS razorpay_payment_id text NOT NULL DEFAULT '';
  `);

  // The checked-in branch-reviews migration predates member/trainer reviews.
  // Nullable columns preserve existing sample and legacy review rows.
  await connection.query(`
    ALTER TABLE branch_reviews
      ADD COLUMN IF NOT EXISTS trainer_id text,
      ADD COLUMN IF NOT EXISTS gym_id integer,
      ADD COLUMN IF NOT EXISTS author_user_id integer,
      ADD COLUMN IF NOT EXISTS moderation_status text;
  `);
  await connection.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS branch_reviews_member_trainer_unique
      ON branch_reviews (author_user_id, trainer_id, gym_id);
  `);
}