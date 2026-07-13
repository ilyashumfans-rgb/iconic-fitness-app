---
name: Web notch top-padding fallback
description: How iconic-app screens clear the canvas phone frame's simulated notch on web, where safe-area insets are 0.
---

**Rule:** On Expo web (canvas preview), `useSafeAreaInsets().top` is 0 while the phone frame draws a fake notch/dynamic island (~40-50px). Screens must pad the top by `WEB_NOTCH_TOP` (52, exported from `components/Screen.tsx`) when `Platform.OS === "web"`. On native, inset 0 usually means an iOS sheet modal that already clears the notch — only a small pad (16) is needed there, never 52.

**Why:** Titles/headers rendered at the very top get visually clipped by the simulated notch in the canvas preview; a 16px pad is not enough.

**How to apply:**
- Screens using the shared `Screen` wrapper get it automatically — but the fallback must be merged AFTER `contentContainerStyle` using `Math.max(fallback, requestedPaddingTop)`, or per-screen `paddingTop` overrides silently reintroduce the overlap.
- Screens bypassing `Screen` (raw `SafeAreaView`/`insets.top` usage) must apply the same `Platform.OS === "web" ? WEB_NOTCH_TOP : n` pattern themselves.
