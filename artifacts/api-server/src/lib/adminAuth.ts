import type { Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";

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

export const sessionMiddleware: RequestHandler = session({
  name: "gymco.admin.sid",
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
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
