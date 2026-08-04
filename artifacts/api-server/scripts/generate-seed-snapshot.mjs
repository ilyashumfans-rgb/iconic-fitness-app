#!/usr/bin/env node
// Regenerates src/lib/seed-snapshot.json from the CURRENT dev database.
//
// Usage:  pnpm --filter @workspace/api-server run snapshot
//
// Dumps every catalog table consumed by seedFromSnapshot.ts, then includes
// only the uploaded_images rows actually referenced by a
// `/storage/db-images/<id>` URL somewhere in the dumped data (image_url
// columns on gyms, products, package_categories, yoactiv_package_prefs, etc.).
// Run this before publishing so "Import workspace data" and
// "Copy missing from workspace" mirror fresh dev data.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../src/lib/seed-snapshot.json");

// Keep in sync with seedAll()/CATALOG_TABLES in src/lib/seedFromSnapshot.ts.
// uploaded_images is handled separately (referenced rows only).
const TABLES = [
  "cities",
  "areas",
  "amenities",
  "workouts",
  "partners",
  "gyms",
  "trainers",
  "gym_amenities",
  "gym_workouts",
  "gym_workout_sessions",
  "gym_hours",
  "memberships",
  "class_sessions",
  "products",
  "package_categories",
  "yoactiv_package_prefs",
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set (run inside the Replit workspace).");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Dates -> ISO strings so the JSON matches what seedFromSnapshot expects.
function serializeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

function collectImageIds(value, ids) {
  if (typeof value === "string") {
    for (const m of value.matchAll(/db-images\/([^/?#"']+)/g)) ids.add(m[1]);
  } else if (Array.isArray(value)) {
    for (const v of value) collectImageIds(v, ids);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectImageIds(v, ids);
  }
}

try {
  const snapshot = {};
  for (const table of TABLES) {
    const res = await pool.query(`SELECT * FROM "${table}" ORDER BY id`);
    snapshot[table] = res.rows.map(serializeRow);
    console.log(`${table}: ${res.rows.length} rows`);
  }

  // Only ship image blobs the catalog actually references.
  const imageIds = new Set();
  collectImageIds(snapshot, imageIds);
  const imgRes = await pool.query(
    `SELECT * FROM "uploaded_images" WHERE id = ANY($1) ORDER BY id`,
    [[...imageIds]],
  );
  snapshot.uploaded_images = imgRes.rows.map(serializeRow);
  console.log(
    `uploaded_images: ${imgRes.rows.length} rows (of ${imageIds.size} referenced ids)`,
  );
  const missing = [...imageIds].filter(
    (id) => !imgRes.rows.some((r) => r.id === id),
  );
  if (missing.length > 0) {
    console.warn(
      `WARNING: ${missing.length} referenced image id(s) not found in uploaded_images: ${missing.join(", ")}`,
    );
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 1) + "\n");
  const kb = Math.round(fs.statSync(OUT_FILE).size / 1024);
  console.log(`\nWrote ${path.relative(process.cwd(), OUT_FILE)} (${kb} KB)`);
} finally {
  await pool.end();
}
