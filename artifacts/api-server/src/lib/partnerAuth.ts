import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, partnersTable } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    partnerId?: number;
    partnerEmail?: string;
    partnerName?: string;
  }
}

function clearPartnerSession(req: Request): void {
  delete req.session.partnerId;
  delete req.session.partnerEmail;
  delete req.session.partnerName;
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
  next();
}
