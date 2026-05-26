import type { Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { pool } from "@workspace/db";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  // Dev only — log a warning so the developer notices.
  // eslint-disable-next-line no-console
  console.warn(
    "[adminAuth] SESSION_SECRET is not set; using an insecure dev fallback.",
  );
}
const SECRET = SESSION_SECRET ?? "dev-only-insecure-secret-do-not-use";

declare module "express-session" {
  interface SessionData {
    adminId?: number;
    adminEmail?: string;
    adminName?: string;
  }
}

const PgStore = connectPgSimple(session);

// Ensure the session table exists. We do this manually (rather than via
// `createTableIfMissing: true`) because connect-pg-simple reads a packaged
// table.sql at runtime, which esbuild does not bundle — so the flag fails
// in production with ENOENT. Schema mirrors connect-pg-simple's table.sql.
// Must be awaited before the server starts accepting requests.
export async function ensureSessionTable(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    ) WITH (OIDS=FALSE);
    CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");`,
  );
}

export const sessionMiddleware: RequestHandler = session({
  name: "gymco.admin.sid",
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  store: new PgStore({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: false,
  }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session.adminId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Loads the current admin row and only proceeds if their role is "superadmin".
// Use AFTER `requireAdmin`. Avoids relying on session-only role values that
// could go stale after a role change.
export function requireSuperAdmin(
  loadRole: (adminId: number) => Promise<string | undefined>,
): RequestHandler {
  return async (req, res, next) => {
    const id = req.session.adminId;
    if (!id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const role = await loadRole(id);
      if (role !== "superadmin") {
        res.status(403).json({ error: "Superadmin access required" });
        return;
      }
      next();
    } catch (err) {
      req.log?.error({ err }, "requireSuperAdmin role lookup failed");
      res.status(500).json({ error: "Role check failed" });
    }
  };
}
