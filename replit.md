# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

GYMCO is a multi-role gym marketplace: members discover/join gyms, partners manage their gyms, staff support partners, and admins run the platform.

### Trainers

Partners manage their own trainers from `/partner/trainers` (CRUD scoped to gyms they own via `ensureOwnsGym`; manual `partnerApi.trainers.{list,create,update,remove}`, no OpenAPI). Admins still have global trainer CRUD. Trainers are attached to a gym and selectable when scheduling classes.

### Class visibility & booking window

Classes are hidden from members and not bookable until 1 day (24h) before start. Single source of truth: `artifacts/api-server/src/lib/classVisibility.ts` (`CLASS_VISIBLE_BEFORE_MS`, `isClassVisibleToMembers`). Applied to all member-facing class listings (`classes.ts` `buildSessionDtos`; `gyms.ts` gym-detail + `/gyms/:id/classes`) and the `POST /bookings` gate (started → 400, >24h away → 403). Partner/admin views are unaffected.

GX class enquiries via `LeadEnquiryDialog` (`kind="class"`) are further restricted: Mon–Fri only, two fixed one-hour slots (`07:00` = 7–8 AM, `19:00` = 7–8 PM), prebookable only 1 day ahead (today + tomorrow, today's passed slots hidden). The dialog renders dependent day→slot `<select>`s; `POST /api/leads` enforces the same via `validateGxBooking` (window computed in `Asia/Kolkata`). Other dialog kinds (`gym`, `membership`, `general`) keep free date/time pickers.

### Ticket & task system

Unified support tickets across all roles. Members raise/view tickets on `/support`; partners on `/partner/tickets`; staff on `/staff/tickets` (raised + assigned-to-me); admins triage on `/admin/tickets` (filters: status/priority/assignee, change status/priority, assign/reassign to staff/partner/admin). In-app notifications fire on create (→ all admins), assign (→ assignee), status-change and comment (→ participants).

- DB: `ticketsTable` + `ticketCommentsTable` (`lib/db/src/schema/index.ts`), polymorphic `requesterRole/requesterId` + `assigneeRole/assigneeId`.
- API: `artifacts/api-server/src/routes/tickets.ts` (role-scoped); staff notification feed in `notifications.ts`.
- Frontend: shared types/badges in `src/lib/tickets.ts`; components in `src/components/tickets/`; ticket methods on adminApi/staffApi/partnerApi and member `ticketsApi.ts`.

### Group class (GX) timetable

Every gym/branch shows a fixed weekly group-class timetable (Mon–Sat, two slots: 7–8 AM & 7–8 PM; class names prefixed "iconic "). Partners can edit their own gyms' timings from `/partner/schedule` ("Timetable" nav).

- **Default lives in code:** `artifacts/api-server/src/lib/groupClassSchedule.ts` (`DEFAULT_GROUP_CLASS_SCHEDULE`, `GROUP_CLASS_DAY_NAMES`). No seeding / "Import workspace data" needed — every branch displays the default until a partner customizes it.
- **DB:** `groupClassScheduleTable` (`lib/db/src/schema/index.ts`): per-gym rows (`gymId, dayOfWeek 1-7, startTime, endTime, className, sortOrder`). Reaches prod automatically via Replit Publish schema diff.
- **Lazy materialization:** members see the code default until a partner first opens their timetable; the partner `GET /partner/schedule` inserts the default rows for that gym (advisory-lock guarded against concurrent double-insert), after which all edits are real row CRUD.
- **API:** member `GET /gyms/:id/schedule` (public, `gyms.ts`) returns gym rows or the default. Partner CRUD `GET/POST/PATCH/DELETE /partner/schedule` + `POST /partner/schedule/reset` (`partner.ts`), scoped via `ensureOwnsGym`; `/partner/schedule` → `classes` permission for staff.
- **Frontend:** member display in `GymDetail.tsx`; partner editor `pages/partner/Schedule.tsx`; client methods in `partnerApi.ts`.
- **Book a GX Class page** (`/book-gx`, nav link "Book a GX Class", `pages/BookGxClass.tsx`): members pick a branch → the page fetches that branch's timetable and shows the **available** day+slot options inside the 1-day prebook window (today + tomorrow, today's passed slots hidden) → fill contact details → submits a `kind="class"` lead (`source: "book-gx-page"`). Window/slot logic is computed in `Asia/Kolkata` so the UI matches server validation regardless of the visitor's timezone.
- **Schedule-aware lead validation:** `POST /api/leads` (`leads.ts` `validateGxBooking`) accepts a class slot if it exists in the branch's timetable (via shared `lib/resolveGymSchedule.ts`, also used by `GET /gyms/:id/schedule`) **OR** matches the legacy fixed 07:00/19:00 weekday slots. The legacy fallback keeps the older `LeadEnquiryDialog kind="class"` flow (still hard-coded 07:00/19:00 Mon–Fri, not wired to per-gym schedules) working even after a partner customizes a branch.
- **Partner GX Bookings view** (`/partner/gx-bookings`, nav link "GX Bookings", `pages/partner/GxBookings.tsx`): partners see who booked each GX slot at their branches. GX bookings are `leadsTable` rows with `kind="class"` (previously admin-only). There is **no seat cap** on GX slots — the page just surfaces per-slot booking counts plus each booker's contact details. API: `GET /partner/gx-bookings` (`partner.ts`), scoped via `ownedGymIds` + `inArray(leadsTable.gymId, …)` + `kind='class'`, staff-mapped to the `classes` permission in `STAFF_PERMISSION_PREFIXES`. Frontend groups by branch → `preferredDate`+`preferredTime`+`className`; client method `partnerApi.gxBookings.list`. No trainer login exists — trainers are records only, so this is partner-dashboard-only.

