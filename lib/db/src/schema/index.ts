import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  gender: text("gender").notNull(),
  age: integer("age").notNull(),
  heightCm: real("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  fitnessGoal: text("fitness_goal").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  city: text("city").notNull(),
  dailyCalories: integer("daily_calories").notNull().default(0),
  dailyWaterMl: integer("daily_water_ml").notNull().default(0),
  dailySleepHours: real("daily_sleep_hours").notNull().default(0),
  restingHr: integer("resting_hr").notNull().default(60),
  streakDays: integer("streak_days").notNull().default(0),
  weeklyGoal: integer("weekly_goal").notNull().default(5),
  waterGoalMl: integer("water_goal_ml").notNull().default(3000),
  calorieGoal: integer("calorie_goal").notNull().default(2200),
  proteinGoalG: integer("protein_goal_g").notNull().default(120),
  stepGoal: integer("step_goal").notNull().default(8000),
  experienceLevel: text("experience_level"),
  targetWeightKg: real("target_weight_kg"),
  activityLevel: text("activity_level"),
  foodPreference: text("food_preference"),
  assessment: jsonb("assessment"),
  assessmentCompletedAt: timestamp("assessment_completed_at", {
    withTimezone: true,
  }),
  memberCode: text("member_code").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const gymsTable = pgTable("gyms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  city: text("city").notNull(),
  area: text("area").notNull(),
  address: text("address").notNull(),
  heroImage: text("hero_image").notNull(),
  videoUrl: text("video_url"),
  logoUrl: text("logo_url").notNull().default(""),
  rating: real("rating").notNull(),
  reviewsCount: integer("reviews_count").notNull(),
  priceFrom: integer("price_from").notNull(),
  categories: text("categories").array().notNull().default([]),
  amenities: text("amenities").array().notNull().default([]),
  distanceKm: real("distance_km").notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  openNow: boolean("open_now").notNull().default(true),
  about: text("about").notNull(),
  gallery: text("gallery").array().notNull().default([]),
  hours: text("hours").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  featured: boolean("featured").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  ownerPartnerId: integer("owner_partner_id"),
  payoutPerVisitInr: integer("payout_per_visit_inr").notNull().default(0),
  payoutTaxPct: integer("payout_tax_pct").notNull().default(18),
  // Maps this branch to its YoActiv Branch_Id so branch-scoped trainer
  // rosters and PT-package pricing can be pulled from the right branch.
  yoactivBranchId: integer("yoactiv_branch_id"),
});

