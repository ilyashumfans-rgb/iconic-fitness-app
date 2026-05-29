import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  ticketsTable,
  ticketCommentsTable,
  notificationsTable,
  usersTable,
  partnersTable,
  staffTable,
  adminsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { requirePartner } from "../lib/partnerAuth";
import { requireStaff } from "../lib/staffAuth";
import { requireUser } from "../lib/currentUser";

const router: IRouter = Router();

// ───────────────────────────── Domain constants ─────────────────────────────

const ROLES = ["user", "partner", "staff", "admin"] as const;
type Role = (typeof ROLES)[number];

const CATEGORIES = [
  "general",
  "billing",
  "technical",
  "account",
  "gym",
  "booking",
  "other",
] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

type Priority = (typeof PRIORITIES)[number];
type Status = (typeof STATUSES)[number];

type Actor = { role: Role; id: number };

// Map a ticket role to the notification recipientType + deep-link prefix for
// that role's portal.
function notifyLinkFor(role: Role, ticketId: number): string {
  switch (role) {
    case "user":
      return `/support?ticket=${ticketId}`;
    case "partner":
      return `/partner/tickets?ticket=${ticketId}`;
    case "staff":
      return `/staff/tickets?ticket=${ticketId}`;
    case "admin":
      return `/admin/tickets?ticket=${ticketId}`;
  }
}

async function notify(opts: {
  role: Role;
  id: number;
  title: string;
  body: string;
  ticketId: number;
}): Promise<void> {
  await db.insert(notificationsTable).values({
    recipientType: opts.role,
    recipientId: opts.id,
    title: opts.title,
    body: opts.body,
    link: notifyLinkFor(opts.role, opts.ticketId),
    batchId: randomUUID(),
  });
}

async function notifyAllAdmins(opts: {
  title: string;
  body: string;
  ticketId: number;
}): Promise<void> {
  const admins = await db.select({ id: adminsTable.id }).from(adminsTable);
  if (admins.length === 0) return;
  const batchId = randomUUID();
  const link = notifyLinkFor("admin", opts.ticketId);
  await db.insert(notificationsTable).values(
    admins.map((a) => ({
      recipientType: "admin",
      recipientId: a.id,
      title: opts.title,
      body: opts.body,
      link,
      batchId,
    })),
  );
}

// ─────────────────────────── Name resolution ────────────────────────────────

type IdName = { id: number; name: string };

async function resolveNames(
  refs: { role: Role; id: number }[],
): Promise<Map<string, string>> {
  const byRole: Record<Role, Set<number>> = {
    user: new Set(),
    partner: new Set(),
    staff: new Set(),
    admin: new Set(),
  };
  for (const r of refs) byRole[r.role].add(r.id);

  const out = new Map<string, string>();
  const collect = (role: Role, rows: IdName[]) => {
    for (const row of rows) out.set(`${role}:${row.id}`, row.name);
  };

  if (byRole.user.size) {
    const rows = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, [...byRole.user]));
    collect("user", rows);
  }
  if (byRole.partner.size) {
    const rows = await db
      .select({ id: partnersTable.id, name: partnersTable.name })
      .from(partnersTable)
      .where(inArray(partnersTable.id, [...byRole.partner]));
    collect("partner", rows);
  }
  if (byRole.staff.size) {
    const rows = await db
      .select({ id: staffTable.id, name: staffTable.name })
      .from(staffTable)
      .where(inArray(staffTable.id, [...byRole.staff]));
    collect("staff", rows);
  }
  if (byRole.admin.size) {
    const rows = await db
      .select({ id: adminsTable.id, name: adminsTable.name })
      .from(adminsTable)
      .where(inArray(adminsTable.id, [...byRole.admin]));
    collect("admin", rows);
  }
  return out;
}

type TicketRow = typeof ticketsTable.$inferSelect;

