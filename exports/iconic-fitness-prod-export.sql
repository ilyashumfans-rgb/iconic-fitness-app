-- ============================================================
  -- Iconic Fitness — PRODUCTION database export
  -- Generated: 2026-06-08T07:27:10.809Z
  -- Source: live production database (read-only replica)
  --
  -- Contents: schema (CREATE TABLE) + data (INSERT) for all 35 tables.
  -- NOTE: uploaded_images.data_base64 (image bytes, ~223MB) is EXCLUDED;
  --       those rows are present with data_base64 = NULL (metadata only).
  -- Foreign-key constraints are omitted; the authoritative schema with
  -- relations lives in the source code (lib/db, Drizzle ORM).
  --
  -- Restore (into an empty Postgres DB):
  --   psql "$TARGET_DATABASE_URL" -f iconic-fitness-prod-export.sql
  -- ============================================================

  SET client_encoding = 'UTF8';
  SET standard_conforming_strings = on;

  -- ---------- SCHEMA ----------

CREATE TABLE IF NOT EXISTS "admins" (
  "id" integer NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "amenities" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text NOT NULL,
  "icon" text NOT NULL,
  "category" text NOT NULL,
  "is_active" boolean NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "areas" (
  "id" integer NOT NULL,
  "city_id" integer NOT NULL,
  "name" text NOT NULL,
  "is_active" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" integer NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "excerpt" text NOT NULL,
  "content" text NOT NULL,
  "cover_image" text NOT NULL,
  "author" text NOT NULL,
  "category" text NOT NULL,
  "is_published" boolean NOT NULL,
  "published_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "video_url" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "class_id" integer NOT NULL,
  "status" text NOT NULL,
  "qr_code" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "checkins" (
  "id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "gym_id" integer NOT NULL,
  "checked_in_at" timestamptz NOT NULL,
  "method" text NOT NULL,
  "base_inr" integer NOT NULL,
  "tax_pct" integer NOT NULL,
  "tax_inr" integer NOT NULL,
  "payout_inr" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cities" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "is_active" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "is_default" boolean NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "class_sessions" (
  "id" integer NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "gym_id" integer NOT NULL,
  "trainer_id" integer NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "duration_min" integer NOT NULL,
  "capacity" integer NOT NULL,
  "intensity" text NOT NULL,
  "cover_image" text NOT NULL,
  "description" text NOT NULL,
  "equipment_needed" text[] NOT NULL,
  "calorie_estimate" integer NOT NULL,
  "trending_score" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gym_amenities" (
  "id" integer NOT NULL,
  "gym_id" integer NOT NULL,
  "amenity_id" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gym_custom_amenities" (
  "id" integer NOT NULL,
  "gym_id" integer NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "icon" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gym_hours" (
  "id" integer NOT NULL,
  "gym_id" integer NOT NULL,
  "day_of_week" integer NOT NULL,
  "is_closed" boolean NOT NULL,
  "open_minute" integer NOT NULL,
  "close_minute" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gym_workout_sessions" (
  "id" integer NOT NULL,
  "gym_id" integer NOT NULL,
  "workout_id" integer NOT NULL,
  "day_of_week" integer NOT NULL,
  "start_minute" integer NOT NULL,
  "end_minute" integer NOT NULL,
  "instructor" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gym_workouts" (
  "id" integer NOT NULL,
  "gym_id" integer NOT NULL,
  "workout_id" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gyms" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "city" text NOT NULL,
  "area" text NOT NULL,
  "address" text NOT NULL,
  "hero_image" text NOT NULL,
  "rating" real NOT NULL,
  "reviews_count" integer NOT NULL,
  "price_from" integer NOT NULL,
  "categories" text[] NOT NULL,
  "amenities" text[] NOT NULL,
  "distance_km" real NOT NULL,
  "is_premium" boolean NOT NULL,
  "open_now" boolean NOT NULL,
  "about" text NOT NULL,
  "gallery" text[] NOT NULL,
  "hours" text NOT NULL,
  "lat" real NOT NULL,
  "lng" real NOT NULL,
  "featured" boolean NOT NULL,
  "owner_partner_id" integer,
  "logo_url" text NOT NULL,
  "payout_per_visit_inr" integer NOT NULL,
  "payout_tax_pct" integer NOT NULL,
  "is_verified" boolean NOT NULL,
  "video_url" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" integer NOT NULL,
  "kind" text NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text NOT NULL,
  "city" text NOT NULL,
  "class_id" integer,
  "gym_id" integer,
  "class_name" text NOT NULL,
  "gym_name" text NOT NULL,
  "preferred_date" text NOT NULL,
  "message" text NOT NULL,
  "source" text NOT NULL,
  "status" text NOT NULL,
  "assigned_to" text NOT NULL,
  "notes" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "plan_id" integer,
  "plan_name" text NOT NULL,
  "plan_price_inr" integer NOT NULL,
  "preferred_time" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "memberships" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "tagline" text NOT NULL,
  "billing_period" text NOT NULL,
  "price_inr" integer NOT NULL,
  "original_price_inr" integer NOT NULL,
  "gyms_included" integer NOT NULL,
  "classes_per_month" integer NOT NULL,
  "perks" text[] NOT NULL,
  "badge" text NOT NULL,
  "popular" boolean NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" integer NOT NULL,
  "recipient_type" text NOT NULL,
  "recipient_id" integer NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "link" text NOT NULL,
  "batch_id" text NOT NULL,
  "created_by_admin_id" integer,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partner_documents" (
  "id" integer NOT NULL,
  "partner_id" integer NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "notes" text NOT NULL,
  "uploaded_by_kind" text NOT NULL,
  "uploaded_by_email" text NOT NULL,
  "uploaded_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partner_login_tokens" (
  "id" integer NOT NULL,
  "token" text NOT NULL,
  "partner_id" integer NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_by_email" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partner_staff" (
  "id" integer NOT NULL,
  "partner_id" integer NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "permissions" text[] NOT NULL,
  "is_active" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partners" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "password_hash" text NOT NULL,
  "status" text NOT NULL,
  "city" text NOT NULL,
  "notes" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "kind" text NOT NULL,
  "avatar_url" text NOT NULL,
  "pending_amenity_ids" integer[] NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_order_items" (
  "id" integer NOT NULL,
  "order_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  "vendor_partner_id" integer NOT NULL,
  "product_name" text NOT NULL,
  "unit_price_inr" integer NOT NULL,
  "qty" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_orders" (
  "id" integer NOT NULL,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "customer_phone" text NOT NULL,
  "shipping_address" text NOT NULL,
  "shipping_city" text NOT NULL,
  "shipping_pincode" text NOT NULL,
  "total_inr" integer NOT NULL,
  "payment_method" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" integer NOT NULL,
  "vendor_partner_id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "price_inr" integer NOT NULL,
  "original_price_inr" integer NOT NULL,
  "image_url" text NOT NULL,
  "gallery" text[] NOT NULL,
  "stock" integer NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "staff" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "is_active" boolean NOT NULL,
  "permissions" text[] NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ticket_comments" (
  "id" integer NOT NULL,
  "ticket_id" integer NOT NULL,
  "author_role" text NOT NULL,
  "author_id" integer NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tickets" (
  "id" integer NOT NULL,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "priority" text NOT NULL,
  "status" text NOT NULL,
  "requester_role" text NOT NULL,
  "requester_id" integer NOT NULL,
  "assignee_role" text,
  "assignee_id" integer,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "resolved_at" timestamptz,
  "closed_at" timestamptz,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trainers" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "specialty" text NOT NULL,
  "bio" text NOT NULL,
  "photo_url" text NOT NULL,
  "rating" real NOT NULL,
  "sessions_count" integer NOT NULL,
  "price_per_session" integer NOT NULL,
  "certifications" text[] NOT NULL,
  "city" text NOT NULL,
  "gym_id" integer,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "uploaded_images" (
  "id" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "data_base64" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_memberships" (
  "id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "plan_id" integer NOT NULL,
  "renews_on" timestamptz NOT NULL,
  "classes_used" integer NOT NULL,
  "gyms_accessed" integer NOT NULL,
  "status" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp NOT NULL,
  PRIMARY KEY ("sid")
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "mobile" text NOT NULL,
  "gender" text NOT NULL,
  "age" integer NOT NULL,
  "height_cm" real NOT NULL,
  "weight_kg" real NOT NULL,
  "fitness_goal" text NOT NULL,
  "avatar_url" text NOT NULL,
  "city" text NOT NULL,
  "daily_calories" integer NOT NULL,
  "daily_water_ml" integer NOT NULL,
  "daily_sleep_hours" real NOT NULL,
  "resting_hr" integer NOT NULL,
  "streak_days" integer NOT NULL,
  "weekly_goal" integer NOT NULL,
  "member_code" text NOT NULL,
  "joined_at" timestamptz NOT NULL,
  "clerk_user_id" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wallet_transactions" (
  "id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "label" text NOT NULL,
  "amount_inr" integer NOT NULL,
  "kind" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wallets" (
  "id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "balance_inr" integer NOT NULL,
  "reward_points" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workouts" (
  "id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text NOT NULL,
  "icon" text NOT NULL,
  "color" text NOT NULL,
  "image_url" text NOT NULL,
  "is_active" boolean NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

-- ---------- DATA ----------

-- admins (4 rows)
INSERT INTO "admins" ("id", "email", "password_hash", "name", "role", "created_at") VALUES (1, 'admin@gymco.in', '$2b$10$2PqOU./MrKsnOLbpMhQYtesi3hnoAIrFR5a2MNJ1Xw4utcxCx0G56', 'GYMCO Admin', 'superadmin', '2026-05-25T14:22:25.248429+00:00');
INSERT INTO "admins" ("id", "email", "password_hash", "name", "role", "created_at") VALUES (2, 'ilyashumfans@gmail.com', '$2b$10$NZiv8cej/v2OlfRNfvTBg.DfavQZP9kSNS64OgMlSNt2Hh9VuXH8u', 'Ilyas', 'superadmin', '2026-05-26T05:56:08.043434+00:00');
INSERT INTO "admins" ("id", "email", "password_hash", "name", "role", "created_at") VALUES (4, 'suhail4u@outlook.com', '$2b$10$RUeRTolZvL7cGx/lxnshDOo70nh9vM9bWh8OyqgQ4QFKub15b4B2K', 'Suhail', 'admin', '2026-05-26T13:19:39.987699+00:00');
INSERT INTO "admins" ("id", "email", "password_hash", "name", "role", "created_at") VALUES (5, 'test@gymco.in', '$2b$10$WiFKBM105KYUfjikwcjGl.52pO4jREkhiXHFoaaFsDVhQ24mZVarq', 'Test', 'admin', '2026-05-26T13:20:00.28298+00:00');

-- amenities (35 rows)
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (2, 'WiFi', 'wifi', 'High-speed wireless internet', 'Wifi', 'facilities', TRUE, 0, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (3, 'Air Conditioning', 'air-conditioning', 'Climate-controlled workout floor', 'Wind', 'facilities', TRUE, 10, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (4, 'Shower', 'shower', 'Clean shower facilities', 'Droplets', 'facilities', TRUE, 20, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (5, 'Sauna', 'sauna', 'Steam and dry sauna', 'Flame', 'wellness', TRUE, 30, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (6, 'Steam Room', 'steam-room', 'Relaxing steam room', 'CloudFog', 'wellness', TRUE, 40, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (7, 'Swimming Pool', 'swimming-pool', 'Indoor swimming pool', 'Waves', 'facilities', TRUE, 50, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (8, 'Jacuzzi', 'jacuzzi', 'Hot tub for post-workout recovery', 'Bath', 'wellness', TRUE, 60, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (9, 'Cardio Equipment', 'cardio-equipment', 'Treadmills, ellipticals, bikes', 'HeartPulse', 'equipment', TRUE, 70, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (10, 'Weight Training', 'weight-training', 'Free weights and machines', 'Dumbbell', 'equipment', TRUE, 80, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (11, 'Functional Training Area', 'functional-training', 'Open space for functional workouts', 'Activity', 'equipment', TRUE, 90, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (12, 'CrossFit Box', 'crossfit-box', 'Dedicated CrossFit zone', 'Flame', 'equipment', TRUE, 100, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (13, 'Boxing Ring', 'boxing-ring', 'Boxing and MMA ring', 'Swords', 'equipment', TRUE, 110, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (14, 'Spinning Studio', 'spinning-studio', 'Indoor cycling studio', 'Bike', 'equipment', TRUE, 120, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (15, 'Personal Training', 'personal-training', 'Certified personal trainers', 'Users', 'services', TRUE, 130, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (16, 'Group Classes', 'group-classes', 'HIIT, Zumba, dance and more', 'Users2', 'services', TRUE, 140, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (17, 'Yoga Classes', 'yoga-classes', 'Yoga and meditation sessions', 'Flower2', 'services', TRUE, 150, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (18, 'Pilates Studio', 'pilates-studio', 'Reformer and mat pilates', 'Sparkles', 'services', TRUE, 160, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (19, 'Nutrition Counseling', 'nutrition-counseling', 'Personalized diet plans', 'Apple', 'services', TRUE, 170, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (20, 'Physiotherapy', 'physiotherapy', 'Recovery and rehab support', 'Stethoscope', 'wellness', TRUE, 180, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (21, 'Massage Therapy', 'massage-therapy', 'Sports and recovery massage', 'HandHeart', 'wellness', TRUE, 190, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (22, 'Locker Room', 'locker-room', 'Secure personal lockers', 'Lock', 'facilities', TRUE, 200, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (23, 'Towel Service', 'towel-service', 'Fresh towels provided', 'Shirt', 'facilities', TRUE, 210, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (24, 'Parking', 'parking', 'On-site parking available', 'ParkingCircle', 'facilities', TRUE, 220, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (25, 'Valet Parking', 'valet-parking', 'Complimentary valet', 'CarFront', 'facilities', TRUE, 230, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (26, 'Cafe / Smoothie Bar', 'cafe-smoothie-bar', 'Healthy snacks and shakes', 'Coffee', 'facilities', TRUE, 240, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (27, 'Pro Shop', 'pro-shop', 'Apparel and supplements', 'ShoppingBag', 'facilities', TRUE, 250, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (28, 'Kids Zone', 'kids-zone', 'Childcare while you train', 'Baby', 'facilities', TRUE, 260, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (29, 'Women Only Hours', 'women-only-hours', 'Dedicated women-only sessions', 'VenusAndMars', 'services', TRUE, 270, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (30, '24/7 Access', '24-7-access', 'Around-the-clock entry', 'Clock', 'services', TRUE, 280, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (31, 'Open Air Rooftop', 'open-air-rooftop', 'Outdoor rooftop training area', 'Sun', 'facilities', TRUE, 290, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (32, 'Body Composition Analysis', 'body-composition-analysis', 'InBody / DEXA scans', 'Scale', 'services', TRUE, 300, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (33, 'Eucalyptus Steam Room', 'eucalyptus-steam-room', 'Aromatherapy steam', 'Leaf', 'wellness', TRUE, 310, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (34, 'Ice Bath', 'ice-bath', 'Cold plunge for recovery', 'Snowflake', 'wellness', TRUE, 320, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (35, 'Cycling Track', 'cycling-track', 'Indoor cycling track', 'Bike', 'equipment', TRUE, 330, '2026-05-26T06:42:38.8+00:00');
INSERT INTO "amenities" ("id", "name", "slug", "description", "icon", "category", "is_active", "sort_order", "created_at") VALUES (36, 'Music System', 'music-system', 'Premium audio on the floor', 'Music2', 'facilities', TRUE, 340, '2026-05-26T06:42:38.8+00:00');

-- areas (99 rows)
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (1, 1, 'Kormangala', TRUE, '2026-05-26T07:31:42.369+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (2, 1, 'Kumaraswamy Layout', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (3, 1, 'Kalyan Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (4, 1, 'Vidyaranyapura', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (5, 1, 'Nandini Layout', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (6, 1, 'Rajarajeshwari Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (7, 1, 'CV Raman Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (8, 1, 'Arekere', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (9, 1, 'Attibele', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (10, 1, 'Mahadevapura', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (11, 1, 'Indiranagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (12, 1, 'HAL', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (13, 1, 'Kanakapura Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (14, 1, 'Kammanahalli', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (15, 1, 'Brigade Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (16, 1, 'Whitefield', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (17, 1, 'Marathahalli', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (18, 1, 'Bannerghatta Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (19, 1, 'Sadashivanagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (20, 1, 'Chandapura', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (21, 1, 'Kasturi Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (22, 1, 'Nagarbhavi', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (23, 1, 'Bellandur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (24, 1, 'Bommasandra', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (25, 1, 'Hosakerehalli', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (26, 1, 'Cunningham Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (27, 1, 'Bagalur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (28, 1, 'Basavanagudi', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (29, 1, 'Kengeri', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (30, 1, 'Doddaballapur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (31, 1, 'Old Madras Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (32, 1, 'Jayanagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (33, 1, 'Mysore Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (34, 1, 'Malleshwaram', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (35, 1, 'Sanjay Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (36, 1, 'Varthur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (37, 1, 'Jeevan Bhima Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (38, 1, 'Chikkajala', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (39, 1, 'Hennur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (40, 1, 'Ramamurthy Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (41, 1, 'Anekal', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (42, 1, 'HSR Layout', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (43, 1, 'Murugeshpalya', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (44, 1, 'Outer Ring Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (45, 1, 'BTM Layout', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (46, 1, 'Kadugodi', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (47, 1, 'ITPL', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (48, 1, 'Tin Factory', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (49, 1, 'RT Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (50, 1, 'Hanumanthnagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (51, 1, 'Rajanukunte', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (52, 1, 'Gandhi Bazaar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (53, 1, 'Hulimavu', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (54, 1, 'Frazer Town', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (55, 1, 'Yeshwanthpur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (56, 1, 'Thanisandra', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (57, 1, 'Konanakunte', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (58, 1, 'KR Puram', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (59, 1, 'Wilson Garden', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (60, 1, 'Begur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (61, 1, 'Hosur Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (62, 1, 'Domlur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (63, 1, 'Cox Town', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (64, 1, 'Rajajinagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (65, 1, 'Lalbagh', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (66, 1, 'Yelahanka', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (67, 1, 'Nelamangala', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (68, 1, 'MG Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (69, 1, 'Kathriguppe', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (70, 1, 'Jakkur', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (71, 1, 'Chamrajpet', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (72, 1, 'JP Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (73, 1, 'Mathikere', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (74, 1, 'Electronic City', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (75, 1, 'Hoodi', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (76, 1, 'Shivajinagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (77, 1, 'Tumkur Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (78, 1, 'Banashankari', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (79, 1, 'Uttarahalli', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (80, 1, 'Richmond Town', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (81, 1, 'Peenya', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (82, 1, 'Hebbal', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (83, 1, 'Magadi Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (84, 1, 'Padmanabhanagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (85, 1, 'Vijayanagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (86, 1, 'Koramangala', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (87, 1, 'Brookefield', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (88, 1, 'Bommanahalli', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (89, 1, 'Nagawara', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (90, 1, 'Sahakar Nagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (91, 1, 'Banaswadi', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (92, 1, 'Residency Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (93, 1, 'Girinagar', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (94, 1, 'Old Airport Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (95, 1, 'Sarjapur Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (96, 1, 'Lavelle Road', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (97, 1, 'Devanahalli', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (98, 1, 'Ulsoor', TRUE, '2026-05-26T07:33:04.041+00:00');
INSERT INTO "areas" ("id", "city_id", "name", "is_active", "created_at") VALUES (99, 1, 'Koramangala 5th block', TRUE, '2026-05-26T13:23:28.026+00:00');

-- blog_posts (2 rows)
INSERT INTO "blog_posts" ("id", "slug", "title", "excerpt", "content", "cover_image", "author", "category", "is_published", "published_at", "created_at", "updated_at", "video_url") VALUES (2, 'all-you-need-to-know-about-iconic-fitness-how-it-transforms-you-into-iconic-of-y-yqjf', 'All You Need to Know about Iconic Fitness! How it Transforms You into Iconic of You', '', 'At Iconic Fitness, we believe that fitness in terms of body and mind is the best path to a contented life. We advocate fitness for everyone and completely understand any time is right to begin the fitness journey.', '/api/storage/db-images/257baf95-a95e-421f-8e93-8691c2ffb3bd', 'Iconic Fitness Team', 'Fitness', TRUE, '2026-06-06T12:40:14.891336+00:00', '2026-06-06T12:40:14.891336+00:00', '2026-06-06T12:41:55.785+00:00', 'https://www.youtube.com/watch?v=Dk_cr_3pN1M');
INSERT INTO "blog_posts" ("id", "slug", "title", "excerpt", "content", "cover_image", "author", "category", "is_published", "published_at", "created_at", "updated_at", "video_url") VALUES (3, 'iconic-fitness-best-place-to-start-your-fitness-journey-bqgp', 'Iconic Fitness - Best Place to Start Your Fitness Journey', 'Start Your Journey Fitness with Iconic Fitness Today ', 'At Iconic Fitness, we believe that fitness in terms of body and mind is the best path to a contented life. We advocate fitness for everyone and completely understand any time is right to begin the fitness journey.', '/api/storage/db-images/97ea2914-9c98-48d3-a515-246928cc3001', 'Iconic Fitness Team', 'Fitness', TRUE, '2026-06-06T12:44:06.57618+00:00', '2026-06-06T12:44:06.57618+00:00', '2026-06-06T12:44:06.57618+00:00', 'https://www.youtube.com/watch?v=wktMnWJ4BLY');

-- bookings (3 rows)
INSERT INTO "bookings" ("id", "user_id", "class_id", "status", "qr_code", "created_at") VALUES (1, 1, 1, 'confirmed', 'GYMCO-0001-ZZ96AE', '2026-05-25T12:41:26.520838+00:00');
INSERT INTO "bookings" ("id", "user_id", "class_id", "status", "qr_code", "created_at") VALUES (2, 1, 4, 'confirmed', 'GYMCO-0004-TOHJCZ', '2026-05-25T12:41:28.257488+00:00');
INSERT INTO "bookings" ("id", "user_id", "class_id", "status", "qr_code", "created_at") VALUES (3, 1, 6, 'confirmed', 'GYMCO-0006-GI7711', '2026-05-25T12:41:30.215245+00:00');

-- checkins (11 rows)
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (1, 1, 1, '2026-05-25T08:41:39.758555+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (2, 1, 3, '2026-05-24T10:41:41.892873+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (3, 1, 1, '2026-05-23T12:41:43.488136+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (4, 1, 5, '2026-05-22T14:41:45.134538+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (5, 1, 1, '2026-05-21T16:41:47.015206+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (6, 1, 4, '2026-05-20T18:41:48.761647+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (7, 1, 1, '2026-05-19T20:41:50.392698+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (8, 1, 2, '2026-05-18T22:41:52.397973+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (9, 1, 3, '2026-05-18T00:41:54.045726+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (10, 1, 1, '2026-05-17T02:41:55.762141+00:00', 'qr', 0, 0, 0, 0);
INSERT INTO "checkins" ("id", "user_id", "gym_id", "checked_in_at", "method", "base_inr", "tax_pct", "tax_inr", "payout_inr") VALUES (11, 2, 1, '2026-05-26T10:05:05.094277+00:00', 'qr', 0, 18, 0, 0);

-- cities (1 rows)
INSERT INTO "cities" ("id", "name", "is_active", "created_at", "is_default") VALUES (1, 'Bengaluru', TRUE, '2026-05-26T07:31:30.858+00:00', FALSE);

-- class_sessions (20 rows)
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (1, 'Sunrise Power Yoga', 'yoga', 3, 2, '2026-05-25T14:40:29.33+00:00', 60, 18, 'medium', 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80', 'Heated vinyasa flow to wake up every muscle.', ARRAY['Mat']::text[], 260, 95);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (2, 'Heavy Squat Day', 'strength', 1, 1, '2026-05-25T16:40:29.33+00:00', 75, 12, 'high', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=80', 'Coached squat session — work up to your 5RM with Rohan.', ARRAY['Belt','Knee sleeves']::text[], 380, 88);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (3, 'Combat Conditioning', 'mma', 4, 4, '2026-05-25T18:40:29.33+00:00', 60, 16, 'high', 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1200&q=80', 'Pad work, bag rounds, and brutal finishers. All levels.', ARRAY['Wraps','Gloves']::text[], 520, 92);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (4, 'Metcon Mayhem', 'crossfit', 5, 3, '2026-05-25T19:40:29.33+00:00', 60, 20, 'high', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=80', 'Three rounds of running, rowing, and barbell complexes.', ARRAY['Jump rope']::text[], 540, 98);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (5, 'Reformer Pilates Flow', 'pilates', 7, 6, '2026-05-25T21:40:29.33+00:00', 55, 8, 'low', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=1200&q=80', 'Slow, precise reformer work for posture and core control.', ARRAY['None — provided']::text[], 230, 72);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (6, 'Sunset Spin Ride', 'cycling', 6, 10, '2026-05-25T22:40:29.33+00:00', 45, 30, 'high', 'https://images.unsplash.com/photo-1591741535018-d042766c62eb?w=1200&q=80', '45 minutes of climbs and sprints to a live-DJ set.', ARRAY['Cycling shoes — provided']::text[], 490, 85);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (7, 'Zumba Burn', 'zumba', 9, 7, '2026-05-25T23:40:29.33+00:00', 60, 25, 'medium', 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=1200&q=80', 'Latin-fusion dance class. No experience needed.', ARRAY['Towel']::text[], 440, 68);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (8, 'Functional Athlete', 'functional', 5, 5, '2026-05-26T13:40:29.33+00:00', 60, 14, 'high', 'https://images.unsplash.com/photo-1571388208497-71bedc66e932?w=1200&q=80', 'Kettlebells, sled, sandbag, and gymnastic rings.', ARRAY['Cross-trainers']::text[], 460, 76);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (9, 'Power Hour Strength', 'strength', 2, 1, '2026-05-26T15:40:29.33+00:00', 60, 10, 'high', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=80', 'Compound lifts with coached cues and tempo work.', ARRAY['Belt']::text[], 360, 82);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (10, 'Restorative Yoga', 'yoga', 3, 8, '2026-05-26T17:40:29.33+00:00', 75, 16, 'low', 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80', 'Long-held postures with breathwork. Recover and reset.', ARRAY['Mat','Bolster']::text[], 180, 55);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (11, 'Box Fit Bootcamp', 'boxing', 4, 4, '2026-05-26T19:40:29.33+00:00', 60, 18, 'medium', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&q=80', 'Boxing-style HIIT. Mitts, bag rounds, and core finisher.', ARRAY['Wraps']::text[], 520, 86);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (12, 'Reformer Burn', 'pilates', 7, 6, '2026-05-27T13:40:29.33+00:00', 55, 8, 'medium', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=1200&q=80', 'Higher-intensity reformer class targeting glutes and core.', ARRAY['None']::text[], 260, 64);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (13, 'Olympic Lifting Lab', 'strength', 8, 9, '2026-05-27T15:40:29.33+00:00', 90, 8, 'high', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=80', 'Snatch and clean & jerk technique with Rahul.', ARRAY['Belt','Wrist wraps']::text[], 420, 71);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (14, 'Spin & Sculpt', 'cycling', 6, 10, '2026-05-27T17:40:29.33+00:00', 60, 28, 'high', 'https://images.unsplash.com/photo-1591741535018-d042766c62eb?w=1200&q=80', '30 min on the bike, 30 min mat work.', ARRAY['Cycling shoes']::text[], 520, 88);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (15, 'Sunrise Strength', 'strength', 1, 1, '2026-05-27T13:40:29.33+00:00', 60, 14, 'medium', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=80', 'Full body session — push, pull, hinge, squat.', ARRAY['None']::text[], 340, 79);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (16, 'Yin Yoga', 'yoga', 3, 2, '2026-05-27T20:40:29.33+00:00', 60, 16, 'low', 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80', 'Deep stretches held 3–5 minutes for connective tissue.', ARRAY['Mat','Block']::text[], 150, 48);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (17, 'MMA Open Mat', 'mma', 4, 4, '2026-05-28T17:40:29.33+00:00', 90, 20, 'high', 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1200&q=80', 'Coach-led open mat — grappling and striking drills.', ARRAY['Mouthguard','Gloves']::text[], 580, 90);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (18, 'HIIT Express', 'hiit', 9, 7, '2026-05-28T13:40:29.33+00:00', 30, 20, 'high', 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&q=80', '30-minute full-body HIIT. In and out, drenched.', ARRAY['Towel']::text[], 380, 77);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (19, 'Pilates Foundations', 'pilates', 7, 12, '2026-05-28T15:40:29.33+00:00', 55, 8, 'low', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=1200&q=80', 'Beginner reformer class. Learn the fundamentals.', ARRAY['None']::text[], 210, 52);
INSERT INTO "class_sessions" ("id", "title", "category", "gym_id", "trainer_id", "starts_at", "duration_min", "capacity", "intensity", "cover_image", "description", "equipment_needed", "calorie_estimate", "trending_score") VALUES (20, 'Strength Club', 'strength', 8, 9, '2026-05-29T14:40:29.33+00:00', 60, 12, 'high', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=80', 'Programmed strength session. Five-week block.', ARRAY['Belt']::text[], 360, 69);

-- gym_amenities (212 rows)
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (449, 26, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (450, 26, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (451, 26, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (452, 26, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (453, 26, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (454, 26, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (455, 26, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (456, 26, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (457, 26, 12);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (458, 26, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (459, 26, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (460, 26, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (461, 26, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (462, 26, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (463, 26, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (464, 26, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (465, 26, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (466, 26, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (467, 26, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (468, 26, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (557, 14, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (558, 14, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (559, 14, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (560, 14, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (561, 14, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (562, 14, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (563, 14, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (564, 14, 12);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (565, 14, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (566, 14, 14);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (567, 14, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (568, 14, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (569, 14, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (570, 14, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (571, 14, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (572, 14, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (573, 14, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (574, 14, 23);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (575, 14, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (576, 14, 29);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (469, 22, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (470, 22, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (471, 22, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (472, 22, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (473, 22, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (474, 22, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (475, 22, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (476, 22, 12);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (577, 14, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (578, 14, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (579, 14, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (580, 14, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (602, 13, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (603, 13, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (604, 13, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (605, 13, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (606, 13, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (607, 13, 7);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (608, 13, 8);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (609, 13, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (610, 13, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (611, 13, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (612, 13, 12);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (613, 13, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (614, 13, 14);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (615, 13, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (616, 13, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (617, 13, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (618, 13, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (619, 13, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (620, 13, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (621, 13, 21);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (622, 13, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (623, 13, 23);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (624, 13, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (625, 13, 26);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (167, 27, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (168, 27, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (169, 27, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (170, 27, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (171, 27, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (172, 27, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (173, 27, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (174, 27, 14);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (175, 27, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (176, 27, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (177, 27, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (178, 27, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (179, 27, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (180, 27, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (181, 27, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (182, 27, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (183, 27, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (184, 27, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (185, 27, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (186, 27, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (477, 22, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (478, 22, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (479, 22, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (480, 22, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (481, 22, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (482, 22, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (483, 22, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (484, 22, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (485, 22, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (486, 22, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (487, 22, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (328, 23, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (329, 23, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (330, 23, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (331, 23, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (332, 23, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (333, 23, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (334, 23, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (335, 23, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (336, 23, 14);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (337, 23, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (338, 23, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (488, 22, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (489, 22, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (339, 23, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (340, 23, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (341, 23, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (342, 23, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (343, 23, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (344, 23, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (345, 23, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (346, 23, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (490, 24, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (491, 24, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (492, 24, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (493, 24, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (494, 24, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (495, 24, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (496, 24, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (497, 24, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (498, 24, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (499, 24, 14);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (500, 24, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (501, 24, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (502, 24, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (503, 24, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (504, 24, 23);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (505, 24, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (506, 24, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (507, 24, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (508, 24, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (509, 24, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (581, 25, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (582, 25, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (583, 25, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (584, 25, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (585, 25, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (586, 25, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (587, 25, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (588, 25, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (589, 25, 12);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (590, 25, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (591, 25, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (592, 25, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (593, 25, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (594, 25, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (595, 25, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (596, 25, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (597, 25, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (598, 25, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (599, 25, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (600, 25, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (601, 25, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (408, 21, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (409, 21, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (410, 21, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (411, 21, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (412, 21, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (413, 21, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (414, 21, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (415, 21, 12);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (416, 21, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (417, 21, 14);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (418, 21, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (419, 21, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (420, 21, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (421, 21, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (422, 21, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (423, 21, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (424, 21, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (425, 21, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (426, 21, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (427, 21, 36);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (626, 28, 2);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (627, 28, 3);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (628, 28, 4);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (629, 28, 5);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (630, 28, 6);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (631, 28, 9);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (632, 28, 10);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (633, 28, 11);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (634, 28, 12);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (635, 28, 13);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (636, 28, 14);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (637, 28, 15);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (638, 28, 16);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (639, 28, 17);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (640, 28, 18);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (641, 28, 19);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (642, 28, 20);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (643, 28, 22);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (644, 28, 24);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (645, 28, 32);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (646, 28, 33);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (647, 28, 35);
INSERT INTO "gym_amenities" ("id", "gym_id", "amenity_id") VALUES (648, 28, 36);

-- gym_hours (112 rows)
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (505, 26, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (506, 26, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (507, 26, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (508, 26, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (509, 26, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (510, 26, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (511, 26, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (512, 22, 0, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (513, 22, 1, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (514, 22, 2, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (515, 22, 3, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (516, 22, 4, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (517, 22, 5, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (518, 22, 6, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (519, 20, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (520, 20, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (521, 20, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (522, 20, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (523, 20, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (524, 20, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (525, 20, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (442, 15, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (443, 15, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (444, 15, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (445, 15, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (446, 15, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (447, 15, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (448, 15, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (449, 16, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (450, 16, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (451, 16, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (452, 16, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (453, 16, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (454, 16, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (455, 16, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (456, 17, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (457, 17, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (458, 17, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (459, 17, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (460, 17, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (461, 17, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (462, 17, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (463, 18, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (464, 18, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (465, 18, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (466, 18, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (467, 18, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (468, 18, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (469, 18, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (526, 24, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (527, 24, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (528, 24, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (529, 24, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (530, 24, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (531, 24, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (532, 24, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (547, 14, 0, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (548, 14, 1, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (549, 14, 2, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (550, 14, 3, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (551, 14, 4, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (552, 14, 5, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (553, 14, 6, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (554, 25, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (555, 25, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (556, 25, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (557, 25, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (558, 25, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (559, 25, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (560, 25, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (561, 19, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (562, 19, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (563, 19, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (564, 19, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (565, 19, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (566, 19, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (567, 19, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (491, 21, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (492, 21, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (493, 21, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (494, 21, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (495, 21, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (496, 21, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (497, 21, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (323, 27, 0, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (324, 27, 1, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (325, 27, 2, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (326, 27, 3, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (327, 27, 4, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (328, 27, 5, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (329, 27, 6, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (407, 23, 0, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (408, 23, 1, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (409, 23, 2, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (410, 23, 3, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (411, 23, 4, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (412, 23, 5, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (413, 23, 6, FALSE, 300, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (568, 13, 0, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (569, 13, 1, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (570, 13, 2, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (571, 13, 3, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (572, 13, 4, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (573, 13, 5, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (574, 13, 6, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (575, 28, 0, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (576, 28, 1, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (577, 28, 2, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (578, 28, 3, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (579, 28, 4, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (580, 28, 5, FALSE, 360, 1380);
INSERT INTO "gym_hours" ("id", "gym_id", "day_of_week", "is_closed", "open_minute", "close_minute") VALUES (581, 28, 6, FALSE, 360, 1380);

-- gyms (16 rows)
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (14, 'Kormangala - (4th Block)', 'koramangala-4th-block', 'Bengaluru', 'Koramangala', '142 ST BED layout 1st Main Road, 8th - Cross Rd, Koramangala, Bengaluru, Karnataka 560034', '/api/storage/db-images/8491d904-4ad2-4b62-97a1-1815395c70e6', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, '', ARRAY['/api/storage/db-images/89aa75eb-a6d6-41c5-ae78-f061106cf791','/api/storage/db-images/6cf57929-b189-49b5-b6ea-55a4e0058092','/api/storage/db-images/71ecb639-f280-4fe5-ac15-a961b8e87577','/api/storage/db-images/65021d4d-d7a8-4acf-8f6c-71d1b6b301a5','/api/storage/db-images/6aab1e50-06c1-40c0-a387-8c5747054ac8','/api/storage/db-images/39790b8e-97a6-48cf-b01a-bff15a775c69','/api/storage/db-images/e76cbef1-f733-402f-92e9-6f9a5d51f1fb','/api/storage/db-images/106a1a53-674c-4089-9934-1ce69d307e7c','/api/storage/db-images/2045ce20-c8cd-4ae4-be8e-662e706d1537','/api/storage/db-images/107307de-5592-4f70-a8f8-f0aa7709948e']::text[], '5am – 11pm', 12.9318695, 77.63334, TRUE, 40, '/api/storage/db-images/30f1120a-03e6-4ebb-912a-6a4935c344dd', 100, 18, TRUE, 'https://www.youtube.com/watch?v=gfnJDGGVQOs');
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (17, 'White Field - ( Seegehalli )', 'seegehalli', 'Bengaluru', 'Whitefield', '', '/api/storage/db-images/1774622e-7d9e-47d5-b162-9fdb59fc5b75', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/8d586b76-58df-4aa8-8628-432ea4df1a98','/api/storage/db-images/91a1897c-be7a-43b0-924d-6a488fcfdd06','/api/storage/db-images/4114aa93-00a7-44ce-bc6a-1cacbc1185ec','/api/storage/db-images/9d6a931d-cd73-4869-af0b-79a46bed6853','/api/storage/db-images/d7875a99-0773-4262-8127-ba73ad8225f1','/api/storage/db-images/b3b6c5a1-f933-4d09-8de2-348dd32b235f','/api/storage/db-images/7ca61aa4-e640-4e56-b94a-e24f2ee90240','/api/storage/db-images/fee93cf3-3437-4de3-9ec6-fc9997256cdd']::text[], '5am – 11pm', 13.012693, 77.76112, TRUE, 53, '/api/storage/db-images/4e158da3-5038-4760-b6cd-19cd52aaac10', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (21, 'Bellandur - ( Green Glen Layout )', 'bellandur-green-glan', 'Bengaluru', 'Bellandur', '1st Floor, 152, Hobli, near HDFC bank, Green Glen Layout, Bellandur, Varthur, Bengaluru, Karnataka 560103', '/api/storage/db-images/040aa374-8588-45ae-8ea0-54b258fe9e8b', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/ef2d4dba-60a9-428c-a31c-c78dc2b8e25d','/api/storage/db-images/da765e7a-f014-4342-9243-232771276cb6','/api/storage/db-images/afee4c21-a888-486b-9cde-01371fb6a8a0','/api/storage/db-images/86a4085d-fabd-45d2-a094-e3015997dcc6','/api/storage/db-images/2d3b73bd-81ca-4083-b614-10b0b06ac7e5','/api/storage/db-images/6235a9dd-e3ac-4db1-bec9-fcaa5ad36a11','/api/storage/db-images/08e0d977-47f8-466a-bd98-624078085da0','/api/storage/db-images/1fbe7fcb-8ea5-4f15-a9eb-e4efc3911946','/api/storage/db-images/b1c3ed5c-f64a-4f8b-93a9-cbf6ce800b74','/api/storage/db-images/8485ab1a-ff02-49ca-93c6-55bfe43d3bb6','/api/storage/db-images/ba91e540-9fc8-4ec9-b88a-cd2308880e29']::text[], '5am – 11pm', 12.927508, 77.67123, TRUE, 48, '/api/storage/db-images/f60d4504-72d7-46e4-a6fb-841530bc6d33', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (23, 'BTM Layout - ( Tavarekere  )', 'btm-tavarekere', 'Bengaluru', 'BTM Layout', '170, Sree Panduranga Complex, 16th Main, Tavarekere Main Rd, Madiwala, Tavarekere, Bengaluru, Karnataka 560029', '/api/storage/db-images/acb2ac0b-1b42-40b9-be8f-6f97496f7348', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/5aa60ee5-9d57-46e8-8407-a0c7869e0a76','/api/storage/db-images/f9f329d0-7d4c-496d-b662-e506cbd202ca','/api/storage/db-images/a11f097f-eb16-490f-bda9-00b465adca19','/api/storage/db-images/4ee438b6-c179-431f-ab85-d68dd8137ef0','/api/storage/db-images/ab753f71-d9b7-4c75-bcb0-049fb37d025c','/api/storage/db-images/3189e8c8-bed6-4fb8-9d31-aba28151d962','/api/storage/db-images/801c0f38-a87e-4c9b-a887-0f2f7fa8a5e0','/api/storage/db-images/0c415ca4-dc19-4304-b84c-0c36bccb022e','/api/storage/db-images/17969285-0353-4566-8cde-9d59e7515278','/api/storage/db-images/c7f00406-8628-459e-8ee2-05bea8269464','/api/storage/db-images/dd25fa82-479d-4d81-8800-3f33f74c1f8e']::text[], '5am – 11pm', 12.921884, 77.610695, TRUE, 47, '/api/storage/db-images/34aa3476-a80b-4fb0-bb26-7834efe41d6a', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (19, 'JP Nagar - ( 7th Phase)', 'jp-nagar-7th-phase', 'Bengaluru', 'JP Nagar', 'sqft, 721, infront of Kai Ruchi, 11000, Kothnur Main Rd, above Smart Bazaar, Kothnur, RBI Layout, JP Nagar 7th Phase, J. P. Nagar, Bengaluru, Karnataka 560078', '/api/storage/db-images/74229c47-8501-4de6-aced-16df3aa9dfa5', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/9ee1be4b-d3cb-4799-a484-f105930fc3ee','/api/storage/db-images/c69ad85f-bcea-4cdf-9147-08f67303568a','/api/storage/db-images/fedadb7e-1edf-49de-924e-d9fa63c4f409','/api/storage/db-images/99f4785f-ae7e-404b-a843-b8d28aeecde5','/api/storage/db-images/8d89ab3a-dc74-4db6-90f1-50bc3288e29b','/api/storage/db-images/129a76a8-1493-4330-9a3b-88cef424c81e','/api/storage/db-images/e2de62ff-b422-4185-a857-9e3227ca51ad','/api/storage/db-images/1aee6188-e38a-4c99-90b0-a7522a401402','/api/storage/db-images/7aa92b41-3044-4538-8958-28abe9316c16','/api/storage/db-images/29c6b2ce-7cf8-4c4f-a5d0-01bf3e076d65']::text[], '5am – 11pm', 12.887236, 77.50572, TRUE, 51, '/api/storage/db-images/4124b58c-bd5e-4bf2-a4f5-44ba5017be8d', 100, 18, TRUE, 'https://www.youtube.com/watch?v=f46qYiSj41k');
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (16, 'Marathahalli - (SGR Road)', 'marathahalli', 'Bengaluru', 'Marathahalli', '', '/api/storage/db-images/86465fa0-f003-4767-b35c-cf23ee5af334', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/2563dab4-b7ed-4b2d-97ab-3816b7a06fc2','/api/storage/db-images/c5423161-794a-4468-910a-3497bd97ccac','/api/storage/db-images/aeb0e465-5230-456a-a34f-14a2fb1f5f18','/api/storage/db-images/f26585d6-8f23-4587-aa5c-bb6418383e4b','/api/storage/db-images/34a4cc49-65d1-4e67-ae55-1732083e4d95','/api/storage/db-images/810cdac9-c313-4bf4-8ba8-a53ca50cadbd','/api/storage/db-images/d209172e-823c-475d-824d-270bf27e84e7']::text[], '5am – 11pm', 12.948654, 77.70411, TRUE, 54, '/api/storage/db-images/8aa0c5eb-1e38-419a-a67c-8f4f7bfbeb45', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (27, 'Koramangala - (5th Block)', 'koramangala-5th-block', 'Bengaluru', 'Koramangala 5th block', 'MM Mention, 67, 60 Feet Rd, KHB Colony, 5th Block, Koramangala, Bengaluru, Karnataka 560095', '/api/storage/db-images/2353be0a-d62c-4d27-bf7d-8efcd21449d1', 4.5, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/1322998b-db6a-4ca3-a477-0f739100c97a','/api/storage/db-images/76ceb529-83f3-4dd3-9753-a778e748567d','/api/storage/db-images/0a3a3040-a8b7-4e72-a761-28b5ddc0d19b','/api/storage/db-images/7e647624-fb76-4ad6-bb45-1aa1bbebb496','/api/storage/db-images/4d535136-a3fc-417f-863f-771fce591062','/api/storage/db-images/cce2cd47-9e84-4de6-bb15-f52a845e470e','/api/storage/db-images/6ed4e0dc-f557-4e84-a2c1-285331acac23','/api/storage/db-images/1f7ae346-18a1-43fa-bd3a-b12f0774964e','/api/storage/db-images/81ce515e-3bd6-4aaf-aba1-c4f56800b690','/api/storage/db-images/8a8e4c4c-2cf9-45d9-af02-43d08e9c1783']::text[], '5am – 11pm', 12.933846, 77.617676, TRUE, 43, '/api/storage/db-images/2a584a40-0b9f-44fd-b40b-27aea8b62941', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (15, 'Brookefield - ( AECS Layout)', 'brook-field', 'Bengaluru', 'Brookefield', '', '/api/storage/db-images/cf9eb894-32d6-46dc-9fa7-f040c52ca7ec', 5, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/9a911813-b0fe-4e86-9b80-7e87b20503db','/api/storage/db-images/5050fcdf-c8d2-4d4e-859f-eea9b40f8ff4','/api/storage/db-images/bce093d9-6ac5-4f70-ae20-2572a381ec03','/api/storage/db-images/dd4581f8-33ff-4bce-af49-54b304ea86a8','/api/storage/db-images/1c66a8a8-f3e5-4339-aad9-f893f1a78c9c','/api/storage/db-images/3252effd-dab8-43d6-be24-b62bcd905430','/api/storage/db-images/dff2beb2-d8b6-4af5-bf0a-56fb61f500de']::text[], '5am – 11pm', 12.959829, 77.71605, TRUE, 55, '/api/storage/db-images/b4798412-16d5-4543-a6df-f190128093f6', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (13, 'Koramangala (1st Block )', 'iconic-fitness-1st-block', 'Bengaluru', 'Koramangala', '43, 5th A Main Rd, near Wipro Park, 1st Block Koramangala, Koramangala, Bengaluru, Karnataka 560034', '/api/storage/db-images/57e3c06f-6498-424d-85b6-d8a9e4ea9274', 4.9, 0, 999, ARRAY['Gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, '', ARRAY['/api/storage/db-images/d8d84308-0b8b-431e-88f2-e7ff4c66b604','/api/storage/db-images/3c97e88c-df14-447d-ac50-29a9d6c69ca0','/api/storage/db-images/bdde624c-c5ce-4aa9-95b8-cc1df941db07','/api/storage/db-images/2d8e716c-a2a6-4034-a692-53c7e2fe9fd5','/api/storage/db-images/4a791890-447d-4561-ad56-5fda753c7dce','/api/storage/db-images/ab8465fb-22d4-4812-a389-e6ddc7da13a8','/api/storage/db-images/2935f90e-a261-4e01-bd72-472b09e2dda1','/api/storage/db-images/59144d39-6eb5-4e0e-a915-610ff9c21f74','/api/storage/db-images/fe223ec7-33de-4d4e-a7c6-27e5a9add9e0','/api/storage/db-images/1c5abe99-d731-4a6c-9e51-df6fc6e5562f','/api/storage/db-images/d2de4e69-f902-46e6-acc2-0a612074e611']::text[], '5am – 11pm', 12.929273, 77.63438, TRUE, 41, '/api/storage/db-images/95454eea-69dc-4c59-9d22-785c416b164c', 100, 18, TRUE, 'https://www.youtube.com/watch?v=FUqIBGi_Na8');
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (24, 'BTM Layout - ( Maruti Nagar )', 'btm-marutinagar', 'Bengaluru', 'BTM Layout', 'To More Super Market, No 4/19,1st Floor, Maruti Nagar, BTM 1st Stage, Bengaluru, Karnataka 560068', '/api/storage/db-images/f45439ef-3d48-499b-87bc-c7383c0bf0c9', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/b129f4b1-d585-408b-9b5a-4ea8ca57808c','/api/storage/db-images/711b4c6b-7d1c-45da-9065-eb9bcbd277a0','/api/storage/db-images/529923fa-0686-4475-94d6-cba842db63bb','/api/storage/db-images/b3402c4b-5058-496d-aac6-4f294014c94c','/api/storage/db-images/440ecaf5-a2b6-466c-847a-d2784cce8907','/api/storage/db-images/bce1426b-6c7d-4303-bc16-ce44714af5ba','/api/storage/db-images/53a3e0e7-24e7-4464-894d-1800f75f512e','/api/storage/db-images/523b9ed8-71fa-41f7-94d0-79f11b6b9933','/api/storage/db-images/f8ab65f0-9276-4d45-826a-42f13eb0eccc','/api/storage/db-images/8d3c9ee7-7de8-4bc2-b096-2e276b4dcb26']::text[], '5am – 11pm', 12.921548, 77.61382, TRUE, 46, '/api/storage/db-images/1cffec92-2f82-4a5d-9a95-a3fedb8340a7', 100, 18, TRUE, 'https://www.youtube.com/watch?v=miXuBIpsIgY');
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (22, 'Bellandur Centro (ORR)', 'bellandur-centro', 'Bengaluru', 'Bellandur', 'RR Pyramid building, 12000Sqft, 1st, 2nd, 3rd, & 4th floor, Outer Ring Road, mall, next to Bengaluru Centro, Bellandur, Bengaluru, Karnataka 560103', '/api/storage/db-images/be56d4ca-1183-46fe-a956-08d829d4553b', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/a60312cf-29b3-4f4d-a735-5aec2ec69b0d','/api/storage/db-images/895183c4-fe50-48f3-9250-6e96ac20ad1b','/api/storage/db-images/7d9367ef-886f-49bd-a40a-8a0f13d1840e','/api/storage/db-images/d2bf2d0a-46ae-408d-9870-0a44ce0348cf','/api/storage/db-images/329e193b-06b3-4e18-81e1-2d5218046462','/api/storage/db-images/f487bdaf-9b20-4cfd-ba0a-62ceef7ccfcd','/api/storage/db-images/cac13bb7-1bb6-4209-ac0a-ce8a022dea4f','/api/storage/db-images/0a361044-5f66-4e48-803a-073cdc5cffa9','/api/storage/db-images/a67d9bda-cec2-439e-85d4-4af92afb8686','/api/storage/db-images/3570a066-4377-4561-ba96-c7ded59fe70e','/api/storage/db-images/dcc66a2e-3360-4bef-9114-769b5cddd563','/api/storage/db-images/b34d32f0-e296-4ea7-9444-8436d73067ba']::text[], '5am – 11pm', 12.925849, 77.675705, TRUE, 49, '/api/storage/db-images/45d35970-31b2-4a8d-86e9-6d8a312c1a94', 100, 18, TRUE, 'https://www.youtube.com/watch?v=40BS7TXAYR4');
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (18, 'JP Nagar - ( Puttenahalli )', 'jp-nagar-puttenahalli', 'Bengaluru', 'JP Nagar', 'Puttenahalli Rd, BOB Colony, JP Nagar 7th Phase, J. P. Nagar, Bengaluru, Karnataka 560078', '/api/storage/db-images/748c0b04-03ab-48d5-816a-edbecd432e49', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/7aed2e6b-8dbb-40ac-88c4-95476833f8e3','/api/storage/db-images/d94ffdc8-c10b-4d44-9ef9-42abccf802eb','/api/storage/db-images/bc1877a8-6ac2-421e-9e08-f6d30d347a44','/api/storage/db-images/2080b781-b27e-43a3-808f-75c3772cfe87','/api/storage/db-images/d66fcde0-4f58-4714-8663-42c2933c9282','/api/storage/db-images/9f35735d-561f-4112-8f76-09d0cca35093','/api/storage/db-images/08f71519-2526-4a95-a9d3-bb0a0aa7e746','/api/storage/db-images/7646c2e8-2980-4257-a16d-fd8b14a8fbd7','/api/storage/db-images/4eb0ce5c-c5e2-4579-b5e6-1ae53266cdfb','/api/storage/db-images/42d4af00-b28f-4557-b937-ed0fd70b4f81','/api/storage/db-images/923fa1c4-e668-4795-aaeb-0fc00aa1a490','/api/storage/db-images/a45f20f2-34c6-4a6c-94cf-4ce7ad1df2b1','/api/storage/db-images/4133b8ad-f1c5-4805-8aa3-b0258daf9bc5','/api/storage/db-images/0a0e703f-fcb7-4964-8b44-988643010e22']::text[], '5am – 11pm', 12.897742, 77.582756, TRUE, 52, '/api/storage/db-images/e00021d8-7b8c-4ed9-a8fc-71f7f969cebe', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (26, 'HSR Layout - ( Sector 7 ) ', 'hsr-sector-2', 'Bengaluru', 'HSR Layout', ' 70/7, 3rd Cross Rd, next to New Aswad Hospital, Rajiv Gandhi Nagar, 7th Sector, HSR Layout, Bengaluru, Karnataka 560068', '/api/storage/db-images/c7ebac7f-396d-4963-b3b5-776bc7aea327', 4.5, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/5510f860-64e8-4e0c-859d-5ac19f59d111','/api/storage/db-images/c40dde6d-a7b9-4460-a160-a443bba7d223','/api/storage/db-images/3d4a17ff-cae2-429a-a4bc-72e847ae7ee2','/api/storage/db-images/8ebaa3f5-98f6-4fc1-9d54-4ba07c3ca046','/api/storage/db-images/2552bb38-9403-452f-8bfb-e9354339e43a','/api/storage/db-images/122cd6a2-b7e6-48f6-b209-99ff8ae75d5c','/api/storage/db-images/61cefe96-8918-4966-b729-0d6b30c9e5f2','/api/storage/db-images/c650859b-daeb-48f5-bfe5-6a7ca90a9f76','/api/storage/db-images/a2422583-9471-4a1d-bfb5-13264e3554af','/api/storage/db-images/97c6e38c-eb75-40a7-96ec-899d1da951a8']::text[], '5am – 11pm', 12.907409, 77.62977, TRUE, 44, '/api/storage/db-images/e9036532-31f0-451b-9022-484d65ec8c1a', 100, 18, TRUE, NULL);
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (20, 'Indiranagar - (80 Feet Road)', 'indranagar', 'Bengaluru', 'Indiranagar', '3rd, 4th and 5th Floor, 872/A, 80 Feet Rd, above Brik Oven, near Sapna book house, HAL 2nd Stage, New Tippasandra, Bengaluru, Karnataka 560075', '/api/storage/db-images/01677f35-2d1e-4d07-9ab8-409b0eb80752', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/5db420c3-ff2c-4504-a617-257d557e9ebb','/api/storage/db-images/d4679daf-20b7-40ff-8b4c-f348515c7e27','/api/storage/db-images/50434b19-c952-4a3c-8c7d-d15ad297f35b','/api/storage/db-images/f60bf9d3-012d-46fb-bb74-46ecaacfee63','/api/storage/db-images/ee1a2870-7680-48f1-81cf-2e76feaeddc8','/api/storage/db-images/6b602fa1-ca23-4c19-9805-aad866c6ce79','/api/storage/db-images/d3e885ff-25e1-48bb-a27f-019f887774aa','/api/storage/db-images/4d5c4765-ec68-4aac-b352-12293c67dce2']::text[], '5am – 11pm', 12.979764, 77.64657, TRUE, 50, '/api/storage/db-images/95ddd79c-d726-4e7f-8855-10cd9f609582', 100, 18, TRUE, 'https://www.youtube.com/watch?v=Nn5e8jcG-BY');
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (25, 'HSR  Layout - ( Sector  2)', 'hsr-sector-7', 'Bengaluru', 'HSR Layout', 'Apartment, 107, 24th Cross Rd, next to Purva Fairmont Road, above ALANKRITA, Garden Layout, Sector 2, HSR Layout, Bengaluru, Karnataka 560102', '/api/storage/db-images/aa0ad859-1539-4001-a6b3-25213770cffa', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/62c6c4af-bbc9-47d7-9f12-e7e2470a7bf1','/api/storage/db-images/d74fdf3d-d504-44e7-9bcb-97a3c40ea7ea','/api/storage/db-images/1a62ffd6-7ea3-44e5-b41c-291ca0995df5','/api/storage/db-images/56e1ad91-00c9-4a18-ac6e-4556c0a3299c','/api/storage/db-images/567f2f8f-f6e0-4530-870a-9c7d50c744fc','/api/storage/db-images/cd4c2803-69af-493e-bf0f-e0a90173f5dd','/api/storage/db-images/f65f75f1-d0e5-45d0-aa02-258092b95f2f','/api/storage/db-images/74b7cc65-968f-4664-ba7d-d91c3e1fca9c','/api/storage/db-images/5f7a2840-a0e2-4189-b5c8-98592755547b','/api/storage/db-images/26833bdc-855a-41c5-9a54-a060b2154bee','/api/storage/db-images/5e4f3db9-4e3d-4501-bd47-806fe073f80b','/api/storage/db-images/dc118ad8-472b-4d32-b59e-8cd6f408c5f7','/api/storage/db-images/5c221774-633b-484b-9e38-1cd093f5c91d','/api/storage/db-images/a9369e9e-cb01-4289-a75d-9348fea4f4a8']::text[], '5am – 11pm', 12.905199, 77.64884, TRUE, 45, '/api/storage/db-images/0a88a1c0-0c9c-4a22-853b-010a714f3c17', 100, 18, TRUE, 'https://www.youtube.com/watch?v=IR6adaGs9Hs');
INSERT INTO "gyms" ("id", "name", "slug", "city", "area", "address", "hero_image", "rating", "reviews_count", "price_from", "categories", "amenities", "distance_km", "is_premium", "open_now", "about", "gallery", "hours", "lat", "lng", "featured", "owner_partner_id", "logo_url", "payout_per_visit_inr", "payout_tax_pct", "is_verified", "video_url") VALUES (28, 'Koramangala - (7th Block)', 'koramangala-7th-block', 'Bengaluru', 'Koramangala', '2nd Floor, Site No 6/B, 20th Main Rd, above HDFC Bank, next to Bombay Adda, KHB Colony, 7th Block, Koramangala, Bengaluru, Karnataka 560095', '/api/storage/db-images/e951f4ed-4d94-4cb3-b067-e84b8dd083d3', 4.9, 0, 999, ARRAY['gym']::text[], ARRAY[]::text[], 2.5, TRUE, TRUE, 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', ARRAY['/api/storage/db-images/39974428-7664-48ea-98a7-0a6a83f263eb','/api/storage/db-images/91a2827a-3191-41a7-9b59-9cfaf845c22d','/api/storage/db-images/ebfe0bbf-6308-4df4-af45-957616b6027f','/api/storage/db-images/f711ffe7-a654-4073-9365-d3d9f4eb823e','/api/storage/db-images/d9ffe209-d562-4f32-a9ad-e6fb469669f2','/api/storage/db-images/27fe1231-ce31-4358-9551-0db17f8ce5d1','/api/storage/db-images/d95b1e98-9b40-4409-9741-b4858db89649','/api/storage/db-images/ab709097-fd93-4707-9051-c0904a4b9e7e','/api/storage/db-images/d36ca7d2-3613-487c-a81f-e39ec87eecd0','/api/storage/db-images/1f35ffd8-12ac-40db-9559-758412757a78','/api/storage/db-images/90e7856c-9cce-497d-abe2-a713d47c1291','/api/storage/db-images/2a2cdb8a-f149-4c16-9c4f-1b2d70ac1d77','/api/storage/db-images/fc4cc816-7784-4af9-9f71-c0cae00b4cf2','/api/storage/db-images/b168ed0f-9dd0-4423-9e04-1aeb2b9ce0dd']::text[], '5am – 11pm', 12.936399, 77.61611, TRUE, 42, '/api/storage/db-images/6426726d-1193-433b-be8a-423108c8ad58', 100, 18, TRUE, 'https://www.youtube.com/watch?v=DqMQ266G_Sk');

-- leads (5 rows)
INSERT INTO "leads" ("id", "kind", "name", "phone", "email", "city", "class_id", "gym_id", "class_name", "gym_name", "preferred_date", "message", "source", "status", "assigned_to", "notes", "created_at", "updated_at", "plan_id", "plan_name", "plan_price_inr", "preferred_time") VALUES (4, 'gym', 'Abhishek Dwivedi', '+919844876569', 'abhidy@yahoo.co', '', NULL, 17, '', 'seegehalli', '', '', 'gym-detail-try-for-free', 'new', '', '', '2026-06-03T14:59:38.057354+00:00', '2026-06-03T14:59:38.057354+00:00', NULL, '', 0, '');
INSERT INTO "leads" ("id", "kind", "name", "phone", "email", "city", "class_id", "gym_id", "class_name", "gym_name", "preferred_date", "message", "source", "status", "assigned_to", "notes", "created_at", "updated_at", "plan_id", "plan_name", "plan_price_inr", "preferred_time") VALUES (5, 'gym', 'Askanda', '6005946996', '', '', NULL, 14, '', 'Kormangala - (4th Block)', '2026-06-08', '', 'gym-detail-try-for-free', 'new', '', '', '2026-06-05T06:44:08.945425+00:00', '2026-06-05T06:44:08.945425+00:00', NULL, '', 0, '');
INSERT INTO "leads" ("id", "kind", "name", "phone", "email", "city", "class_id", "gym_id", "class_name", "gym_name", "preferred_date", "message", "source", "status", "assigned_to", "notes", "created_at", "updated_at", "plan_id", "plan_name", "plan_price_inr", "preferred_time") VALUES (6, 'gym', 'Midhun Chandran', '+916282491355', 'midhunchandran511@gmail.com', 'Bangalore', NULL, 14, '', 'Kormangala - (4th Block)', '2026-06-06', '', 'gym-detail-try-for-free', 'new', '', '', '2026-06-05T16:00:55.62503+00:00', '2026-06-05T16:00:55.62503+00:00', NULL, '', 0, '');
INSERT INTO "leads" ("id", "kind", "name", "phone", "email", "city", "class_id", "gym_id", "class_name", "gym_name", "preferred_date", "message", "source", "status", "assigned_to", "notes", "created_at", "updated_at", "plan_id", "plan_name", "plan_price_inr", "preferred_time") VALUES (7, 'gym', 'Ashish  P', '7992758305', 'ap056056@gmail.com', 'Bengaluru', NULL, 16, '', 'Marathahalli - (SGR Road)', '2026-06-08', '', 'gym-detail-try-for-free', 'new', '', '', '2026-06-06T09:35:35.309281+00:00', '2026-06-06T09:35:35.309281+00:00', NULL, '', 0, '');
INSERT INTO "leads" ("id", "kind", "name", "phone", "email", "city", "class_id", "gym_id", "class_name", "gym_name", "preferred_date", "message", "source", "status", "assigned_to", "notes", "created_at", "updated_at", "plan_id", "plan_name", "plan_price_inr", "preferred_time") VALUES (8, 'gym', 'Abhishek Khanna', '9871741322', 'abhishekkhanna1997@gmail.com', '', NULL, 22, '', 'Bellandur Centro (ORR)', '2026-06-06', '', 'gym-detail-try-for-free', 'new', '', '', '2026-06-06T09:42:26.826262+00:00', '2026-06-06T09:42:26.826262+00:00', NULL, '', 0, '');

-- memberships (5 rows)
INSERT INTO "memberships" ("id", "name", "tagline", "billing_period", "price_inr", "original_price_inr", "gyms_included", "classes_per_month", "perks", "badge", "popular") VALUES (1, '1 Month', '₹118 / day', 'monthly', 3540, 4000, 16, 20, ARRAY['Access to 16+ Iconic Gyms','Free GX Classes','100+ Workout Formats','Flexible EMI Options','Physiotherapy Consultation','In-house Dieticians','Steam & Shower Facilities','BMI Analysis']::text[], '', FALSE);
INSERT INTO "memberships" ("id", "name", "tagline", "billing_period", "price_inr", "original_price_inr", "gyms_included", "classes_per_month", "perks", "badge", "popular") VALUES (2, '3 Months', '₹81 / day', 'quarterly', 7260, 8500, 16, 20, ARRAY['Access to 16+ Iconic Gyms','Free GX Classes','100+ Workout Formats','Flexible EMI Options','Physiotherapy Consultation','In-house Dieticians','Steam & Shower Facilities','BMI Analysis']::text[], 'Popular', FALSE);
INSERT INTO "memberships" ("id", "name", "tagline", "billing_period", "price_inr", "original_price_inr", "gyms_included", "classes_per_month", "perks", "badge", "popular") VALUES (3, 'Starter 6 Month', 'Try the network', 'annual', 8999, 10000, 16, 1, ARRAY['Access to 16+ Iconic Gyms','Free GX Classes','100+ Workout Formats','Flexible EMI Options','Physiotherapy Consultation','In-house Dieticians','Steam & Shower Facilities','BMI Analysis']::text[], 'Half Year', FALSE);
INSERT INTO "memberships" ("id", "name", "tagline", "billing_period", "price_inr", "original_price_inr", "gyms_included", "classes_per_month", "perks", "badge", "popular") VALUES (4, '12 Months', '₹50 / day', 'annual', 17999, 20999, 16, 999, ARRAY['Access to 16+ Iconic Gyms','Free GX Classes','100+ Workout Formats','Flexible EMI Options','Physiotherapy Consultation','In-house Dieticians','Steam & Shower Facilities','BMI Analysis']::text[], 'Best Value', FALSE);
INSERT INTO "memberships" ("id", "name", "tagline", "billing_period", "price_inr", "original_price_inr", "gyms_included", "classes_per_month", "perks", "badge", "popular") VALUES (5, '15 Months', '₹24 / day', 'annual', 10498, 25000, 16, 20, ARRAY['Access to 16+ Iconic Gyms','Free GX Classes','100+ Workout Formats','Flexible EMI Options','Physiotherapy Consultation','In-house Dieticians','Steam & Shower Facilities','BMI Analysis']::text[], 'Save 52%', TRUE);

-- notifications (16 rows)
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (1, 'admin', 1, 'System ready', 'Notifications feature is live.', '/admin/notifications', 'b1e1339d-4233-44b9-9151-d90f3ff4ba0c', 2, NULL, '2026-05-26T13:27:31.916561+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (2, 'admin', 2, 'System ready', 'Notifications feature is live.', '/admin/notifications', 'b1e1339d-4233-44b9-9151-d90f3ff4ba0c', 2, NULL, '2026-05-26T13:27:31.916561+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (3, 'admin', 4, 'System ready', 'Notifications feature is live.', '/admin/notifications', 'b1e1339d-4233-44b9-9151-d90f3ff4ba0c', 2, NULL, '2026-05-26T13:27:31.916561+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (4, 'admin', 5, 'System ready', 'Notifications feature is live.', '/admin/notifications', 'b1e1339d-4233-44b9-9151-d90f3ff4ba0c', 2, NULL, '2026-05-26T13:27:31.916561+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (5, 'admin', 2, 'Hi', 'You only', '', 'a471bd27-e64e-42d4-a347-4007e8c852ff', 2, NULL, '2026-05-26T13:30:01.951019+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (6, 'admin', 1, 'New support ticket', 'sdasa — raised by staff', '/admin/tickets?ticket=2', '182b4cba-ac67-4c08-87b3-031bcf52036f', NULL, NULL, '2026-05-29T13:32:46.866537+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (7, 'admin', 2, 'New support ticket', 'sdasa — raised by staff', '/admin/tickets?ticket=2', '182b4cba-ac67-4c08-87b3-031bcf52036f', NULL, NULL, '2026-05-29T13:32:46.866537+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (8, 'admin', 4, 'New support ticket', 'sdasa — raised by staff', '/admin/tickets?ticket=2', '182b4cba-ac67-4c08-87b3-031bcf52036f', NULL, NULL, '2026-05-29T13:32:46.866537+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (9, 'admin', 5, 'New support ticket', 'sdasa — raised by staff', '/admin/tickets?ticket=2', '182b4cba-ac67-4c08-87b3-031bcf52036f', NULL, NULL, '2026-05-29T13:32:46.866537+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (10, 'staff', 1, 'Ticket assigned to you', 'sdasa', '/staff/tickets?ticket=2', '800ee64a-85a4-4e00-8b30-543888f9da93', NULL, NULL, '2026-05-29T13:33:50.861463+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (11, 'staff', 1, 'New reply on ticket', 'sdasa: XsxaxaXZXZ', '/staff/tickets?ticket=2', 'b70c6d3c-89c3-4932-a98e-eb8911f38298', NULL, NULL, '2026-05-29T13:33:53.059487+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (12, 'admin', 1, 'New support ticket', 'issue with ac — raised by partner', '/admin/tickets?ticket=3', 'fa052221-443f-49d4-9113-f4d865332d98', NULL, NULL, '2026-06-01T11:16:58.049423+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (13, 'admin', 2, 'New support ticket', 'issue with ac — raised by partner', '/admin/tickets?ticket=3', 'fa052221-443f-49d4-9113-f4d865332d98', NULL, NULL, '2026-06-01T11:16:58.049423+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (14, 'admin', 4, 'New support ticket', 'issue with ac — raised by partner', '/admin/tickets?ticket=3', 'fa052221-443f-49d4-9113-f4d865332d98', NULL, NULL, '2026-06-01T11:16:58.049423+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (15, 'admin', 5, 'New support ticket', 'issue with ac — raised by partner', '/admin/tickets?ticket=3', 'fa052221-443f-49d4-9113-f4d865332d98', NULL, NULL, '2026-06-01T11:16:58.049423+00:00');
INSERT INTO "notifications" ("id", "recipient_type", "recipient_id", "title", "body", "link", "batch_id", "created_by_admin_id", "read_at", "created_at") VALUES (16, 'partner', 3, 'Ticket status updated', 'issue with ac is now in progress', '/partner/tickets?ticket=3', '0b2e78a1-023d-49b1-a2cf-f932b26e0c68', NULL, NULL, '2026-06-06T11:35:01.8994+00:00');

-- partners (16 rows)
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (45, 'HSR Layout (Sector 2)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$FQlcC6KgT7INUKvplnhVTO/LpPfNpRGzctiQcCGHjFj1EZDGZAuju', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:35:47.402+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (44, 'HSR Layout (Sector 7)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$VFV5GMxh0Ty5z0fhV.X76..Pki4WXHlHooHMKu5ZyUIU8qCebJPEK', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:21:42.233+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (46, 'BTM Layout ( Maruthi Nagar )', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$lEnwvy949i3Ek8ugQFTY8eZuurAHGya9wRxYd7Y0B.GDGw8rd/VMe', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:37:05.471+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (49, 'Bellandur  Centro (ORR)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$1maHYMW/a/Mf2/sqt6BaUuNYIdC86DDVipjFjbHMijty8DYcKggAW', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:40:05.452+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (48, 'Bellandur - (Green Glan Layout )', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$dBexnaPHLRwXPWhocRyF5.GY9dbVOfHHs9fakXVLJotrWCqDpWYeW', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:38:47.024+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (40, 'Kormangala (4th Block)', 'info@iconicfitnessindia.com', '7026276888', '$2b$10$i0Ed4Ue9vMWl.Lr1Kdk0kO8f1I/OrcZN59ljvEXBtw/OgQZC5IOEa', 'active', 'Bengaluru', 'Best Gym', '2026-06-01T12:04:44.082+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (43, 'Koramangala (5th Block  )', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$RzVXW9fJCXL8iftjJBIRP.NX3HJjA845YX3VL6j4Oxx.1FxWX9V7y', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:20:46.869+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (42, 'Koramangala (7th Block)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$C0BYQUL2lkANJS6dOrE63e5Yv36e/eTq2n3NXlZzA./m1Qcl8p.IS', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:19:55.114+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (41, 'Koramangala (1st Block )', 'info@iconicfitnessindia.com', '7026276888', '$2b$10$vGeE7hzorJcKApDbDS4jn.IVJ5lO9BoePj7GsBdVpAogswm9vKtD2', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:17:40.506+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (50, 'Indiranagar (80 Feet Road)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$V5tnb0xwgShnchLGcXkGnuPr9mfW/Ur2cx5rCqlVfU0Omnk3X.IOK', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:40:33.469+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (54, 'Marathahalli (SJR Road)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$xa1UK9lUEmY6ADlo2.PC3OezsYKJ4A4qBVp.M1dHufLr6hwWY/4I.', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:43:24.232+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (52, 'JP nagar  (Puttenahalli)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$eyC2P.iy9kcacTaGSUIp0eoDF1tCl3F0sexDyQLRfj/zLzcHwhEry', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:42:06.097+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (53, 'White Field ( Seegehalli )', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$GuUWc2K4Xna5FY3y2f2l6erLjD3cFqYalGL5dF3MCERJpX4uiFLjO', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:42:42.228+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (47, 'BTM  Layout (Tavarekere)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$vxu46JMUlamQyTOCYL1Gje2svHXmeG7fnx78fpuSOAaG5oFkWiCbS', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:37:52.656+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (51, 'JP nagar (7th Phase)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$QMx.4W26u2B1Sf11mKqJFO3sXyZF57kJIV5ZQOhuSEl1enkovNdg.', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:41:23.368+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);
INSERT INTO "partners" ("id", "name", "email", "phone", "password_hash", "status", "city", "notes", "created_at", "kind", "avatar_url", "pending_amenity_ids") VALUES (55, 'Brookefield ( AECS Layout)', 'support@iconicfitnessindia.com', '7026276888', '$2b$10$DzVSy4GkFLWM/GPAgAPEpu61AXkyvDPD.DQ7fOxurvvy0sXyWdEXi', 'active', 'Bengaluru', 'We believe fitness shouldn''t be confined to four walls. Iconic Fitness was built to break the chains of the traditional gym membership — where you''re locked into one location, one brand, one routine.

Our Mission — Give everyone the freedom to train wherever life takes them.

Our Vision — Build the largest, most accessible fitness network, powered by a single membership.', '2026-06-01T13:43:52.139+00:00', 'gym', '', ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]::integer[]);

-- product_order_items (1 rows)
INSERT INTO "product_order_items" ("id", "order_id", "product_id", "vendor_partner_id", "product_name", "unit_price_inr", "qty") VALUES (1, 1, 3, 1, 'Pro Resistance Bands Set', 1199, 1);

-- product_orders (1 rows)
INSERT INTO "product_orders" ("id", "customer_name", "customer_email", "customer_phone", "shipping_address", "shipping_city", "shipping_pincode", "total_inr", "payment_method", "status", "created_at") VALUES (1, 'Mohammed Illyas', 'ilyashumfans@gmail.com', '+919916232827', 'Jayanagar 4 th block', 'Select City', '560045', 1199, 'cod', 'confirmed', '2026-05-26T08:42:42.821714+00:00');

-- products (4 rows)
INSERT INTO "products" ("id", "vendor_partner_id", "name", "slug", "description", "category", "price_inr", "original_price_inr", "image_url", "gallery", "stock", "status", "created_at") VALUES (1, 1, 'GYMCO Performance Tee', 'gymco-performance-tee', 'Moisture-wicking athletic tee built for high-intensity training. Lightweight, breathable mesh panels keep you cool through every set.', 'apparel', 899, 1499, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', ARRAY[]::text[], 42, 'active', '2026-05-25T15:03:28.448+00:00');
INSERT INTO "products" ("id", "vendor_partner_id", "name", "slug", "description", "category", "price_inr", "original_price_inr", "image_url", "gallery", "stock", "status", "created_at") VALUES (2, 1, 'Iron Whey Protein 1kg', 'iron-whey-1kg', '24g of premium whey isolate per serving. Chocolate flavor. Fast absorbing, low carb, perfect post-workout fuel.', 'supplements', 2299, 2999, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80', ARRAY[]::text[], 18, 'active', '2026-05-25T15:03:28.448+00:00');
INSERT INTO "products" ("id", "vendor_partner_id", "name", "slug", "description", "category", "price_inr", "original_price_inr", "image_url", "gallery", "stock", "status", "created_at") VALUES (3, 1, 'Pro Resistance Bands Set', 'pro-resistance-bands', 'Set of 5 progressive bands with door anchor and grip handles. Up to 150lbs total resistance. Travel-friendly.', 'equipment', 1199, 1799, 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&q=80', ARRAY[]::text[], 30, 'active', '2026-05-25T15:03:28.448+00:00');
INSERT INTO "products" ("id", "vendor_partner_id", "name", "slug", "description", "category", "price_inr", "original_price_inr", "image_url", "gallery", "stock", "status", "created_at") VALUES (4, 1, 'Shaker Bottle 700ml', 'shaker-bottle-700ml', 'BPA-free, leakproof shaker with wire whisk ball. Easy-grip texture. Dishwasher safe.', 'accessories', 349, 599, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80', ARRAY[]::text[], 100, 'active', '2026-05-25T15:03:28.448+00:00');

-- ticket_comments (1 rows)
INSERT INTO "ticket_comments" ("id", "ticket_id", "author_role", "author_id", "body", "created_at") VALUES (2, 2, 'admin', 2, 'XsxaxaXZXZ', '2026-05-29T13:33:53.050659+00:00');

-- tickets (2 rows)
INSERT INTO "tickets" ("id", "subject", "description", "category", "priority", "status", "requester_role", "requester_id", "assignee_role", "assignee_id", "created_at", "updated_at", "resolved_at", "closed_at") VALUES (2, 'sdasa', 'asaadasa', 'booking', 'high', 'open', 'staff', 1, 'staff', 1, '2026-05-29T13:32:46.861583+00:00', '2026-05-29T13:33:53.055+00:00', NULL, NULL);
INSERT INTO "tickets" ("id", "subject", "description", "category", "priority", "status", "requester_role", "requester_id", "assignee_role", "assignee_id", "created_at", "updated_at", "resolved_at", "closed_at") VALUES (3, 'issue with ac', 'eror', 'general', 'high', 'in_progress', 'partner', 3, NULL, NULL, '2026-06-01T11:16:58.019216+00:00', '2026-06-06T11:35:01.876+00:00', NULL, NULL);

-- trainers (12 rows)
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (1, 'Rohan Iyer', 'Strength & Conditioning', 'NSCA-CSCS coach with 8 years training pro athletes. Specialises in powerlifting and rehab.', 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80', 4.6, 80, 1500, ARRAY['NASM-CPT','Strength L2','First Aid Certified']::text[], 'Bangalore', 1);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (2, 'Priya Sharma', 'Yoga', 'E-RYT 500 vinyasa and ashtanga teacher trained in Mysore. Calm, precise, demanding in the best way.', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80', 4.65, 103, 2000, ARRAY['NASM-CPT','Yoga L2','First Aid Certified']::text[], 'Bangalore', 3);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (3, 'Vikram Singh', 'CrossFit', 'CF-L3, regional competitor 2019. Builds programmes that scale from beginner to elite.', 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600&q=80', 4.7, 126, 2500, ARRAY['NASM-CPT','CrossFit L2','First Aid Certified']::text[], 'Bangalore', 1);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (4, 'Ayesha Khan', 'MMA & Boxing', 'Former amateur boxer, now head coach at Combat Lab. Sharp pad work and brutal conditioning.', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80', 4.75, 149, 3000, ARRAY['NASM-CPT','MMA L2','First Aid Certified']::text[], 'Mumbai', 4);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (5, 'Karan Joshi', 'Functional Fitness', 'Mobility-first coach. Combines kettlebells, gymnastics rings, and Z-Health drills.', 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=600&q=80', 4.8, 172, 1500, ARRAY['NASM-CPT','Functional L2','First Aid Certified']::text[], 'Mumbai', 5);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (6, 'Meera Nair', 'Pilates', 'Polestar-certified pilates instructor. Reformer specialist with a background in classical dance.', 'https://images.unsplash.com/photo-1609899537878-88d5ba429bdf?w=600&q=80', 4.6, 195, 2000, ARRAY['NASM-CPT','Pilates L2','First Aid Certified']::text[], 'Delhi', 7);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (7, 'Aditya Verma', 'HIIT', 'Group fitness lead at Move Studio. Designs metcons that leave you laughing on the floor.', 'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=600&q=80', 4.65, 218, 2500, ARRAY['NASM-CPT','HIIT L2','First Aid Certified']::text[], 'Delhi', 9);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (8, 'Sneha Reddy', 'Yoga', 'Hot yoga, prenatal, and meditation teacher with 12 years on the mat.', 'https://images.unsplash.com/photo-1607962837359-5e7e89f86776?w=600&q=80', 4.7, 241, 3000, ARRAY['NASM-CPT','Yoga L2','First Aid Certified']::text[], 'Bangalore', 3);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (9, 'Rahul Kapoor', 'Strength', 'Olympic weightlifting coach. Trains national-level juniors twice a week.', 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80', 4.75, 264, 1500, ARRAY['NASM-CPT','Strength L2','First Aid Certified']::text[], 'Delhi', 8);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (10, 'Tara Bose', 'Cycling', 'Indoor cycling instructor and certified spinning master. The playlist alone is worth the class.', 'https://images.unsplash.com/photo-1530021232320-687d8e3dba54?w=600&q=80', 4.8, 287, 2000, ARRAY['NASM-CPT','Cycling L2','First Aid Certified']::text[], 'Mumbai', 6);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (11, 'Devansh Gupta', 'Strength', 'Bodybuilding-focused coach. Has prepped clients for Mr. India Classic Physique.', 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80', 4.6, 310, 2500, ARRAY['NASM-CPT','Strength L2','First Aid Certified']::text[], 'Delhi', 8);
INSERT INTO "trainers" ("id", "name", "specialty", "bio", "photo_url", "rating", "sessions_count", "price_per_session", "certifications", "city", "gym_id") VALUES (12, 'Naina Pillai', 'Pilates', 'Reformer and barre instructor. Postpartum recovery specialist.', 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=600&q=80', 4.65, 333, 3000, ARRAY['NASM-CPT','Pilates L2','First Aid Certified']::text[], 'Bangalore', 3);

-- uploaded_images: 336 rows — data_base64 EXCLUDED (image bytes ~223MB, not exported)
-- uploaded_images (336 rows)
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('95454eea-69dc-4c59-9d22-785c416b164c', 'iconic%20logo.jpeg', 'image/jpeg', 32276, NULL, '2026-06-01T12:28:06.892+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c4062fea-f74f-4d5e-a015-37de93007bf4', 'Untitled%20design%20(34).jpg', 'image/jpeg', 238102, NULL, '2026-06-01T13:29:01.91+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1b6c00fe-745f-4566-84cb-5e5b102555cc', 'Untitled%20design%20(33).jpg', 'image/jpeg', 213184, NULL, '2026-06-01T13:29:02.096+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('bf6e7741-cf8c-4ba9-9d96-587355e6c315', 'Untitled%20design%20(32).jpg', 'image/jpeg', 206047, NULL, '2026-06-01T13:29:02.153+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('af8f3a5e-50b2-4802-8a95-13796ac62b9a', 'Untitled%20design%20(34).jpg', 'image/jpeg', 238102, NULL, '2026-06-01T13:29:24.976+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0eecd669-007c-4e81-b702-8f7daa4bf210', 'px.png', 'image/png', 80, NULL, '2026-06-03T13:49:29.27702+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ca2a98e5-37ce-47b7-9b02-9babca3f4cae', 'iconic%20logo.jpeg', 'image/jpeg', 32276, NULL, '2026-06-03T13:58:17.562665+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('555e13d3-e3c2-476f-bc9d-a8724d163100', 'unnamed%20(9).webp', 'image/webp', 243834, NULL, '2026-06-03T13:59:02.642682+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('27b8de65-f9af-475c-a25d-189c3c0025c9', 'iconic%20logo.jpeg', 'image/jpeg', 32276, NULL, '2026-06-03T14:05:01.42239+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fc08f988-c0d1-4c74-9254-d3b6b901d04b', 'real.png', 'image/png', 56494, NULL, '2026-06-03T14:11:41.020576+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ebad310d-0b55-4db9-9fa2-c4a75c07b0ca', 'real.jpg', 'image/jpeg', 26796, NULL, '2026-06-03T14:11:41.587924+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('342b1ebd-1be8-4e13-8742-aac8a5233eb0', 't.jpg', 'image/jpeg', 251986, NULL, '2026-06-03T14:13:58.30715+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('85f6719b-4bcc-4ef4-9c99-a084be3b447c', 't.jpg', 'image/jpeg', 528503, NULL, '2026-06-03T14:14:00.733012+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('63d350c0-8921-40ed-9af6-8842cbe61563', 't.jpg', 'image/jpeg', 799157, NULL, '2026-06-03T14:14:05.305542+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('e4a9a2a1-1044-4d87-818f-98834721853f', 't.jpg', 'image/jpeg', 1061769, NULL, '2026-06-03T14:14:10.115324+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('994ec41e-d7aa-4a25-a261-7fbe6e2a1bc1', 't.jpg', 'image/jpeg', 2818886, NULL, '2026-06-03T14:14:26.827522+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('eb4b1fb7-56ff-4664-ac5b-a2935d9e0a97', 't.jpg', 'image/jpeg', 4037055, NULL, '2026-06-03T14:14:33.348217+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3bb2a5d9-8503-4464-b606-142b47731cb9', 't.jpg', 'image/jpeg', 6666537, NULL, '2026-06-03T14:14:48.926697+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0701dd7e-b86a-4c50-aeff-f1370cb00288', 't.jpg', 'image/jpeg', 9459972, NULL, '2026-06-03T14:15:05.786526+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5f093816-fac7-449e-b987-1a42c4b9900a', 'WhatsApp%20Image%202026-06-02%20at%2010.13.43.jpeg', 'image/jpeg', 129742, NULL, '2026-06-03T14:15:46.977496+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('e6fd562a-3d6e-4acb-95a0-f10ecd2c6b68', 's.jpg', 'image/jpeg', 769843, NULL, '2026-06-03T14:16:05.637351+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9215f897-69d6-4472-abcb-9488e9e5bbcc', 's.jpg', 'image/jpeg', 769843, NULL, '2026-06-03T14:16:07.289827+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('08e24701-dd5d-43d0-b6c0-7c10ec4a726b', 's.jpg', 'image/jpeg', 769843, NULL, '2026-06-03T14:16:08.891377+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fa585dc4-2b75-4ed4-a87f-d031ddcda08d', 's.jpg', 'image/jpeg', 769843, NULL, '2026-06-03T14:16:10.452426+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c06ab059-1048-416e-8460-830eb7636c97', 's.jpg', 'image/jpeg', 769843, NULL, '2026-06-03T14:16:12.025773+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('36c5db9e-ac58-4023-9344-64b951430206', 'Gemini_Generated_Image_.png', 'image/png', 2106703, NULL, '2026-06-03T14:16:12.871838+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8ea5155a-dd7c-4988-8989-7392dc021640', 'l.jpg', 'image/jpeg', 8318786, NULL, '2026-06-03T14:16:15.291005+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('bb0d854f-6174-403c-9273-47cc95b41f71', 'l.jpg', 'image/jpeg', 8318786, NULL, '2026-06-03T14:16:18.786402+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fde6ac62-d477-41a0-a05c-85b23bcee7a9', 'l.jpg', 'image/jpeg', 8318786, NULL, '2026-06-03T14:16:22.379079+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('91e88974-53d3-4d48-8748-17ab8a43a65a', 'l.jpg', 'image/jpeg', 8318786, NULL, '2026-06-03T14:16:25.987499+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0e24a6f0-e0c2-4bc7-9ad9-0a4999f78b61', 'l.jpg', 'image/jpeg', 8318786, NULL, '2026-06-03T14:16:30.664251+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5367adf8-688c-4035-9007-6fd53dffcec7', 'Untitled%20design%20(23).png', 'image/png', 1266047, NULL, '2026-06-03T14:28:31.310605+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6f1820b1-d311-4718-8759-5ce278d3c7cc', '1_Untitled%20design%202.jpg', 'image/jpeg', 182255, NULL, '2026-06-03T14:33:18.189015+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f60d4504-72d7-46e4-a6fb-841530bc6d33', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T14:40:07.922299+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('040aa374-8588-45ae-8ea0-54b258fe9e8b', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(2).jpg', 'image/jpeg', 372396, NULL, '2026-06-03T14:40:23.482912+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ef2d4dba-60a9-428c-a31c-c78dc2b8e25d', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(9).jpg', 'image/jpeg', 372362, NULL, '2026-06-03T14:40:36.483393+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('da765e7a-f014-4342-9243-232771276cb6', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(8).jpg', 'image/jpeg', 343563, NULL, '2026-06-03T14:40:37.932779+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('afee4c21-a888-486b-9cde-01371fb6a8a0', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(7).jpg', 'image/jpeg', 380183, NULL, '2026-06-03T14:40:39.336168+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('86a4085d-fabd-45d2-a094-e3015997dcc6', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(6).jpg', 'image/jpeg', 338441, NULL, '2026-06-03T14:40:40.756857+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2d3b73bd-81ca-4083-b614-10b0b06ac7e5', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(5).jpg', 'image/jpeg', 326514, NULL, '2026-06-03T14:40:42.061685+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6235a9dd-e3ac-4db1-bec9-fcaa5ad36a11', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(4).jpg', 'image/jpeg', 318847, NULL, '2026-06-03T14:40:43.406967+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('08e0d977-47f8-466a-bd98-624078085da0', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(3).jpg', 'image/jpeg', 324746, NULL, '2026-06-03T14:40:44.783982+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1fbe7fcb-8ea5-4f15-a9eb-e4efc3911946', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(2).jpg', 'image/jpeg', 372396, NULL, '2026-06-03T14:40:46.197089+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b1c3ed5c-f64a-4f8b-93a9-cbf6ce800b74', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(1).jpg', 'image/jpeg', 352077, NULL, '2026-06-03T14:40:47.763471+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8485ab1a-ff02-49ca-93c6-55bfe43d3bb6', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40.jpg', 'image/jpeg', 353719, NULL, '2026-06-03T14:40:49.122382+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ba91e540-9fc8-4ec9-b88a-cd2308880e29', 'WhatsApp%20Image%202026-06-03%20at%2020.07.39%20(3).jpg', 'image/jpeg', 274491, NULL, '2026-06-03T14:40:50.359527+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('45d35970-31b2-4a8d-86e9-6d8a312c1a94', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T14:45:33.180134+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('be56d4ca-1183-46fe-a956-08d829d4553b', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(5).jpg', 'image/jpeg', 291007, NULL, '2026-06-03T14:45:51.275562+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8e62e778-05a3-4409-86b6-df198806f624', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(7).jpg', 'image/jpeg', 275472, NULL, '2026-06-03T14:46:09.130314+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('23ae8d37-9fff-4dfd-b2b6-a586ab2f8b28', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(6).jpg', 'image/jpeg', 275302, NULL, '2026-06-03T14:46:10.458019+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('237bf442-6da2-4940-af44-d809fe08bb7a', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(5).jpg', 'image/jpeg', 291007, NULL, '2026-06-03T14:46:11.693933+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b1275df1-5abf-481f-a3d0-fef4d55fb8e3', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(4).jpg', 'image/jpeg', 282603, NULL, '2026-06-03T14:46:12.986719+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8b7101dd-613c-4901-a38d-46c59abffc51', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(3).jpg', 'image/jpeg', 310944, NULL, '2026-06-03T14:46:14.271524+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9e04869d-e435-44e9-ae7a-be64f60d2fc4', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(2).jpg', 'image/jpeg', 292011, NULL, '2026-06-03T14:46:15.473567+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('14da8516-ea7d-4088-96e9-b60d60da8cd5', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(1).jpg', 'image/jpeg', 336391, NULL, '2026-06-03T14:46:16.745358+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('00e91695-4dda-42a3-b939-5de5c0397d46', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54.jpg', 'image/jpeg', 311261, NULL, '2026-06-03T14:46:18.036388+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d6f47182-ce26-4b25-893a-3508af596d1a', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(8).jpg', 'image/jpeg', 314849, NULL, '2026-06-03T14:46:19.357287+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2bfaed5f-b699-4da4-960b-1cdc4479cd69', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(7).jpg', 'image/jpeg', 318324, NULL, '2026-06-03T14:46:20.683222+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7a8ae9d1-e23e-46e0-b6e3-4204fb90e8b6', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(6).jpg', 'image/jpeg', 316884, NULL, '2026-06-03T14:46:21.97355+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('37203c4d-f30f-4778-9daa-3f2b9e027a3f', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(5).jpg', 'image/jpeg', 282355, NULL, '2026-06-03T14:46:23.274562+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a60312cf-29b3-4f4d-a735-5aec2ec69b0d', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(7).jpg', 'image/jpeg', 275472, NULL, '2026-06-03T14:46:34.47018+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('895183c4-fe50-48f3-9250-6e96ac20ad1b', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(6).jpg', 'image/jpeg', 275302, NULL, '2026-06-03T14:46:35.683646+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7d9367ef-886f-49bd-a40a-8a0f13d1840e', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(5).jpg', 'image/jpeg', 291007, NULL, '2026-06-03T14:46:37.013785+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d2bf2d0a-46ae-408d-9870-0a44ce0348cf', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(4).jpg', 'image/jpeg', 282603, NULL, '2026-06-03T14:46:38.344796+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('329e193b-06b3-4e18-81e1-2d5218046462', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(3).jpg', 'image/jpeg', 310944, NULL, '2026-06-03T14:46:39.662399+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f487bdaf-9b20-4cfd-ba0a-62ceef7ccfcd', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(2).jpg', 'image/jpeg', 292011, NULL, '2026-06-03T14:46:40.926003+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('cac13bb7-1bb6-4209-ac0a-ce8a022dea4f', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54%20(1).jpg', 'image/jpeg', 336391, NULL, '2026-06-03T14:46:42.341685+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0a361044-5f66-4e48-803a-073cdc5cffa9', 'WhatsApp%20Image%202026-06-03%20at%2020.12.54.jpg', 'image/jpeg', 311261, NULL, '2026-06-03T14:46:43.47653+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a67d9bda-cec2-439e-85d4-4af92afb8686', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(8).jpg', 'image/jpeg', 314849, NULL, '2026-06-03T14:46:44.83093+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3570a066-4377-4561-ba96-c7ded59fe70e', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(7).jpg', 'image/jpeg', 318324, NULL, '2026-06-03T14:46:45.78336+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('37ac525c-5787-4d45-b944-4b1ff43fc2f1', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(6).jpg', 'image/jpeg', 316884, NULL, '2026-06-03T14:46:59.606202+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('51741cce-4ef5-43fa-9224-7c78c41d7627', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(5).jpg', 'image/jpeg', 282355, NULL, '2026-06-03T14:47:00.950628+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4c78f6b6-2a24-4f3e-b3b0-5c5542a078f3', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(6).jpg', 'image/jpeg', 316884, NULL, '2026-06-03T14:47:16.701601+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b4e16d5c-900e-4124-9bc8-0deaeda0c26c', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53%20(5).jpg', 'image/jpeg', 282355, NULL, '2026-06-03T14:47:18.070646+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('dcc66a2e-3360-4bef-9114-769b5cddd563', 'WhatsApp%20Image%202026-06-03%20at%2020.12.53.jpg', 'image/jpeg', 307723, NULL, '2026-06-03T14:47:26.499286+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b34d32f0-e296-4ea7-9444-8436d73067ba', 'WhatsApp%20Image%202026-06-03%20at%2020.07.40%20(4).jpg', 'image/jpeg', 318847, NULL, '2026-06-03T14:47:36.138551+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1cffec92-2f82-4a5d-9a95-a3fedb8340a7', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T14:54:14.638276+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f45439ef-3d48-499b-87bc-c7383c0bf0c9', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16%20(4).jpg', 'image/jpeg', 311500, NULL, '2026-06-03T14:54:29.519747+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b129f4b1-d585-408b-9b5a-4ea8ca57808c', 'WhatsApp%20Image%202026-06-03%20at%2020.13.17%20(2).jpg', 'image/jpeg', 245554, NULL, '2026-06-03T14:54:49.316562+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('711b4c6b-7d1c-45da-9065-eb9bcbd277a0', 'WhatsApp%20Image%202026-06-03%20at%2020.13.17%20(1).jpg', 'image/jpeg', 278169, NULL, '2026-06-03T14:54:51.012437+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('529923fa-0686-4475-94d6-cba842db63bb', 'WhatsApp%20Image%202026-06-03%20at%2020.13.17.jpg', 'image/jpeg', 283872, NULL, '2026-06-03T14:54:52.648836+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b3402c4b-5058-496d-aac6-4f294014c94c', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16%20(6).jpg', 'image/jpeg', 293004, NULL, '2026-06-03T14:54:54.453526+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('440ecaf5-a2b6-466c-847a-d2784cce8907', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16%20(5).jpg', 'image/jpeg', 324953, NULL, '2026-06-03T14:54:56.256523+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('bce1426b-6c7d-4303-bc16-ce44714af5ba', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16%20(4).jpg', 'image/jpeg', 311500, NULL, '2026-06-03T14:54:57.554524+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('53a3e0e7-24e7-4464-894d-1800f75f512e', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16%20(3).jpg', 'image/jpeg', 324091, NULL, '2026-06-03T14:54:59.364249+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('523b9ed8-71fa-41f7-94d0-79f11b6b9933', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16%20(2).jpg', 'image/jpeg', 321924, NULL, '2026-06-03T14:55:01.077704+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f8ab65f0-9276-4d45-826a-42f13eb0eccc', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16%20(1).jpg', 'image/jpeg', 272004, NULL, '2026-06-03T14:55:02.46062+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8d3c9ee7-7de8-4bc2-b096-2e276b4dcb26', 'WhatsApp%20Image%202026-06-03%20at%2020.13.16.jpg', 'image/jpeg', 301510, NULL, '2026-06-03T14:55:04.221003+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('34aa3476-a80b-4fb0-bb26-7834efe41d6a', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T14:57:17.362487+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('acb2ac0b-1b42-40b9-be8f-6f97496f7348', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(6).jpg', 'image/jpeg', 407680, NULL, '2026-06-03T14:57:30.886814+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5aa60ee5-9d57-46e8-8407-a0c7869e0a76', 'WhatsApp%20Image%202026-06-03%20at%2020.13.36.jpg', 'image/jpeg', 333712, NULL, '2026-06-03T14:57:44.302829+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f9f329d0-7d4c-496d-b662-e506cbd202ca', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(10).jpg', 'image/jpeg', 295420, NULL, '2026-06-03T14:57:46.044928+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a11f097f-eb16-490f-bda9-00b465adca19', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(9).jpg', 'image/jpeg', 381323, NULL, '2026-06-03T14:57:47.899634+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4ee438b6-c179-431f-ab85-d68dd8137ef0', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(8).jpg', 'image/jpeg', 384860, NULL, '2026-06-03T14:57:49.674063+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ab753f71-d9b7-4c75-bcb0-049fb37d025c', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(7).jpg', 'image/jpeg', 399024, NULL, '2026-06-03T14:57:51.433627+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3189e8c8-bed6-4fb8-9d31-aba28151d962', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(6).jpg', 'image/jpeg', 407680, NULL, '2026-06-03T14:57:53.31425+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('801c0f38-a87e-4c9b-a887-0f2f7fa8a5e0', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(5).jpg', 'image/jpeg', 313047, NULL, '2026-06-03T14:57:55.023265+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0c415ca4-dc19-4304-b84c-0c36bccb022e', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(4).jpg', 'image/jpeg', 321353, NULL, '2026-06-03T14:57:56.735728+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('17969285-0353-4566-8cde-9d59e7515278', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(3).jpg', 'image/jpeg', 286771, NULL, '2026-06-03T14:57:58.44458+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9d66a97b-43c8-4e2a-b300-b5d53e4f860b', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(2).jpg', 'image/jpeg', 272652, NULL, '2026-06-03T14:58:00.126426+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c7f00406-8628-459e-8ee2-05bea8269464', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35%20(1).jpg', 'image/jpeg', 348841, NULL, '2026-06-03T14:58:36.556156+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('dd25fa82-479d-4d81-8800-3f33f74c1f8e', 'WhatsApp%20Image%202026-06-03%20at%2020.13.35.jpg', 'image/jpeg', 289528, NULL, '2026-06-03T14:58:37.913329+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('e9036532-31f0-451b-9022-484d65ec8c1a', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T15:20:46.716458+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c7ebac7f-396d-4963-b3b5-776bc7aea327', 'WhatsApp%20Image%202026-06-03%20at%2020.29.43%20(8).jpg', 'image/jpeg', 338074, NULL, '2026-06-03T15:21:28.634331+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5510f860-64e8-4e0c-859d-5ac19f59d111', 'WhatsApp%20Image%202026-06-03%20at%2020.29.44%20(3).jpg', 'image/jpeg', 297897, NULL, '2026-06-03T15:21:57.432609+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c40dde6d-a7b9-4460-a160-a443bba7d223', 'WhatsApp%20Image%202026-06-03%20at%2020.29.44%20(2).jpg', 'image/jpeg', 333410, NULL, '2026-06-03T15:21:59.208309+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3d4a17ff-cae2-429a-a4bc-72e847ae7ee2', 'WhatsApp%20Image%202026-06-03%20at%2020.29.44%20(1).jpg', 'image/jpeg', 310051, NULL, '2026-06-03T15:22:00.909944+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8ebaa3f5-98f6-4fc1-9d54-4ba07c3ca046', 'WhatsApp%20Image%202026-06-03%20at%2020.29.44.jpg', 'image/jpeg', 309723, NULL, '2026-06-03T15:22:02.675697+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2552bb38-9403-452f-8bfb-e9354339e43a', 'WhatsApp%20Image%202026-06-03%20at%2020.29.43%20(9).jpg', 'image/jpeg', 321857, NULL, '2026-06-03T15:22:04.676803+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('122cd6a2-b7e6-48f6-b209-99ff8ae75d5c', 'WhatsApp%20Image%202026-06-03%20at%2020.29.43%20(8).jpg', 'image/jpeg', 338074, NULL, '2026-06-03T15:22:06.388837+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('61cefe96-8918-4966-b729-0d6b30c9e5f2', 'WhatsApp%20Image%202026-06-03%20at%2020.29.43%20(7).jpg', 'image/jpeg', 340253, NULL, '2026-06-03T15:22:08.111086+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c650859b-daeb-48f5-bfe5-6a7ca90a9f76', 'WhatsApp%20Image%202026-06-03%20at%2020.29.43%20(6).jpg', 'image/jpeg', 340095, NULL, '2026-06-03T15:22:09.97179+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a2422583-9471-4a1d-bfb5-13264e3554af', 'WhatsApp%20Image%202026-06-03%20at%2020.29.43%20(5).jpg', 'image/jpeg', 380452, NULL, '2026-06-03T15:22:12.261081+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('97c6e38c-eb75-40a7-96ec-899d1da951a8', 'WhatsApp%20Image%202026-06-03%20at%2020.29.43%20(4).jpg', 'image/jpeg', 270987, NULL, '2026-06-03T15:22:13.945853+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0a88a1c0-0c9c-4a22-853b-010a714f3c17', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T15:29:05.69805+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('aa0ad859-1539-4001-a6b3-25213770cffa', 'WhatsApp%20Image%202026-06-03%20at%2020.30.13%20(1).jpg', 'image/jpeg', 297335, NULL, '2026-06-03T15:30:05.803225+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('62c6c4af-bbc9-47d7-9f12-e7e2470a7bf1', 'WhatsApp%20Image%202026-06-03%20at%2020.30.13%20(1).jpg', 'image/jpeg', 297335, NULL, '2026-06-03T15:30:17.219523+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d74fdf3d-d504-44e7-9bcb-97a3c40ea7ea', 'WhatsApp%20Image%202026-06-03%20at%2020.30.13.jpg', 'image/jpeg', 259971, NULL, '2026-06-03T15:30:18.911859+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1a62ffd6-7ea3-44e5-b41c-291ca0995df5', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(11).jpg', 'image/jpeg', 329665, NULL, '2026-06-03T15:30:20.70154+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('56e1ad91-00c9-4a18-ac6e-4556c0a3299c', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(10).jpg', 'image/jpeg', 344046, NULL, '2026-06-03T15:30:22.406137+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('567f2f8f-f6e0-4530-870a-9c7d50c744fc', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(9).jpg', 'image/jpeg', 295431, NULL, '2026-06-03T15:30:23.793852+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('cd4c2803-69af-493e-bf0f-e0a90173f5dd', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(8).jpg', 'image/jpeg', 270087, NULL, '2026-06-03T15:30:25.388324+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f65f75f1-d0e5-45d0-aa02-258092b95f2f', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(7).jpg', 'image/jpeg', 305138, NULL, '2026-06-03T15:30:27.134424+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('74b7cc65-968f-4664-ba7d-d91c3e1fca9c', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(6).jpg', 'image/jpeg', 316751, NULL, '2026-06-03T15:30:28.86043+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5f7a2840-a0e2-4189-b5c8-98592755547b', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(5).jpg', 'image/jpeg', 311974, NULL, '2026-06-03T15:30:30.542932+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('26833bdc-855a-41c5-9a54-a060b2154bee', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(4).jpg', 'image/jpeg', 302202, NULL, '2026-06-03T15:30:32.398092+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5e4f3db9-4e3d-4501-bd47-806fe073f80b', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(3).jpg', 'image/jpeg', 292370, NULL, '2026-06-03T15:30:49.255786+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('dc118ad8-472b-4d32-b59e-8cd6f408c5f7', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(2).jpg', 'image/jpeg', 305573, NULL, '2026-06-03T15:30:50.593321+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5c221774-633b-484b-9e38-1cd093f5c91d', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12%20(1).jpg', 'image/jpeg', 230543, NULL, '2026-06-03T15:30:52.07494+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a9369e9e-cb01-4289-a75d-9348fea4f4a8', 'WhatsApp%20Image%202026-06-03%20at%2020.30.12.jpg', 'image/jpeg', 418363, NULL, '2026-06-03T15:30:53.7955+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('95ddd79c-d726-4e7f-8855-10cd9f609582', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T15:45:08.365544+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('01677f35-2d1e-4d07-9ab8-409b0eb80752', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(6).jpg', 'image/jpeg', 302936, NULL, '2026-06-03T15:45:27.752442+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5db420c3-ff2c-4504-a617-257d557e9ebb', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(19).jpg', 'image/jpeg', 296670, NULL, '2026-06-03T15:45:40.285637+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4eb440ab-26f2-41aa-8a56-a802d47e9e36', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(18).jpg', 'image/jpeg', 313948, NULL, '2026-06-03T15:45:42.133886+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('df5849cc-a747-4f2b-ada1-b61041256777', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(17).jpg', 'image/jpeg', 340218, NULL, '2026-06-03T15:45:43.920127+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d4679daf-20b7-40ff-8b4c-f348515c7e27', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(16).jpg', 'image/jpeg', 352576, NULL, '2026-06-03T15:45:45.671633+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('50434b19-c952-4a3c-8c7d-d15ad297f35b', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(15).jpg', 'image/jpeg', 356054, NULL, '2026-06-03T15:45:47.471954+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f60bf9d3-012d-46fb-bb74-46ecaacfee63', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(14).jpg', 'image/jpeg', 330301, NULL, '2026-06-03T15:45:49.120971+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ee1a2870-7680-48f1-81cf-2e76feaeddc8', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(13).jpg', 'image/jpeg', 339382, NULL, '2026-06-03T15:45:50.825339+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6b602fa1-ca23-4c19-9805-aad866c6ce79', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(12).jpg', 'image/jpeg', 298227, NULL, '2026-06-03T15:45:52.460835+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d3e885ff-25e1-48bb-a27f-019f887774aa', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(11).jpg', 'image/jpeg', 260611, NULL, '2026-06-03T15:45:54.079156+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4d5c4765-ec68-4aac-b352-12293c67dce2', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(10).jpg', 'image/jpeg', 281560, NULL, '2026-06-03T15:45:55.826109+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f3d75d99-73a4-4b2c-ac33-0daa3f9ea616', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(9).jpg', 'image/jpeg', 240887, NULL, '2026-06-03T15:46:23.656812+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('91863c72-4eb4-4a42-a3d9-90d7ba9d29d6', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(8).jpg', 'image/jpeg', 263535, NULL, '2026-06-03T15:46:25.299396+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d6c70872-2628-4fe4-8a3e-447651ef6fae', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(7).jpg', 'image/jpeg', 287051, NULL, '2026-06-03T15:46:26.896839+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5e20a5b5-39a8-4a1e-8f06-775854922a6c', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(6).jpg', 'image/jpeg', 302936, NULL, '2026-06-03T15:46:28.598138+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fc45f988-a514-41c4-8a6a-6e3291c115b0', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(5).jpg', 'image/jpeg', 247180, NULL, '2026-06-03T15:46:30.251852+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5e7cc196-04f0-449a-845f-afa926bde05c', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(4).jpg', 'image/jpeg', 338723, NULL, '2026-06-03T15:46:31.946102+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c6da5737-cd2d-4414-945c-28ca67772a0c', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(3).jpg', 'image/jpeg', 320505, NULL, '2026-06-03T15:46:33.744094+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6d434ba1-23ca-4abf-9cb8-cc4f82e889e7', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(9).jpg', 'image/jpeg', 240887, NULL, '2026-06-03T15:47:33.300687+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('985d2a80-1dea-4788-8003-6a9b1c94ff40', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(8).jpg', 'image/jpeg', 263535, NULL, '2026-06-03T15:47:35.029496+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('58f424dd-e831-4295-a54c-60655ecbb53b', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(7).jpg', 'image/jpeg', 287051, NULL, '2026-06-03T15:47:36.718852+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('66d5384d-b9d9-488e-bbd5-03d693bc4712', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(6).jpg', 'image/jpeg', 302936, NULL, '2026-06-03T15:47:38.172928+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7bd73bf9-c039-44ce-b59f-2e6c6d3511a2', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(5).jpg', 'image/jpeg', 247180, NULL, '2026-06-03T15:47:39.753163+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c34c95fc-168f-42ea-828c-70d225105687', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(4).jpg', 'image/jpeg', 338723, NULL, '2026-06-03T15:47:41.423617+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0b54f9b7-0751-47c4-8e1a-5d214d870bf0', 'WhatsApp%20Image%202026-06-03%20at%2020.30.53%20(3).jpg', 'image/jpeg', 320505, NULL, '2026-06-03T15:47:43.235124+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4124b58c-bd5e-4bf2-a4f5-44ba5017be8d', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T15:49:15.783438+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('74229c47-8501-4de6-aced-16df3aa9dfa5', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(13).jpg', 'image/jpeg', 332249, NULL, '2026-06-03T15:49:23.626949+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0ef55371-6953-40af-9911-6feb71548ef1', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(15).jpg', 'image/jpeg', 317722, NULL, '2026-06-03T15:49:40.017735+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a8d4c91a-fb1a-4844-96e7-651d063701ec', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(14).jpg', 'image/jpeg', 294008, NULL, '2026-06-03T15:49:41.883565+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('24f98f6a-d91f-4196-92ef-8e8bbfda7f29', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(13).jpg', 'image/jpeg', 332249, NULL, '2026-06-03T15:49:43.354388+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a82cbc3a-763c-48bb-a765-36f22bda1d87', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(12).jpg', 'image/jpeg', 341169, NULL, '2026-06-03T15:49:45.156255+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('65cc0b02-413e-4c24-8b93-0acead91c8bb', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(11).jpg', 'image/jpeg', 341837, NULL, '2026-06-03T15:49:47.297859+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5c1783e6-6df8-41db-872b-605dcace1f70', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(10).jpg', 'image/jpeg', 281879, NULL, '2026-06-03T15:49:49.017419+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('85c7803c-d7e0-420a-998a-f25a99e8b718', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(9).jpg', 'image/jpeg', 319563, NULL, '2026-06-03T15:49:50.786984+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('bc020cb4-7734-462c-9bd7-95566d8717a6', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(8).jpg', 'image/jpeg', 330623, NULL, '2026-06-03T15:49:52.568338+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('abaaf3d2-aa14-4031-9129-fb1361bcbf12', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(15).jpg', 'image/jpeg', 317722, NULL, '2026-06-03T15:50:04.457752+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('44d830b9-eb4d-4c09-aa94-738644a8da0f', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(14).jpg', 'image/jpeg', 294008, NULL, '2026-06-03T15:50:06.134661+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('eeb5b33e-fa33-4313-87d6-9c8f9ac0d4b8', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(13).jpg', 'image/jpeg', 332249, NULL, '2026-06-03T15:50:07.862754+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('67dbb52f-697e-492b-bd15-eb25cdfa5dbb', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(12).jpg', 'image/jpeg', 341169, NULL, '2026-06-03T15:50:09.67388+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ac12664d-ee9d-4c73-9c66-7a6d16ccb743', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(11).jpg', 'image/jpeg', 341837, NULL, '2026-06-03T15:50:11.17377+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('32edab02-b0c3-4d72-a171-bd88d095fa75', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(10).jpg', 'image/jpeg', 281879, NULL, '2026-06-03T15:50:12.952936+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('aa2a28c1-2250-4990-bd37-ee715f58023e', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(9).jpg', 'image/jpeg', 319563, NULL, '2026-06-03T15:50:14.731359+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d0c26c45-8e7a-49c5-b655-604bc4ba42cd', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(8).jpg', 'image/jpeg', 330623, NULL, '2026-06-03T15:50:16.179858+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9ee1be4b-d3cb-4799-a484-f105930fc3ee', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(15).jpg', 'image/jpeg', 317722, NULL, '2026-06-03T15:50:28.742271+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c69ad85f-bcea-4cdf-9147-08f67303568a', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(14).jpg', 'image/jpeg', 294008, NULL, '2026-06-03T15:50:30.417152+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fedadb7e-1edf-49de-924e-d9fa63c4f409', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(13).jpg', 'image/jpeg', 332249, NULL, '2026-06-03T15:50:31.928846+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('99f4785f-ae7e-404b-a843-b8d28aeecde5', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(12).jpg', 'image/jpeg', 341169, NULL, '2026-06-03T15:50:33.295372+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8d89ab3a-dc74-4db6-90f1-50bc3288e29b', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(11).jpg', 'image/jpeg', 341837, NULL, '2026-06-03T15:50:35.119898+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('59f9a368-00f5-44e4-8cda-fe985738ebe0', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(10).jpg', 'image/jpeg', 281879, NULL, '2026-06-03T15:50:48.018337+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('35aa0a7b-93aa-406b-896c-c3cd3b72379d', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(9).jpg', 'image/jpeg', 319563, NULL, '2026-06-03T15:50:49.737277+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('858f5c15-cccb-42f2-a365-c968fbf464f1', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(8).jpg', 'image/jpeg', 330623, NULL, '2026-06-03T15:50:51.582976+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('129a76a8-1493-4330-9a3b-88cef424c81e', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(2).jpg', 'image/jpeg', 236071, NULL, '2026-06-03T15:51:01.611515+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('e2de62ff-b422-4185-a857-9e3227ca51ad', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(10).jpg', 'image/jpeg', 281879, NULL, '2026-06-03T15:51:09.226154+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1aee6188-e38a-4c99-90b0-a7522a401402', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(5).jpg', 'image/jpeg', 281560, NULL, '2026-06-03T15:51:18.384647+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7aa92b41-3044-4538-8958-28abe9316c16', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(1).jpg', 'image/jpeg', 392630, NULL, '2026-06-03T15:51:30.808941+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('29c6b2ce-7cf8-4c4f-a5d0-01bf3e076d65', 'WhatsApp%20Image%202026-06-03%20at%2020.31.17%20(6).jpg', 'image/jpeg', 340742, NULL, '2026-06-03T15:51:49.814958+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('e00021d8-7b8c-4ed9-a8fc-71f7f969cebe', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T15:55:12.818066+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('748c0b04-03ab-48d5-816a-edbecd432e49', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(7).jpg', 'image/jpeg', 373781, NULL, '2026-06-03T15:55:27.42775+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7aed2e6b-8dbb-40ac-88c4-95476833f8e3', 'WhatsApp%20Image%202026-06-03%20at%2020.31.46%20(5).jpg', 'image/jpeg', 314218, NULL, '2026-06-03T15:55:41.478286+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d94ffdc8-c10b-4d44-9ef9-42abccf802eb', 'WhatsApp%20Image%202026-06-03%20at%2020.31.46%20(4).jpg', 'image/jpeg', 387100, NULL, '2026-06-03T15:55:43.202602+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('bc1877a8-6ac2-421e-9e08-f6d30d347a44', 'WhatsApp%20Image%202026-06-03%20at%2020.31.46%20(3).jpg', 'image/jpeg', 333564, NULL, '2026-06-03T15:55:45.00974+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2080b781-b27e-43a3-808f-75c3772cfe87', 'WhatsApp%20Image%202026-06-03%20at%2020.31.46%20(2).jpg', 'image/jpeg', 345676, NULL, '2026-06-03T15:55:46.82386+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d66fcde0-4f58-4714-8663-42c2933c9282', 'WhatsApp%20Image%202026-06-03%20at%2020.31.46%20(1).jpg', 'image/jpeg', 319185, NULL, '2026-06-03T15:55:48.572306+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9f35735d-561f-4112-8f76-09d0cca35093', 'WhatsApp%20Image%202026-06-03%20at%2020.31.46.jpg', 'image/jpeg', 307529, NULL, '2026-06-03T15:55:50.322609+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('08f71519-2526-4a95-a9d3-bb0a0aa7e746', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(9).jpg', 'image/jpeg', 347607, NULL, '2026-06-03T15:55:52.105262+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7646c2e8-2980-4257-a16d-fd8b14a8fbd7', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(8).jpg', 'image/jpeg', 291671, NULL, '2026-06-03T15:55:53.887124+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4eb0ce5c-c5e2-4579-b5e6-1ae53266cdfb', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(7).jpg', 'image/jpeg', 373781, NULL, '2026-06-03T15:55:55.660357+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('42d4af00-b28f-4557-b937-ed0fd70b4f81', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(6).jpg', 'image/jpeg', 329270, NULL, '2026-06-03T15:55:57.473829+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('923fa1c4-e668-4795-aaeb-0fc00aa1a490', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(5).jpg', 'image/jpeg', 336493, NULL, '2026-06-03T15:56:22.097791+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a45f20f2-34c6-4a6c-94cf-4ce7ad1df2b1', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(4).jpg', 'image/jpeg', 293320, NULL, '2026-06-03T15:56:23.797684+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4133b8ad-f1c5-4805-8aa3-b0258daf9bc5', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(3).jpg', 'image/jpeg', 354723, NULL, '2026-06-03T15:56:25.55773+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0a0e703f-fcb7-4964-8b44-988643010e22', 'WhatsApp%20Image%202026-06-03%20at%2020.31.45%20(2).jpg', 'image/jpeg', 315145, NULL, '2026-06-03T15:56:27.251485+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('57e3c06f-6498-424d-85b6-d8a9e4ea9274', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(6).jpg', 'image/jpeg', 376698, NULL, '2026-06-03T15:58:37.243328+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d8d84308-0b8b-431e-88f2-e7ff4c66b604', 'WhatsApp%20Image%202026-06-03%20at%2020.32.05%20(2).jpg', 'image/jpeg', 337399, NULL, '2026-06-03T15:58:49.657152+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3c97e88c-df14-447d-ac50-29a9d6c69ca0', 'WhatsApp%20Image%202026-06-03%20at%2020.32.05%20(1).jpg', 'image/jpeg', 351991, NULL, '2026-06-03T15:58:51.454308+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('bdde624c-c5ce-4aa9-95b8-cc1df941db07', 'WhatsApp%20Image%202026-06-03%20at%2020.32.05.jpg', 'image/jpeg', 366101, NULL, '2026-06-03T15:58:53.246755+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2d8e716c-a2a6-4034-a692-53c7e2fe9fd5', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(9).jpg', 'image/jpeg', 309944, NULL, '2026-06-03T15:58:55.04339+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4a791890-447d-4561-ad56-5fda753c7dce', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(8).jpg', 'image/jpeg', 296690, NULL, '2026-06-03T15:58:56.779277+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ab8465fb-22d4-4812-a389-e6ddc7da13a8', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(7).jpg', 'image/jpeg', 321330, NULL, '2026-06-03T15:58:58.554166+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2935f90e-a261-4e01-bd72-472b09e2dda1', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(6).jpg', 'image/jpeg', 376698, NULL, '2026-06-03T15:59:00.406495+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('59144d39-6eb5-4e0e-a915-610ff9c21f74', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(5).jpg', 'image/jpeg', 362608, NULL, '2026-06-03T15:59:02.210889+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fe223ec7-33de-4d4e-a7c6-27e5a9add9e0', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(4).jpg', 'image/jpeg', 300406, NULL, '2026-06-03T15:59:03.959454+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1c5abe99-d731-4a6c-9e51-df6fc6e5562f', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(3).jpg', 'image/jpeg', 330961, NULL, '2026-06-03T15:59:05.719022+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d2de4e69-f902-46e6-acc2-0a612074e611', 'WhatsApp%20Image%202026-06-03%20at%2020.32.04%20(2).jpg', 'image/jpeg', 472831, NULL, '2026-06-03T15:59:20.642604+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('30f1120a-03e6-4ebb-912a-6a4935c344dd', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T16:00:42.64516+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8491d904-4ad2-4b62-97a1-1815395c70e6', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(5).jpg', 'image/jpeg', 358159, NULL, '2026-06-03T16:00:50.017718+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('89aa75eb-a6d6-41c5-ae78-f061106cf791', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(11).jpg', 'image/jpeg', 281856, NULL, '2026-06-03T16:01:11.341744+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6cf57929-b189-49b5-b6ea-55a4e0058092', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(10).jpg', 'image/jpeg', 337204, NULL, '2026-06-03T16:01:13.130145+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('71ecb639-f280-4fe5-ac15-a961b8e87577', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(9).jpg', 'image/jpeg', 364373, NULL, '2026-06-03T16:01:14.924668+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('65021d4d-d7a8-4acf-8f6c-71d1b6b301a5', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(8).jpg', 'image/jpeg', 339768, NULL, '2026-06-03T16:01:16.701589+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6aab1e50-06c1-40c0-a387-8c5747054ac8', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(7).jpg', 'image/jpeg', 325089, NULL, '2026-06-03T16:01:18.501307+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('39790b8e-97a6-48cf-b01a-bff15a775c69', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(6).jpg', 'image/jpeg', 295200, NULL, '2026-06-03T16:01:20.234467+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('e76cbef1-f733-402f-92e9-6f9a5d51f1fb', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(5).jpg', 'image/jpeg', 358159, NULL, '2026-06-03T16:01:22.083723+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('106a1a53-674c-4089-9934-1ce69d307e7c', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(4).jpg', 'image/jpeg', 337982, NULL, '2026-06-03T16:01:23.851399+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2045ce20-c8cd-4ae4-be8e-662e706d1537', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(3).jpg', 'image/jpeg', 313929, NULL, '2026-06-03T16:01:25.610823+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('107307de-5592-4f70-a8f8-f0aa7709948e', 'WhatsApp%20Image%202026-06-03%20at%2020.32.23%20(2).jpg', 'image/jpeg', 309079, NULL, '2026-06-03T16:01:27.295475+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0f7c312a-d2fb-48f7-b84f-69edec96a593', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T16:05:18.122176+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d804d683-3f35-488c-afab-1f851b96a49c', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(6).jpg', 'image/jpeg', 330057, NULL, '2026-06-03T16:05:49.563405+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('38a80161-75bb-473c-9557-30cdd4ad964a', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:06:00.709864+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5209e5f1-dac1-4124-b2d8-ea95e7800860', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46%20(1).jpg', 'image/jpeg', 350148, NULL, '2026-06-03T16:06:15.879541+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1c5e0427-2799-49d6-b6d7-288ab8bcf673', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46.jpg', 'image/jpeg', 309637, NULL, '2026-06-03T16:06:17.74102+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6fcebab7-086b-454a-b3e1-0cb0d143223b', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(11).jpg', 'image/jpeg', 294017, NULL, '2026-06-03T16:06:19.469046+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6fbc5169-d9ed-4686-afee-af89e857c52b', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(10).jpg', 'image/jpeg', 334687, NULL, '2026-06-03T16:06:21.334987+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7a6325ff-9803-4b4d-bf61-384555780ffc', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(9).jpg', 'image/jpeg', 269745, NULL, '2026-06-03T16:06:23.059352+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('55f123c7-9098-420b-a95c-ee3c4c7ab7aa', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(8).jpg', 'image/jpeg', 322887, NULL, '2026-06-03T16:06:24.862574+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('58c66fdf-098f-4381-9cdc-53f66923853e', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:06:26.554007+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7607c58a-bde9-4f7c-933d-137e4e3be825', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(6).jpg', 'image/jpeg', 330057, NULL, '2026-06-03T16:06:28.325428+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a077c6d1-9bd0-4da9-bc1d-0a06b79a9db3', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(5).jpg', 'image/jpeg', 320637, NULL, '2026-06-03T16:06:30.094+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('eef1242f-e844-4fd3-9995-073b71986038', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46%20(1).jpg', 'image/jpeg', 350148, NULL, '2026-06-03T16:06:44.388478+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c2134d74-0b1f-4064-8adf-11fea6fc01b2', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46.jpg', 'image/jpeg', 309637, NULL, '2026-06-03T16:06:46.088098+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b25b0e37-2442-447b-b432-9dd0c39e158c', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(11).jpg', 'image/jpeg', 294017, NULL, '2026-06-03T16:06:47.780888+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('818d356d-ac73-4735-9bd5-7e610095e505', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(10).jpg', 'image/jpeg', 334687, NULL, '2026-06-03T16:06:49.56629+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('99cc4a73-b23a-4afc-b70e-01ffc700782e', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(9).jpg', 'image/jpeg', 269745, NULL, '2026-06-03T16:06:51.216258+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7f05f2c4-e676-4cec-a76f-28312254f1c3', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(8).jpg', 'image/jpeg', 322887, NULL, '2026-06-03T16:07:01.917297+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4bd3b7ec-ac35-439c-b061-cd6ff17340da', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:07:03.39786+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7cd51012-ab7d-4540-8ef7-5921161d4b26', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(6).jpg', 'image/jpeg', 330057, NULL, '2026-06-03T16:07:05.142103+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3637f8a5-0ab1-44ff-a889-5ebd49178e8d', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(5).jpg', 'image/jpeg', 320637, NULL, '2026-06-03T16:07:06.641927+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1160872c-66f9-4c3b-9d19-5b2b16022cde', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T16:10:06.275347+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0ea2dd76-e6ca-4665-9cc0-ad2dcffd1180', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:10:20.735768+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d4e5ba1b-37be-4b83-bb9c-0cc696772360', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46%20(1).jpg', 'image/jpeg', 350148, NULL, '2026-06-03T16:10:41.707795+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7e58bc8d-96bd-4b6e-9277-74c7b461b920', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46.jpg', 'image/jpeg', 309637, NULL, '2026-06-03T16:10:43.486667+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a2279826-170a-440a-8b36-606150921bbc', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(11).jpg', 'image/jpeg', 294017, NULL, '2026-06-03T16:10:45.265505+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('37158332-75e6-4e28-ad5f-13dcdf9c560f', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(10).jpg', 'image/jpeg', 334687, NULL, '2026-06-03T16:10:47.07916+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4f357778-3b57-4bdf-a69d-d2f530ca8886', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(9).jpg', 'image/jpeg', 269745, NULL, '2026-06-03T16:10:48.781158+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('50a6eecc-d104-4ce8-bd83-1b10886d687c', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(8).jpg', 'image/jpeg', 322887, NULL, '2026-06-03T16:10:51.66004+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0ff2dccc-1f0f-4999-8a2c-49a72ac293ef', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:10:53.392352+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c3e53e17-4184-4a22-aafe-61fc39b359ea', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(6).jpg', 'image/jpeg', 330057, NULL, '2026-06-03T16:10:55.160909+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ac4879e6-78a8-4043-9019-6136242842fe', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(5).jpg', 'image/jpeg', 320637, NULL, '2026-06-03T16:10:56.920479+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2a584a40-0b9f-44fd-b40b-27aea8b62941', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T16:11:25.275801+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2353be0a-d62c-4d27-bf7d-8efcd21449d1', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:11:31.388475+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1322998b-db6a-4ca3-a477-0f739100c97a', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46%20(1).jpg', 'image/jpeg', 350148, NULL, '2026-06-03T16:11:41.246733+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('76ceb529-83f3-4dd3-9753-a778e748567d', 'WhatsApp%20Image%202026-06-03%20at%2020.32.46.jpg', 'image/jpeg', 309637, NULL, '2026-06-03T16:11:43.032923+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0a3a3040-a8b7-4e72-a761-28b5ddc0d19b', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(11).jpg', 'image/jpeg', 294017, NULL, '2026-06-03T16:11:44.783207+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7e647624-fb76-4ad6-bb45-1aa1bbebb496', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(10).jpg', 'image/jpeg', 334687, NULL, '2026-06-03T16:11:46.56002+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4d535136-a3fc-417f-863f-771fce591062', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(9).jpg', 'image/jpeg', 269745, NULL, '2026-06-03T16:11:48.274428+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ab6bb90a-b64f-4673-82bb-87951ef370b8', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(8).jpg', 'image/jpeg', 322887, NULL, '2026-06-03T16:12:00.415576+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('019cefb2-5803-4307-a4cf-0eb44f793f54', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:12:02.045476+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9dd0464f-aa40-4763-bba0-df5d93e43026', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(6).jpg', 'image/jpeg', 330057, NULL, '2026-06-03T16:12:03.857026+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('a461fe51-e2cd-4af7-a9df-cb63a76f2e85', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(5).jpg', 'image/jpeg', 320637, NULL, '2026-06-03T16:12:05.452371+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('cce2cd47-9e84-4de6-bb15-f52a845e470e', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(3).jpg', 'image/jpeg', 324401, NULL, '2026-06-03T16:12:14.815334+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6ed4e0dc-f557-4e84-a2c1-285331acac23', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45.jpg', 'image/jpeg', 289221, NULL, '2026-06-03T16:12:21.026529+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1f7ae346-18a1-43fa-bd3a-b12f0774964e', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(1).jpg', 'image/jpeg', 346142, NULL, '2026-06-03T16:12:27.612812+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('81ce515e-3bd6-4aaf-aba1-c4f56800b690', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(6).jpg', 'image/jpeg', 330057, NULL, '2026-06-03T16:12:35.297119+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8a8e4c4c-2cf9-45d9-af02-43d08e9c1783', 'WhatsApp%20Image%202026-06-03%20at%2020.32.45%20(7).jpg', 'image/jpeg', 283664, NULL, '2026-06-03T16:12:40.346816+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('6426726d-1193-433b-be8a-423108c8ad58', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T16:16:30.463828+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('e951f4ed-4d94-4cb3-b067-e84b8dd083d3', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(12).jpg', 'image/jpeg', 283052, NULL, '2026-06-03T16:16:36.772926+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9fdd6bd1-848e-48b1-a34a-9fe1d04b681a', 'WhatsApp%20Image%202026-06-03%20at%2020.33.10%20(1).jpg', 'image/jpeg', 434074, NULL, '2026-06-03T16:16:51.650867+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('15293889-ae88-44b9-b10b-854fd54cbef1', 'WhatsApp%20Image%202026-06-03%20at%2020.33.10.jpg', 'image/jpeg', 369409, NULL, '2026-06-03T16:16:53.268217+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fc048549-c131-4b55-89be-62108e6f80a1', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(18).jpg', 'image/jpeg', 192422, NULL, '2026-06-03T16:16:54.799448+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('396f87c1-e492-4cda-9672-d4d6d7022c50', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(17).jpg', 'image/jpeg', 368162, NULL, '2026-06-03T16:16:56.68458+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2691085f-193e-4cc4-bfa3-aed27794cbe1', 'WhatsApp%20Image%202026-06-03%20at%2020.33.10%20(1).jpg', 'image/jpeg', 434074, NULL, '2026-06-03T16:17:08.237324+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ca8ea303-3e61-483e-a52c-4ac36a2f6178', 'WhatsApp%20Image%202026-06-03%20at%2020.33.10.jpg', 'image/jpeg', 369409, NULL, '2026-06-03T16:17:10.007733+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('0e2bf7d4-d075-4012-b073-93d3112b15fc', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(18).jpg', 'image/jpeg', 192422, NULL, '2026-06-03T16:17:11.548553+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('25e74cc8-3454-4a34-8de4-cddfa995c3fa', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(17).jpg', 'image/jpeg', 368162, NULL, '2026-06-03T16:17:13.406125+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('39974428-7664-48ea-98a7-0a6a83f263eb', 'WhatsApp%20Image%202026-06-03%20at%2020.33.10%20(1).jpg', 'image/jpeg', 434074, NULL, '2026-06-03T16:17:25.659112+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('91a2827a-3191-41a7-9b59-9cfaf845c22d', 'WhatsApp%20Image%202026-06-03%20at%2020.33.10.jpg', 'image/jpeg', 369409, NULL, '2026-06-03T16:17:27.431247+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ebfe0bbf-6308-4df4-af45-957616b6027f', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(18).jpg', 'image/jpeg', 192422, NULL, '2026-06-03T16:17:28.958531+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f711ffe7-a654-4073-9365-d3d9f4eb823e', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(17).jpg', 'image/jpeg', 368162, NULL, '2026-06-03T16:17:30.789196+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d9ffe209-d562-4f32-a9ad-e6fb469669f2', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(15).jpg', 'image/jpeg', 347785, NULL, '2026-06-03T16:17:57.307534+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('27fe1231-ce31-4358-9551-0db17f8ce5d1', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(14).jpg', 'image/jpeg', 286808, NULL, '2026-06-03T16:17:58.990357+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d95b1e98-9b40-4409-9741-b4858db89649', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(13).jpg', 'image/jpeg', 329639, NULL, '2026-06-03T16:18:09.623793+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('ab709097-fd93-4707-9051-c0904a4b9e7e', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(12).jpg', 'image/jpeg', 283052, NULL, '2026-06-03T16:18:11.287414+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d36ca7d2-3613-487c-a81f-e39ec87eecd0', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(10).jpg', 'image/jpeg', 325371, NULL, '2026-06-03T16:18:24.545343+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1f35ffd8-12ac-40db-9559-758412757a78', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(9).jpg', 'image/jpeg', 366296, NULL, '2026-06-03T16:18:26.295374+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('90e7856c-9cce-497d-abe2-a713d47c1291', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(7).jpg', 'image/jpeg', 283784, NULL, '2026-06-03T16:18:45.675182+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2a2cdb8a-f149-4c16-9c4f-1b2d70ac1d77', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(6).jpg', 'image/jpeg', 315161, NULL, '2026-06-03T16:18:47.449723+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fc4cc816-7784-4af9-9f71-c0cae00b4cf2', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(5).jpg', 'image/jpeg', 365657, NULL, '2026-06-03T16:19:09.956373+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b168ed0f-9dd0-4423-9e04-1aeb2b9ce0dd', 'WhatsApp%20Image%202026-06-03%20at%2020.33.09%20(4).jpg', 'image/jpeg', 276915, NULL, '2026-06-03T16:19:11.575736+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8aa0c5eb-1e38-419a-a67c-8f4f7bfbeb45', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-03T16:25:07.625039+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('86465fa0-f003-4767-b35c-cf23ee5af334', 'WhatsApp%20Image%202026-06-03%20at%2020.33.28%20(5).jpg', 'image/jpeg', 303885, NULL, '2026-06-03T16:25:15.184213+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('65be4a3a-a053-4869-8328-df5282fd12e1', 'WhatsApp%20Image%202026-06-03%20at%2020.33.29%20(2).jpg', 'image/jpeg', 276779, NULL, '2026-06-03T16:25:23.710637+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('64250b27-2bdc-48c0-b3b3-a33868cdb188', 'WhatsApp%20Image%202026-06-03%20at%2020.33.29%20(2).jpg', 'image/jpeg', 276779, NULL, '2026-06-03T16:27:29.651902+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('becec0f2-8661-489d-9435-14f493983508', 'WhatsApp%20Image%202026-06-03%20at%2020.33.29%20(2).jpg', 'image/jpeg', 276779, NULL, '2026-06-03T16:27:36.716855+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d4a76a8d-fd34-4f44-a593-5a3eb0418f99', 'WhatsApp%20Image%202026-06-03%20at%2020.33.29%20(2).jpg', 'image/jpeg', 276779, NULL, '2026-06-03T16:28:30.060949+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('2563dab4-b7ed-4b2d-97ab-3816b7a06fc2', 'WhatsApp%20Image%202026-06-03%20at%2020.33.29%20(2).jpg', 'image/jpeg', 276779, NULL, '2026-06-03T16:30:23.685434+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('c5423161-794a-4468-910a-3497bd97ccac', 'WhatsApp%20Image%202026-06-03%20at%2020.33.29.jpg', 'image/jpeg', 361223, NULL, '2026-06-03T16:30:31.956543+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('aeb0e465-5230-456a-a34f-14a2fb1f5f18', 'WhatsApp%20Image%202026-06-03%20at%2020.33.28%20(5).jpg', 'image/jpeg', 303885, NULL, '2026-06-03T16:30:39.076112+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('f26585d6-8f23-4587-aa5c-bb6418383e4b', 'WhatsApp%20Image%202026-06-03%20at%2020.33.28%20(4).jpg', 'image/jpeg', 314566, NULL, '2026-06-03T16:30:46.598905+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('34a4cc49-65d1-4e67-ae55-1732083e4d95', 'WhatsApp%20Image%202026-06-03%20at%2020.33.28%20(3).jpg', 'image/jpeg', 295862, NULL, '2026-06-03T16:30:54.442521+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('810cdac9-c313-4bf4-8ba8-a53ca50cadbd', 'WhatsApp%20Image%202026-06-03%20at%2020.33.28%20(2).jpg', 'image/jpeg', 318414, NULL, '2026-06-03T16:31:01.985027+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d209172e-823c-475d-824d-270bf27e84e7', 'WhatsApp%20Image%202026-06-03%20at%2020.33.28%20(1).jpg', 'image/jpeg', 328500, NULL, '2026-06-03T16:31:09.428308+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('dde4e555-e949-40e0-81b3-7e36c83f4bf3', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-04T06:55:15.928252+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4e158da3-5038-4760-b6cd-19cd52aaac10', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-04T07:03:18.50376+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1774622e-7d9e-47d5-b162-9fdb59fc5b75', '8.jpg', 'image/jpeg', 337619, NULL, '2026-06-04T07:03:31.226772+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d174e62b-2434-4a9f-93d5-a8e1efad7cad', '10.jpg', 'image/jpeg', 345476, NULL, '2026-06-04T07:03:46.361267+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('8d586b76-58df-4aa8-8628-432ea4df1a98', '10.jpg', 'image/jpeg', 345476, NULL, '2026-06-04T07:05:38.244551+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('91a1897c-be7a-43b0-924d-6a488fcfdd06', '7.jpg', 'image/jpeg', 412486, NULL, '2026-06-04T07:07:00.886041+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('4114aa93-00a7-44ce-bc6a-1cacbc1185ec', '8.jpg', 'image/jpeg', 337619, NULL, '2026-06-04T07:07:08.741296+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9d6a931d-cd73-4869-af0b-79a46bed6853', '9.jpg', 'image/jpeg', 361881, NULL, '2026-06-04T07:07:16.96008+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('d7875a99-0773-4262-8127-ba73ad8225f1', '5.jpg', 'image/jpeg', 531027, NULL, '2026-06-04T07:07:31.424432+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b3b6c5a1-f933-4d09-8de2-348dd32b235f', '6.jpg', 'image/jpeg', 416927, NULL, '2026-06-04T07:07:39.512561+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('7ca61aa4-e640-4e56-b94a-e24f2ee90240', '4.jpg', 'image/jpeg', 561241, NULL, '2026-06-04T07:07:47.055562+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('fee93cf3-3437-4de3-9ec6-fc9997256cdd', '2.jpg', 'image/jpeg', 399819, NULL, '2026-06-04T07:07:55.134817+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('b4798412-16d5-4543-a6df-f190128093f6', 'iconic%20logo.jpg', 'image/jpeg', 34792, NULL, '2026-06-04T07:09:13.420576+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('cf9eb894-32d6-46dc-9fa7-f040c52ca7ec', 'IMG_8646.jpg', 'image/jpeg', 729098, NULL, '2026-06-04T07:09:28.357284+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('9a911813-b0fe-4e86-9b80-7e87b20503db', 'WhatsApp%20Image%202026-06-04%20at%2012.40.38%20(2).jpg', 'image/jpeg', 412849, NULL, '2026-06-04T07:11:32.878755+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('5050fcdf-c8d2-4d4e-859f-eea9b40f8ff4', 'WhatsApp%20Image%202026-06-04%20at%2012.40.36.jpg', 'image/jpeg', 415585, NULL, '2026-06-04T07:12:51.58056+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('bce093d9-6ac5-4f70-ae20-2572a381ec03', 'WhatsApp%20Image%202026-06-04%20at%2012.40.37%20(5).jpg', 'image/jpeg', 374164, NULL, '2026-06-04T07:12:59.555654+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('dd4581f8-33ff-4bce-af49-54b304ea86a8', 'WhatsApp%20Image%202026-06-04%20at%2012.40.37.jpg', 'image/jpeg', 298729, NULL, '2026-06-04T07:13:06.674717+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('1c66a8a8-f3e5-4339-aad9-f893f1a78c9c', 'WhatsApp%20Image%202026-06-04%20at%2012.40.37%20(4).jpg', 'image/jpeg', 377892, NULL, '2026-06-04T07:13:13.425376+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3252effd-dab8-43d6-be24-b62bcd905430', 'jpeg-optimizer_IMG_8639.jpg', 'image/jpeg', 151116, NULL, '2026-06-04T07:14:31.966175+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('dff2beb2-d8b6-4af5-bf0a-56fb61f500de', 'jpeg-optimizer_IMG_8649.jpg', 'image/jpeg', 148081, NULL, '2026-06-04T07:15:03.014851+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('3b38185f-5430-402e-a563-d1f8feff62fd', '2.jpg', 'image/jpeg', 399819, NULL, '2026-06-06T12:41:26.805638+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('257baf95-a95e-421f-8e93-8691c2ffb3bd', 'WhatsApp%20Image%202026-06-04%20at%2012.40.37.jpg', 'image/jpeg', 298729, NULL, '2026-06-06T12:41:52.969864+00:00');
INSERT INTO "uploaded_images" ("id", "file_name", "mime_type", "size_bytes", "data_base64", "created_at") VALUES ('97ea2914-9c98-48d3-a515-246928cc3001', 'WhatsApp%20Image%202026-06-04%20at%2012.40.37%20(2).jpg', 'image/jpeg', 330300, NULL, '2026-06-06T12:43:27.708045+00:00');

-- user_memberships (1 rows)
INSERT INTO "user_memberships" ("id", "user_id", "plan_id", "renews_on", "classes_used", "gyms_accessed", "status") VALUES (1, 1, 2, '2026-06-12T12:39:06.543947+00:00', 11, 6, 'active');

-- user_sessions (16 rows)
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('h72NSnIE8ZDqTkI_haLWWPaNsROh37d1', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T13:49:28.718Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":1,"adminEmail":"admin@gymco.in","adminName":"GYMCO Admin"}'::json, '2026-06-10T13:49:30');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('of3enuW7SuxuWBXtr0q32MlWPKl6002m', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-15T06:15:11.787Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas","partnerId":42,"partnerEmail":"support@iconicfitnessindia.com","partnerName":"Koramangala (7th Block)"}'::json, '2026-06-15T07:26:10');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('jGBwsl6mLbL3a3oru_Re4CBp8rMjYUqg', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-05T10:59:22.724Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"staffId":1,"staffEmail":"ravinder@gmail.com","staffName":"Ravinder","staffPermissions":["partner.onboard","partner.document_upload","partner.view","partner.assign_login","gym.manage"],"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas","partnerId":39,"partnerEmail":"info@iconicfitnessindia.com","partnerName":"Iconic Fitness KORAMANGALA 5th BLOCK"}'::json, '2026-06-08T09:18:44');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('_OUKNmvYr5ArXv0QF9-TGcCMrCb5h7cq', '{"cookie":{"originalMaxAge":604799999,"expires":"2026-06-08T12:06:08.026Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas","partnerId":40,"partnerEmail":"info@iconicfitnessindia.com","partnerName":"Kormangala 4th Block"}'::json, '2026-06-08T12:27:57');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('a_I_kE6rXoSQDGEofrkleXFxjxZjfF8s', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-12T08:34:49.271Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas"}'::json, '2026-06-14T07:29:06');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('Z72iiQK8aurVE9fR24Dz4CYmLpUXEfzA', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T14:15:49.417Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":1,"adminEmail":"admin@gymco.in","adminName":"GYMCO Admin"}'::json, '2026-06-10T14:16:32');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('aEFSc1HLWxFtAp3EKo9_DNBMCCUMPGUQ', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T14:10:36.806Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":1,"adminEmail":"admin@gymco.in","adminName":"GYMCO Admin"}'::json, '2026-06-10T14:10:43');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('qR48P1s3FnjRcRGLoIXT3zZDGm3Btl6U', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T14:13:14.939Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":1,"adminEmail":"admin@gymco.in","adminName":"GYMCO Admin"}'::json, '2026-06-10T14:13:15');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('ZrDi5Kzub9nw7IeakLVq0s5OXL8Vjeh8', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-08T15:19:15.928Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas"}'::json, '2026-06-08T15:31:58');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('BufUZq1BBjsozO7uqXoME-ZRsTeuEmHI', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T12:41:09.384Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas","partnerId":54,"partnerEmail":"support@iconicfitnessindia.com","partnerName":"Marathahalli"}'::json, '2026-06-15T07:08:47');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('C3FtD9I6Wmo8_gRnAhcNWr_m6XxtisaS', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-08T12:59:45.285Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas","partnerId":41,"partnerEmail":"info@iconicfitnessindia.com","partnerName":"Koramangala 1st Block"}'::json, '2026-06-08T13:47:08');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('vg-X2hjHvlvQyzZgoF2UNj5PVXxGNjnU', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T14:11:40.371Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":1,"adminEmail":"admin@gymco.in","adminName":"GYMCO Admin"}'::json, '2026-06-10T14:11:42');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('xP8qiz40CbC8MdyRYCpqTGJKuykZG5dy', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T13:57:51.902Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas","partnerId":55,"partnerEmail":"support@iconicfitnessindia.com","partnerName":"Brookfield"}'::json, '2026-06-10T14:26:34');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('dpcTuuw6H_gH-AfkjSzSEizTFMc5K_VH', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T14:13:56.057Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":1,"adminEmail":"admin@gymco.in","adminName":"GYMCO Admin"}'::json, '2026-06-10T14:14:11');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('bpGmGeN2m2WxW---P9OsMrEexXWjirMB', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-10T14:14:21.512Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":1,"adminEmail":"admin@gymco.in","adminName":"GYMCO Admin"}'::json, '2026-06-10T14:15:07');
INSERT INTO "user_sessions" ("sid", "sess", "expire") VALUES ('760ovRg1TQ8lTJjwSKR8CuL0ao90JvXt', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-13T08:36:36.621Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"adminId":2,"adminEmail":"ilyashumfans@gmail.com","adminName":"Ilyas","partnerId":40,"partnerEmail":"info@iconicfitnessindia.com","partnerName":"Kormangala (4th Block)"}'::json, '2026-06-13T08:36:42');

-- users (16 rows)
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (1, 'Arjun Mehta', 'arjun@gymco.app', '+91 98765 43210', 'male', 29, 178, 76.5, 'Build strength & lose 4kg', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80', 'Bangalore', 1840, 2400, 7.4, 58, 17, 5, 'GYMCO-AM-2401', '2026-01-03T12:34:28.318424+00:00', NULL);
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (2, 'Web Blitz Software Limited', 'ilyashumfans@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRURqVHRUNHhKQ0M0Z1hxYlljY0F5a1o0RHMifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-Q7D4JB', '2026-05-26T10:04:22.450688+00:00', 'user_3EDjTsUtuIQSCaB4h6CppjVoy5a');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (4, 'Web Blitz Software Limited', 'ilyashumfans@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRVd6TmFJRjRUZmFXSVJkNnF0QmRIaDZpVmQifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-RSUFSG', '2026-06-01T10:17:57.606339+00:00', 'user_3EWzNUd7Aic5SFtqxrKcrVaHSmO');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (7, 'MERAJ RIZWAN', 'meraj.rizwan9832@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRVlGR1pZeVFjamJwY016RHUwVkluTnhJbGcifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-L1ZO33', '2026-06-01T20:58:22.784612+00:00', 'user_3EYFGVe0QqR4w7B5lgYpRMysUJX');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (8, 'Vinayak Saxena', 'vinayaksaxena159@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRVpUTHpoWFR1ekJqNWhiUkZwTGNzemc1YkQifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-DQCVNW', '2026-06-02T07:24:00.532169+00:00', 'user_3EZTM1g3e6NWrmr2exREAORf1UJ');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (10, 'sandeep kurien', 'sandeepkurien@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRVpYVHZLdDdld3p3YVpZc3BuNnUyUEhjcFkifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-YCIJ5T', '2026-06-02T07:58:00.101119+00:00', 'user_3EZXTwlj3Hktl8ZdDUMIcQhkWlN');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (12, 'Fidha', 'fidhaiconicfitness123@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRVp5S2JtOEdCQmhEcTBCclpNaDhxcmxNQVUifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-QX26KU', '2026-06-02T11:38:44.861517+00:00', 'user_3EZyKhdf7L5cPMjndNQ5eKIuvTi');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (14, 'Attreya Mishra', 'attreya.96@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRWE0TjR3ZXJHb1lQV1lsYzU3R0JhZzNSNW4ifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-MFPAT8', '2026-06-02T12:28:25.474807+00:00', 'user_3Ea4N5TdsqTuYo4XThapqhV0v0r');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (16, 'guptarishabh412', 'guptarishabh412@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zRVd0SEt6aGJNM25JemkzOUZVc1ZoejZhbEMiLCJyaWQiOiJ1c2VyXzNFZFBja3V2N0pVM1lSemExMVBjSm5yYUVtVyJ9', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-ITWBK4', '2026-06-03T16:52:37.225288+00:00', 'user_3EdPckuv7JU3YRza11PcJnraEmW');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (17, 'Mohammed Suhail', 'suhail44u@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRWZPRGhVUkhtT2daOGJJVDhTa3N5N2VMYjQifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-YI8DWA', '2026-06-04T09:40:40.973884+00:00', 'user_3EfODgvnhWyMCb6ySOXr3Gr5YV4');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (19, 'Evan Sam', 'evansam68@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRWlIQTBrelJ1NUdqQmQ3bnpKdGJHSE9aVmgifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-QE7X92', '2026-06-05T10:12:05.104712+00:00', 'user_3EiHA3Y5SZDLc30c3AFIp0oURu5');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (22, 'Abhishek Khanna', 'abhishekkhanna1997@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRWwyams4SDl5R0Zvc0dVVjFObXFITGc4bGQifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-0ZMW2E', '2026-06-06T09:42:53.590662+00:00', 'user_3El2jppDBSLmu2s6iN44kkL7nMf');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (23, 'ramathevikannan', 'ramathevikannan@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zRVd0SEt6aGJNM25JemkzOUZVc1ZoejZhbEMiLCJyaWQiOiJ1c2VyXzNFbGEydzV5Tkg0alA2WERoRTRoTlZwQVlvMSJ9', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-G4QK0D', '2026-06-06T14:16:48.666983+00:00', 'user_3Ela2w5yNH4jP6XDhE4hNVpAYo1');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (24, 'Shivam Sahu', 'shivamsahu19882000@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRW53VjJMenRZQTN6OGNhdzhqdXQzOWhoTGgifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-N363SB', '2026-06-07T10:21:02.889619+00:00', 'user_3EnwV5Rmy6EPN3tZmshgW6FIZhu');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (26, 'danish shaikh', 'danishshaikhds085@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRW8ycUZZcURBWmFOT2Q4M3BOTVJOdExaV24ifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-QE315F', '2026-06-07T11:13:11.877682+00:00', 'user_3Eo2qEeK8I5a1alexs4GDqviDF0');
INSERT INTO "users" ("id", "name", "email", "mobile", "gender", "age", "height_cm", "weight_kg", "fitness_goal", "avatar_url", "city", "daily_calories", "daily_water_ml", "daily_sleep_hours", "resting_hr", "streak_days", "weekly_goal", "member_code", "joined_at", "clerk_user_id") VALUES (29, 'Nathish 21', 'nathishl2165@gmail.com', '', 'prefer_not_to_say', 25, 170, 70, 'general_fitness', 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zRW9UdDFmNFRmMzY3RzZkaDNydWc2UFRTWmQifQ', 'Bengaluru', 0, 0, 0, 60, 0, 5, 'GYM-04EF1C', '2026-06-07T14:55:35.040012+00:00', 'user_3EoTt8LDfuxNW1pHfYZ8dJ4k0kE');

-- wallet_transactions (7 rows)
INSERT INTO "wallet_transactions" ("id", "user_id", "label", "amount_inr", "kind", "created_at") VALUES (1, 1, 'Cashback - GYMCO Pro renewal', 150, 'cashback', '2026-05-25T10:42:12.869095+00:00');
INSERT INTO "wallet_transactions" ("id", "user_id", "label", "amount_inr", "kind", "created_at") VALUES (2, 1, 'Referral bonus - Karthik joined', 500, 'referral', '2026-05-22T12:42:14.70146+00:00');
INSERT INTO "wallet_transactions" ("id", "user_id", "label", "amount_inr", "kind", "created_at") VALUES (3, 1, 'Class booking - Heavy Squat Day', -250, 'debit', '2026-05-20T12:42:16.264421+00:00');
INSERT INTO "wallet_transactions" ("id", "user_id", "label", "amount_inr", "kind", "created_at") VALUES (4, 1, 'Top up via UPI', 1000, 'topup', '2026-05-13T12:42:17.992059+00:00');
INSERT INTO "wallet_transactions" ("id", "user_id", "label", "amount_inr", "kind", "created_at") VALUES (5, 1, 'Refund - Cancelled spin class', 200, 'refund', '2026-05-07T12:42:19.474515+00:00');
INSERT INTO "wallet_transactions" ("id", "user_id", "label", "amount_inr", "kind", "created_at") VALUES (6, 1, 'Cashback - First Combat Lab visit', 100, 'cashback', '2026-05-03T12:42:21.650164+00:00');
INSERT INTO "wallet_transactions" ("id", "user_id", "label", "amount_inr", "kind", "created_at") VALUES (7, 1, 'Reward points redemption', -150, 'debit', '2026-04-29T12:42:23.44645+00:00');

-- wallets (1 rows)
INSERT INTO "wallets" ("id", "user_id", "balance_inr", "reward_points") VALUES (1, 1, 1850, 4720);

-- workouts (9 rows)
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (1, 'Gym Workouts', 'gym-workouts', 'Strength + functional training', 'Dumbbell', 'from-orange-500 to-amber-500', '', TRUE, 1, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (2, 'Yoga', 'yoga', 'Flexibility and mindfulness', 'Flower2', 'from-violet-500 to-purple-500', '', TRUE, 2, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (3, 'Abs', 'abs', 'Core sculpting sessions', 'Flame', 'from-red-500 to-rose-500', '', TRUE, 3, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (4, 'Combat Sports', 'combat-sports', 'Boxing, kickboxing, sparring', 'Swords', 'from-slate-700 to-slate-900', '', TRUE, 4, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (5, 'Core', 'core', 'Functional core training', 'Target', 'from-yellow-400 to-orange-400', '', TRUE, 5, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (6, 'Dance', 'dance', 'Cardio dance fitness', 'Music', 'from-pink-500 to-rose-500', '', TRUE, 6, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (7, 'HIIT', 'hiit', 'High-intensity interval training', 'Zap', 'from-orange-500 to-red-500', '', TRUE, 7, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (9, 'Pilates', 'pilates', 'Low-impact strength + control', 'Activity', 'from-emerald-500 to-teal-500', '', TRUE, 9, '2026-05-26T06:52:29.239+00:00');
INSERT INTO "workouts" ("id", "name", "slug", "description", "icon", "color", "image_url", "is_active", "sort_order", "created_at") VALUES (10, 'Spinning', 'spinning', 'Indoor cycling', 'Bike', 'from-blue-500 to-indigo-500', '', TRUE, 10, '2026-05-26T06:52:29.239+00:00');

