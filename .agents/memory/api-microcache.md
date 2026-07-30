---
name: API micro-cache + perf setup
description: How hot public GETs are cached and what prod still needs (indexes)
---

- Hot public GETs (gyms, classes, store, memberships, membership-packages, trainers) go through `microCache(ttlMs)` (in-process, keyed by originalUrl, 30s TTL, 2xx JSON only). **Only** attach it to fully public, per-user-invariant GETs — never to authed/per-member routes.
- **Why:** with lakhs of members these endpoints dominate DB load; 30s staleness is invisible in the UI.
- **How to apply:** import from `lib/microCache`; admin catalog edits show up within 30s, or call `clearMicroCache()` if instant visibility is ever needed.
- Response compression is enabled app-wide (`compression()` in app.ts, before routes).
- Perf indexes (notifications recipient feed, leads created_at/gym_id, bookings class_id/user_id) exist in the drizzle schema AND were applied to the **dev** DB via raw `CREATE INDEX IF NOT EXISTS` (db push is forbidden — see db-push-drift). The **production** DB still needs the same CREATE INDEX statements run once.
- Member bell poll is 120s (`NotificationBell.tsx` refetchInterval) + refetch on focus; keep it ≥2 min.
