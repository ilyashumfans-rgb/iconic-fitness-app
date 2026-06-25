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

## Never gate the whole app tree on `<ClerkLoaded>`
- Wrapping the root layout's children (router + splash) in `<ClerkLoaded>` makes the ENTIRE
  app wait on Clerk's network init. On a real device / embedded webview where that request is
  slow or blocked, the native splash hands off to a permanent blank screen — symptom: "splash
  comes then goes back, not loading". It also gates guest mode: the sign-in screen (with
  "Continue without login") is unreachable, deadlocking guests.
- **Fix/pattern:** render the app always under `ClerkProvider` (no `ClerkLoaded` wrapper) and
  resolve auth state per-route: `(auth)` layout only redirects to the app when
  `isLoaded && isSignedIn`, otherwise always shows the auth stack (guest always reachable);
  `(tabs)` grants access on `isGuest || (isLoaded && isSignedIn)`, shows a brief spinner while
  `!isLoaded`, and after a ~5s timeout falls through to sign-in so a stuck Clerk load never
  traps the user. Modal screens use `if (isLoaded && !isSignedIn) <Redirect/>` (render while
  loading, redirect only when confirmed signed-out) — same no-blank-gate principle.
- **Why:** `ClerkLoaded` renders nothing until `clerk.loaded`; `getToken()` safely returns null
  before load, so public data + guest flows work fine without the gate.

## Expo Go native-module trap
- The Replit Expo workflow runs in **Expo Go** ("Using Expo Go" in Metro logs), which only bundles the native modules shipped in the Expo SDK. Any third-party lib with its own native code (e.g. `react-native-keyboard-controller`) crashes the app on launch on Android/iOS while **web keeps working** (web has a JS fallback). Symptom: "android/ios not loading" but web preview fine. Fix: drop the lib (use RN built-ins like `KeyboardAvoidingView`) or move the user to a dev build. Reanimated/gesture-handler/svg/screens ARE in Expo Go, so they're safe.

## RN gotcha
- `GestureHandlerRootView` needs `style={{ flex: 1 }}` or it collapses to zero height → fully blank white screen even though the tree mounted.

## Never block first paint on `useFonts` (`return null`)
- A root-layout `if (!fontsLoaded && !fontError) return null;` makes the WHOLE app render nothing
  until the Google font assets finish downloading. On a slow device / Replit tunnel that download
  stalls, so the app paints blank white forever (web) or never hands off from Expo Go's
  "Downloading 100.00%" loader (device). Symptom: JS clearly runs ("Running application main" in
  web console, no errors) but screen stays blank.
- **Fix:** render immediately — do NOT gate the tree on fonts. Let Inter swap in when ready
  (system font is a fine first-frame fallback). Keep the native splash up via
  `preventAutoHideAsync`, then `hideAsync` on `fontsLoaded || fontError` **OR** a ~2s timeout so a
  stalled font load can't trap the splash either.
- **Why:** same class of bug as the `<ClerkLoaded>` gate above — any single async dependency that
  blocks the entire render tree becomes a permanent blank screen when that dependency is slow.
- `Alert.alert` with multiple buttons is a no-op on React Native Web — the confirm/destructive button callbacks never fire, so any action gated behind it (e.g. logout `signOut()`) silently does nothing in the web preview. Branch on `Platform.OS === "web"` and use `window.confirm` there. **Why:** "logout button does nothing, user still sees home" is this, not an auth bug.
- Any full-screen overlay whose dismissal is gated on a Reanimated animation callback (`withTiming(..., cb)` → `runOnJS(setDone)`) MUST also have a JS `setTimeout` fail-safe that flips the same state. If the worklet callback doesn't fire (web/reduced-motion/interrupt) the overlay traps the user forever. **Why:** an animated launch-splash gated only on the callback can lock the whole app.
- `expo-video` (`useVideoPlayer` + `VideoView`) works in Expo Go on SDK 54; `expo install expo-video` auto-adds its config plugin to `app.json`. Reference website-hosted media via `${websiteUrl}/media/*.mp4` (served through the proxy at the gym site's `/` base) rather than bundling large mp4s into the app. **Why:** keeps the app bundle small and the videos in one source-of-truth (the website's public/media).
