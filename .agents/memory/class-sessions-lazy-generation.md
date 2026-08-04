---
name: Group class sessions lazy generation
description: Upcoming class_sessions are materialised on read from each gym's weekly timetable; never assume seeded sessions stay fresh.
---
Class sessions were originally seeded with fixed dates and all went stale (0 upcoming → empty "Book your next session"). Fix: `ensureUpcomingClassSessions()` (api-server lib) lazily inserts the next 7 days of sessions per verified gym from `resolveGymSchedule` (partner rows or default IST 7-8AM/7-8PM timetable), throttled 10 min in-process, called from the class listing endpoints.
**Why:** no background jobs run in this project; anything time-based must be lazily materialised from a read path (same pattern as engagement program / milestone reminders).
**How to apply:** if classes/bookings look empty again, check upcoming-row counts first, not the UI; new time-based features should follow the lazy-materialise-on-read pattern. Trending endpoint must filter startsAt >= now.
