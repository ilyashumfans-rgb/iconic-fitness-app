---
name: RN guided-timer state machine
description: Correctness pattern for set/rest workout-timer (or any interval-driven multi-step) screens in the Expo app.
---

When building an interval-driven stepper (e.g. the guided WorkoutPlayer: exercise sets → rest countdown → next set), the naive approach has two recurring bugs:

1. **Double-advance race.** If `advance()` (which increments the step index) is reachable from BOTH a user action ("Skip rest") AND the interval reaching 0, they can both fire near a tick boundary and double-increment, silently skipping a set.
2. **Off-by-one "Next" label.** During rest, the still-current `step` is not the upcoming one — the label must read `steps[index + 1]`.

**Rule / how to apply:**
- Make `advance()` idempotent with a `useRef` guard (`advancingRef`); set it true on entry, return early if already true, and re-arm it in `useEffect(..., [index])` (runs after a successful advance).
- Do NOT call `advance()` (a state-setter) from inside a `setRestLeft(prev => ...)` updater — that's a side-effect-in-updater anti-pattern. Instead let the interval ONLY decrement, and centralize the transition in `useEffect(() => { if (resting && restLeft === 0) advance(); }, [resting, restLeft, advance])`.
- Always clear the interval in the effect cleanup AND inside `advance()`.

**Why:** caught by architect review as a "Fail" (skipped-set race + wrong rest label) before this pattern was applied.
