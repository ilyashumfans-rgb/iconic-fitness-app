# GYMCO / Iconic Fitness

Multi-role gym marketplace: members discover/join gyms (web + Iconic Fitness mobile app), partners manage their gyms, staff support partners, admins run the platform, and read-only agency accounts monitor GX bookings.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string
- **Never run `db push`** (it wants to DROP populated tables). Schema changes are additive raw SQL (`CREATE TABLE` / `ALTER TABLE … IF NOT EXISTS`) on dev + Drizzle schema update; prod gets them via the Replit Publish schema diff.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5; DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`; API codegen: Orval (from `lib/api-spec/openapi.yaml`)
- Mobile: Expo (React Native, expo-router) in `artifacts/iconic-app`; web: React+Vite in `artifacts/gymco`
- All dates are `Asia/Kolkata` (IST) throughout.

## Architecture decisions

- **Contract-first:** OpenAPI → codegen → generated hooks (`@workspace/api-client-react`) + Zod (`@workspace/api-zod`). Server validates with the Zod schemas.
- **Code-default + lazy materialization pattern** (GX timetable, challenges): defaults live in server code, DB rows are created only when an owner first customizes/joins — features reach prod with no data-import step.
- **Image uploads go to the DB, not object storage** (broken forked secrets): `POST /api/storage/uploads/inline` → `uploaded_images` → served at `/api/storage/db-images/:id`. Compress images client-side (prod edge 403s large bodies).
- Tables use plain int cross-references, no FKs (repo convention).
- No `console.log` in server code — `req.log` / `logger`.

## Product features

### Membership plans, Annual Plans & Offers

All plans are rows in `membershipsTable`; discriminator `billingPeriod === "annual"` splits regular plans from annual "packages/offers" everywhere (no separate table).

- Admin: `pages/admin/Memberships.tsx` (all) + `pages/admin/AnnualPlans.tsx` (annual-only CRUD, forces `billingPeriod="annual"`, per-plan image upload on its "Packages" tab). Form components must be keyed by `editing?.id ?? "new"` to remount on record switch.
- Website: `pages/Memberships.tsx` (non-annual) + `pages/Offers.tsx` (`/offers`, annual); both render shared `MembershipPlanGrid.tsx`.
- Mobile: `app/plans.tsx` (non-annual, `PlanCard.tsx`); annual plans render cultpass-style `PackageCard.tsx` on the **Packages bottom tab** (`app/(tabs)/packages.tsx`) and a Home "Explore packages" section (annual-only, popular-first, top 4). CTAs open `membershipsUrl` externally.
- `membershipsTable.imageUrl` (`text NOT NULL DEFAULT ''`); empty → gradient+icon fallback on mobile.

### Package categories (annual packages)

Admin-managed grouping for annual packages. `package_categories` table (name, sortOrder, isActive, imageUrl) + `membershipsTable.categoryId` (int, 0 = uncategorized, no FK). Category image uploads via inline DB upload in the admin Categories panel. Public `GET /package-categories` (active only, sorted) in `memberships.ts`; admin CRUD `/admin/package-categories` in `admin.ts` (delete detaches plans to 0); membership POST/PATCH accept `categoryId`. Admin UI: Categories panel + plan-form select in `AnnualPlans.tsx` (`adminApi.packageCategories`). Category-first UX (no chips, no "All packages" card): mobile Packages tab (`app/(tabs)/packages.tsx`) and website Offers page (`pages/Offers.tsx`) show category cards styled like the package cards (media block left, name/count/"View packages" right); tap → filtered package list with back control. State: `null`=picker / `>0`=category; picker-vs-list gated on categories query *settled* (no flash); hidden/deleted open category falls back to picker; zero categories → plain full list. **Uncategorized plans (categoryId 0) are unreachable while categories exist — assign every annual plan a category.**

### Trainers

- Partners: CRUD from `/partner/trainers` (scoped via `ensureOwnsGym`, manual `partnerApi.trainers.*`). Admins have global CRUD. Trainers attach to a gym and are selectable when scheduling classes. No trainer login exists — records only.
- Mobile: `app/trainers.tsx` is **live-YoActiv-roster only** (no local DB fallback — unmapped/empty branch shows an empty state); tap → `book-trainer`. Home entry: `PersonalTrainersCard`.

### Branch-locked member experience

Active members only see their home branch's content; guests / no-plan / expired / unmapped-branch members see all branches. `MyMembership.homeGymId` (nullable) = local gym mapped from the YoActiv plan branch via `gymsTable.yoactivBranchId` (set in `GET /memberships/mine` YoActiv path). Mobile: `app/trainers.tsx` auto-locks the branch (no picker, "· your branch") and `app/(tabs)/classes.tsx` filters Discover to the home gym — both gate on membership-query settled (no cross-branch flash). Server enforces on `POST /bookings` via `activeMemberHomeGymId()` in `bookings.ts` (fail-open on YoActiv outage → never blocks bookings).

### Class visibility & booking window

Classes hidden/not bookable until 24h before start. Source of truth: `api-server/src/lib/classVisibility.ts`; applied to member class listings + `POST /bookings` gate (started → 400, >24h → 403). Partner/admin views unaffected.

### Group class (GX) timetable & bookings

Fixed weekly timetable per branch (Mon–Sat, 7–8 AM & 7–8 PM slots, class names prefixed "iconic ").

- Default in code: `api-server/src/lib/groupClassSchedule.ts`; per-gym rows in `groupClassScheduleTable` are lazily materialized when a partner first opens `/partner/schedule` (advisory-lock guarded). Partner CRUD in `partner.ts` (`ensureOwnsGym`; staff permission `classes`); member display via `GET /gyms/:id/schedule` + `GymDetail.tsx`.
- GX bookings are `leadsTable` rows with `kind="class"`. `POST /api/leads` (`leads.ts` `validateGxBooking`) accepts a slot if it's in the branch timetable (`lib/resolveGymSchedule.ts`) OR matches legacy fixed 07:00/19:00 weekday slots (keeps old `LeadEnquiryDialog kind="class"` flow working). 1-day prebook window (today+tomorrow, passed slots hidden), computed in IST.
- Member page `/book-gx` (`pages/BookGxClass.tsx`): pick branch → available slots → contact details → lead (`source: "book-gx-page"`).
- Partner view `/partner/gx-bookings` (`GxBookings.tsx`): per-slot booking counts + booker contacts (no seat caps). API `GET /partner/gx-bookings`.

### Agency portal (read-only, branch-scoped)

Admin-managed view-only accounts for agencies to monitor GX bookings, limited to assigned branches.

- DB: `agencyUsersTable` (`username` unique, bcrypt `passwordHash`, `gymIds` int array — no join table).
- Auth: session-based (reuses admin session infra, `SessionData.agencyUserId`); `requireAgency` in `lib/agencyAuth.ts`. `gymIds` are **re-read per request**, so grants/revokes/deletion apply immediately. No write paths.
- API: `routes/agency.ts` (`/agency/login|logout|me|gx-bookings`). Admin CRUD: `adminApi.agencies.*` + `pages/admin/Agencies.tsx` ("Agency Accounts" nav).
- Frontend: standalone routes outside all shells (`App.tsx` `location.startsWith("/agency")`) → `pages/agency/Login.tsx` + `Dashboard.tsx` (totals, by-branch, by-class, per-slot detail). `lib/agencyApi.ts`.
- Old env secrets `AGENCY_USERNAME`/`AGENCY_PASSWORD` are dead config — login is DB-backed.

### Home banner slider (admin-managed)

Full-bleed slider at the top of mobile Home; slides managed in web admin (`pages/admin/HomeSlides.tsx`, "Home Slider" nav).

- DB: `homeSlidesTable` — `kind` (image|gif|youtube), `mediaUrl`, title/subtitle/CTA, `audience` (all|members|customers), `sortOrder`, `isActive`. GIFs upload raw (preserve animation); other images canvas-compressed.
- API: public `GET /home-slides` + admin CRUD in `routes/homeSlides.ts`; server validates kind↔mediaUrl (`validateMedia`).
- Audience gating on mobile (`HeroSlider` in `app/(tabs)/index.tsx`): **members = anyone signed in, customers = guests** (per user decision; no plan check, targeting always settled). Code-default brand/gym slides render when nothing is visible (never empty).
- YouTube slides autoplay inline muted+looping via platform-split `components/YouTubeInline` (`.tsx` webview / `.web.tsx` iframe), `pointerEvents="none"` so swipe/tap still work. Slider clears the notch: safe-area top on native, `paddingTop` only when `insets.top === 0` (web).
- **Slide taps stay in-app:** `ctaUrl` starting with `/` → `router.push`; external URLs (and YouTube slides / Explore) open the `app/web.tsx` in-app browser modal (native WebView / web iframe, header with close + open-externally).

### Home plan card & member-focused Home (mobile)

Signed-in Home is tracking-first: the personal tracking block ("Today's standing" goal bar graph with overall %, Quick log, Today stats, hydration CTA) is pinned to the top. "Explore packages" and the Gyms-near-me hero slide stay **guest-only** (`showDiscovery = !isSignedIn`), but Shop by category, Watch our story (posters now bundled app assets), and Top rated gyms show for **everyone** (user decision). The very top of Home is `TopCardPager` (in `index.tsx`) for members with a plan — a swipeable 2-slide pager (AI coach card + membership card, both `embedded`, pagination dots; expired/≤7-day plans put the membership slide first so the renewal warning leads; re-snaps on width change, resets to slide 1 on priority flip); guests/no-plan users get the standalone `AICoachCard`. `MembershipStatusCard` is a **premium black/gold card** (YoActiv photo or initials avatar, plan, branch, valid from/till, IST days left; `MyMembership` gained `startedOn`/`branchName`/`expiryKnown` — `expiryKnown:false` suppresses all urgency since `renewsOn` is then a placeholder). ≤7 days → amber, expired → red + gold **"Renew now"** = one-tap online renewal: `POST /memberships/mine/renew` (in `memberships.ts`) matches the member's current YoActiv plan to the live branch catalog (exact then case/whitespace-insensitive name match; strict branch scoping; visibility prefs deliberately NOT applied — member is already on the plan), reuses the package-purchase pipeline (pending `packageBookingsTable` row, `/api/pay/package/:token` landings, 4s status poll via booking token), hosted Razorpay page. No match/branch → 409 → app offers `membershipsUrl` fallback.

### Refer & Earn (points wallet)

Member referral codes (`ICN-XXXXXX`, lazily generated in `users.referral_code`) + rupee-valued points wallet (1 point = ₹1).

- DB: `wallets` (one row per user, `wallets_user_id_unique`), `wallet_transactions` ledger with `refType`/`refId` idempotency anchor (`wallet_tx_ref_unique` partial index — DB-enforced once-per-ref), `referral_settings` (single lazy row: `fixed` ₹ or `percent` of first purchase; code-default fixed ₹100 active), `users.referral_code` (partial unique) + `users.referred_by` (0 = none). **Prod needs the three CREATE UNIQUE INDEX statements via the Publish schema diff.**
- Server: `lib/referrals.ts` — `creditWallet`/`debitWallet` are transactions with a FOR UPDATE wallet-row lock + 23505 catch (never double-credit/overspend); `creditReferralRewardOnce(userId, amountInr)` credits the referrer once per referred buyer on their first paid purchase (refId = referred user id) and **never throws** — safe on money paths. Routes `routes/referrals.ts`: `GET /referrals/mine`, `POST /referrals/apply` (conditional update `WHERE referred_by=0` → 409 if already applied), admin GET/PUT settings.
- Redemption: package purchases debit at the paid-flip (pending→paid guard); store COD orders debit immediately at checkout with re-clamp fallback (balance moved → difference stays COD). Reward base is always the pre-redemption amount. Reward credit fires on package/trainer paid-flips and store checkout.
- Clients: mobile `app/refer.tsx` (share code, balance, apply, history; More-hub link, non-guest) + redeem toggle in `app/book-package.tsx`; web redeem checkbox in `pages/Checkout.tsx`; admin `pages/admin/Referrals.tsx` (reward type/value/active).

### YoActiv integration (live gym-management data)

YoActiv (api.yoactiv.com) is the source of truth for member plans, payments, and the trainer roster. Client: `api-server/src/lib/yoactiv.ts` — all POST JSON with `API_Key`+`Branch_Id` headers; lookup field `Mobile_No`; dates DD-MM-YYYY; freeze/hold → `paused`; per-request 8s timeout, member lookup 6s global deadline, 5-min success / 60s failure cache.

- **Keys/branches:** secrets `YOACTIV_SANDBOX_API_KEY`/`YOACTIV_API_KEY_1`/`YOACTIV_API_KEY_2` + env `YOACTIV_BRANCH_IDS_1`/`_2` (16 prod branches each), sandbox branch 7820. **Slot names untrusted** (values pasted swapped) — client probes each key against each branch set once per process and auto-assigns (partial resolution retries after 60s). Sandbox in dev, live in prod (`YOACTIV_MODE` overrides); dev-only `YOACTIV_DEV_BRANCH_IDS` (currently `5838,6797`) swaps the sandbox branch for specific LIVE branches for testing — remove it to go back to sandbox. See `.agents/memory/yoactiv-integration.md`.
- **Plan:** `GET /memberships/mine` prefers the YoActiv plan by mobile, local `userMembershipsTable` fallback; `source: local|yoactiv` on `MyMembership`.
- **Mobile-first membership link (login):** sign-in/up screens show `MemberMobileVerify` — member enters gym-registered mobile, public `POST /membership-lookup` (memberships.ts; zod, per-IP 15/5min rate limit, masked name "Rah••• K." + branch) checks it live; verified number stashed in AsyncStorage (`lib/pendingMobile.ts`, 30-min TTL). After Clerk auth, root `PendingMobileLink` (in `_layout.tsx`) PATCHes `/me {mobile}` **only when the account has no mobile or it matches** (never overwrites a different number — shared-device safety), clears the stash, invalidates `/api/me` + `/api/memberships/mine*`. Not-found is informational; user continues anyway.
- **Payment history:** `GET /memberships/mine/payments` (`requireUser`) → `MembershipPayment[]` (billId, plan, invoice/start/expiry dates, `amountInr` from `upgradeDetails.total_due`, status), newest-first; `[]` when unlinked. Mobile Profile shows a "Payment history" card (top 10) when rows exist.
- **Member invoices (web + mobile):** YoActiv exposes no invoice PDF, so invoices are generated client-side as printable HTML from the payments payload (template duplicated intentionally: `iconic-app/lib/invoiceHtml.ts` + `gymco/src/lib/invoiceHtml.ts`; IST midday-UTC-anchored dates). Mobile `app/invoices.tsx` (modal, auth-gated; download = expo-print `printToFileAsync` → expo-sharing on native, `Print.printAsync` on web; entry: Profile "Payment history" → "Invoices"). Web `pages/Invoices.tsx` at `/invoices` (window.open + print; entries: desktop sidebar "Invoices" + Profile "View invoices"). Both show a summary card: registered since (earliest payment start), current plan/branch/started, next renewal (hidden when `expiryKnown:false`). No new API endpoints.
- **Branch names:** `lib/yoactivBranchNames.ts` maps all 32 prod branch IDs (+sandbox) to studio names (second set suffixed "(PT Sales)"); shown in admin/partner branch pickers and GymManagement's branch dropdown (select of configured branches, replaces free-text ID input).
- **Partner member directory:** `/partner/members` ("Gym Members" nav, staff perm `bookings`) — same browser as admin (`components/YoactivMembersBrowser.tsx`, shared) but strictly scoped: `/partner/yoactiv/branches|members|members/detail|trainers` in `partner.ts` only expose branches of gyms the partner owns; unowned branch → 403; detail filters memberships to owned branches (empty profile when none).
- **Photos:** trainers get staff-uploaded photos (`trainer_photos` table keyed by YoActiv staff id, helpers in `lib/trainerPhotos.ts`, mutations `PUT|DELETE /admin|/partner/yoactiv/trainers/:id/photo` — partner routes enforce owned branch + roster membership). Member photos are **display-only from YoActiv** (`Image` field via `normalizeYoactivImage`, generic-avatar URLs filtered out) — no member photo uploads exist. Web: trainer Photo column with upload/remove in `YoactivMembersBrowser`; members just render `photoUrl` with initials fallback.
- **Trainer directory (staff-facing):** Members/Trainers toggle inside `YoactivMembersBrowser`; `GET /admin/yoactiv/trainers` + `GET /partner/yoactiv/trainers` (owned-branch only) → per-branch PT roster **with mobiles** via `fetchYoactivBranchTrainers` (10-min/60s cache). Member-facing `/trainers/live` keeps stripping mobiles — never reuse the staff fetcher there. Browser guards branch/view switches with a request token (no stale-list flash).
- **Plan curation (admin):** "YoActiv Plans" (`/admin/yoactiv-plans`, Membership Management nav) — branch picker → live plan catalog (membership + PT groups) with a visibility switch + Edit dialog per plan. **DEFAULT-HIDDEN:** every plan starts OFF for members; visible only via an explicit pref row with `hidden=false` (`isPackageVisible` is the single gate — use it for any future listing/purchase path). Content edits insert `hidden:true` on fresh rows (metadata edit never un-hides). YoActiv owns **prices** (never overridable — payment happens on YoActiv's hosted page); `yoactiv_package_prefs` (unique branch+package, `lib/yoactivPackagePrefs.ts`) stores the hidden flag + display-only overrides (displayName/description/imageUrl, empty = live value; image via inline DB upload). `applyPackagePref` overlays them onto member-facing `GET /membership-packages` + `GET /trainer-packages` (TrainerPackage schema gained optional `description`/`imageUrl`); mobile package cards render image + description. Hidden plans filtered from listings AND rejected in the purchase POST re-verify; booking rows snapshot the curated display name (matches what the member saw). Admin routes `GET /admin/yoactiv/packages` + `PUT .../:id/visibility` + `PUT .../:id/content` (requireAdmin, branch validated against configured sets).
- **Admin member directory:** "Gym Members (YoActiv)" (`/admin/yoactiv-members`, Membership Management nav): branch picker (configured branches labelled by mapped gym) → full member list via paginated `Users/GetUserList` (`fetchYoactivMemberList`, dedupe by MemberId, stop when a page adds no new ids — API repeats last page; 5-min cache) with Active/Inactive badges, search, status filter; row expand → plans with start/expiry/sessions via `Users/Fetch` by mobile. Routes: `GET /admin/yoactiv/branches|members|members/detail` (requireAdmin, manual `adminApi.yoactiv.*`).
- **Live trainer roster:** public `GET /trainers/live` (registered **before** `/trainers/:trainerId`) → `LiveTrainer[] {id,name}` via `Billing/GetStaff {PT:1}` per branch, deduped by normalized mobile (mobiles are PII, never exposed), 10-min/60s cache with stale-on-failure. Accepts `?gymId=` → gym's `yoactivBranchId` (strict: unmapped gym → `[]`). Mobile `app/trainers.tsx` (branch picker → per-branch roster) prefers it; tap → `app/book-trainer.tsx`.

### Paid trainer booking (YoActiv hosted Razorpay)

Member picks branch → live trainer → PT package (live prices) → pays on YoActiv's hosted Razorpay page (`Billing/APIPayment` PaymentURL, ~5 min validity).

- Gym↔branch mapping: `gymsTable.yoactivBranchId` (admin GymManagement form field, POST+PATCH). **Strict scoping — never a default-branch fallback** (money path): unmapped gym → no packages/roster, `POST /trainer-bookings` 409; mobile then falls back to the free enquiry lead flow. See `.agents/memory/yoactiv-branch-scoping.md`.
- Server `routes/trainerBookings.ts`: `GET /trainer-packages?gymId` (from `Billing/GetServices` variations, PT-first, cached); `POST /trainer-bookings` (requireUser, server-side price re-verify, `ensureYoactivMemberId`, pending `trainerBookingsTable` row with 48-hex token, payment URL with success/failed redirects `/api/pay/trainer/:token/:outcome`); landing route flips pending→paid/failed (only from pending) with HTML page; `GET /trainer-bookings/:id` owner-only status poll (mobile polls 4s). **Caveat: `paid` set by redirect only — no webhook verification.**
- Mobile `app/book-trainer.tsx`: **request-only** (per user decision) — package picker/online pay removed from this screen; always the enquiry form, prefilled name/phone/email from `/me`. Paid package purchase stays on `book-package.tsx`. Server paid-booking routes remain for dashboards/history.
- Member view: `GET /trainer-bookings/mine` (requireUser, registered before `/:bookingId`) merges the member's `trainer_bookings` rows with their enquiry leads (SQL-normalized last-10-digit phone match, status `enquiry`, negative ids). Home membership card (active, no renewal due) shows "Book PT Trainer" (hidden when any paid/pending/enquiry PT row exists) + "Book Classes" instead of "Manage plan" (routes `/trainers`, `/classes`).
- Dashboards: partner `/partner/gx-bookings`-style page at `/partner/trainer-bookings` ("PT Bookings", ownedGymIds-scoped) + admin `/admin/trainer-bookings`; shared `TrainerBookingsTable.tsx`. Free PT enquiries (mobile "Send request", leads source `iconic-app-live-trainer`) are merged in as status `enquiry` rows with negative ids.
- **Cancel PT (admin only):** `PUT /admin/trainer-bookings/:id/cancel` — positive id → `trainer_bookings.status='cancelled'`; negative id → enquiry lead `status='cancelled'` (scoped to PT-enquiry source/kind). Cancelled enquiries surface as status `cancelled` in merged lists and are excluded from `/pt/mine`. Table: Cancel button (admin page only), `cancelled` badge + filter.
- **Trainer assignment:** staff assign/reassign a trainer per row (paid or enquiry) — `pt_trainer_assignments` table (refType booking|enquiry + refId, unique upsert; enquiry refId = lead id); `PUT /partner|/admin/trainer-bookings/:id/assign` (partner owned-gym + `classes` staff perm); rows carry `branchId` + `assignedTrainerName`; table's inline editor picks from the branch's live YoActiv roster, free-text fallback when unmapped.
- **PT program / session timings:** once a trainer is assigned, the member gets a PT program view. `pt_sessions` table (refType booking|enquiry + refId, sessionDate, startTime HH:MM IST, status scheduled|completed|cancelled; **prod Publish schema diff must add this table**); 12 sessions/month is the code constant `PT_TOTAL_SESSIONS` in `lib/ptSessions.ts` (not DB). Member `GET /pt/mine` (in `trainerBookings.ts`) picks the newest paid booking or phone-matched enquiry that HAS an assignment → `PtProgram {active, trainerName, gymName, packageName, totalSessions, completedCount, sessions[]}`; `active:false` otherwise. Staff CRUD `GET/POST/PATCH/DELETE /admin|/partner/trainer-bookings/:id/sessions(/:sessionId)` (partner owned-gym + `classes` perm; merged ids: positive=booking, negative=enquiry). Web: "Sessions" column → `SessionsManager` modal in `TrainerBookingsTable.tsx` (both dashboards). Mobile: `app/pt-details.tsx` modal (trainer/gym/package card, x/12 progress bar, session timing list) — reached via "Personal Trainers" (`app/trainers.tsx` redirects there when PT active); Home membership card shows only "Book PT Trainer" (no PT yet) — PT Details/Book Classes buttons removed per user request.
- **Trial session request:** lime "Book your trial session" CTA atop mobile `app/trainers.tsx` roster → `book-trainer.tsx` `trial=1` mode (trial copy, lead `className="Trial session"`, same enquiry pipeline). Trial form has an optional "Preferred trainer" chip picker (live roster, "Any trainer" default; choice appended to the lead message). PT/trial enquiry leads (`source=iconic-app-live-trainer`) fan out in-app notifications in `leads.ts` (`notifyPtEnquiry`) to all admins, active staff, and the gym's `ownerPartnerId` — fire-and-forget, per-IP rate limited (5/15min) since `/leads` is public. `PtProgram.trainerPhotoUrl` (optional) = assigned trainer's staff-uploaded photo; Home journey card's "Trainer assignment" step becomes "Accepted by {name}" + round avatar once assigned.
- **Fitness journey (mobile Home):** `components/FitnessJourneyCard.tsx` — signed-in 6-step kick-starter tracker (book PT trial → trainer assignment → 1st trial session → feedback → 2nd session → feedback), steps auto-derived from trainer bookings / `GET /pt/mine` active / completedCount / feedback rows; hides when all done. Feedback: `pt_trial_feedback` table (unique user+sessionNo; **prod Publish schema diff must add it**), `GET /pt/trial-feedback/mine` + upsert `POST /pt/trial-feedback` (requireUser, in `trainerBookings.ts`), star+comment modal in the card.
- **Welcome celebration (mobile):** `components/WelcomeCelebration.tsx` — one-time Diwali-crackers fireworks overlay on Home when an active plan is first seen; AsyncStorage key `welcomeCelebrated:v1:{startedOn ?? planName}`.

### Paid membership package purchase (YoActiv hosted Razorpay)

Member buys a membership package online: branch picker → live non-PT YoActiv packages (cheapest-first) → pays on YoActiv's hosted Razorpay page. Mirrors the trainer-booking flow.

- Server `routes/packageBookings.ts`: `GET /membership-packages?gymId` (non-PT variations from `Billing/GetServices`, reuses `TrainerPackage` schema); `POST /package-bookings` (**optionalUser — guests can buy without login**; nullable `userId`, server-side price re-verify, `ensureYoactivMemberId` only when signed in, pending `packageBookingsTable` row + 48-hex token returned in the response, landing `/api/pay/package/:token/:outcome` flips only pending rows); `GET /package-bookings/:id` poll allows owner OR `?token=` (format-validated + timing-safe compare, else 404); `GET /package-bookings/mine` stays requireUser. Same caveat as trainer bookings: `paid` set by redirect only, no webhook. Strict branch scoping — unmapped gym → 409/[] → mobile falls back to a `kind="membership"` enquiry lead.
- `package_bookings` table mirrors `trainer_bookings` (minus trainer fields, plus `startDate`).
- Mobile: `app/book-package.tsx` (branch → package → pay + 4s poll; **no sign-in required** — guest polls pass the create-response `token` in the query params/queryKey; enquiry fallback); "Buy this package" CTA on `app/package/[id].tsx`; "Package purchases" list on Profile tab (`useListMyPackageBookings`). Paid purchases also appear in YoActiv payment history.
- Web dashboards: admin `/admin/package-bookings` ("Package Purchases" nav) + partner `/partner/package-bookings` (ownedGymIds-scoped, staff perm `bookings`); shared `PackageBookingsTable.tsx`.

### Plan renewal reminders

`lib/renewalReminders.ts` — no cron: `GET /notifications/mine` fire-and-forgets `ensureRenewalReminders(userId)` (10-min per-user throttle). Looks up the member's YoActiv plan by mobile; at 7/3/1/0 IST days before expiry inserts an in-app notification, deduped via `batchId = renewal:{userId}:{expiry}:{threshold}`. Thresholds ascending + `find(t => t >= daysLeft)` = exact on milestone day, catch-up between milestones, never early. Never throws; the bell's 60s poll surfaces the row with sound.

### Member notifications & sound (mobile)

Admins send member notifications via `POST /notifications` (`recipientType="user"`); member feed endpoints (`/notifications/mine…`) are in OpenAPI. `components/NotificationBell.tsx` floats on the Home hero (members-only, unread badge, 60s poll) → `app/notifications.tsx` modal (marks all read). No push infra (Expo Go): the bell detects new rows via a per-user id high-water mark and fires a **local** notification for sound; Android needs the HIGH-importance `reminders` channel + `channelId` on every trigger. See `.agents/memory/expo-notification-sound-delivery.md`.

### Member mobile app (Iconic Fitness)

Expo app in `artifacts/iconic-app` (previewPath `/iconic-app/`), talks to the GYMCO API via generated hooks over `https://$EXPO_PUBLIC_DOMAIN/api`.

