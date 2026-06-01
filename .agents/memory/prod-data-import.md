---
name: Dev → prod catalog import
description: How dev gym/catalog data gets onto the separate production database, and why a manual admin button exists.
---

# Dev → prod catalog import

Dev and production are **separate Postgres databases**. Data created in dev (gyms, partners, etc.) does NOT appear on the live site automatically.

The startup seeder (`seedFromSnapshot`) seeds from a bundled `seed-snapshot.json`, but `seedTable` **skips any table that already has ≥1 row**. So once prod has any gyms (even junk ones), startup seeding never runs again.

**To mirror dev data onto prod:**
1. Regenerate `artifacts/api-server/src/lib/seed-snapshot.json` from the current dev DB (a throwaway node script using `pg` + `process.env.DATABASE_URL` works; resolve `pg` from `node_modules/.pnpm/pg@*/...`). Include the catalog tables plus any `uploaded_images` referenced by gym hero/logo/gallery (text PK).
2. Redeploy so the new snapshot + server code ship to prod.
3. Admin (super-admin) clicks **"Import workspace data"** on the admin Dashboard → `POST /admin/reseed-from-snapshot` → `forceReseedFromSnapshot()`.

**`forceReseedFromSnapshot()` is destructive and atomic:** inside one `db.transaction`, it `TRUNCATE … RESTART IDENTITY CASCADE` on the catalog tables, then reseeds. CASCADE also wipes dependents (bookings, memberships, etc.). A sanity check (gyms>0 && partners>0) forces rollback + throw on failure so prod is never left empty.

**Why:** the autoscale Republish "overwrite data" toggle was never findable in the UI; an explicit in-app button is reliable and repeatable. It is NOT auto-run on deploy, because that would wipe any gyms users add on prod later.

**Gotcha:** `seedTable`'s id-sequence realignment is guarded by a `DO` block that checks `pg_get_serial_sequence(...)` is non-null — text-PK tables like `uploaded_images` have no sequence and would otherwise error on `setval(NULL)`.
