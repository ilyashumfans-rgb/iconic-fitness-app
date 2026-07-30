---
name: DB image compression
description: In-app and DB-stored media compression approach; uploads are stored raw so they regrow
---
Bundled app media: GIFs converted to animated WebP via ffmpeg (`fps=8-10, libwebp -q:v 35-50`), hero PNGs to WebP at display resolution — expo-image renders animated WebP fine on web and native.

DB-stored uploads (`uploaded_images`) were batch-recompressed in place (resize ≤1280px, WebP for alpha/animated, JPEG otherwise) by a throwaway script run from `lib/db` (has `pg` locally; scripts in /tmp can't resolve it — copy into lib/db to run).

**Why:** the inline upload endpoint stores raw bytes with no server-side resize, so new uploads will bloat the table again; dev and prod DBs are separate, so prod images stay uncompressed until mirrored or recompressed there.

**How to apply:** if remote images get slow again, check `uploaded_images` size distribution first; re-run the same batch approach or add compress-at-upload.
