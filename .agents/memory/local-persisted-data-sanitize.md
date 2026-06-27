---
name: Sanitize AsyncStorage-persisted data on load
description: Robustness rule for local-first features that store user data (weight, measurements, prefs) in AsyncStorage in the Expo app.
---

Local-first features (e.g. Body & Weight tracker) persist a JSON blob in AsyncStorage and have no server validation. Treat the stored blob as untrusted: a corrupt/old/partial value can flow into derived math and render `NaN%` width / `NaN` text.

**Rule / how to apply:**
- On LOAD, run a `sanitize()` that whitelists+normalizes every field: numeric fields go through a `posNum()` (finite & > 0 → value, else undefined); validate date strings with a regex; drop malformed array entries. Do NOT just check `typeof === "object"` and trust the contents.
- Guard derived helpers too: any divide/derive (e.g. `goalProgress`) must return `null` (not `NaN`) when inputs are missing or the result is non-finite, and the UI should render the dependent element only when `Number.isFinite(x)`.
- Do NOT re-sanitize inside the `save*` mergers by dropping `undefined` keys — callers intentionally pass `undefined` to CLEAR a field, and a sanitize-on-save that omits undefined silently breaks clear-to-blank. Load-time sanitize + UI guards are sufficient.

**Why:** architect review failed this twice — first for trusting stored profile/measurements (NaN%), then the "optional" save-side re-sanitize introduced a clear-field regression.
