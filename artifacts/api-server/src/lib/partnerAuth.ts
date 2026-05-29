import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, partnersTable, partnerStaffTable } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    partnerId?: number;
    partnerEmail?: string;
    partnerName?: string;
    // Set only when the signed-in account is a partner-created sub-account
    // (team member). When present, the session acts on behalf of `partnerId`
    // (the parent partner) but is limited to `partnerStaffPermissions`.
    partnerStaffId?: number;
    partnerStaffPermissions?: string[];
  }
}

// Areas a partner can grant to their team members. Dashboard is always
// available; Settings and Team management stay owner-only.
export const PARTNER_STAFF_PERMISSIONS = [
  "gyms",
  "bookings",
  "checkins",
  "classes",
  "products",
] as const;

export function clearPartnerSession(req: Request): void {
  delete req.session.partnerId;
  delete req.session.partnerEmail;
  delete req.session.partnerName;
  delete req.session.partnerStaffId;
  delete req.session.partnerStaffPermissions;
}

export async function requirePartner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = req.session.partnerId;
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [partner] = await db
    .select({ id: partnersTable.id, status: partnersTable.status })
    .from(partnersTable)
    .where(eq(partnersTable.id, id));
  if (!partner) {
    clearPartnerSession(req);
    res.status(401).json({ error: "Account no longer exists" });
    return;
  }
  if (partner.status === "suspended") {
    clearPartnerSession(req);
    res.status(403).json({
      error: "Your partner account has been suspended. Contact GYMCO support.",
    });
    return;
  }
  // For team-member sessions, revalidate the sub-account on every request so
  // that disabling the account, deleting it, or changing its permissions takes
  // effect immediately (permissions are sourced from the DB, not the session).
  if (req.session.partnerStaffId) {
    const [staff] = await db
      .select({
        id: partnerStaffTable.id,
        partnerId: partnerStaffTable.partnerId,
        isActive: partnerStaffTable.isActive,
        permissions: partnerStaffTable.permissions,
      })
      .from(partnerStaffTable)
      .where(eq(partnerStaffTable.id, req.session.partnerStaffId));
    if (!staff || !staff.isActive || staff.partnerId !== id) {
      clearPartnerSession(req);
      res.status(401).json({ error: "Your access has been revoked." });
      return;
    }
    req.session.partnerStaffPermissions = staff.permissions;
  }
  next();
}

// Owner-only guard: blocks partner-created team members. Used for managing the
// team itself and editing the brand account (profile + password).
export function requirePartnerOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.session.partnerStaffId) {
    res.status(403).json({
      error: "Only the partner account owner can do this.",
    });
    return;
  }
  next();
}

// Permission guard for operational areas. The owner (no partnerStaffId) always
// passes; a team member must carry the named permission.
export function requirePartnerPerm(perm: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.partnerStaffId) {
      next();
      return;
    }
    const perms = req.session.partnerStaffPermissions ?? [];
    if (perms.includes(perm)) {
      next();
      return;
    }
    res.status(403).json({
      error: "You do not have access to this section.",
    });
  };
}
