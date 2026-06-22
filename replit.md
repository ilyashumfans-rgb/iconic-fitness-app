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

### Ticket & task system

Unified support tickets across all roles. Members raise/view tickets on `/support`; partners on `/partner/tickets`; staff on `/staff/tickets` (raised + assigned-to-me); admins triage on `/admin/tickets` (filters: status/priority/assignee, change status/priority, assign/reassign to staff/partner/admin). In-app notifications fire on create (→ all admins), assign (→ assignee), status-change and comment (→ participants).

- DB: `ticketsTable` + `ticketCommentsTable` (`lib/db/src/schema/index.ts`), polymorphic `requesterRole/requesterId` + `assigneeRole/assigneeId`.
- API: `artifacts/api-server/src/routes/tickets.ts` (role-scoped); staff notification feed in `notifications.ts`.
- Frontend: shared types/badges in `src/lib/tickets.ts`; components in `src/components/tickets/`; ticket methods on adminApi/staffApi/partnerApi and member `ticketsApi.ts`.

## User preferences

- **Pushing data to production:** dev and prod are separate databases. To get dev catalog data (gyms, partners, etc.) onto the live site, use the admin Dashboard "Import workspace data" button — this is the standard workflow. Each time the user wants new/changed dev data live, the agent must: (1) regenerate `artifacts/api-server/src/lib/seed-snapshot.json` from the current dev DB, (2) redeploy, then (3) user clicks "Import workspace data" on the live admin Dashboard. See `.agents/memory/prod-data-import.md`.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
