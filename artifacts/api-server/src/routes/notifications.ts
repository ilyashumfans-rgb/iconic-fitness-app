import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  notificationsTable,
  usersTable,
  partnersTable,
  adminsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { requirePartner } from "../lib/partnerAuth";
import { requireStaff } from "../lib/staffAuth";
import { requireUser } from "../lib/currentUser";
import { ensureRenewalReminders } from "../lib/renewalReminders";
import { ensureAssessmentReminder } from "./assessment";

const router: IRouter = Router();

const VALID_TYPES = ["user", "partner", "vendor", "admin"] as const;
type RecipientType = (typeof VALID_TYPES)[number];

async function recipientExists(
  type: RecipientType,
  id: number,
): Promise<boolean> {
  switch (type) {
    case "user": {
      const r = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      return r.length > 0;
    }
    case "partner": {
      const r = await db
        .select({ id: partnersTable.id })
        .from(partnersTable)
        .where(
          and(
            eq(partnersTable.id, id),
            inArray(partnersTable.kind, ["gym", "both"]),
          ),
        )
        .limit(1);
      return r.length > 0;
    }
    case "vendor": {
      const r = await db
        .select({ id: partnersTable.id })
        .from(partnersTable)
        .where(
          and(
            eq(partnersTable.id, id),
            inArray(partnersTable.kind, ["vendor", "both"]),
          ),
        )
        .limit(1);
      return r.length > 0;
    }
    case "admin": {
      const r = await db
        .select({ id: adminsTable.id })
        .from(adminsTable)
        .where(eq(adminsTable.id, id))
        .limit(1);
      return r.length > 0;
    }
  }
}

// Verify the session partner is allowed to access the given portal kind.
// "partner" portal requires kind in (gym, both); "vendor" portal requires
// kind in (vendor, both). Returns true if authorized.
async function partnerHasKind(
  partnerId: number,
  kind: "partner" | "vendor",
): Promise<boolean> {
  const allowed = kind === "partner" ? ["gym", "both"] : ["vendor", "both"];
  const r = await db
    .select({ id: partnersTable.id })
    .from(partnersTable)
    .where(
      and(eq(partnersTable.id, partnerId), inArray(partnersTable.kind, allowed)),
    )
    .limit(1);
  return r.length > 0;
}

async function resolveRecipientIds(type: RecipientType): Promise<number[]> {
  switch (type) {
    case "user": {
      const rows = await db.select({ id: usersTable.id }).from(usersTable);
      return rows.map((r) => r.id);
    }
    case "partner": {
      const rows = await db
        .select({ id: partnersTable.id })
        .from(partnersTable)
        .where(inArray(partnersTable.kind, ["gym", "both"]));
      return rows.map((r) => r.id);
    }
    case "vendor": {
      const rows = await db
        .select({ id: partnersTable.id })
        .from(partnersTable)
        .where(inArray(partnersTable.kind, ["vendor", "both"]));
      return rows.map((r) => r.id);
    }
    case "admin": {
      const rows = await db.select({ id: adminsTable.id }).from(adminsTable);
      return rows.map((r) => r.id);
    }
  }
}

// ───────────────────────── Admin: send + list sent ─────────────────────────

