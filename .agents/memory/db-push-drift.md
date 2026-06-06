---
name: db push drift / data-loss guard
description: Why `pnpm --filter @workspace/db run push` can be unsafe here, and how to apply additive schema changes instead.
---

`pnpm --filter @workspace/db run push` runs drizzle-kit non-interactively and will FAIL on a TTY prompt whenever it detects "data-loss" statements. The live DB has drifted from the Drizzle schema: push wants to DROP `user_sessions` (a populated table not in the schema). Letting it proceed would delete that data.

**Rule:** For purely additive schema changes (e.g. adding a nullable column), don't rely on `db push`. Apply the change with direct SQL — `ALTER TABLE <t> ADD COLUMN IF NOT EXISTS <col> <type>;` — via the database tooling, and still update `lib/db/src/schema/index.ts` so the ORM types match.

**Why:** push is all-or-nothing against the whole schema diff; one unrelated drift turns an additive change into a destructive prompt that also can't be answered in the non-interactive shell.

**How to apply:** kicks in any time you add/alter columns. Do the additive ALTER manually; keep the Drizzle schema file in sync; never push to "fix" drift unless you've confirmed the dropped tables are truly disposable.

**Production (separate DB):** do NOT manually ALTER prod and do NOT add startup DDL or migration scripts. Replit's Publish flow auto-diffs the dev schema against prod and applies new columns when the user republishes. So the workflow for a new column is: (1) additive ALTER on dev + update Drizzle schema, (2) tell the user to republish — prod gets the column automatically via the publish diff. The app's startup seeder does data-only seeding (`seedFromSnapshot`), never schema DDL.