function shapeTicket(t: TicketRow, names: Map<string, string>) {
  return {
    id: t.id,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    requesterRole: t.requesterRole as Role,
    requesterId: t.requesterId,
    requesterName: names.get(`${t.requesterRole}:${t.requesterId}`) ?? "Unknown",
    assigneeRole: (t.assigneeRole ?? null) as Role | null,
    assigneeId: t.assigneeId ?? null,
    assigneeName:
      t.assigneeRole && t.assigneeId != null
        ? (names.get(`${t.assigneeRole}:${t.assigneeId}`) ?? "Unknown")
        : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
  };
}

async function shapeTickets(rows: TicketRow[]) {
  const refs: { role: Role; id: number }[] = [];
  for (const t of rows) {
    refs.push({ role: t.requesterRole as Role, id: t.requesterId });
    if (t.assigneeRole && t.assigneeId != null) {
      refs.push({ role: t.assigneeRole as Role, id: t.assigneeId });
    }
  }
  const names = await resolveNames(refs);
  return rows.map((t) => shapeTicket(t, names));
}

function sameActor(a: Actor, role: string | null, id: number | null): boolean {
  return role === a.role && id != null && id === a.id;
}

// Returns true if the actor may view / participate in the ticket. Admins can
// access any ticket; everyone else must be the requester or the assignee.
function canAccess(actor: Actor, t: TicketRow): boolean {
  if (actor.role === "admin") return true;
  return (
    sameActor(actor, t.requesterRole, t.requesterId) ||
    sameActor(actor, t.assigneeRole ?? null, t.assigneeId ?? null)
  );
}

// ─────────────────────────── Shared operations ──────────────────────────────

async function createTicket(actor: Actor, body: Record<string, unknown>) {
  const subject = String(body.subject ?? "").trim();
  const description = String(body.description ?? "").trim();
  let category = String(body.category ?? "general").trim();
  let priority = String(body.priority ?? "medium").trim();

  if (!subject || !description) {
    return { error: "Subject and description are required", code: 400 as const };
  }
  if (subject.length > 200) {
    return { error: "Subject must be 200 chars or less", code: 400 as const };
  }
  if (description.length > 5000) {
    return {
      error: "Description must be 5000 chars or less",
      code: 400 as const,
    };
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) category = "general";
  if (!(PRIORITIES as readonly string[]).includes(priority)) priority = "medium";

  const [row] = await db
    .insert(ticketsTable)
    .values({
      subject,
      description,
      category,
      priority,
      status: "open",
      requesterRole: actor.role,
      requesterId: actor.id,
    })
    .returning();

  await notifyAllAdmins({
    title: "New support ticket",
    body: `${subject} — raised by ${actor.role}`,
    ticketId: row.id,
  });

  const [shaped] = await shapeTickets([row]);
  return { ticket: shaped };
}

async function listRaised(actor: Actor) {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.requesterRole, actor.role),
        eq(ticketsTable.requesterId, actor.id),
      ),
    )
    .orderBy(desc(ticketsTable.updatedAt));
  return shapeTickets(rows);
}

async function listAssigned(actor: Actor) {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.assigneeRole, actor.role),
        eq(ticketsTable.assigneeId, actor.id),
      ),
    )
    .orderBy(desc(ticketsTable.updatedAt));
  return shapeTickets(rows);
}

async function getTicketDetail(actor: Actor, ticketId: number) {
  const [row] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId));
  if (!row) return { error: "Ticket not found", code: 404 as const };
  if (!canAccess(actor, row)) {
    return { error: "Forbidden", code: 403 as const };
  }
  const comments = await db
    .select()
    .from(ticketCommentsTable)
    .where(eq(ticketCommentsTable.ticketId, ticketId))
    .orderBy(ticketCommentsTable.createdAt);

  const refs: { role: Role; id: number }[] = [
    { role: row.requesterRole as Role, id: row.requesterId },
  ];
  if (row.assigneeRole && row.assigneeId != null) {
    refs.push({ role: row.assigneeRole as Role, id: row.assigneeId });
  }
  for (const c of comments)
    refs.push({ role: c.authorRole as Role, id: c.authorId });
  const names = await resolveNames(refs);

  return {
    ticket: shapeTicket(row, names),
    comments: comments.map((c) => ({
      id: c.id,
      authorRole: c.authorRole as Role,
      authorId: c.authorId,
      authorName: names.get(`${c.authorRole}:${c.authorId}`) ?? "Unknown",
      body: c.body,
      createdAt: c.createdAt,
    })),
  };
}

