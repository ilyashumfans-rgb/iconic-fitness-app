---
name: Gym visibility gating (isVerified)
description: Why newly added gyms can be invisible on public pages, and the per-role default policy.
---

All public/member-facing gym reads gate on `gymsTable.isVerified = true` (browse list, featured, gym detail, categories, dashboard nearby, classes DTO, booking creation). `isVerified` defaults to `false` in the schema.

Per-role create policy (intentional):
- **Admin create** → defaults `isVerified: true` (admins are trusted; gyms go live immediately). Admin PATCH can also toggle `isVerified`.
- **Staff create** → stays unverified by default (moderation/onboarding flow expects review before going live).

**Why:** Users repeatedly report "I added a gym but it doesn't show anywhere." The cause is almost always `isVerified = false`, not a missing gym. Check this flag first before suspecting frontend cache or query filters.

**How to apply:** If a gym is missing from public pages, run `SELECT id,name,is_verified,featured FROM gyms` — flip `is_verified` to true (admin) to reveal. Featured/home also requires `featured = true` in addition to verified.
