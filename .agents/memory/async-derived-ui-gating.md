---
name: Gate viewer-attribute UI on settled state, not truthiness
description: Content targeted by an async-derived viewer attribute (membership, role, flags) must gate on query-settled, not just a boolean, or it flickers the wrong audience's content.
---

When UI is shown/hidden based on a viewer attribute that comes from an async query (e.g. "is this viewer a member?" from `/memberships/mine`), do NOT decide purely on `!!query.data`. While the query is loading (or on transient error) `data` is undefined, so a real member is transiently classified as a non-member and briefly sees the wrong audience's content.

**Rule:** make it tri-state — `member` | `customer` | `unknown`. Derive `settled = !needsFetch || query.isSuccess` (guests are known immediately; signed-in viewers are known only once the query resolves). While `!settled`, render only the neutral/`all` audience; apply member/customer-specific filtering only after settle.

**Why:** the home-slide `audience` targeting (all|members|customers) first shipped as `isMember = isSignedIn && !!data`, which flashed customer-only slides to members during load. Code review flagged it.

**How to apply:** any per-viewer gating (audience targeting, role-gated sections, feature flags) fed by react-query. Also degrade to the neutral bucket on error rather than silently classifying as the default side.

**Money-path corollary:** when the gated choice is paid-checkout vs a free fallback (e.g. package purchase vs enquiry lead), `isError` must NOT count as "settled into the fallback" — a transient fetch failure would divert paying users to the free flow. Use four explicit states: loading → spinner, error → retry UI, success+items → paid flow, success+empty → fallback. The fallback is only for confirmed-empty.