// Notify the other participants of a ticket (requester + assignee), excluding
// the actor who triggered the event.
async function notifyParticipants(
  t: TicketRow,
  actor: Actor,
  title: string,
  body: string,
): Promise<void> {
  const targets: { role: Role; id: number }[] = [];
  const add = (role: string | null, id: number | null) => {
    if (!role || id == null) return;
    if (role === actor.role && id === actor.id) return;
    if (targets.some((x) => x.role === role && x.id === id)) return;
    targets.push({ role: role as Role, id });
  };
  add(t.requesterRole, t.requesterId);
  add(t.assigneeRole ?? null, t.assigneeId ?? null);
  await Promise.all(
    targets.map((x) =>
      notify({ role: x.role, id: x.id, title, body, ticketId: t.id }),
    ),
  );
}

async function addComment(actor: Actor, ticketId: number, bodyText: string) {
  const text = bodyText.trim();
  if (!text) return { error: "Comment cannot be empty", code: 400 as const };
  if (text.length > 5000) {
    return { error: "Comment must be 5000 chars or less", code: 400 as const };
  }
  const [row] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId));
  if (!row) return { error: "Ticket not found", code: 404 as const };
  if (!canAccess(actor, row)) return { error: "Forbidden", code: 403 as const };

  const [comment] = await db
    .insert(ticketCommentsTable)
    .values({
      ticketId,
      authorRole: actor.role,
      authorId: actor.id,
      body: text,
    })
    .returning();
  await db
    .update(ticketsTable)
    .set({ updatedAt: new Date() })
    .where(eq(ticketsTable.id, ticketId));

  await notifyParticipants(
    row,
    actor,
    "New reply on ticket",
    `${row.subject}: ${text.slice(0, 120)}`,
  );

  return { comment: { id: comment.id } };
}

function timestampsForStatus(status: Status): Partial<TicketRow> {
  const now = new Date();
  const patch: Partial<TicketRow> = { status, updatedAt: now };
  if (status === "resolved") patch.resolvedAt = now;
  if (status === "closed") patch.closedAt = now;
  return patch;
}

async function changeStatus(actor: Actor, ticketId: number, status: string) {
  if (!(STATUSES as readonly string[]).includes(status)) {
    return { error: "Invalid status", code: 400 as const };
  }
  const [row] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId));
  if (!row) return { error: "Ticket not found", code: 404 as const };
  // Admins can change any ticket's status; otherwise only the assignee may.
  const isAssignee = sameActor(
    actor,
    row.assigneeRole ?? null,
    row.assigneeId ?? null,
  );
  if (actor.role !== "admin" && !isAssignee) {
    return { error: "Forbidden", code: 403 as const };
  }

  await db
    .update(ticketsTable)
    .set(timestampsForStatus(status as Status))
    .where(eq(ticketsTable.id, ticketId));

  await notifyParticipants(
    row,
    actor,
    "Ticket status updated",
    `${row.subject} is now ${status.replace("_", " ")}`,
  );

  return { ok: true };
}

async function changePriority(ticketId: number, priority: string) {
  if (!(PRIORITIES as readonly string[]).includes(priority)) {
    return { error: "Invalid priority", code: 400 as const };
  }
  const [row] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId));
  if (!row) return { error: "Ticket not found", code: 404 as const };
  await db
    .update(ticketsTable)
    .set({ priority: priority as Priority, updatedAt: new Date() })
    .where(eq(ticketsTable.id, ticketId));
  return { ok: true };
}

