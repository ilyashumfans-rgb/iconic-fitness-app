---
name: Mobile + password member login
description: How members log in with mobile number + password despite Clerk identifying accounts by email
---
Clerk managed tenant has no SMS; members remember mobile, Clerk knows email. Pattern:
- `POST /api/auth/password-login {mobile,password}` (memberships routes): last-10 digit match on users, **fail closed unless exactly one distinct clerkUserId**, `clerkClient.users.verifyPassword`, then `signInTokens.createSignInToken` (300s) → app does `signIn.create({strategy:"ticket", ticket})` (future signals API) → finalize.
- **Why:** never return the account email from an unauthenticated endpoint (harvesting/PII — architect flagged); uniform generic 401 for every failure so accounts can't be enumerated; rate-limited per IP.
- Forgot/create password: user types their OWN email → `signIn.create({identifier})` → `resetPasswordEmailCode.sendCode()/verifyCode/submitPassword`. Works to set a FIRST password on Google-only accounts.
