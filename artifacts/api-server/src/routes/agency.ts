import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireAgency, verifyAgencyCredentials } from "../lib/agencyAuth";

const router: IRouter = Router();

// ───────────────────────────── Auth ─────────────────────────────

router.post(
  "/agency/login",
  async (req: Request, res: Response): Promise<void> => {
    const { username, password } = (req.body ?? {}) as {
      username?: string;
      password?: string;
    };
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    if (!verifyAgencyCredentials(username, password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.agencyUser = username;
    res.json({ username });
  },
);

router.post(
  "/agency/logout",
  (req: Request, res: Response): void => {
    delete req.session.agencyUser;
    res.json({ ok: true });
  },
);

router.get("/agency/me", requireAgency, (req: Request, res: Response): void => {
  res.json({ username: req.session.agencyUser });
});

// ─────────────────────── GX bookings (all branches) ───────────────────────

// Read-only view of every GX (group class) booking across all branches. These
// are stored as leads with kind="class". The frontend groups them by branch and
// by class category to show how many people have booked each.
router.get(
  "/agency/gx-bookings",
  requireAgency,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: leadsTable.id,
        gymId: leadsTable.gymId,
        gymName: leadsTable.gymName,
        className: leadsTable.className,
        name: leadsTable.name,
        phone: leadsTable.phone,
        email: leadsTable.email,
        preferredDate: leadsTable.preferredDate,
        preferredTime: leadsTable.preferredTime,
        status: leadsTable.status,
        source: leadsTable.source,
        createdAt: leadsTable.createdAt,
      })
      .from(leadsTable)
      .where(and(eq(leadsTable.kind, "class")))
      .orderBy(desc(leadsTable.preferredDate), asc(leadsTable.preferredTime))
      .limit(10000);
    res.json(rows);
  },
);

export default router;
