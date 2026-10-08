import { pgTable, serial, text, integer, timestamp, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Iconic Network Coach (online coaching) — category-only feature.
 * Mirrors the additive startup DDL in api-server lib/networkCoachSchema.ts exactly.
 */
export const networkCoachSlotsTable = pgTable("network_coach_slots", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  trainerId: text("trainer_id").notNull(),
  staffId: integer("staff_id").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("network_coach_slots_trainer_start_unique").on(t.trainerId, t.startsAt),
  index("network_coach_slots_gym_start_idx").on(t.gymId, t.startsAt),
]);

export const networkCoachBookingsTable = pgTable("network_coach_bookings", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id").notNull(),
  userId: integer("user_id").notNull(),
  gymId: integer("gym_id").notNull(),
  trainerId: text("trainer_id").notNull(),
  staffId: integer("staff_id").notNull(),
  categoryId: text("category_id").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  amountInr: integer("amount_inr").notNull(),
  status: text("status").notNull(),
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
  payToken: text("pay_token").notNull(),
  airpayOrderRef: text("airpay_order_ref").notNull().default(""),
  airpayTxnId: text("airpay_txn_id").notNull().default(""),
  roomName: text("room_name").notNull(),
  planEntitlementId: integer("plan_entitlement_id"),
  refundStatus: text("refund_status").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("network_coach_bookings_active_slot_unique").on(t.slotId)
    .where(sql`status IN ('held','paid','completed')`),
  uniqueIndex("network_coach_bookings_pay_token_unique").on(t.payToken),
  uniqueIndex("network_coach_bookings_room_unique").on(t.roomName),
  index("network_coach_bookings_user_idx").on(t.userId),
]);

export const networkCoachReviewsTable = pgTable("network_coach_reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  userId: integer("user_id").notNull(),
  gymId: integer("gym_id").notNull(),
  trainerId: text("trainer_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("network_coach_reviews_booking_unique").on(t.bookingId)]);

export const networkCoachPlansTable = pgTable("network_coach_plans", {
  categoryId: text("category_id"),
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  duration: integer("duration").notNull(),
  durationUnit: text("duration_unit").notNull(),
  priceInr: integer("price_inr").notNull(),
  published: boolean("published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const networkCoachPlanPurchasesTable = pgTable("network_coach_plan_purchases", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  planName: text("plan_name").notNull(),
  duration: integer("duration").notNull(),
  durationUnit: text("duration_unit").notNull(),
  amountInr: integer("amount_inr").notNull(),
  userId: integer("user_id").notNull(),
  gymId: integer("gym_id").notNull(),
  trainerId: text("trainer_id").notNull(),
  staffId: integer("staff_id").notNull(),
  categoryId: text("category_id").notNull(),
  status: text("status").notNull().default("held"),
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
  payToken: text("pay_token").notNull(),
  airpayOrderRef: text("airpay_order_ref").notNull().default(""),
  airpayTxnId: text("airpay_txn_id").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  refundStatus: text("refund_status").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("network_coach_plan_token_unique").on(t.payToken),
  uniqueIndex("network_coach_trainer_category_hold_unique").on(t.userId,t.trainerId,t.categoryId).where(sql`status = 'held'`),
  uniqueIndex("network_coach_plan_order_unique").on(t.airpayOrderRef).where(sql`airpay_order_ref <> ''`),
  index("network_coach_plan_user_trainer_idx").on(t.userId,t.trainerId,t.endsAt),
]);
