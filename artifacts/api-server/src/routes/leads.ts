import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

const VALID_STATUS = new Set([
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);
const VALID_KIND = new Set(["class", "gym", "general", "membership"]);

// ─────────────────────────── Public capture ───────────────────────────

router.post("/leads", async (req: Request, res: Response): Promise<void> => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const city = typeof b.city === "string" ? b.city.trim() : "";
  const kind = VALID_KIND.has(String(b.kind)) ? String(b.kind) : "class";
  const classId = Number.isFinite(Number(b.classId))
    ? Number(b.classId)
    : null;
  const gymId = Number.isFinite(Number(b.gymId)) ? Number(b.gymId) : null;
  const planId = Number.isFinite(Number(b.planId)) ? Number(b.planId) : null;
  const className = typeof b.className === "string" ? b.className : "";
  const gymName = typeof b.gymName === "string" ? b.gymName : "";
  const planName = typeof b.planName === "string" ? b.planName : "";
  const planPriceInr = Number.isFinite(Number(b.planPriceInr))
    ? Number(b.planPriceInr)
    : 0;
  const preferredDate =
    typeof b.preferredDate === "string" ? b.preferredDate : "";
  const preferredTime =
    typeof b.preferredTime === "string" ? b.preferredTime : "";
  const message = typeof b.message === "string" ? b.message : "";
  const source = typeof b.source === "string" ? b.source : "web";

  if (!name || name.length < 2) {
    res.status(400).json({ error: "Please enter your full name" });
    return;
  }
  if (!phone || !/^[+0-9 ()-]{7,}$/.test(phone)) {
    res.status(400).json({ error: "Please enter a valid phone number" });
    return;
  }
  if (!preferredDate) {
    res.status(400).json({ error: "Please choose a date for your visit" });
    return;
  }
  if (!preferredTime) {
    res.status(400).json({ error: "Please choose a time for your visit" });
    return;
  }

  const [row] = await db
    .insert(leadsTable)
    .values({
      kind,
      name,
      phone,
      email,
      city,
      classId,
      gymId,
      planId,
      className,
      gymName,
      planName,
      planPriceInr,
      preferredDate,
      preferredTime,
      message,
      source,
    })
    .returning();

  req.log?.info(
    { leadId: row.id, kind, classId, gymId },
    "lead captured",
  );
  res.status(201).json({ id: row.id, ok: true });
});

// ─────────────────────────── Admin CRM ───────────────────────────

router.get(
  "/admin/leads",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const status =
      typeof req.query.status === "string" ? req.query.status : null;
    const rows = await db
      .select()
      .from(leadsTable)
      .where(status && VALID_STATUS.has(status) ? eq(leadsTable.status, status) : undefined)
      .orderBy(desc(leadsTable.createdAt));
    res.json(rows);
  },
);

router.get(
  "/admin/leads/stats",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        status: leadsTable.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(leadsTable)
      .groupBy(leadsTable.status);
    const total = rows.reduce((s, r) => s + Number(r.count), 0);
    res.json({ total, byStatus: rows });
  },
);

router.patch(
  "/admin/leads/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.status === "string" && VALID_STATUS.has(b.status)) {
      patch.status = b.status;
    }
    if (typeof b.assignedTo === "string") patch.assignedTo = b.assignedTo;
    if (typeof b.notes === "string") patch.notes = b.notes;
    const [row] = await db
      .update(leadsTable)
      .set(patch)
      .where(eq(leadsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/admin/leads/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(leadsTable).where(eq(leadsTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
