import { pgTable, text, timestamp, integer, uuid, index } from "drizzle-orm/pg-core";

// No plaintext OTPs, credentials or tickets are persisted.
export const whatsappOtpChallengesTable = pgTable("whatsapp_otp_challenges", {
  id: uuid("id").primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  state: text("state").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [index("whatsapp_otp_challenges_phone_created_idx").on(t.phone, t.createdAt)]);
export const whatsappOtpBudgetsTable = pgTable("whatsapp_otp_budgets", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull(),
});
export const whatsappPhoneLinksTable = pgTable("whatsapp_phone_links", {
  phone: text("phone").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
});
export const whatsappOtpContinuationsTable = pgTable("whatsapp_otp_continuations", {
  tokenHash: text("token_hash").primaryKey(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
}, (t) => [index("whatsapp_otp_continuations_phone_idx").on(t.phone)]);