import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// A Postgres server can drop an idle pooled connection at any time (e.g. during
// maintenance or autoscale scale-down: "terminating connection due to
// administrator command"). node-postgres surfaces that as an 'error' event on
// the pool; with no listener attached, Node treats it as an unhandled 'error'
// and crashes the whole process. Swallow it here — the pool discards the dead
// client and creates a fresh one on the next query.
pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[db] idle client error (ignored, pool will recover):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
