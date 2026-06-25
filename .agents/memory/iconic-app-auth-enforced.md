---
name: Iconic app auth — guest mode + persisted-session red herring
description: How login gating works on the Expo app, the "Continue without login" guest bypass, and its invariant.
---

# Login gating, guest mode, and the persisted-session red herring

The Expo member app (`artifacts/iconic-app`) gates entry on Clerk auth **OR** a
guest flag. Entry points: `(tabs)/_layout.tsx` (allows `isSignedIn || isGuest`),
`(auth)/_layout.tsx` (redirects signed-in users to tabs), and root modals.

## Guest mode ("Continue without login")
- In-memory React context: `hooks/useGuest.tsx` (`isGuest`, `enterGuest`, `exitGuest`),
  provider mounted in `app/_layout.tsx`. Not persisted → resets each cold launch.
- Sign-in screen has a "Continue without login" action → `enterGuest()` + go to tabs.
- Profile shows "Log in or create account" (not "Log out") when `isGuest`.

**Invariant — keep guest state consistent with real auth:** call `exitGuest()` on every
auth-completion path (sign-in finalize, sign-up finalize, Google SSO `setActive`) and on
sign-out. **Why:** otherwise a stale `isGuest=true` keeps tab access open after logout, or
mixes guest + authenticated state. **How to apply:** any new auth/logout handler must also
clear guest.

**Guests + authed APIs:** tracking/bookings endpoints need a Clerk token, so they 401 for
guests. Screens must degrade gracefully (null-safe reads; mutations need a `catch`). Don't
let a guest-triggerable mutation throw an unhandled rejection.

**Pattern for guest-accessible screens — gate auth-only queries, don't just catch them:**
pass `{ query: { enabled: !!isSignedIn, queryKey: getGetXQueryKey(params) } }` to each
auth-only hook so guests never fire them (avoids 401 churn). Orval requires `queryKey`
alongside `enabled` or it fails typecheck (see expo-clerk-mobile note). Public hooks
(`useListGyms`, `useListClasses`, gym categories — gym routes have no `requireUser`) stay
always-enabled and power the guest home. Keep the `isSignedIn` branch in JSX, not in hooks.

## Persisted-session red herring
"Login isn't required on my device" is usually Clerk's `tokenCache` (expo-secure-store)
remembering a session from earlier testing — not a gate bug. Fix: Profile → Log out.

**Aside:** dev web preview shows white briefly on cold load (fonts not yet loaded → root
returns null), then a ~3s `AnimatedSplash`, then the app. Each fresh page load (incl. the
screenshot tool) restarts that splash, so screenshots often catch the splash, not the
screen — verify via browser logs (Clerk loaded + DOM nodes present) or on a device.
Separately, `@clerk/expo` throws `Cannot find native module 'ClerkExpo'` in Expo Go on
native — that's a dev-build requirement, unrelated to web rendering.
