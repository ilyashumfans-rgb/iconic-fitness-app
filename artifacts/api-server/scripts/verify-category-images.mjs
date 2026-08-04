#!/usr/bin/env node
/**
 * Verify that every active package_category with a db-images URL has its
 * blob row in uploaded_images. Exits 1 with a clear message if any are missing.
 *
 * Usage: node scripts/verify-category-images.mjs
 * (Requires DATABASE_URL in env — runs against the dev database.)
 */
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

const DB_IMAGE_ID_RE = /db-images\/([^/?#]+)/;

try {
  const { rows: cats } = await pool.query(`
    SELECT id, name, image_url
    FROM package_categories
    WHERE is_active = true AND image_url IS NOT NULL AND image_url <> ''
    ORDER BY sort_order
  `);

  const referencedIds = [];
  for (const c of cats) {
    const m = String(c.image_url).match(DB_IMAGE_ID_RE);
    if (m) referencedIds.push({ id: m[1], categoryName: c.name });
  }

  if (referencedIds.length === 0) {
    console.log("No db-images references found in package_categories. Nothing to verify.");
    process.exit(0);
  }

  const ids = referencedIds.map((r) => r.id);
  const { rows: presentRows } = await pool.query(
    `SELECT id FROM uploaded_images WHERE id = ANY($1::text[])`,
    [ids],
  );
  const presentIds = new Set(presentRows.map((r) => r.id));

  const missing = referencedIds.filter((r) => !presentIds.has(r.id));
  if (missing.length > 0) {
    console.error("FAIL: These category images are missing from uploaded_images:");
    for (const m of missing) {
      console.error(`  Category '${m.categoryName}' -> image id ${m.id}`);
    }
    process.exit(1);
  }

  console.log(`OK: All ${referencedIds.length} category image(s) are present in uploaded_images.`);
  for (const r of referencedIds) {
    console.log(`  \u2713 ${r.categoryName} (${r.id})`);
  }
} finally {
  await pool.end();
}