async function assigneeExists(role: Role, id: number): Promise<boolean> {
  switch (role) {
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
        .where(eq(partnersTable.id, id))
        .limit(1);
      return r.length > 0;
    }
    case "staff": {
      const r = await db
        .select({ id: staffTable.id })
        .from(staffTable)
        .where(eq(staffTable.id, id))
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

async function assignTicket(
  actor: Actor,
  ticketId: number,
  assigneeRoleRaw: unknown,
  assigneeIdRaw: unknown,
) {
  const [row] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId));
  if (!row) return { error: "Ticket not found", code: 404 as const };

  // Unassign when role is null/empty.
  if (
    assigneeRoleRaw === null ||
    assigneeRoleRaw === undefined ||
    assigneeRoleRaw === ""
  ) {
    await db
      .update(ticketsTable)
      .set({ assigneeRole: null, assigneeId: null, updatedAt: new Date() })
      .where(eq(ticketsTable.id, ticketId));
    return { ok: true };
  }

  const role = String(assigneeRoleRaw) as Role;
  // Members are not valid assignees — tickets are assigned to staff/partner/admin.
  if (!["staff", "partner", "admin"].includes(role)) {
    return { error: "Invalid assignee role", code: 400 as const };
  }
  const id = Number(assigneeIdRaw);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid assignee id", code: 400 as const };
  }
  if (!(await assigneeExists(role, id))) {
    return { error: `No ${role} with id ${id}`, code: 404 as const };
  }

  await db
    .update(ticketsTable)
    .set({ assigneeRole: role, assigneeId: id, updatedAt: new Date() })
    .where(eq(ticketsTable.id, ticketId));

  // Notify the new assignee (unless they assigned the ticket to themselves).
  if (!(role === actor.role && id === actor.id)) {
    await notify({
      role,
      id,
      title: "Ticket assigned to you",
      body: row.subject,
      ticketId,
    });
  }
  return { ok: true };
}

// ───────────────────────────── Route helpers ────────────────────────────────

function sendResult(res: Response, result: { error?: string; code?: number }) {
  if (result.error) {
    res.status(result.code ?? 400).json({ error: result.error });
    return true;
  }
  return false;
}

// Resolve the partner actor id. Team members act on behalf of the parent
// partner account, matching how partner notifications are addressed.
function partnerActor(req: Request): Actor {
  return { role: "partner", id: req.session.partnerId! };
}

// ───────────────────────────── Member routes ────────────────────────────────

router.post(
  "/tickets",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const result = await createTicket(
      { role: "user", id: req.userId! },
      (req.body ?? {}) as Record<string, unknown>,
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.ticket);
  },
);

router.get(
  "/tickets/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    res.json(await listRaised({ role: "user", id: req.userId! }));
  },
);

router.get(
  "/tickets/:id",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const result = await getTicketDetail(
      { role: "user", id: req.userId! },
      Number(req.params.id),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

router.post(
  "/tickets/:id/comments",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const result = await addComment(
      { role: "user", id: req.userId! },
      Number(req.params.id),
      String((req.body ?? {}).body ?? ""),
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.comment);
  },
);

// ───────────────────────────── Staff routes ─────────────────────────────────

router.post(
  "/staff/tickets",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    const result = await createTicket(
      { role: "staff", id: req.session.staffId! },
      (req.body ?? {}) as Record<string, unknown>,
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.ticket);
  },
);

router.get(
  "/staff/tickets/mine",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    res.json(await listRaised({ role: "staff", id: req.session.staffId! }));
  },
);

router.get(
  "/staff/tickets/assigned",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    res.json(await listAssigned({ role: "staff", id: req.session.staffId! }));
  },
);

