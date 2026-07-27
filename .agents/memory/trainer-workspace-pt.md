---
name: Trainer workspace (mobile studio PT)
description: How the trainer PT workspace is gated and linked to members
---
- All `/staff/pt/*` routes require staff permission `pt.manage` — admins must grant it in web Staff Management or the trainer sees nothing. "Trainer can't see workspace" → check this permission first.
- First-accept-wins on PT requests is enforced by the `pt_programs (ref_type, ref_id)` unique index; accept catches the duplicate error → 409.
- Member linking is by exact last-10-digit phone equality with ambiguity → no link (never guess-attach BMI/diet records); member view matches `user_id` OR (user_id IS NULL AND phone last-10 equal).
- Staff notification delivery in the app is a module-level singleton poller (`lib/staffPt.ts`) — multiple mounted screens must not each start an interval; dedupe by notification id + AsyncStorage watermark.

**Why:** architect review flagged staff-wide PII access, fuzzy-phone cross-account leakage, and duplicate notification storms; these were the fixes.
- Trainer accept now (a) rejects unpaid bookings / cancelled leads, (b) inserts a best-effort member notification (recipientType user) with trainer name + preferred date/time, and (c) surfaces to the member: GET /pt/mine merges pt_programs acceptances with ptTrainerAssignments (assignment wins for photo) and synthesizes up to 2 kick-starter sessions from the lead's preferred slot + session done stamps when no ptSessions exist. Home FitnessJourneyCard step 2 flips to "Accepted by <trainer>" from the same endpoint.
