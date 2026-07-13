---
name: Pre-auth verified-data stash linking
description: Safety rules when data collected before login is auto-written to whoever signs in next
---

Any value captured on an auth screen *before* login and later auto-applied to the signed-in account (e.g. a verified mobile that links a membership) is a cross-account hazard on shared devices: whoever signs in next inherits the stash.

**Rule:**
1. TTL the stash (~30 min) and drop corrupt/legacy values on read.
2. Before writing, read the current profile — only auto-apply when the field is empty or already matches; a differing existing value means a different person: discard the stash, never overwrite.
3. One attempt per sign-in session via a ref guard; on failure leave the stash for next app start. Don't put a React Query mutation object in the effect deps — its identity changes with state and re-fires the effect (rapid retry loop instead of "retry next launch"). Use the generated plain fetch functions inside the effect instead.

**Why:** architect review flagged that an unconditioned PATCH from device storage could relink a different user's account to the wrong YoActiv member.

**How to apply:** any future "remember before login, apply after login" flow (referral codes, branch pre-selection, pre-auth preferences that write to the profile).
