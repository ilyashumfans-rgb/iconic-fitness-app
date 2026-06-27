---
name: IST date-label drift for date-only strings
description: Why YYYY-MM-DD chips/labels in the mobile app must be IST-anchored, not formatted with the device timezone
---

In `artifacts/iconic-app`, dates that represent a *calendar day* are stored as `YYYY-MM-DD` strings (IST, via `istToday`/`istDateInNDays`). Formatting them for display is where the bug hits.

**Rule:** to render a `YYYY-MM-DD` string as a friendly label, use an IST-anchored helper (`istDateLabel`, `istWeekdayShort` in `lib/dates.ts`) that anchors at `T12:00:00Z` and formats with `timeZone: "Asia/Kolkata"`. Do NOT pass a bare `YYYY-MM-DD` to `formatDateLabel` / `new Date(str)` + local formatting.

**Why:** `new Date("2026-06-27")` parses as UTC midnight. On a device behind UTC (e.g. US timezones) the local-timezone formatter then renders the *previous* day ("Jun 26"), so the chip label disagrees with the IST day actually being submitted to the server. Architect flagged this same class of bug across multiple phases (habit grid weekday labels, trainer booking date chips).

**How to apply:** any new day-picker / date chip / streak-grid label over date-only strings → reach for the IST-anchored helpers. `formatDateLabel`/`formatClock` are fine only for full ISO *timestamps* where the instant is unambiguous.
