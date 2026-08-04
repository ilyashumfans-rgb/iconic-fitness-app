---
name: EAS Android APK builds for iconic-app
description: What it took to get Expo cloud (EAS) Android builds working from this pnpm monorepo via GitHub
---

- User builds APKs on expo.dev via GitHub (repo `ilyasiconic/iconic-fitness-app`, base directory `artifacts/iconic-app`, profile `preview` = APK). Replit's Git-pane GitHub repo creation was broken ("Integration Unavailable" / false name-conflicts); repo was created manually on github.com and `origin` added by hand.
- EAS build machines need explicit pins or they fail, in this order encountered:
  1. root `package.json` `packageManager: pnpm@10.x` (else npm install fails on `workspace:*`),
  2. `eas.json` profile `pnpm` version (else old pnpm rejects lockfileVersion 9 → ERR_PNPM_NO_LOCKFILE),
  3. `eas.json` profile `node` 22 (else Metro config crashes: `toReversed is not a function` on Node <20),
  4. `eas.json` `android.image: "latest"` (else Java 11 image; Android Gradle plugin needs Java 17).
- `app.json` `slug` must equal the EAS project slug (`iconic-fitness`) and `extra.eas.projectId` must be set; `android.package` = `com.iconicfitness.app`.
- EAS builders set none of the Replit env vars, so the APK relies on code fallbacks: API/base + images + links fall back to `iconicfitnessindia.com` (the real custom-domain deployment — `gymco.replit.app` is a STALE old deployment, never point at it), and a hardcoded Clerk publishable-key fallback in `app/_layout.tsx` (same key the published website bundle ships; without it APKs had no login). Published site currently bakes a pk_test key — see task about live keys.
- **Why:** each missing pin fails with a misleading error deep in EAS logs; pinning everything up front avoids re-burning ~2h build queues.