router.post(
  "/admin/notifications",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const type = String(b.recipientType ?? "") as RecipientType;
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: "Invalid recipientType" });
      return;
    }
    const title = String(b.title ?? "").trim();
    const body = String(b.body ?? "").trim();
    const link = String(b.link ?? "").trim();
    if (!title || !body) {
      res.status(400).json({ error: "Title and body are required" });
      return;
    }
    if (title.length > 200) {
      res.status(400).json({ error: "Title must be 200 chars or less" });
      return;
    }
    if (body.length > 4000) {
      res.status(400).json({ error: "Body must be 4000 chars or less" });
      return;
    }

    const recipientIdRaw = b.recipientId;
    const isBroadcast =
      recipientIdRaw === null ||
      recipientIdRaw === undefined ||
      recipientIdRaw === "";

    let ids: number[];
    if (isBroadcast) {
      ids = await resolveRecipientIds(type);
    } else {
      const id = Number(recipientIdRaw);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: "Invalid recipientId" });
        return;
      }
      const ok = await recipientExists(type, id);
      if (!ok) {
        res
          .status(404)
          .json({ error: `No ${type} recipient with id ${id}` });
        return;
      }
      ids = [id];
    }

    if (ids.length === 0) {
      res
        .status(400)
        .json({ error: `No recipients found for type "${type}"` });
      return;
    }

    const batchId = randomUUID();
    const values = ids.map((id) => ({
      recipientType: type,
      recipientId: id,
      title,
      body,
      link,
      batchId,
      createdByAdminId: req.session.adminId ?? null,
    }));

    // Postgres has a parameter limit; chunk inserts at 500 rows.
    let inserted = 0;
    for (let i = 0; i < values.length; i += 500) {
      const chunk = values.slice(i, i + 500);
      const out = await db
        .insert(notificationsTable)
        .values(chunk)
        .returning({ id: notificationsTable.id });
      inserted += out.length;
    }

    res.status(201).json({
      ok: true,
      batchId,
      recipientType: type,
      broadcast: isBroadcast,
      delivered: inserted,
    });
  },
);

router.get(
  "/admin/notifications",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    // Group by batch and return one summary row per send.
    const rows = await db
      .select({
        batchId: notificationsTable.batchId,
        recipientType: notificationsTable.recipientType,
        title: notificationsTable.title,
        body: notificationsTable.body,
        link: notificationsTable.link,
        createdByAdminId: notificationsTable.createdByAdminId,
        createdAt: sql<string>`min(${notificationsTable.createdAt})`,
        delivered: sql<number>`count(*)::int`,
        read: sql<number>`count(${notificationsTable.readAt})::int`,
      })
      .from(notificationsTable)
      .groupBy(
        notificationsTable.batchId,
        notificationsTable.recipientType,
        notificationsTable.title,
        notificationsTable.body,
        notificationsTable.link,
        notificationsTable.createdByAdminId,
      )
      .orderBy(desc(sql`min(${notificationsTable.createdAt})`))
      .limit(200);
    res.json(rows);
  },
);

// ───────────────────────── Member (user) notifications ─────────────────────

router.get(
  "/notifications/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    // Lazily generate plan-renewal reminders (7/3/1/0 days before the member's
    // YoActiv plan expiry) as the app polls the feed. Fire-and-forget so the
    // feed response never waits on the external YoActiv lookup — any new
    // reminder row is picked up by the next poll (bell polls every 2 min).
    // ensureRenewalReminders never throws.
    void ensureRenewalReminders(req.userId!);
    // Same lazy pattern: assessment evening-before reminder. Never throws.
    void ensureAssessmentReminder(req.userId!);
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.recipientType, "user"),
          eq(notificationsTable.recipientId, req.userId!),
        ),
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    res.json(rows);
  },
);

router.post(
  "/notifications/mine/:id/read",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.recipientType, "user"),
          eq(notificationsTable.recipientId, req.userId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  },
);

router.post(
  "/notifications/mine/read-all",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.recipientType, "user"),
          eq(notificationsTable.recipientId, req.userId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  },
);

// ─────────────────── Partner / Vendor notifications (partner session) ───────
// The partner portal queries kind=partner, the vendor portal queries kind=vendor.
// Both use the same `partnerId` session; a partner with kind="both" can see
// both feeds from their respective portals.

function partnerFeedHandler(kind: "partner" | "vendor") {
  return async (req: Request, res: Response): Promise<void> => {
    if (!(await partnerHasKind(req.session.partnerId!, kind))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.recipientType, kind),
          eq(notificationsTable.recipientId, req.session.partnerId!),
        ),
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    res.json(rows);
  };
}

