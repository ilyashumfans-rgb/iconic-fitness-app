---
name: Phone-fallback record reads must first-claim
description: Pattern for member-facing reads of trainer-authored records (BMI/diet/exercises) matched by phone when userId is NULL.
---

Rule: any member-facing endpoint that returns trainer-authored records via the
last-10 phone fallback (`userId IS NULL AND right(digits(phone),10) = mine`)
must, after the read, backfill `user_id` on the returned NULL rows to the
requesting user (best-effort, `WHERE user_id IS NULL` guard).

**Why:** phone numbers get recycled/shared; without first-claim binding, a
later account with the same last-10 digits could read another member's
PT/health records. Code review flagged this as a leakage class.

**How to apply:** see `/pt/records/mine` in the trainer workspace routes — the
`claim()` helper pattern (Promise.all over tables, try/catch so a failed
backfill never fails the read). Reuse for any new record type added to that
endpoint or similar member views.

Related: `istDateLabel` in the mobile app now accepts both YYYY-MM-DD and full
ISO timestamps and returns "" on invalid input — passing an ISO createdAt used
to throw RangeError and crash whole screens via the error boundary.
