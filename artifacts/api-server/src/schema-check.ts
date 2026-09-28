import { Pool } from "pg";
import { checkSchemaCompatibility } from "./lib/schemaCompatibility";

// Deliberately no import of app, index, @workspace/db, or migration runners.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the read-only schema check.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  try {
    const issues = await checkSchemaCompatibility(pool);
    if (issues.length) {
      console.error(`Schema compatibility FAILED (${issues.length} issues):\n${issues.join("\n")}`);
      console.error("Release blocked. See docs/schema-migration-inventory.md. Do not use db push to repair drift.");
      process.exitCode = 1;
    } else console.log("Schema compatibility passed: all declared API tables and columns exist with matching types.");
  } finally { await pool.end(); }
}
main().catch(() => {
  // Do not print connection errors: they can contain credential-bearing URLs.
  console.error("Schema check could not complete. Verify database access and retry; release is blocked.");
  process.exitCode = 1;
});