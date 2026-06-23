import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

// The agency portal uses a single shared credential supplied via environment
// secrets (AGENCY_USERNAME / AGENCY_PASSWORD). This is a read-only role that
// can view GX class bookings across every branch, so a single login is enough.
declare module "express-session" {
  interface SessionData {
    agencyUser?: string;
  }
}

// Constant-time string compare to avoid leaking length/secrets via timing.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still run a comparison against a same-length buffer to keep timing flat.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyAgencyCredentials(
  username: string,
  password: string,
): boolean {
  const expectedUser = process.env.AGENCY_USERNAME;
  const expectedPass = process.env.AGENCY_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  const userOk = safeEqual(username, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  return userOk && passOk;
}

export function requireAgency(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session.agencyUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