- **Auth:** Clerk (Replit-managed) via `@clerk/expo` v3 Future signals API; token wired by `setAuthTokenGetter` in root `ApiAuthBridge` (`app/_layout.tsx`). Guest mode via "Continue without login". Tabs + authed modals redirect to `/(auth)/sign-in` when signed out.
- **Backend:** tracking endpoints in `routes/tracking.ts` (`/tracking/*`, `/checkins`), `requireUser` (Clerk bearer).
- **Features:** dashboard rings, water/diet/workout+steps logging (modals), class browse+book+check-in, progress charts/streaks, goals, daily reminders. Theme: dark `#0A0C08` + lime `#C7F000`.
- **Bottom tabs:** Home, Sports & Fitness, Store, Packages, More. Sports & Fitness tab is an external link (`tabPress` preventDefault → `openExternal`); Store is a **native in-app store** (see "Native mobile store" below). `train`/`classes`/`progress`/`profile` are hidden routes (`href: null`) reached via the More hub, which also holds settings (Daily reminders toggle, Appearance/theme, Log out/login).
- **Profile:** Membership section (plan, status, IST renew date, payment history) + editable Personal details (`PATCH /me`); both hidden for guests.
- **Login screen** (`app/(auth)/sign-in.tsx`): full-bleed hero photo + gradient scrim, logo pinned top, form bottom-anchored (`flexGrow:1` + `marginTop:"auto"` — never a `flex:1` spacer child; see `.agents/memory/rn-login-scroll-anchor.md`); forces dark palette via `<ThemeContext.Provider value={FORCE_DARK}>`. Login is **email OTP only** (no password field: email → `signIn.emailCode.sendCode` → code → `verifyCode`+finalize, with Resend / Use-a-different-email resets; SMS OTP unsupported by managed Clerk) + Google SSO + guest.
- **Launch splash:** `components/AnimatedSplash.tsx` (brand mark + halo animation, hardcoded dark palette, fail-safe timeouts).
- **Gotchas:** `GestureHandlerRootView` needs `style={{ flex: 1 }}` or the app renders blank. `AppText` weight caps at "700".

