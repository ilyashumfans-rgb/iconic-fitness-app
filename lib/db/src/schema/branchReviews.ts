import { pgTable, serial, text, integer, boolean, timestamp, check, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./index";

export const branchReviewsTable = pgTable("branch_reviews", {
  id: serial("id").primaryKey(),
  reviewerName: text("reviewer_name").notNull(),
  branchName: text("branch_name").notNull(),
  trainerId: text("trainer_id"),
  gymId: integer("gym_id"),
  authorUserId: integer("author_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  moderationStatus: text("moderation_status"),
  reviewText: text("review_text").notNull(),
  rating: integer("rating").notNull(),
  isSample: boolean("is_sample").notNull(),
  isPublished: boolean("is_published").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  seedKey: text("seed_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("branch_reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
  check("branch_reviews_sample_check", sql`${table.seedKey} IS NULL OR ${table.isSample} = true`),
  check("branch_reviews_trainer_pair_check", sql`(${table.trainerId} IS NULL AND ${table.gymId} IS NULL) OR (${table.trainerId} IS NOT NULL AND ${table.gymId} IS NOT NULL AND ${table.gymId} > 0)`),
  uniqueIndex("branch_reviews_member_trainer_unique").on(table.authorUserId, table.trainerId, table.gymId),
  check("branch_reviews_member_moderation_check", sql`(${table.authorUserId} IS NULL AND ${table.moderationStatus} IS NULL) OR (${table.authorUserId} IS NOT NULL AND ${table.trainerId} IS NOT NULL AND ${table.moderationStatus} IS NOT NULL AND ${table.moderationStatus} IN ('pending','approved','rejected') AND ${table.isSample} = false AND (${table.isPublished} = false OR ${table.moderationStatus} = 'approved'))`),
]);