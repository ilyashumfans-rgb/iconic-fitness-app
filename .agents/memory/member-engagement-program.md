---
name: Member engagement 45-day program
description: How the General Member Engagement feature (45-day plan, follow-ups, PT re-conversion, score) is wired
---
- Plan content is code-only (api-server lib/engagementPlan.ts, 3 levels × weekly template → 45 cards); DB stores only the enrolment row (member_engagement_programs, unique per user).
- Auto-start is lazy inside GET /engagement/mine: kick-starter trial completed (any pt_program in history, not just latest) + no paid PT → onConflictDoNothing insert.
- Day 7/15/30/45 follow-ups and 15/30/45 PT re-conversion reminders fire lazily from the same GET via conditional UPDATE cursor guards (last_followup_day / last_pt_reminder_day) — no cron.
- Engagement score 0–100 computed on read (engagementScore/scoreBand in routes/engagement.ts); staff overview batch-loads facts (no per-member queries).
- **Prod publish requires the additive CREATE TABLE member_engagement_programs** (db push forbidden; run the same SQL on prod).
