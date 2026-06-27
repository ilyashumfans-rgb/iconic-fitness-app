---
name: AI coach multi-turn assessment writes
description: How a tool-calling LLM should persist a conversational assessment without losing or prematurely completing data.
---

When an LLM gathers a multi-field assessment conversationally and persists it via a single write tool (e.g. `save_assessment`), the tool can be called repeatedly with partial data across turns. Two non-obvious rules keep this correct:

1. **Merge, never replace, the JSON blob.** Build the update from only the keys actually present in the tool args (`"key" in args`), then spread over the row's existing blob. Defaulting omitted fields to null/[] on every call silently erases details captured earlier in the conversation.
2. **Gate the "complete" timestamp on a core-field check, and make it idempotent.** Only stamp `assessmentCompletedAt` once the minimum profile is present; once stamped, keep the original time (`cur.completedAt ?? (coreComplete ? now : null)`). Otherwise any partial save flips the user to "onboarded" and downstream UI (greeting/banner/daily-vs-onboarding mode) switches too early. Return `{ok:true, message:"still missing …"}` so the model keeps asking instead of presenting final results.

**Why:** code review caught both — partial saves wiped lifestyle/health answers, and completion was stamped on any successful save. Both break the "collect the *full* assessment before guiding" requirement.

**How to apply:** any feature where an LLM tool incrementally fills a record. Use a nullable new column (here `experienceLevel`) as the reliable completion signal — pre-existing notNull profile columns may already hold signup placeholders and can't distinguish "assessed" from "never assessed". For omitted first-class columns, fall back to the row's current value, not null.