function partnerMarkReadHandler(kind: "partner" | "vendor") {
  return async (req: Request, res: Response): Promise<void> => {
    if (!(await partnerHasKind(req.session.partnerId!, kind))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const id = Number(req.params.id);
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.recipientType, kind),
          eq(notificationsTable.recipientId, req.session.partnerId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  };
}

function partnerReadAllHandler(kind: "partner" | "vendor") {
  return async (req: Request, res: Response): Promise<void> => {
    if (!(await partnerHasKind(req.session.partnerId!, kind))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.recipientType, kind),
          eq(notificationsTable.recipientId, req.session.partnerId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  };
}

router.get("/partner/notifications", requirePartner, partnerFeedHandler("partner"));
router.post(
  "/partner/notifications/:id/read",
  requirePartner,
  partnerMarkReadHandler("partner"),
);
router.post(
  "/partner/notifications/read-all",
  requirePartner,
  partnerReadAllHandler("partner"),
);

router.get("/vendor/notifications", requirePartner, partnerFeedHandler("vendor"));
router.post(
  "/vendor/notifications/:id/read",
  requirePartner,
  partnerMarkReadHandler("vendor"),
);
router.post(
  "/vendor/notifications/read-all",
  requirePartner,
  partnerReadAllHandler("vendor"),
);

// ─────────────────── Admin's own inbox (bell on admin portal) ───────────────

router.get(
  "/admin/me/notifications",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.recipientType, "admin"),
          eq(notificationsTable.recipientId, req.session.adminId!),
        ),
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    res.json(rows);
  },
);

router.post(
  "/admin/me/notifications/:id/read",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.recipientType, "admin"),
          eq(notificationsTable.recipientId, req.session.adminId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  },
);

router.post(
  "/admin/me/notifications/read-all",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.recipientType, "admin"),
          eq(notificationsTable.recipientId, req.session.adminId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  },
);

// ─────────────────── Staff notifications (staff session) ────────────────────

router.get(
  "/staff/notifications",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.recipientType, "staff"),
          eq(notificationsTable.recipientId, req.session.staffId!),
        ),
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    res.json(rows);
  },
);

router.post(
  "/staff/notifications/:id/read",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.recipientType, "staff"),
          eq(notificationsTable.recipientId, req.session.staffId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  },
);

router.post(
  "/staff/notifications/read-all",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.recipientType, "staff"),
          eq(notificationsTable.recipientId, req.session.staffId!),
          isNull(notificationsTable.readAt),
        ),
      );
    res.json({ ok: true });
  },
);

// ─────────────────── Admin: directory for recipient picker ──────────────────

router.get(
  "/admin/notifications/recipients",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const type = String(req.query.type ?? "") as RecipientType;
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: "Invalid type" });
      return;
    }
    switch (type) {
      case "user": {
        const rows = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
          })
          .from(usersTable)
          .orderBy(usersTable.name)
          .limit(1000);
        res.json(rows);
        return;
      }
      case "partner": {
        const rows = await db
          .select({
            id: partnersTable.id,
            name: partnersTable.name,
            email: partnersTable.email,
          })
          .from(partnersTable)
          .where(inArray(partnersTable.kind, ["gym", "both"]))
          .orderBy(partnersTable.name)
          .limit(1000);
        res.json(rows);
        return;
      }
      case "vendor": {
        const rows = await db
          .select({
            id: partnersTable.id,
            name: partnersTable.name,
            email: partnersTable.email,
          })
          .from(partnersTable)
          .where(inArray(partnersTable.kind, ["vendor", "both"]))
          .orderBy(partnersTable.name)
          .limit(1000);
        res.json(rows);
        return;
      }
      case "admin": {
        const rows = await db
          .select({
            id: adminsTable.id,
            name: adminsTable.name,
            email: adminsTable.email,
          })
          .from(adminsTable)
          .orderBy(adminsTable.name)
          .limit(1000);
        res.json(rows);
        return;
      }
    }
  },
);

export default router;