// Paid personal-training session bookings made from the mobile app.
// Payment runs through YoActiv's hosted Razorpay page (Billing/APIPayment);
// status moves pending → paid/failed via the redirect landing routes.
export const trainerBookingsTable = pgTable("trainer_bookings", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id"),
  gymId: integer("gym_id").notNull(),
  gymName: text("gym_name").notNull().default(""),
  branchId: integer("branch_id").notNull().default(0),
  trainerId: text("trainer_id").notNull().default(""),
  trainerName: text("trainer_name").notNull().default(""),
  memberName: text("member_name").notNull().default(""),
  mobile: text("mobile").notNull().default(""),
  packageName: text("package_name").notNull().default(""),
  serviceName: text("service_name").notNull().default(""),
  amountInr: integer("amount_inr").notNull().default(0),
  preferredDate: text("preferred_date").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | paid | failed
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

// Agency portal accounts. Each agency user is a read-only login scoped to a set
// of branches (gymIds) that an admin assigns. They can only view GX class
// bookings for their assigned branches.
export const agencyUsersTable = pgTable("agency_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  gymIds: integer("gym_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Home banner slides shown at the top of the mobile Home screen. Admins manage
// these (images / GIFs uploaded to db-images, or YouTube links). Rendered in
// sortOrder; only active rows are served to members.
export const homeSlidesTable = pgTable("home_slides", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("image"), // image | gif | youtube
  mediaUrl: text("media_url").notNull().default(""), // db-image URL, gif URL, or YouTube URL
  title: text("title").notNull().default(""),
  subtitle: text("subtitle").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default(""),
  ctaUrl: text("cta_url").notNull().default(""),
  audience: text("audience").notNull().default("all"), // all | members | customers
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const trainersTable = pgTable("trainers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  bio: text("bio").notNull(),
  photoUrl: text("photo_url").notNull(),
  rating: real("rating").notNull(),
  sessionsCount: integer("sessions_count").notNull(),
  pricePerSession: integer("price_per_session").notNull(),
  certifications: text("certifications").array().notNull().default([]),
  city: text("city").notNull(),
  gymId: integer("gym_id"),
});

export const groupClassScheduleTable = pgTable("group_class_schedule", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1 = Mon … 7 = Sun
  startTime: text("start_time").notNull(), // "07:00"
  endTime: text("end_time").notNull(), // "08:00"
  className: text("class_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const classSessionsTable = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  gymId: integer("gym_id").notNull(),
  trainerId: integer("trainer_id").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull(),
  capacity: integer("capacity").notNull(),
  intensity: text("intensity").notNull(),
  coverImage: text("cover_image").notNull(),
  description: text("description").notNull(),
  equipmentNeeded: text("equipment_needed").array().notNull().default([]),
  calorieEstimate: integer("calorie_estimate").notNull(),
  trendingScore: integer("trending_score").notNull().default(0),
});

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  billingPeriod: text("billing_period").notNull(),
  priceInr: integer("price_inr").notNull(),
  originalPriceInr: integer("original_price_inr").notNull(),
  gymsIncluded: integer("gyms_included").notNull(),
  classesPerMonth: integer("classes_per_month").notNull(),
  perks: text("perks").array().notNull().default([]),
  badge: text("badge").notNull(),
  popular: boolean("popular").notNull().default(false),
  imageUrl: text("image_url").notNull().default(""),
});

export const userMembershipsTable = pgTable("user_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id").notNull(),
  renewsOn: timestamp("renews_on", { withTimezone: true }).notNull(),
  classesUsed: integer("classes_used").notNull().default(0),
  gymsAccessed: integer("gyms_accessed").notNull().default(0),
  status: text("status").notNull().default("active"),
});

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  classId: integer("class_id").notNull(),
  status: text("status").notNull().default("confirmed"),
  qrCode: text("qr_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const checkinsTable = pgTable("checkins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gymId: integer("gym_id").notNull(),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  method: text("method").notNull().default("qr"),
  baseInr: integer("base_inr").notNull().default(0),
  taxPct: integer("tax_pct").notNull().default(0),
  taxInr: integer("tax_inr").notNull().default(0),
  payoutInr: integer("payout_inr").notNull().default(0),
}, (t) => ({
  oncePerDay: uniqueIndex("checkins_user_gym_ist_day_unique").on(
    t.userId,
    t.gymId,
    sql`((${t.checkedInAt} AT TIME ZONE 'Asia/Kolkata')::date)`,
  ),
}));

// ─── Amenities catalog (admin-managed) ───
export const amenitiesTable = pgTable("amenities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Dot"),
  category: text("category").notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Join: which catalog amenities a gym offers
export const gymAmenitiesTable = pgTable(
  "gym_amenities",
  {
    id: serial("id").primaryKey(),
    gymId: integer("gym_id")
      .notNull()
      .references(() => gymsTable.id, { onDelete: "cascade" }),
    amenityId: integer("amenity_id")
      .notNull()
      .references(() => amenitiesTable.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniq: uniqueIndex("gym_amenities_gym_amenity_unique").on(
      t.gymId,
      t.amenityId,
    ),
  }),
);

// Partner-added custom amenities (outside the master catalog)
export const gymCustomAmenitiesTable = pgTable("gym_custom_amenities", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id")
    .notNull()
    .references(() => gymsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Dot"),
});

