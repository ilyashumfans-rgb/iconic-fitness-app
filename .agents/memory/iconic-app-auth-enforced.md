---
name: Iconic app login is enforced (persisted-session red herring)
description: Why "login not required / I reach Home without signing in" reports on the Expo app are not a bug.
---

# "Login isn't required on my device" — almost always a remembered session

The Expo member app (`artifacts/iconic-app`) **does** enforce login. Every entry point
gates on Clerk auth and `<Redirect href="/(auth)/sign-in">` when signed out:
`(tabs)/_layout.tsx`, `(auth)/_layout.tsx` (inverse), and each root modal
(`water.tsx`, `diet.tsx`, `workouts.tsx`). Wiring matches the clerk-auth canonical
snippets (status `managed`).

**Why users still land on Home without a visible login:** Clerk's `tokenCache`
(`@clerk/expo/token-cache`, expo-secure-store) persists the session across launches —
standard "stay logged in". A leftover session from development testing makes it look
like login is skipped.

**Self-test / fix:** Profile tab → Log out (`useClerk().signOut()` clears the cache) →
reopen → sign-in screen appears.

**Why:** Spent a full investigation here; the symptom is convincing but the code is
correct. Don't re-audit the gates — confirm the user simply has a remembered session.

**How to apply:** If asked to "force login every launch", the user previously *declined*
that (chose normal stay-logged-in). Only disable persistence if they explicitly ask.

**Aside:** dev web preview is blank because Clerk init differs on web; verify auth on a
device/Expo Go, not the web preview.
