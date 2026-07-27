---
name: Mobile studio/staff login
description: How the Expo app reuses the web cookie-session staff auth alongside Clerk member auth.
---

The Iconic app has TWO auth systems: Clerk (members) and the web staff cookie session (studio team).

- Entry gate is `app/(auth)/welcome.tsx` — Membership Login vs Studio Login vs guest. Signed-out redirects across the app should target `/(auth)/welcome`, not sign-in.
- Studio login does NOT use Clerk or the generated hooks: plain fetch via `lib/staffSession.ts` → `POST /api/staff/login` with `credentials:"include"` (native cookie jar / browser cookies), profile cached in AsyncStorage as a render hint only.
- **Why:** staff accounts (trainers, MCs) live in the `staff` table with session auth; no Clerk identity exists for them. The cookie is the source of truth — always re-verify with `GET /staff/me` and bounce to staff-login on 401/403; never trust the cached profile alone, and never render blank on server errors.
- **How to apply:** any new staff-facing mobile screen goes outside the Clerk-gated `(tabs)` group and uses `staffFetch`. Expo *web* preview may drop cross-origin cookies — test staff flows on native.
