import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

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
  ownerPartnerId: integer("owner_partner_id"),
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
});

export const partnersTable = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("pending"),
  city: text("city").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
