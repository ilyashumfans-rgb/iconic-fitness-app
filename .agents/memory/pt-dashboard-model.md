---
name: PT dashboard data model
description: Trainer PT dashboard — session auto-deduction, incentive rule, renew idempotency
---

- Tables: `pt_memberships` (per trainer, per package purchase), `pt_attendance` (unique membership+date = one delivered session/day), `trainer_targets` & `trainer_incentives` (unique staff+month, admin-managed).
- Session deduction is TIME-based: remaining = originalSessions − (originalSessions/durationDays)×elapsedDays, 0 after expiry; delivered sessions shown separately from attendance count. Both must always be displayed.
- `endDate = startDate + durationDays − 1` (a 30-day pack spans 30 dates); expiry is `today > endDate`. **Why:** review caught an off-by-one making packs active for duration+1 days.
- Renew is atomic+idempotent: transaction flips old row pending|lost→renewed via conditional UPDATE…RETURNING (the one-shot guard), then inserts the new row; second submit → 409.
- Incentive: monthly paid sales by startDate month; <₹1,00,000 → 20%, ≥ → 40%; + admin adjustments; approvalStatus pending|approved.
- Drizzle wraps pg errors — detect unique violations via `error.cause.code === "23505"` (shared `isUniqueViolation` in ptDashboard.ts), not message regex.
- Staff endpoints under /staff/pt/* gated by `pt.manage` + row ownership (staffId = me); admin manager endpoints /admin/pt/* via requireAdmin.
