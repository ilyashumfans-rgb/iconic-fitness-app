import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, leadsTable, agencyUsersTable, gymsTable } from "@workspace/db";
import { requireAgency } from "../lib/agencyAuth";
import { verifyPassword } from "../lib/adminAuth";

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
    const [user] = await db
      .select()
      .from(agencyUsersTable)
      .where(eq(agencyUsersTable.username, username.trim()))
      .limit(1);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    // Regenerate the session on login to guard against session fixation.
    req.session.regenerate((err) => {
      if (err) {
        res.status(500).json({ error: "Login failed" });
        return;
      }
      req.session.agencyUserId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          res.status(500).json({ error: "Login failed" });
          return;
        }
        res.json({ id: user.id, username: user.username, name: user.name });
      });
    });
  },
);

router.post("/agency/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get(
  "/agency/me",
  requireAgency,
  async (req: Request, res: Response): Promise<void> => {
    const id = req.session.agencyUserId!;
    const [user] = await db
      .select()
      .from(agencyUsersTable)
      .where(eq(agencyUsersTable.id, id))
      .limit(1);
    if (!user) {
      // Account was deleted while logged in — end the session.
      req.session.destroy(() => {
        res.status(401).json({ error: "Unauthorized" });
      });
      return;
    }
    const branches = user.gymIds.length
      ? await db
          .select({ id: gymsTable.id, name: gymsTable.name })
          .from(gymsTable)
          .where(inArray(gymsTable.id, user.gymIds))
          .orderBy(asc(gymsTable.name))
      : [];
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      branches,
    });
  },
);

// ─────────────────────── GX bookings (assigned branches) ───────────────────────

// Read-only view of GX (group class) bookings for the branches this agency
// account is assigned to. Bookings are leads with kind="class". Scoping is
// always re-read from the account row so revoked branches take effect
// immediately.
router.get(
  "/agency/gx-bookings",
  requireAgency,
  async (req: Request, res: Response): Promise<void> => {
    const id = req.session.agencyUserId!;
    const [user] = await db
      .select({ gymIds: agencyUsersTable.gymIds })
      .from(agencyUsersTable)
      .where(eq(agencyUsersTable.id, id))
      .limit(1);
    if (!user) {
      // Account was deleted while logged in — end the session.
      req.session.destroy(() => {
        res.status(401).json({ error: "Unauthorized" });
      });
      return;
    }
    if (user.gymIds.length === 0) {
      res.json([]);
      return;
    }
    // Aggregate-safe projection only: no name/phone/email is ever sent to the
    // agency client (this role sees booking counts, not personal contact info).
    const rows = await db
      .select({
        id: leadsTable.id,
        gymId: leadsTable.gymId,
        gymName: leadsTable.gymName,
        className: leadsTable.className,
        preferredDate: leadsTable.preferredDate,
        preferredTime: leadsTable.preferredTime,
        createdAt: leadsTable.createdAt,
      })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.kind, "class"),
          inArray(leadsTable.gymId, user.gymIds),
        ),
      )
      .orderBy(desc(leadsTable.preferredDate), asc(leadsTable.preferredTime));
    res.json(rows);
  },
);

export default router;
