---
name: Image uploads use DB, not object storage
description: Why gym logo/hero/gallery uploads are stored in Postgres instead of Replit object storage, and how that path works.
---

Replit object storage (App Storage / GCS) is NOT usable in this repl. The bucket
secrets (`DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`,
`PRIVATE_OBJECT_DIR`) are stale, carried over when this app was branched from the
original GYMCO template. The storage sidecar (`http://127.0.0.1:1106/token`) returns
`no allowed resources` (HTTP 401), so any presigned-URL signing 500s.

**Why it can't be auto-fixed:** `setupObjectStorage()` short-circuits with
`alreadySetUp:true` whenever those secrets exist (force/recreate/reprovision flags are
ignored), so it won't attach a fresh bucket. The secrets are *global secrets*, which the
agent's tooling cannot delete or overwrite (`deleteEnvVars`/`setEnvVars` only touch
environment-scoped vars — they are a no-op on these). Only the user can delete them via
the Secrets UI, and in this project the user was unable to do that. A workflow restart
does NOT remount the sidecar.

**The working path (use this for any new image/file upload feature):**
- Table `uploaded_images` (created via raw `CREATE TABLE IF NOT EXISTS`, not `db push`)
  stores bytes as base64 text. Schema mirror is `uploadedImagesTable` in
  `lib/db/src/schema/index.ts`.
- `POST /api/storage/uploads/inline` — session-auth, `express.raw` (15MB cap), sniffs
  MIME from magic bytes (rejects SVG / anything that isn't PNG/JPEG/GIF/WebP/PDF),
  inserts row, returns `{ url: "/api/storage/db-images/<uuid>" }`.
- `GET /api/storage/db-images/:id` — serves bytes with sniffed Content-Type +
  `X-Content-Type-Options: nosniff` (PDFs forced to `attachment`).
- Frontend `artifacts/gymco/src/components/FileUpload.tsx` POSTs the raw file to the
  inline endpoint.

**Why bytes-not-header MIME:** trusting the client Content-Type let an SVG be served
same-origin as active content (stored XSS). Always sniff magic bytes for any
user-uploaded-then-served file.

The legacy object-storage code (`routes/storage.ts` request-url route, `lib/objectStorage.ts`)
is left in place but unused; if object storage is ever properly provisioned, the inline
path can be swapped back.

**GIF animation passthrough (important for any slider/banner upload):** the shared
`FileUpload.tsx` re-encodes every image through a `<canvas>`, which flattens animated
GIFs to a single static frame. To keep GIFs animated, upload the raw file bytes directly
to `POST /api/storage/uploads/inline` (the endpoint accepts `image/gif` via magic-byte
sniffing) and only canvas-compress non-GIF rasters. The admin Home-slider editor
(`pages/admin/HomeSlides.tsx`) does exactly this (`isGif ? file : compressImage(file)`).
On the mobile side, React Native / Expo `<Image>` animates GIFs from a db-image URL with
no extra deps.
