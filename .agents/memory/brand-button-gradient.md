---
name: Brand button gradient (iconic-app)
description: Primary buttons app-wide use a lime→green gradient token with white text; how it's wired and why.
---

Primary/CTA buttons in `artifacts/iconic-app` render a lime→green diagonal gradient (expo-linear-gradient), not a flat color.

- Single source of truth: `primaryGradient` token in `constants/colors.ts` (same tuple in both light+dark palettes), surfaced via `useColors()` spread. Change the color there and every button follows.
- The shared `Button` component's `primary` variant renders a `<LinearGradient style={StyleSheet.absoluteFill}>` behind content with `overflow:"hidden"` on the Pressable. Standalone CTAs that don't use `Button` (workout start/done/complete-set, generate CTA, home hero cards, class Book-now active state, coach send, ErrorFallback) replicate the same absolute-fill pattern.
- Foreground is hardcoded white (`#FFFFFF`) on the gradient.

**Why:** the user supplied a reference CTA screenshot that is explicitly white bold text on this green gradient and asked for "this same colour for every button everywhere". A code review flagged white-on-lime as below WCAG contrast and suggested dark ink; we intentionally kept white to match the requested brand look, and deepened the gradient slightly (`#84C03F → #3F9E51`) so white reads better while still matching the reference. Design intent overrode the strict-WCAG suggestion here.

**How to apply:** to restyle all buttons, edit `primaryGradient` (both palettes) — do NOT hunt individual buttons. Non-button primary usages (progress-bar fills, badges, avatars, translucent `colors.primary + "22"` icon chips) were deliberately left flat; don't gradient-ize those.
