import type { Request, Response, NextFunction, RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, staffTable } from "@workspace/db";

export const STAFF_PERMISSIONS = [
  "partner.onboard",
  "partner.view",
  "partner.document_upload",
  "partner.assign_login",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export function isValidPermission(p: string): p is StaffPermission {
  return (STAFF_PERMISSIONS as readonly string[]).includes(p);
}

declare module "express-session" {
  interface SessionData {
    staffId?: number;
    staffEmail?: string;
    staffName?: string;
    staffPermissions?: string[];
  }
}

function clearStaffSession(req: Request): void {
  delete req.session.staffId;
  delete req.session.staffEmail;
  delete req.session.staffName;
  delete req.session.staffPermissions;
}

export async function loadStaffOrUnauthorized(
  req: Request,
  res: Response,
): Promise<{ id: number; email: string; name: string; permissions: string[] } | null> {
  const id = req.session.staffId;
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [row] = await db
    .select({
      id: staffTable.id,
      email: staffTable.email,
      name: staffTable.name,
      isActive: staffTable.isActive,
      permissions: staffTable.permissions,
    })
    .from(staffTable)
    .where(eq(staffTable.id, id));
  if (!row) {
    clearStaffSession(req);
    res.status(401).json({ error: "Account no longer exists" });
    return null;
  }
  if (!row.isActive) {
    clearStaffSession(req);
    res.status(403).json({ error: "Your staff account has been deactivated." });
    return null;
  }
  // Keep session permissions in sync.
  req.session.staffPermissions = row.permissions ?? [];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    permissions: row.permissions ?? [],
  };
}

export async function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const staff = await loadStaffOrUnauthorized(req, res);
  if (!staff) return;
  next();
}

export function requireStaffPermission(perm: StaffPermission): RequestHandler {
  return async (req, res, next): Promise<void> => {
    const staff = await loadStaffOrUnauthorized(req, res);
    if (!staff) return;
    if (!staff.permissions.includes(perm)) {
      res.status(403).json({ error: "Permission denied", required: perm });
      return;
    }
    next();
  };
}
