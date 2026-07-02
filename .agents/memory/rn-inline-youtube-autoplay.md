---
name: Inline autoplay YouTube in Expo (web + native)
description: How to embed an auto-playing YouTube video inside an Expo app that runs on both web preview and native, without breaking a surrounding carousel.
---

To autoplay a YouTube video *inline* in an Expo app that ships to both web (the
canvas/browser preview) and native, use a **platform-split component** — Metro
resolves `Foo.web.tsx` for web and `Foo.tsx` for native automatically:

- `Foo.web.tsx` → render a raw `<iframe>` (expo web runs on react-dom, so DOM
  elements are valid JSX in a `.web.tsx` file; no `@ts-expect-error` needed —
  the `iframe` intrinsic typechecks and adding the directive errors as unused).
- `Foo.tsx` (native) → `react-native-webview` `<WebView>` with
  `allowsInlineMediaPlayback` + `mediaPlaybackRequiresUserAction={false}`.

Embed URL that autoplays reliably: `https://www.youtube.com/embed/<id>?autoplay=1&mute=1&loop=1&playlist=<id>&controls=0&playsinline=1&rel=0`.
**`mute=1` is mandatory** — browsers/OS block autoplay with sound. `loop` needs
`playlist=<same id>` to actually loop a single video.

**Why:** the earlier design just showed a thumbnail + play badge and opened the
video externally; the director wanted it playing "there itself".

**How to apply / gotchas:**
- Install the native dep with `pnpm --filter @workspace/<app> exec expo install react-native-webview` (picks the SDK-compatible version). Web never imports it (it resolves `.web.tsx`), so the web bundle stays clean.
- Inside a horizontal paging carousel, make the player **non-interactive**: wrap it in a `View pointerEvents="none"` (and `pointerEvents:"none"` in the iframe inline style / on the WebView). Then the surrounding `Pressable` still gets taps and the `ScrollView` still gets swipes. An interactive iframe/webview would swallow both.
- Multiple muted iframes autoplaying at once is fine (no audio); keep slide count modest for perf.

**Related — safe-area on web:** `useSafeAreaInsets().top` is `0` on web/expo-web,
so a full-bleed top banner sits under the mockup device notch. Guard with
`insets.top === 0 ? { paddingTop: N } : null` rather than a negative marginTop,
and let `SafeAreaView(edges:["top"])` handle native.
