import type { Request, Response, NextFunction } from "express";

// The agency portal now uses admin-managed accounts stored in `agency_users`.
// Each account is read-only and scoped to a set of branches (gymIds). The
// session carries the agency user's id; the row is the source of truth for
// which branches they may view.
declare module "express-session" {
  interface SessionData {
    agencyUserId?: number;
  }
}

export function requireAgency(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session.agencyUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
