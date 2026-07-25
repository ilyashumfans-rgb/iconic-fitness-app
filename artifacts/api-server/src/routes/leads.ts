import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  adminsTable,
  db,
  gymsTable,
  leadsTable,
  notificationsTable,
  staffTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { resolveGymSchedule } from "../lib/resolveGymSchedule";
import { TRAINER_ENQUIRY_SOURCE } from "../lib/trainerEnquiryLeads";

const router: IRouter = Router();

const VALID_STATUS = new Set([
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);
const VALID_KIND = new Set(["class", "gym", "general", "membership"]);

// GX class booking rules: slots come from the branch's weekly timetable
// (Mon–Sat by default, but partners may customise days/times per branch),
// prebookable only 1 day ahead (today or tomorrow). This is a server-side guard
// against tampered or stale clients; the booking UI already constrains the
// choices. The "today" / "tomorrow" window is computed in India time so it does
// not drift with the server's UTC clock. When no branch is known we fall back to
// the legacy two fixed slots on weekdays.
const GX_SLOT_VALUES = new Set(["07:00", "19:00"]);
const GX_TIMEZONE = "Asia/Kolkata";

// Calendar date (YYYY-MM-DD) for `base` rendered in the gym's timezone.
function istDateString(base: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: GX_TIMEZONE }).format(
    base,
  );
}

// 1 = Mon … 7 = Sun for a calendar date, matching the schedule's dayOfWeek.
function isoDayOfWeek(preferredDate: string): number {
  const dow = new Date(`${preferredDate}T00:00:00Z`).getUTCDay(); // 0 = Sun
  return dow === 0 ? 7 : dow;
}

async function validateGxBooking(
  gymId: number | null,
  preferredDate: string,
  preferredTime: string,
): Promise<string | null> {
  const d = new Date(`${preferredDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return "Please choose a valid day for your class.";
  }
  const now = new Date();
  const todayIso = istDateString(now);
  const tomorrowIso = istDateString(new Date(now.getTime() + 24 * 3600 * 1000));
  if (preferredDate !== todayIso && preferredDate !== tomorrowIso) {
    return "GX classes can be prebooked only 1 day in advance.";
  }

  // Accept if the slot exists in this branch's weekly timetable.
  if (gymId) {
    const schedule = await resolveGymSchedule(gymId);
    const day = isoDayOfWeek(preferredDate);
    if (
      schedule.some((s) => s.dayOfWeek === day && s.startTime === preferredTime)
    ) {
      return null;
    }
  }

  // Legacy fallback: the two fixed one-hour slots on weekdays. Covers the case
  // where no branch is known, and keeps the existing enquiry dialog (which still
  // offers these fixed slots) working even if a branch later customises its
  // timetable away from them.
  if (GX_SLOT_VALUES.has(preferredTime)) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) return null;
  }

  return "That slot isn't available at this branch. Please pick an available slot.";
}

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

  // GX class bookings: slot must exist in the branch's weekly timetable and be
  // prebooked only 1 day ahead (falls back to legacy fixed slots if no branch).
  if (kind === "class") {
    const gxError = await validateGxBooking(gymId, preferredDate, preferredTime);
    if (gxError) {
      res.status(400).json({ error: gxError });
      return;
    }
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

  // PT / trial session requests: alert every backend account (admins, staff,
  // and the owning partner) so no request sits unseen. Fire-and-forget —
  // notification failure must never fail the member's request. The public
  // endpoint's `source` is client-controlled, so the fan-out is rate limited
  // per IP to prevent internal notification spam (the lead itself still saves).
  if (source === TRAINER_ENQUIRY_SOURCE && allowEnquiryNotify(req.ip ?? "")) {
    void notifyPtEnquiry({
      leadName: name,
      gymId,
      gymName,
      className,
      preferredDate,
      preferredTime,
      message,
    }).catch((err) =>
      req.log?.warn({ err, leadId: row.id }, "pt enquiry notify failed"),
    );
  }

  res.status(201).json({ id: row.id, ok: true });
});

// Per-IP throttle for the notification fan-out: max 5 fan-outs per 15 minutes.
const ENQUIRY_NOTIFY_WINDOW_MS = 15 * 60 * 1000;
const ENQUIRY_NOTIFY_MAX = 5;
const enquiryNotifyHits = new Map<string, number[]>();

function allowEnquiryNotify(ip: string): boolean {
  const now = Date.now();
  const hits = (enquiryNotifyHits.get(ip) ?? []).filter(
    (t) => now - t < ENQUIRY_NOTIFY_WINDOW_MS,
  );
  if (hits.length >= ENQUIRY_NOTIFY_MAX) {
    enquiryNotifyHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  enquiryNotifyHits.set(ip, hits);
  // Opportunistic cleanup so the map can't grow unbounded.
  if (enquiryNotifyHits.size > 5000) {
    for (const [k, v] of enquiryNotifyHits) {
      if (v.every((t) => now - t >= ENQUIRY_NOTIFY_WINDOW_MS)) {
        enquiryNotifyHits.delete(k);
      }
    }
  }
  return true;
}

// Insert one notification row per admin, active staff member, and the gym's
// owning partner for a new PT/trial session request.
async function notifyPtEnquiry(opts: {
  leadName: string;
  gymId: number | null;
  gymName: string;
  className: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
}): Promise<void> {
  const isTrial = opts.className === "Trial session";
  const title = isTrial ? "New trial session request" : "New PT session request";
  // Surface the member's preferred trainer (embedded in the lead message by
  // the app) so staff can triage straight from the notification feed.
  const preferredMatch = opts.message.match(/Preferred trainer: ([^.]+)\./);
  const preferredNote = preferredMatch
    ? ` Preferred trainer: ${preferredMatch[1].trim()}.`
    : "";
  const body = `${opts.leadName} requested ${
    isTrial ? "a kick-starter trial session" : `a PT session (${opts.className})`
  }${opts.gymName ? ` at ${opts.gymName}` : ""} on ${opts.preferredDate} ${opts.preferredTime}.${preferredNote}`;
  const batchId = randomUUID();

  const rows: (typeof notificationsTable.$inferInsert)[] = [];

  const admins = await db.select({ id: adminsTable.id }).from(adminsTable);
  for (const a of admins) {
    rows.push({
      recipientType: "admin",
      recipientId: a.id,
      title,
      body,
      link: "/admin/trainer-bookings",
      batchId,
    });
  }

  const staff = await db
    .select({ id: staffTable.id })
    .from(staffTable)
    .where(eq(staffTable.isActive, true));
  for (const s of staff) {
    rows.push({
      recipientType: "staff",
      recipientId: s.id,
      title,
      body,
      link: "/staff/leads",
      batchId,
    });
  }

  if (opts.gymId) {
    const [gym] = await db
      .select({ ownerPartnerId: gymsTable.ownerPartnerId })
      .from(gymsTable)
      .where(eq(gymsTable.id, opts.gymId));
    if (gym?.ownerPartnerId) {
      rows.push({
        recipientType: "partner",
        recipientId: gym.ownerPartnerId,
        title,
        body,
        link: "/partner/trainer-bookings",
        batchId,
      });
    }
  }

  if (rows.length > 0) {
    await db.insert(notificationsTable).values(rows);
  }
}

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
