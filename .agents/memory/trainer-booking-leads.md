---
name: Trainer booking implemented as a leads enquiry
description: Why the mobile "book a personal trainer" flow posts to /api/leads instead of a real booking table
---

The Iconic Fitness mobile app (`artifacts/iconic-app`) has a Personal Trainers feature (`app/trainers.tsx` list, `app/trainer/[id].tsx` detail). Trainers already have full read backend: `trainersTable`, member `GET /trainers` + `GET /trainers/:trainerId`, and generated `useListTrainers`/`useGetTrainer` hooks.

**Decision:** "Book / request a session" is NOT a persisted booking — it submits a lead/enquiry to the existing public `POST /api/leads` endpoint with `kind: "general"`, putting the trainer name/specialty in `message` and `source: "iconic-app-trainer"`. Helper: `lib/leads.ts` `submitLead()` (plain `fetch` to `${websiteUrl}/api/leads`, no auth needed).

**Why:** there is no trainer-booking table and `db push` is forbidden in this project. Reusing the leads pipeline gets the request to partners/admins (existing leads infra) with zero schema change. There is also no trainer login — trainers are records only.

**How to apply / contract gotchas:** `/api/leads` requires `name` (≥2 chars), a phone matching `/^[+0-9 ()-]{7,}$/`, and non-empty `preferredDate` + `preferredTime`. `kind: "general"` skips the GX timetable validation that `kind: "class"` triggers, so arbitrary date/time chips are accepted. If a true booking history is ever needed, that requires a new table (blocked until db push is allowed).
