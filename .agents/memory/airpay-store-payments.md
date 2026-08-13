---
name: Airpay store payment flow
description: Airpay v4 hosted checkout for the product store — endpoints, crypto quirks, and the unresolved credential blocker.
---

# Airpay store payments

- Flow: checkout creates order `payment_pending` + 48-hex token → `/api/pay/store/:token/start` renders auto-submit form to Airpay hosted checkout → `/api/pay/store/return` (POST+GET) decrypts encdata, one-shot flips pending→placed (wallet debit + referral credit inside try/catch, idempotent per refType/refId) or payment_failed.
- **oauth2 endpoint only accepts form-encoded bodies** (`application/x-www-form-urlencoded`); JSON → 403 "Parameters are required".
- Crypto: AES-256-CBC, key = md5hex(username~:~password) as 32 ASCII bytes; encdata = 16-char hex IV + base64(ct); checksum = sha256(sorted-values + UTC date). Docs' oauth sample uses the dashboard `secretKey` directly — code tries BOTH keys (`aesKeyCandidates`).
- RESOLVED (Aug 13 2026): after the user got fresh credentials from Airpay (and added AIRPAY_API_KEY, 16 chars), oauth decrypts fine with the standard md5(user~:~pass) key — earlier failures were wrong creds on Airpay's side, not the crypto. Note: a newly added secret needs a WORKFLOW RESTART before the server sees it (and a fresh shell; first save came through empty — re-request if length 0).
- **Why:** wrong-key decrypt = silent 502 at /start; don't re-debug the crypto — the code matches the official PHP kit exactly.
- Security hardening done after review: legacy plain securehash fallback REMOVED (forgeable); return handler binds echoed amount+merchant to the pending order; admin PATCH cannot set payment_* statuses or flip unpaid orders except to cancelled; ensureOrderPaymentColumns throws (checkout 503) instead of proceeding on a maybe-missing schema.
- Return URL to configure in Airpay dashboard: https://iconicfitnessindia.com/api/pay/store/return