### Native mobile store & order tracking

Store tab is fully native (no WebView). Data via `/store/*` (categories, products, checkout in OpenAPI; hooks generated). New `GET /store/orders/mine` (requireUser, userId-scoped in `routes/store.ts`) returns orders + item snapshots — public order lookup stays removed (PII). Checkout dedupes product ids (same product in 2 variants = 2 lines, one DB row).

- Mobile: `lib/cart.ts` (AsyncStorage module store, variant-keyed lines, mutate-wins over slow load); `(tabs)/store.tsx` (search, category chips, 2-col grid, cart badge); `app/product/[slug].tsx` (gallery, size/color, qty, add/buy now); `app/cart.tsx` (COD checkout, prefill from `/me`, wallet-points toggle for signed-in, guest checkout OK); `app/orders.tsx` (status timeline placed→confirmed→shipped→delivered, cancelled banner) linked from More hub "Orders & Tracking" (non-guest). Statuses set by staff in web admin Orders page.

### Challenges & leaderboards

Code-default pattern: challenge definitions in `api-server/src/lib/challenges.ts` (metrics workouts/steps/water/active_days; rolling IST weekly/monthly windows); only opt-in participants persisted (`challengeParticipantsTable`). Leaderboards computed live from tracking logs; payload omits raw `userId` (privacy) — `isMe` + `rank`. `active_days` = distinct days with ANY tracking activity. Mobile: `app/challenges.tsx` + `app/challenge/[id].tsx`, entry on Progress tab, auth-gated.

