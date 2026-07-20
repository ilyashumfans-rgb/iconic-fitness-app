---
name: Wallet/points money-path concurrency
description: How the points wallet stays race-safe — DB unique indexes as the idempotency source of truth, FOR UPDATE row locks, conditional updates.
---

Rule: application-level "check then write" is never enough on money paths; the DB must enforce it.

**Why:** an architect review found the original wallet code could double-credit referral rewards and let two concurrent checkouts spend the same points (pre-check + insert race).

**How to apply:**
- Idempotency = partial unique index on the ledger's `(ref_type, ref_id)` (WHERE both <> ''); code catches Postgres 23505 (check `err.code` AND `err.cause.code` — drizzle nests the pg error) and treats it as "already done".
- Balance mutations run in `db.transaction` with an upsert-then-`SELECT ... FOR UPDATE` on the wallet row so clamping never reads a stale balance.
- One-shot state flips (apply referral code, assign referral code) use conditional `UPDATE ... WHERE <still unset> RETURNING`; zero rows = someone else won → 409/re-read.
- Reward crediting helpers on money paths must swallow their own errors so a wallet hiccup never fails a purchase.
- Dev got the unique indexes via raw SQL; prod gets them through the Replit Publish schema diff — mirror them in the Drizzle schema so the diff sees them.
