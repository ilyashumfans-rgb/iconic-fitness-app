---
name: Gym distance display & coordinate data
description: How per-gym distance is computed/shown, and why "all gyms same distance" is usually a data problem.
---

# Gym distance display & coordinate data

`GET /gyms` only computes real per-gym distance (haversine) when BOTH `lat` and `lng`
query params are passed; otherwise every gym keeps a static `distanceKm` (default 2.5).

**Rule:** never render a distance badge/text unless the user's real coords are known.
Frontend gates display on `coords` from the shared `useUserLocation` hook
(`artifacts/gymco/src/hooks/use-user-location.ts`, auto-requests geolocation on mount).
NearbyGyms + Explore pass coords into `useListGyms` AND `getListGymsQueryKey` (same
`gymsParams` object) so React Query partitions cache by location. The member Dashboard
uses a separate `getDashboard` endpoint with no location input, so it shows no distance.

**Why "all gyms show same/0 km":** it's almost always DATA, not code — gyms in the DB
had identical placeholder coords (e.g. `12.97,77.59` = generic Bangalore) for most rows.
Fix is to give each gym real lat/lng. Check `SELECT COUNT(DISTINCT (lat,lng)) FROM gyms`
before suspecting the haversine code.

**How to apply (push coords to prod):** dev/prod are separate DBs. After fixing dev gym
coords: regenerate `artifacts/api-server/src/lib/seed-snapshot.json` from dev DB, redeploy,
then admin clicks "Import workspace data". See `prod-data-import.md`.
