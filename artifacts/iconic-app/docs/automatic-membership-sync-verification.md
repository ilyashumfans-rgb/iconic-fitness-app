# Automatic membership sync verification

Verified in development on 2026-09-19. No production changes or publishing.

## Live authenticated browser checks

Two disposable Clerk development accounts were provisioned with the official SDK
and signed in through the normal app password UI. No authentication bypass was
introduced. Both accounts and their test-only local rows were removed afterwards.

- Fresh authenticated root mount: exactly one automatic-sync request, HTTP 200,
  `{synced:false, reason:"confirmation_required"}`.
- Home → Progress → Home: request count remained one; no repeated automatic
  prompt; journey offer remained hidden.
- Normal logout followed by login to the second account: a separate single
  automatic-sync request; no journey state carried across accounts.

## Browser fixtures (not live upstream evidence)

- Automatic-sync HTTP 503: refresh-incomplete notice and Retry shown; journey hidden.
- Retry with successful response: failure notice removed.
- Successful automatic response plus eligible account-owned journey: journey
  heading and booking action rendered.

## Deterministic behavioral regression tests

`artifacts/api-server/src/routes/fitnessJourneyAutomatic.test.ts` executes the
actual registered route handlers with isolated Clerk, database, and YoActiv
boundaries. Real receipt-validation logic executes:

- Trusted receipt success with existing mobile.
- Trusted receipt restoration with blank mobile.
- Upstream failure followed by successful retry.
- Concurrent explicit sync while automatic lookup is pending preserves the
  newer mobile and receipt.

`artifacts/iconic-app/lib/syncMemberMobile.test.ts` additionally checks stale
automatic and explicit responses after an account switch, plus concurrent
explicit/automatic result ordering.

These controlled tests do not prove real upstream availability or actual
database transaction behavior.

## Safety and remaining limitation

No genuine-member mutations, real phone lookups, YoActiv AddMember, payment,
or booking requests were made. Real YoActiv success/failure/recovery against
a dedicated upstream sandbox member remains unverified: no such fixture was
available. UI fixtures and isolated handler tests must not be described as
live YoActiv verification.