router.get(
  "/staff/tickets/:id",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    const result = await getTicketDetail(
      { role: "staff", id: req.session.staffId! },
      Number(req.params.id),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

router.post(
  "/staff/tickets/:id/comments",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    const result = await addComment(
      { role: "staff", id: req.session.staffId! },
      Number(req.params.id),
      String((req.body ?? {}).body ?? ""),
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.comment);
  },
);

router.patch(
  "/staff/tickets/:id/status",
  requireStaff,
  async (req: Request, res: Response): Promise<void> => {
    const result = await changeStatus(
      { role: "staff", id: req.session.staffId! },
      Number(req.params.id),
      String((req.body ?? {}).status ?? ""),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

// ──────────────────────────── Partner routes ────────────────────────────────

router.post(
  "/partner/tickets",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const result = await createTicket(
      partnerActor(req),
      (req.body ?? {}) as Record<string, unknown>,
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.ticket);
  },
);

router.get(
  "/partner/tickets/mine",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    res.json(await listRaised(partnerActor(req)));
  },
);

router.get(
  "/partner/tickets/assigned",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    res.json(await listAssigned(partnerActor(req)));
  },
);

router.get(
  "/partner/tickets/:id",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const result = await getTicketDetail(
      partnerActor(req),
      Number(req.params.id),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

router.post(
  "/partner/tickets/:id/comments",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const result = await addComment(
      partnerActor(req),
      Number(req.params.id),
      String((req.body ?? {}).body ?? ""),
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.comment);
  },
);

router.patch(
  "/partner/tickets/:id/status",
  requirePartner,
  async (req: Request, res: Response): Promise<void> => {
    const result = await changeStatus(
      partnerActor(req),
      Number(req.params.id),
      String((req.body ?? {}).status ?? ""),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

// ───────────────────────────── Admin routes ─────────────────────────────────

const adminActor = (req: Request): Actor => ({
  role: "admin",
  id: req.session.adminId!,
});

router.get(
  "/admin/tickets",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const conds = [];
    const status = String(req.query.status ?? "");
    const priority = String(req.query.priority ?? "");
    const assignee = String(req.query.assignee ?? "");
    if ((STATUSES as readonly string[]).includes(status)) {
      conds.push(eq(ticketsTable.status, status));
    }
    if ((PRIORITIES as readonly string[]).includes(priority)) {
      conds.push(eq(ticketsTable.priority, priority));
    }
    let rows = await db
      .select()
      .from(ticketsTable)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(ticketsTable.updatedAt));

    // Assignee filter applied in memory (handles "unassigned" and role:id).
    if (assignee === "unassigned") {
      rows = rows.filter((r) => r.assigneeId == null);
    } else if (assignee.includes(":")) {
      const [r, i] = assignee.split(":");
      rows = rows.filter(
        (row) => row.assigneeRole === r && row.assigneeId === Number(i),
      );
    }
    res.json(await shapeTickets(rows));
  },
);

router.get(
  "/admin/tickets/assignees",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const [staff, partners, admins] = await Promise.all([
      db
        .select({ id: staffTable.id, name: staffTable.name, email: staffTable.email })
        .from(staffTable)
        .where(eq(staffTable.isActive, true))
        .orderBy(staffTable.name),
      db
        .select({
          id: partnersTable.id,
          name: partnersTable.name,
          email: partnersTable.email,
        })
        .from(partnersTable)
        .orderBy(partnersTable.name),
      db
        .select({ id: adminsTable.id, name: adminsTable.name, email: adminsTable.email })
        .from(adminsTable)
        .orderBy(adminsTable.name),
    ]);
    res.json({ staff, partners, admins });
  },
);

router.get(
  "/admin/tickets/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const result = await getTicketDetail(
      adminActor(req),
      Number(req.params.id),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

router.post(
  "/admin/tickets",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const result = await createTicket(
      adminActor(req),
      (req.body ?? {}) as Record<string, unknown>,
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.ticket);
  },
);

router.post(
  "/admin/tickets/:id/comments",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const result = await addComment(
      adminActor(req),
      Number(req.params.id),
      String((req.body ?? {}).body ?? ""),
    );
    if (sendResult(res, result)) return;
    res.status(201).json(result.comment);
  },
);

router.patch(
  "/admin/tickets/:id/status",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const result = await changeStatus(
      adminActor(req),
      Number(req.params.id),
      String((req.body ?? {}).status ?? ""),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

router.patch(
  "/admin/tickets/:id/priority",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const result = await changePriority(
      Number(req.params.id),
      String((req.body ?? {}).priority ?? ""),
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

router.patch(
  "/admin/tickets/:id/assign",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const result = await assignTicket(
      adminActor(req),
      Number(req.params.id),
      b.assigneeRole,
      b.assigneeId,
    );
    if (sendResult(res, result)) return;
    res.json(result);
  },
);

export default router;
