---
name: Deploy build typechecks ALL artifacts (one broken artifact blocks the whole publish)
description: Why a publish can fail on an artifact you never touched, and the DOM-lib trap for Vite React artifacts.
---

Publishing runs a workspace-wide `pnpm run build` (typecheck of every package + per-artifact build). A type error in ANY artifact — even one unrelated to the change being shipped — fails the whole publish.

**Concrete trap seen:** the `gymco-promo` video artifact's `tsconfig.json` was missing `"lib": ["esnext","dom","dom.iterable"]`, so it inherited base `["es2022"]` and threw `Cannot find name 'window'/'document'` plus cascading framer-motion `Variant` typing errors. Adding the `dom` lib fixed all of them at once.

**Why it hid:** the dev server (vite) does NOT typecheck, so the artifact ran fine in preview for a long time; only the deploy/full-build typecheck surfaced it.

**How to apply:**
- When a publish "build failed", run `pnpm run build` locally and read which *package* failed — it is often not the app you edited.
- Every Vite React artifact's tsconfig must declare the `dom`/`dom.iterable` libs (compare against `artifacts/gymco/tsconfig.json`, the known-good reference).
- A bare `vite build` from bash fails with `PORT environment variable is required` — that is expected (workflow/deploy supplies PORT), NOT a real deploy blocker. Verify artifacts with `typecheck`, not a shell `build`.