### Agency portal (read-only, admin-managed accounts, branch-scoped)

A standalone, view-only role for agencies to monitor GX class bookings. Admins create **multiple** agency accounts and assign each one a set of branches; an agency only sees bookings for its assigned branches.

- **DB:** `agencyUsersTable` (`agency_users`): `username` (unique), `passwordHash` (bcrypt), `name`, `gymIds` (`integer[]` of assigned branch ids), `createdAt`. Branch assignment is a plain int array, not a join table (simple, low volume). Reaches prod automatically via Replit Publish schema diff.
- **Auth:** session-based, reuses admin session infra (express-session, `user_sessions`, `gymco.admin.sid`). `SessionData.agencyUserId` holds the row id. `POST /agency/login` looks up by username + `verifyPassword` (bcrypt from `adminAuth.ts`), regenerates the session; logout destroys it. `requireAgency` (`lib/agencyAuth.ts`) guards reads.
- **Scoping is re-read per request:** `GET /agency/gx-bookings` re-loads the account's `gymIds` every call and filters `leadsTable` (`kind='class'`) via `inArray`, so branch grants/revokes and account deletion take effect immediately (deleted account → session destroyed, 401). No write paths exist for this role.
- **API:** `artifacts/api-server/src/routes/agency.ts` — `POST /agency/login`, `POST /agency/logout`, `GET /agency/me` (returns assigned branches), `GET /agency/gx-bookings`. Mounted in `routes/index.ts`.
- **Admin CRUD:** `admin.ts` — `GET/POST /admin/agencies`, `PATCH /admin/agencies/:id`, `POST /admin/agencies/:id/reset-password`, `DELETE /admin/agencies/:id`, all under `requireAdmin`. Client methods `adminApi.agencies.*`; admin UI `pages/admin/Agencies.tsx` (nav "Agency Accounts" under Admin Team) — create account + assign branches via checkboxes, edit branches, reset password, delete.
- **Frontend (agency):** standalone routes outside every member/partner/admin shell — `App.tsx` `if (location.startsWith("/agency"))` → `/agency/login` (`pages/agency/Login.tsx`) + `/agency` dashboard (`pages/agency/Dashboard.tsx`). Client: `lib/agencyApi.ts`. Dashboard shows totals + breakdown **by branch** + **by class category** (`className`) + **per-slot detail** (branch+date+time+class with each booker's contact info), all limited to assigned branches.
- **Note:** the old single-login env secrets `AGENCY_USERNAME` / `AGENCY_PASSWORD` are no longer used (dead config) — login is fully DB-backed now.

### Member mobile app (Iconic Fitness)

Member-facing Expo (React Native, expo-router) app in `artifacts/iconic-app` (slug `iconic-app`, previewPath `/iconic-app/`). It talks to the existing GYMCO API over `https://$EXPO_PUBLIC_DOMAIN/api` via the generated `@workspace/api-client-react` hooks.

- **Auth:** Clerk (Replit-managed) via `@clerk/expo` v3 **Future signals API** (`signIn.password`/`finalize`, `signUp.verifications.*`, `useSSO` Google). The Clerk session token is supplied to every API call by `setAuthTokenGetter` wired in `app/_layout.tsx` (root-level `ApiAuthBridge`, so root modal routes get tokens too, not just tabs). Tabs + root authed modals redirect to `/(auth)/sign-in` when signed out.
- **Backend:** tracking endpoints live in `artifacts/api-server/src/routes/tracking.ts` (`/tracking/summary|goals|water|meals|workouts`, `/checkins`), guarded by `requireUser` (Clerk bearer via `clerkMiddleware`+`getAuth`). Bookings DTO carries `gymId` (`bookings.ts` `toBookingDto`) so members can check in from My Bookings.
- **Features:** dashboard rings, water/diet(macros)/workout+steps logging (root modal screens), class browse+book+check-in, progress charts & streaks, editable goals, daily reminder via `expo-notifications` (web-guarded). Theme: dark `#0A0C08` + lime `#C7F000`; all dates in `Asia/Kolkata` (`lib/dates.ts`).
- **Bottom tabs:** Home, Sports & Fitness, Store, More (`app/(tabs)/_layout.tsx`). Sports & Fitness (`sports.tsx`) and Store (`store.tsx`) are external website links — their `Tabs.Screen` uses a `tabPress` listener that `e.preventDefault()`s and calls `openExternal(exploreUrl|storeUrl)`, so tapping opens the in-app browser instead of navigating (the placeholder screens, with a fallback `useEffect`/Open button, are never reached). `train`/`classes`/`progress`/`profile` are `(tabs)` routes hidden from the bar via `options={{ href: null }}` and surfaced through the More hub (`app/(tabs)/more.tsx`, internal `router.push`).
- **Profile tab:** beyond goals/reminders/theme, the Profile screen (`app/(tabs)/profile.tsx`, reached via More) shows two signed-in-only sections: **Membership** (current plan via `useGetMyMembership` → `GET /memberships/mine`; planName, status pill, IST renew date, classes used/included, gyms accessed; "Manage plan"/"View plans" opens `membershipsUrl` externally; `null` → no-active-plan state) and **Personal details** (editable name/mobile/city/gender/age/height/weight/fitness-goal saved via `useUpdateMe` → `PATCH /me`, then invalidates `getGetMeQueryKey()`). Both hidden for guests.
- **Login screen:** `app/(auth)/sign-in.tsx` is a premium branded landing — the full Iconic brand lockup floats on the dark background (`assets/images/iconic-lockup-clean.png`, background-removed transparent PNG) over a soft lime ambient/radial glow (no boxy card), then the real auth (email/password → Clerk `signIn.password`, "Continue with Google" SSO, "Create account" link, "Continue without login" guest). No headline text/phone/Apple auth — the layout is inspired by a reference but only wires real methods; PRIVACY/TERMS footer opens `websiteUrl`.
- **Launch splash:** `components/AnimatedSplash.tsx` is a premium branded launch overlay — the real Iconic mark (`assets/images/iconic-logo.png`, background-removed transparent PNG of the green dotted "C") springs in over a soft pulsing lime halo + expanding ring, then the ICONIC/FITNESS wordmark rises and the overlay fades to reveal the app. It hardcodes the brand palette (`#0A0C08` bg, `#C7F000` lime, ink wordmark) so it always renders dark regardless of system light/dark mode. Wired in `_layout.tsx` with fail-safe timeouts.
- **Gotcha:** `GestureHandlerRootView` must have `style={{ flex: 1 }}` or the whole app renders blank white.

### Challenges & leaderboards

Member-facing challenges with live leaderboards, following the **code-default** pattern (no challenge rows in DB; only opt-in participants are persisted). Each challenge runs on a rolling/evergreen IST window (current week Mon–Sun or current month) and its leaderboard is computed live from existing tracking logs — so it reaches production with no data-import step (the one new table arrives via Replit Publish schema diff).

- **Definitions in code:** `artifacts/api-server/src/lib/challenges.ts` (`DEFAULT_CHALLENGES`, metrics `workouts`/`steps`/`water`/`active_days`, periods `weekly`/`monthly`, IST `challengeWindow`). `active_days` = union-distinct of `logged_date` across water + meal + workout logs (any tracking activity counts), computed in JS — **not** workout-days only.
- **DB:** `challengeParticipantsTable` (`challenge_participants`): plain int `challengeId`+`userId`, composite unique index, no FK (repo convention). Added additively via raw SQL, never `db push`.
- **API:** `artifacts/api-server/src/routes/challenges.ts` (`requireUser`): `GET /challenges` (list + joined flag + my progress + participant count), `GET /challenges/:id` (detail + leaderboard), `POST /challenges/:id/{join,leave}` (scoped to `req.userId`). Leaderboard payload intentionally **omits** raw `userId` (privacy) — `isMe` flags the current user; `rank` is the stable client key.
- **Mobile:** `app/challenges.tsx` (list, modal) + `app/challenge/[id].tsx` (detail + leaderboard + join/leave), registered in `_layout.tsx`, entry card on the Progress tab, auth-gated via `Redirect` for guests. Display formatters in `lib/challenges.ts`.

### AI Fitness Coach (mobile)

Personalized AI chat for members that grounds every answer in the member's **own** live tracking data **and can take actions on their behalf** — following the existing OpenAI integration pattern (no API key; uses Replit AI Integrations, billed to the user's credits).

