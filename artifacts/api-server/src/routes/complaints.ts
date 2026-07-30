import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  adminsTable,
  complaintsTable,
  db,
  gymsTable,
  notificationsTable,
  usersTable,
} from "@workspace/db";
import {
  AddComplaintFollowUpBody,
  AddComplaintFollowUpResponse,
  CreateComplaintBody,
  CreateComplaintResponse,
  ListMyComplaintsResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { requireAdmin } from "../lib/adminAuth";
import { notifyMemberOfComplaintUpdate } from "../lib/complaintMemberNotify";

const router: IRouter = Router();

const COMPLAINT_STATUSES = ["open", "in_progress", "resolved"] as const;

// Simple per-user throttle: at most 3 new complaints per 15 minutes. Keeps a
// stuck finger or a script from flooding every admin's notification feed.
const CREATE_LIMIT = 3;
const CREATE_WINDOW_MS = 15 * 60 * 1000;
const recentCreates = new Map<number, number[]>();

function allowCreate(userId: number): boolean {
  const now = Date.now();
  const times = (recentCreates.get(userId) ?? []).filter(
    (t) => now - t < CREATE_WINDOW_MS,
  );
  if (times.length >= CREATE_LIMIT) {
    recentCreates.set(userId, times);
    return false;
  }
  times.push(now);
  recentCreates.set(userId, times);
  return true;
}

function toApi(row: typeof complaintsTable.$inferSelect) {
  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    status: row.status as (typeof COMPLAINT_STATUSES)[number],
    gymName: row.gymName,
    response: row.response,
    followUps: (row.followUps ?? []).map((f) => ({
      message: f.message,
      reopened: f.reopened,
      at: f.at,
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

// Fan the new complaint out to every admin and (when a branch is named) the
// partner who owns that gym — fire-and-forget so ticket creation never fails
// on a notification hiccup.
async function notifyComplaint(
  complaint: typeof complaintsTable.$inferSelect,
  kind: "new" | "follow_up" | "reopened" = "new",
): Promise<void> {
  try {
    const title =
      kind === "reopened"
        ? "Complaint reopened by member"
        : kind === "follow_up"
          ? "Member replied on a complaint"
          : "New member complaint";
    const body = `${complaint.memberName || "A member"}: ${complaint.subject}${
      complaint.gymName ? ` (${complaint.gymName})` : ""
    }`;
    const batchId = randomUUID();
    const admins = await db.select({ id: adminsTable.id }).from(adminsTable);
    const rows = admins.map((a) => ({
      recipientType: "admin",
      recipientId: a.id,
      title,
      body,
      link: "/admin/complaints",
      batchId,
    }));
    if (complaint.gymId) {
      const [gym] = await db
        .select({ ownerPartnerId: gymsTable.ownerPartnerId })
        .from(gymsTable)
        .where(eq(gymsTable.id, complaint.gymId));
      if (gym?.ownerPartnerId) {
        rows.push({
          recipientType: "partner",
          recipientId: gym.ownerPartnerId,
          title,
          body,
          link: "/partner/complaints",
          batchId,
        });
      }
    }
    if (rows.length > 0) await db.insert(notificationsTable).values(rows);
  } catch (err) {
    console.error("complaint notification failed", err);
  }
}

// Raise a complaint ticket.
router.post(
  "/complaints",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    if (!allowCreate(req.userId!)) {
      res.status(429).json({
        error:
          "You've raised a few complaints just now — please wait a little while before raising another.",
      });
      return;
    }
    const parsed = CreateComplaintBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error:
          "Please add a short subject and describe the problem (at least 10 characters).",
      });
      return;
    }
    const body = parsed.data;
    const [user] = await db
      .select({ name: usersTable.name, mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));

    let gymId: number | null = null;
    let gymName = "";
    if (body.gymId) {
      const [gym] = await db
        .select({ id: gymsTable.id, name: gymsTable.name })
        .from(gymsTable)
        .where(eq(gymsTable.id, body.gymId));
      if (gym) {
        gymId = gym.id;
        gymName = gym.name;
      }
    }

    const [created] = await db
      .insert(complaintsTable)
      .values({
        userId: req.userId!,
        memberName: user?.name ?? "",
        mobile: user?.mobile ?? "",
        gymId,
        gymName,
        subject: body.subject.trim(),
        message: body.message.trim(),
      })
      .returning();
    void notifyComplaint(created);
    res.json(CreateComplaintResponse.parse(toApi(created)));
  },
);

// The caller's complaints, newest first.
router.get(
  "/complaints/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(complaintsTable)
      .where(eq(complaintsTable.userId, req.userId!))
      .orderBy(desc(complaintsTable.createdAt));
    res.json(ListMyComplaintsResponse.parse(rows.map(toApi)));
  },
);

// Member follow-up on their own ticket: add a message to the thread and/or
// reopen a resolved complaint ("This isn't fixed"). Staff get the same fan-out
// as a new complaint so the reply doesn't go unnoticed.
router.post(
  "/complaints/:id/follow-up",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid complaint id" });
      return;
    }
    const parsed = AddComplaintFollowUpBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid follow-up" });
      return;
    }
    const message = (parsed.data.message ?? "").trim();
    const wantsReopen = parsed.data.reopen === true;
    if (!message && !wantsReopen) {
      res
        .status(400)
        .json({ error: "Write a short message or choose to reopen the ticket." });
      return;
    }
    if (!allowCreate(req.userId!)) {
      res.status(429).json({
        error:
          "You've sent a few updates just now — please wait a little while before sending another.",
      });
      return;
    }
    const [row] = await db
      .select()
      .from(complaintsTable)
      .where(eq(complaintsTable.id, id));
    // Only the ticket's owner may follow up.
    if (!row || row.userId !== req.userId!) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }
    // Reopen only makes sense on a resolved ticket; a follow-up message is
    // fine at any status.
    const reopened = wantsReopen && row.status === "resolved";
    if (wantsReopen && row.status !== "resolved") {
      res.status(400).json({ error: "Only a resolved complaint can be reopened." });
      return;
    }
    const followUps = [
      ...(row.followUps ?? []),
      { message, reopened, at: new Date().toISOString() },
    ];
    const [updated] = await db
      .update(complaintsTable)
      .set({
        followUps,
        ...(reopened ? { status: "open" } : {}),
        updatedAt: new Date(),
      })
      .where(eq(complaintsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }
    void notifyComplaint(updated, reopened ? "reopened" : "follow_up");
    res.json(AddComplaintFollowUpResponse.parse(toApi(updated)));
  },
);

// ─── Admin portal ───

router.get(
  "/admin/complaints",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(complaintsTable)
      .orderBy(desc(complaintsTable.createdAt));
    res.json(rows);
  },
);

router.patch(
  "/admin/complaints/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid complaint id" });
      return;
    }
    const { status, response } = req.body ?? {};
    const patch: Partial<typeof complaintsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (status !== undefined) {
      if (!COMPLAINT_STATUSES.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      patch.status = status;
    }
    if (response !== undefined) {
      if (typeof response !== "string" || response.length > 2000) {
        res.status(400).json({ error: "Invalid response" });
        return;
      }
      patch.response = response.trim();
    }
    // Read the row first so we only ping the member on an actual change
    // (new reply text or a fresh resolve), not on every re-save.
    const [before] = await db
      .select()
      .from(complaintsTable)
      .where(eq(complaintsTable.id, id));
    if (!before) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }
    const [updated] = await db
      .update(complaintsTable)
      .set(patch)
      .where(eq(complaintsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }
    void notifyMemberOfComplaintUpdate(before, updated);
    res.json(updated);
  },
);

export default router;
