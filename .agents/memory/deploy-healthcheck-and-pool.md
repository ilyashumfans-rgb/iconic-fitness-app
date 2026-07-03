---
name: Deploy promote fails — health probe & pg pool
description: Why a Replit autoscale publish can "fail to initialize" even though the build succeeds, and the two robustness rules that prevent it.
---

# Autoscale promote failure: startup probe 500 + pg pool crash

**Symptom:** deployment shows `isDeployed:true` but `hasSuccessfulBuild:false`; build PHASE succeeds but promote/initialize fails with "deployment failed to initialize due to a configuration or code error". Runtime logs show the startup probe (`/api/healthz`, path set in `artifacts/api-server/.replit-artifact/artifact.toml` `[services.production.health.startup]`) returning HTTP 500 repeatedly, and/or an unhandled pg `Pool` `'error'` event (`terminating connection due to administrator command` → `throw er`).

## Rule 1 — the health probe must be dependency-free
The startup probe must NOT pass through any DB/session/auth middleware. In `app.ts`, mount the health route BEFORE `sessionMiddleware` (express-session + connect-pg-simple Postgres store) and `clerkMiddleware`: `app.use("/api", healthRouter)` early. The handler returns a plain `{status:"ok"}` — no Zod parse, no DB.

**Why:** during promote the DB can be briefly unavailable; if the probe routes through the Postgres session store it 500s and the whole deploy is rejected even though the app is otherwise fine.

## Rule 2 — the pg Pool needs an `'error'` listener
In `lib/db/src/index.ts`, attach `pool.on("error", ...)` that logs and swallows. Postgres drops idle pooled connections at any time (maintenance / autoscale scale-down); node-postgres emits `'error'` on the pool and with no listener Node treats it as unhandled and crashes the process (crash-loop → failed promote). Swallowing does NOT hide query errors — those still reject on the query promise.

**How to apply:** any Express+node-postgres service on Replit autoscale should have both in place before publishing. If a publish "fails to initialize" but the build log is clean, check the startup probe path and pool error handling first.
