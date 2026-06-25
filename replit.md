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
- **Gotcha:** `GestureHandlerRootView` must have `style={{ flex: 1 }}` or the whole app renders blank white.

## User preferences

- **Pushing data to production:** dev and prod are separate databases. To get dev catalog data (gyms, partners, etc.) onto the live site, use the admin Dashboard "Import workspace data" button — this is the standard workflow. Each time the user wants new/changed dev data live, the agent must: (1) regenerate `artifacts/api-server/src/lib/seed-snapshot.json` from the current dev DB, (2) redeploy, then (3) user clicks "Import workspace data" on the live admin Dashboard. See `.agents/memory/prod-data-import.md`.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