- **API:** `POST /ai/coach` in `artifacts/api-server/src/routes/ai.ts`, guarded by `requireUser`. `buildCoachContext(userId)` assembles a context block from the member's profile + goals (`usersTable`) and today's totals + weekly workouts + a consecutive-day activity streak (`waterLogsTable`/`mealLogsTable`/`workoutLogsTable`, all scoped to `req.userId`, IST dates). It injects that into `COACH_SYSTEM_PROMPT` and calls `openai` `gpt-5.4` (mirrors `/ai/chat`). Streak = consecutive IST days with any tracking activity (today-miss doesn't reset), 90-day bounded — same semantics as `tracking.ts`.
- **Action / tool-calling:** the coach can WRITE the member's tracker via OpenAI function calling. `COACH_TOOLS` = `log_water`, `log_meal`, `log_workout`, `update_goals`; `runCoachTool(userId, name, args)` executes scoped DB writes (same tables/enums/IST-today convention as `tracking.ts`), clamping every numeric input via `clampInt` and validating meal/workout enums. The route runs a **bounded tool loop (max 5 turns)**: it appends the assistant's `tool_calls` + each `role:"tool"` result and re-calls until the model returns a final text reply. Tool failures are returned to the model as `{ ok:false, message }` (never crash the request). The prompt instructs the model to estimate calories/macros for foods and only log on clear intent. `messages` is typed `any[]` (OpenAI request/response message shapes differ; simplest to keep loose).
- **Spec/codegen:** OpenAPI `/ai/coach` (`operationId: aiCoach`, reuses `AiChatInput`/`AiChatOutput`) → generated `useAiCoach` hook + `AiCoachBody`/`AiCoachResponse` zod. (Tool calls are server-internal — the response contract is unchanged, so no schema/codegen change was needed.)
- **Mobile:** chat screen `app/coach.tsx` (modal, registered in `_layout.tsx`), reuses the `AiChatMessage` type + `useAiCoach` mutation. Starter prompts when empty; user/assistant bubbles; `KeyboardAvoidingView`. Auth-gated via `Redirect`. **On mutation success it invalidates every react-query key whose `queryKey[0]` starts with `/api/tracking`, plus `/api/me` and `/api/goals`** so the dashboard rings/logs/goals refresh after the coach saves. Entry points: prominent card on the Home tab (under the hero, members only) + a row on the Progress tab. Theme: dark `#0A0C08` + lime `#C7F000`.

#### Onboarding assessment & daily guidance

The coach runs a conversational onboarding assessment (asks **new vs experienced**, collects personal/health/goal/lifestyle details), computes health metrics, sets goals, then switches to daily guidance.

- **DB (additive only, never `db push`):** six nullable columns on `usersTable` added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on dev + Drizzle schema (prod gets them via Replit Publish schema diff): `experienceLevel` text, `targetWeightKg` real, `activityLevel` text, `foodPreference` text, `assessment` jsonb (lifestyle/health blob: occupation, sleepHours, stressLevel, workoutLocation, availableWorkoutMin, healthConditions[], medications, smoking, alcohol, updatedAt), `assessmentCompletedAt` timestamptz.
- **Metrics helper:** `artifacts/api-server/src/lib/healthMetrics.ts` — `computeHealthMetrics` (BMI + category, body fat via Deurenberg, BMR via Mifflin-St Jeor, TDEE via `ACTIVITY_FACTORS`, ideal-weight range), `classifyGoal`, `deriveGoals` (calorie/protein/water/step/weekly targets from profile+goal+activity+experience), `weightPlan` (turns height + weight + optional target into a concrete lose/gain/maintain recommendation with kg delta, safe weekly pace 0.5 lose / 0.25 gain, and est. weeks; anchors on the healthy BMI range when no target set). Used by both the coach save path and `/me` so values stay consistent.
- **Weight-aware guidance:** `buildCoachContext` adds a "Weight plan (from height & weight)" line via `weightPlan`, and `COACH_SYSTEM_PROMPT` instructs the coach to use height+weight to tell the member concretely whether to lose/gain/maintain (how many kg, realistic timeframe, safe pace) and to match the starter plan + daily nudges to that direction.
- **Tool:** `save_assessment` in `COACH_TOOLS` (alongside `log_water`/`log_meal`/`log_workout`/`update_goals`). Handler in `runCoachTool` validates/clamps inputs (`clampInt`/`clampFloat`/`oneOf`/`strOrNull`), **falls back to the user's existing column values for any field omitted**, **merges the jsonb blob with the existing one (only overwrites keys actually provided)** so a later partial save never wipes earlier answers, derives goals via `deriveGoals`, and **only stamps `assessmentCompletedAt` once the core profile is captured** (experience + age + gender + height + weight + main goal); once stamped it keeps the original time. If core fields are still missing it returns `{ok:true}` with a "still missing …" message and does NOT present final metrics. Enums: `experienceLevel`[new,experienced], `activityLevel`[sedentary,light,moderate,active,very_active], `stressLevel`[low,medium,high], `foodPreference`[veg,non-veg,vegan,eggetarian], `workoutLocation`[gym,home].
- **Context/prompt:** `buildCoachContext` selects the six new cols and adds an ASSESSMENT STATUS + computed-metrics block; `COACH_SYSTEM_PROMPT` has an ONBOARDING ASSESSMENT section (ask new/experienced → collect → save → present metrics+plan) and a DAILY GUIDANCE section.
- **`/me` additions:** OpenAPI `UserProfile` gained `assessmentComplete`/`bmr`/`tdee`/`bodyFatPct` (required) + `experienceLevel`/`targetWeightKg` (nullable); `profile.ts` `loadProfile` computes them via `computeHealthMetrics`. Mobile `coach.tsx` + Home card (`app/(tabs)/index.tsx`) switch greeting/starters/banner copy on `assessmentComplete` (defaults to assessed while `/me` loads).
- **Per-action daily reminders (mobile):** `artifacts/iconic-app/lib/notifications.ts` — `ACTION_REMINDERS` (8 daily nudges: water ×3, meals ×3, workout, steps/sleep) with `scheduleActionReminders`/`cancelActionReminders`/`areRemindersOn`/`ensureNotificationPermission`, web-guarded, DAILY triggers. Profile screen has a master "Daily reminders" toggle + the reminder list (replaced the old single hour-picker).

## User preferences

- **Pushing data to production:** dev and prod are separate databases. To get dev catalog data (gyms, partners, etc.) onto the live site, use the admin Dashboard "Import workspace data" button — this is the standard workflow. Each time the user wants new/changed dev data live, the agent must: (1) regenerate `artifacts/api-server/src/lib/seed-snapshot.json` from the current dev DB, (2) redeploy, then (3) user clicks "Import workspace data" on the live admin Dashboard. See `.agents/memory/prod-data-import.md`.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
