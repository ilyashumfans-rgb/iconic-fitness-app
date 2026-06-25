---
name: Expo Clerk mobile auth (@clerk/expo v3)
description: Non-obvious API/wiring gotchas when adding Clerk auth + generated API hooks to an Expo (expo-router) artifact.
---

## Package & API
- The Expo Clerk package is **`@clerk/expo`** (NOT `@clerk/clerk-expo`). Token cache import is `@clerk/expo/token-cache`.
- `@clerk/expo` v3 uses the **Future signals API**, not the legacy `create()`/`setActive()`/`isLoaded` shape:
  - Sign in: `const { signIn } = useSignIn()` → `await signIn.password({ identifier, password })` returns `{ error }`; check `signIn.status === "complete"` → `await signIn.finalize({ navigate })`.
  - Sign up: `signUp.password({ emailAddress, password })` → `signUp.verifications.sendEmailCode()` → `signUp.verifications.verifyEmailCode({ code })` → `signUp.status === "complete"` → `signUp.finalize({ navigate })`. Optional name via `signUp.update({ firstName })` (wrap in try/catch — instance may reject).
  - OAuth/SSO still uses `useSSO()` → `startSSOFlow({ strategy, redirectUrl })` returning `{ createdSessionId, setActive }`, then `setActive({ session, navigate })`.
  - Hook returns `{ signIn|signUp, errors, fetchStatus }`. Use `fetchStatus === "fetching"` for button loading.

**Why:** the documented legacy Clerk flow (`signIn.create`, `setActive`, `isLoaded`) typechecks-fails against v3 (`SignInSignalValue`/`SignUpFutureResource`). The correct reference is `.local/skills/clerk-auth/references/custom-ui/expo-sdk-{email-password,oauth}.md`.

## Wiring the generated API client to Clerk
- `setAuthTokenGetter(() => getToken())` must live at the **root layout** (a tiny component under `ClerkProvider`/`ClerkLoaded` that calls `useAuth()`), NOT in the `(tabs)` layout. Root-level Stack modals (e.g. `/water`, `/diet`) can cold-start/deep-link without tabs ever mounting, so a tabs-only getter leaves those API calls unauthenticated (401).
- Guard root-level authed modals individually with `useAuth()` + `<Redirect href="/(auth)/sign-in" />` (called after all hooks to respect rules-of-hooks).

## Generated react-query hooks (orval)
- The second arg's `query` option is a **full** `UseQueryOptions` (requires `queryKey`). Passing just `{ query: { enabled } }` fails typecheck — either also pass `queryKey: getGetXQueryKey(params)` or skip `enabled` and rely on the route guard.

## RN gotcha
- `GestureHandlerRootView` needs `style={{ flex: 1 }}` or it collapses to zero height → fully blank white screen even though the tree mounted.