// Per-day opening hours; 0=Sunday … 6=Saturday
export const gymHoursTable = pgTable(
  "gym_hours",
  {
    id: serial("id").primaryKey(),
    gymId: integer("gym_id")
      .notNull()
      .references(() => gymsTable.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    openMinute: integer("open_minute").notNull().default(300), // 05:00
    closeMinute: integer("close_minute").notNull().default(1380), // 23:00
  },
  (t) => ({
    uniq: uniqueIndex("gym_hours_gym_day_unique").on(t.gymId, t.dayOfWeek),
  }),
);

// ─── Workouts catalog (admin-managed) ───
export const workoutsTable = pgTable("workouts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Dumbbell"),
  color: text("color").notNull().default("from-orange-500 to-amber-500"),
  imageUrl: text("image_url").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Join: which catalog workouts a gym offers
export const gymWorkoutsTable = pgTable(
  "gym_workouts",
  {
    id: serial("id").primaryKey(),
    gymId: integer("gym_id")
      .notNull()
      .references(() => gymsTable.id, { onDelete: "cascade" }),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workoutsTable.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniq: uniqueIndex("gym_workouts_gym_workout_unique").on(
      t.gymId,
      t.workoutId,
    ),
  }),
);

// Per-workout session schedule rows; one row per time slot
export const gymWorkoutSessionsTable = pgTable("gym_workout_sessions", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id")
    .notNull()
    .references(() => gymsTable.id, { onDelete: "cascade" }),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workoutsTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun … 6=Sat
  startMinute: integer("start_minute").notNull().default(360),
  endMinute: integer("end_minute").notNull().default(420),
  instructor: text("instructor").notNull().default(""),
});

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  balanceInr: integer("balance_inr").notNull().default(0),
  rewardPoints: integer("reward_points").notNull().default(0),
});

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  label: text("label").notNull(),
  amountInr: integer("amount_inr").notNull(),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  vendorPartnerId: integer("vendor_partner_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("apparel"),
  priceInr: integer("price_inr").notNull(),
  originalPriceInr: integer("original_price_inr").notNull(),
  imageUrl: text("image_url").notNull(),
  gallery: text("gallery").array().notNull().default([]),
  sizes: text("sizes").array().notNull().default([]),
  colors: text("colors").array().notNull().default([]),
  stock: integer("stock").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productOrdersTable = pgTable("product_orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingPincode: text("shipping_pincode").notNull(),
  totalInr: integer("total_inr").notNull(),
  paymentMethod: text("payment_method").notNull().default("cod"),
  status: text("status").notNull().default("placed"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productOrderItemsTable = pgTable("product_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  vendorPartnerId: integer("vendor_partner_id").notNull(),
  productName: text("product_name").notNull(),
  unitPriceInr: integer("unit_price_inr").notNull(),
  qty: integer("qty").notNull(),
  // Per-item fulfillment status so each vendor manages their own portion of a
  // (possibly multi-vendor) order independently of the order-level status.
  status: text("status").notNull().default("placed"),
  // Snapshot of the chosen variant, e.g. "M / Black" (empty when no variants).
  variant: text("variant").notNull().default(""),
});

// Admin-managed storefront product categories. A code default list is used as a
// fallback until the table is materialized (see routes/store.ts categories).
export const productCategoriesTable = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const partnersTable = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // NOTE: email is intentionally NOT unique. The product allows multiple
  // partner accounts to share a contact email (e.g. one brand operating
  // several franchise/branch logins). Login disambiguates by bcrypt-checking
  // the supplied password against every matching row.
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("pending"),
  city: text("city").notNull(),
  notes: text("notes").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  // kind = "gym" → gym operator (default), "vendor" → store seller,
  // "both"   → can sign in to both the partner portal and the vendor portal.
  kind: text("kind").notNull().default("gym"),
  // Platform commission percentage taken from this vendor's store sales.
  commissionPct: integer("commission_pct").notNull().default(10),
  pendingAmenityIds: integer("pending_amenity_ids")
    .array()
    .notNull()
    .default(sql`'{}'::integer[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  permissions: text("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const areasTable = pgTable("areas", {
  id: serial("id").primaryKey(),
  cityId: integer("city_id")
    .notNull()
    .references(() => citiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("class"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  classId: integer("class_id"),
  gymId: integer("gym_id"),
  planId: integer("plan_id"),
  className: text("class_name").notNull().default(""),
  gymName: text("gym_name").notNull().default(""),
  planName: text("plan_name").notNull().default(""),
  planPriceInr: integer("plan_price_inr").notNull().default(0),
  preferredDate: text("preferred_date").notNull().default(""),
  preferredTime: text("preferred_time").notNull().default(""),
  message: text("message").notNull().default(""),
  source: text("source").notNull().default("web"),
  status: text("status").notNull().default("new"),
  assignedTo: text("assigned_to").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const partnerLoginTokensTable = pgTable("partner_login_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  partnerId: integer("partner_id")
    .notNull()
    .references(() => partnersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdByEmail: text("created_by_email").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Sub-accounts created BY a partner for their own team members (e.g. front-desk
// staff, branch managers). They sign in through the same partner portal login
// but act on behalf of their parent partner with a limited set of permissions.
export const partnerStaffTable = pgTable("partner_staff", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id")
    .notNull()
    .references(() => partnersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  permissions: text("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  videoUrl: text("video_url").notNull().default(""),
  author: text("author").notNull().default("GYMCO Team"),
  category: text("category").notNull().default("Fitness"),
  isPublished: boolean("is_published").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// In-app notifications. One row per (recipient, notification). For broadcasts,
// the admin sends one logical message that fans out to N rows sharing a batchId.
// recipientType is one of: "user" | "partner" | "vendor" | "admin" | "staff".
// recipientId references the corresponding table (usersTable / partnersTable /
// partnersTable / adminsTable) by id. No FK is enforced because the target
// table varies by recipientType.
export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientType: text("recipient_type").notNull(),
  recipientId: integer("recipient_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link").notNull().default(""),
  batchId: text("batch_id").notNull(),
  createdByAdminId: integer("created_by_admin_id").references(
    () => adminsTable.id,
    { onDelete: "set null" },
  ),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const partnerDocumentsTable = pgTable("partner_documents", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id")
    .notNull()
    .references(() => partnersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  notes: text("notes").notNull().default(""),
  uploadedByKind: text("uploaded_by_kind").notNull().default("staff"),
  uploadedByEmail: text("uploaded_by_email").notNull().default(""),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Support / task tickets. Any signed-in role can raise a ticket; admins triage,
// assign, and track them. The requester and (optional) assignee are referenced
// polymorphically by role + id, reusing the same convention as the
// notifications table. requesterRole / assigneeRole is one of:
// "user" | "partner" | "staff" | "admin". No FK is enforced because the target
// table varies by role. Status moves through: open -> in_progress -> resolved
// -> closed. Priority is one of: low | medium | high | urgent.
export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  requesterRole: text("requester_role").notNull(),
  requesterId: integer("requester_id").notNull(),
  assigneeRole: text("assignee_role"),
  assigneeId: integer("assignee_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const ticketCommentsTable = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => ticketsTable.id, { onDelete: "cascade" }),
  authorRole: text("author_role").notNull(),
  authorId: integer("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const uploadedImagesTable = pgTable("uploaded_images", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  dataBase64: text("data_base64").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Daily wellness tracking (Iconic Fitness mobile app) ───
// Per-entry logs; daily totals are computed by summing rows for a given
// loggedDate (YYYY-MM-DD, computed in Asia/Kolkata so a "day" matches IST).

export const waterLogsTable = pgTable("water_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  loggedDate: text("logged_date").notNull(),
  amountMl: integer("amount_ml").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mealLogsTable = pgTable("meal_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  loggedDate: text("logged_date").notNull(),
  mealType: text("meal_type").notNull(),
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  proteinG: integer("protein_g").notNull().default(0),
  carbsG: integer("carbs_g").notNull().default(0),
  fatG: integer("fat_g").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workoutLogsTable = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  loggedDate: text("logged_date").notNull(),
  type: text("type").notNull(),
  durationMin: integer("duration_min").notNull(),
  calories: integer("calories").notNull().default(0),
  steps: integer("steps").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Challenge definitions live in code (see api-server lib/challenges.ts); only
// the opt-in participants are persisted. Leaderboards are computed live from the
// tracking log tables, so there is no stored progress to keep in sync.
export const challengeParticipantsTable = pgTable(
  "challenge_participants",
  {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id").notNull(),
    userId: integer("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("challenge_participants_challenge_user_unique").on(
      t.challengeId,
      t.userId,
    ),
  }),
);
