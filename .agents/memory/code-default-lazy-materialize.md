---
name: Code-default + lazy materialization for per-entity config
description: Pattern for per-entity config (e.g. per-gym GX timetable) that must appear on prod with zero data migration, yet stay editable.
---

# Code-default + lazy materialization

When every entity needs to show the *same* default config but partners/owners must be
able to override it per-entity, keep the default **in code** and only write DB rows when
someone actually customizes.

**Pattern:**
- Define the default as a constant in server code (e.g. `DEFAULT_GROUP_CLASS_SCHEDULE`).
- Public/read endpoint returns the entity's DB rows **if any exist, else the code default**.
- The owner's edit endpoint *materializes* the default rows for that entity on first GET,
  then all edits are real row-level CRUD.
- Guard first-time materialization against concurrent double-insert with a per-entity
  Postgres advisory lock inside a transaction:
  `await db.transaction(async (tx) => { await tx.execute(sql`SELECT pg_advisory_xact_lock(${id})`); /* re-check then insert */ });`

**Why:** in this project dev and prod are separate DBs and getting dev data to prod
requires the admin "Import workspace data" dance (see prod-data-import.md). Keeping the
default in code means the feature appears on prod the moment the new table ships (Replit
Publish schema-diffs the table automatically) — no snapshot regen, no import step. Only
genuine per-entity customizations live as data.

**How to apply:** reach for this whenever a "give every X a sensible default that owners
can tweak" feature would otherwise force a prod data import. Avoid if defaults differ per
entity or must be queryable/aggregated server-side before any customization.