### AI Fitness Coach (mobile)

`POST /ai/coach` (`routes/ai.ts`, `requireUser`) — OpenAI via Replit AI Integrations (no API key). `buildCoachContext(userId)` grounds the chat in the member's profile, goals, today's totals, weekly workouts, and IST activity streak.

- **Tool-calling (bounded loop, max 5 turns):** `COACH_TOOLS` = `log_water`, `log_meal`, `log_workout`, `update_goals`, `save_assessment`; `runCoachTool` does scoped DB writes with clamped/validated inputs; tool failures return `{ok:false}` to the model, never crash.
- **Onboarding assessment:** conversational; six nullable `usersTable` columns (`experienceLevel`, `targetWeightKg`, `activityLevel`, `foodPreference`, `assessment` jsonb, `assessmentCompletedAt`). `save_assessment` **merges** the jsonb blob and falls back to existing column values (partial saves never wipe earlier answers); completion stamp only once core fields (experience+age+gender+height+weight+goal) are captured, then idempotent. See `.agents/memory/ai-assessment-tool-writes.md`.
- **Health metrics:** `lib/healthMetrics.ts` (BMI, body fat, BMR/TDEE, `deriveGoals`, `weightPlan` lose/gain/maintain recommendation) — used by both the coach save path and `/me` (`UserProfile` has `assessmentComplete`/`bmr`/`tdee`/`bodyFatPct`).
- **Mobile:** `app/coach.tsx` modal; on success invalidates all `/api/tracking*` + `/api/me` + `/api/goals` query keys (members only). Entry: standalone `AICoachCard` pinned to the **top of Home for everyone** (HeroSlider's `aiSlide` prop still exists but is no longer passed); plus Progress row. **Guests get the public FAQ assistant** (`POST /ai/chat`, no auth, guest greeting/starters about plans/branches/enrollment); signed-in members get the personalized coach — same screen, mutation picked by auth state.
- **Reminders:** `lib/notifications.ts` `ACTION_REMINDERS` (8 daily nudges) with master toggle on Profile.

## User preferences

- **Pushing data to production:** dev and prod are separate databases. To get dev catalog data (gyms, partners, etc.) live: (1) regenerate `artifacts/api-server/src/lib/seed-snapshot.json` from the dev DB, (2) publish, (3) user clicks "Import workspace data" on the live admin Dashboard. See `.agents/memory/prod-data-import.md`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Sharp edges and durable lessons live in `.agents/memory/` (see `MEMORY.md` index).
