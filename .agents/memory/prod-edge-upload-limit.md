---
name: Prod edge 403 on large uploads
description: Production Google Frontend edge proxy intermittently 403s large POST bodies before they reach Express; keep client uploads small.
---

In production the app sits behind Google's edge proxy (`server: Google Frontend`). Large request bodies (multi-MB image uploads) can get an **intermittent `403 Forbidden` HTML response from the edge before they ever reach Express** — so nothing appears in the app/server logs, and the server route itself returns 200 for the same image when tested directly. Symptom reported by users: "JPG gives 403, big PNG just keeps loading" on the live site, while dev (different proxy, higher limits) works fine.

**Why:** the dev proxy and the production Google Frontend have different inbound request limits/behavior. Small uploads (<~1MB) always succeed; multi-MB uploads usually succeed but occasionally 403 (looked correlated with size + cold-start/scaling). It is NOT a clean size cutoff and NOT reproducible 100% of the time.

**How to apply:** never upload large raw images from the browser. Re-encode/downscale every raster image client-side to a small payload (target ~3MB, we use 2400px max dimension, quality-first then dimension reduction) before POSTing. Do not "pass through" already-valid JPG/PNG untouched. Keeping uploads small also fixes the slow/hanging large-PNG case and is faster overall. See `artifacts/gymco/src/components/FileUpload.tsx` `prepareForUpload`.

**Debugging tip:** to tell edge-403 from app-403, `curl -sI`/POST the prod domain — an edge block shows `server: Google Frontend` and a tiny `403 Forbidden` HTML body, whereas our routes return JSON and never 403 (they use 401/413/415/500).
