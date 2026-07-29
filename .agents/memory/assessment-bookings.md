---
name: Empty-stomach assessment bookings
description: Design decisions for the member fitness-assessment booking flow (slots, reminder, result recording)
---

- One active booking per member is enforced by a **partial unique index** on `user_id WHERE status='booked'` — rebooking updates the existing row (and resets `reminder_sent_at`), it never inserts a second active row.
- **Evening-before reminder is lazy**: checked fire-and-forget from the member's `/notifications/mine` poll (and the assessment screen GET). Due when IST hour ≥ 17 on the day before the slot, or any time on the slot day (catch-up). `reminder_sent_at` flipped via conditional UPDATE ... RETURNING is the idempotency truth.
- Recording results (staff `pt.manage` or GYMCO admin) runs in a transaction: the one-shot conditional status flip (`WHERE status='booked'`) FIRST, then the `member_bmi_records` insert — losers roll back so no orphan BMI rows on duplicate submits. Admin-recorded rows use `staffId: 0`.
- Eligibility = trial acceptance = any `pt_programs` row matched by userId OR last-10 phone digits.
- **Why:** no cron/scheduler exists in this stack; all time-based notifications ride the lazy-from-poll pattern.
- Prod DB will need the `assessment_bookings` CREATE TABLE (dev applied via SQL; `db push` is forbidden — see db-push-drift).
