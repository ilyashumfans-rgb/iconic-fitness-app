---
name: Lazy milestone reminders (no cron)
description: Pattern for "remind at N/…/0 days before expiry" generated lazily on feed polls, without early fires or spam.
---

Rule: when generating milestone reminders lazily (on a poll/request, no cron), keep thresholds **ascending** and pick `find(t => t >= daysLeft)` — the smallest milestone already reached. Dedupe per (user, expiry, threshold).

**Why:** the intuitive descending `find(t => daysLeft >= t)` picks the *next* milestone early (6 days left → fires the 3-day reminder), sending reminders on wrong days and creating back-to-back spam. Ascending+`t >= daysLeft` is exact on the milestone day and gracefully catches up if the user opens the app between milestones, never early.

**How to apply:** any lazily-evaluated countdown notification (renewal, trial expiry, deadline nudges). Also: fire-and-forget the generator from the feed endpoint (`void ensure…()`) so the response never waits on external lookups — the next poll picks up the new row.
