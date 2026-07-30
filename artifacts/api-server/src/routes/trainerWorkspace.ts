import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  db,
  leadsTable,
  memberAssignedExercisesTable,
  memberBmiRecordsTable,
  memberDietPlansTable,
  notificationsTable,
  ptProgramsTable,
  trainerBookingsTable,
  usersTable,
} from "@workspace/db";
import { requireStaffPermission, loadStaffOrUnauthorized } from "../lib/staffAuth";
import { avatarsByPhone, avatarsByUserId, pickAvatar } from "../lib/memberAvatars";
import { requireUser } from "../lib/currentUser";
import { TRAINER_ENQUIRY_SOURCE } from "../lib/trainerEnquiryLeads";
import { normalizeMobile } from "../lib/yoactiv";
import { isUniqueViolation } from "./ptDashboard";

/**
 * Trainer workspace (mobile app studio side). Trainers see member PT
 * requests, accept them (first accept wins via the pt_programs unique
 * index), start training (unlocks the 2 free kick-starter sessions), log
 * BMI records and diet plans for their members, and track ongoing vs
 * completed programs on a month-filterable dashboard.
 */
const router: IRouter = Router();

type RefType = "booking" | "enquiry";

function parseRef(body: unknown): { refType: RefType; refId: number } | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const refType = b.refType === "booking" || b.refType === "enquiry" ? b.refType : null;
  const refId = Number(b.refId);
  if (!refType || !Number.isInteger(refId) || refId <= 0) return null;
  return { refType, refId };
}

/** Best-effort link from a member phone to an app user account. */
async function resolveUserIdByPhone(phone: string): Promise<number | null> {
  const norm = normalizeMobile(phone);
  if (!norm) return null;
  // usersTable.mobile is free-format; compare on the exact last 10 digits
  // (strips country-code variants). Ambiguous matches link nobody — never
  // guess-attach records to the wrong account.
  const last10 = norm.slice(-10);
  if (last10.length < 10) return null;
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      sql`length(regexp_replace(${usersTable.mobile}, '[^0-9]', '', 'g')) >= 10 AND right(regexp_replace(${usersTable.mobile}, '[^0-9]', '', 'g'), 10) = ${last10}`,
    )
    .limit(2);
  if (rows.length !== 1) return null;
  return rows[0]!.id;
}

type RequestRow = {
  refType: RefType;
  refId: number;
  memberName: string;
  mobile: string;
  gymName: string;
  trainerName: string;
  packageName: string;
  preferredDate: string;
  createdAt: Date | null;
  paid: boolean;
};

/** All open PT requests (paid bookings + free enquiries), newest first. */
async function fetchOpenRequests(): Promise<RequestRow[]> {
  const bookings = await db
    .select()
    .from(trainerBookingsTable)
    .where(eq(trainerBookingsTable.status, "paid"))
    .orderBy(desc(trainerBookingsTable.createdAt))
    .limit(500);
  const enquiries = await db
    .select()
    .from(leadsTable)
    .where(
      and(
        eq(leadsTable.source, TRAINER_ENQUIRY_SOURCE),
        eq(leadsTable.kind, "general"),
        // Staff-cancelled requests must not be acceptable.
        ne(leadsTable.status, "cancelled"),
      ),
    )
    .orderBy(desc(leadsTable.createdAt))
    .limit(500);
  const rows: RequestRow[] = [
    ...bookings.map((b) => ({
      refType: "booking" as const,
      refId: b.id,
      memberName: b.memberName,
      mobile: b.mobile,
      gymName: b.gymName,
      trainerName: b.trainerName,
      packageName: b.packageName || b.serviceName,
      preferredDate: b.preferredDate,
      createdAt: b.createdAt,
      paid: true,
    })),
    ...enquiries.map((l) => ({
      refType: "enquiry" as const,
      refId: l.id,
      memberName: l.name,
      mobile: l.phone,
      gymName: l.gymName,
      // The app stashes the requested coach's name in className.
      trainerName: l.className,
      packageName: "PT session request",
      preferredDate: l.preferredDate,
      createdAt: l.createdAt,
      paid: false,
    })),
  ];
  rows.sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  );
  return rows;
}

// ── Requests inbox ──────────────────────────────────────────────────────────

router.get(
  "/staff/pt/requests",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const all = await fetchOpenRequests();
    const programs = await db.select().from(ptProgramsTable);
    const byRef = new Map(programs.map((p) => [`${p.refType}:${p.refId}`, p]));
    const pending: (RequestRow & { acceptedBy: string | null })[] = [];
    const mine: (RequestRow & { program: (typeof programs)[number] })[] = [];
    for (const r of all) {
      const prog = byRef.get(`${r.refType}:${r.refId}`);
      if (!prog) {
        pending.push({ ...r, acceptedBy: null });
      } else if (prog.staffId === me.id) {
        mine.push({ ...r, program: prog });
      }
      // Requests accepted by OTHER trainers disappear from this inbox —
      // only the accepting trainer works them.
    }
    // Member photo so the trainer can visually verify the person.
    const [byUser, byPhone] = await Promise.all([
      avatarsByUserId(mine.map((r) => r.program.userId)),
      avatarsByPhone([...pending, ...mine].map((r) => r.mobile)),
    ]);
    res.json({
      pending: pending.map((r) => ({
        ...r,
        avatarUrl: pickAvatar(byUser, byPhone, null, r.mobile),
      })),
      mine: mine.map((r) => ({
        ...r,
        avatarUrl: pickAvatar(byUser, byPhone, r.program.userId, r.mobile),
      })),
    });
  },
);

router.post(
  "/staff/pt/requests/accept",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const ref = parseRef(req.body);
    if (!ref) {
      res.status(400).json({ error: "refType and refId required" });
      return;
    }
    // Verify the request actually exists and capture member details.
    let member: {
      name: string;
      phone: string;
      gymId: number | null;
      gymName: string;
      userId: number | null;
      preferredDate: string;
      preferredTime: string;
    } | null = null;
    if (ref.refType === "booking") {
      const [b] = await db
        .select()
        .from(trainerBookingsTable)
        .where(
          and(
            eq(trainerBookingsTable.id, ref.refId),
            // Only paid bookings are real PT enrolments.
            eq(trainerBookingsTable.status, "paid"),
          ),
        );
      if (b) {
        member = {
          name: b.memberName,
          phone: b.mobile,
          gymId: b.gymId,
          gymName: b.gymName,
          userId: b.userId ?? null,
          preferredDate: b.preferredDate,
          preferredTime: "",
        };
      }
    } else {
      const [l] = await db
        .select()
        .from(leadsTable)
        .where(
          and(
            eq(leadsTable.id, ref.refId),
            eq(leadsTable.source, TRAINER_ENQUIRY_SOURCE),
            ne(leadsTable.status, "cancelled"),
          ),
        );
      if (l) {
        member = {
          name: l.name,
          phone: l.phone,
          gymId: l.gymId,
          gymName: l.gymName,
          userId: null,
          preferredDate: l.preferredDate,
          preferredTime: l.preferredTime,
        };
      }
    }
    if (!member) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    const userId = member.userId ?? (await resolveUserIdByPhone(member.phone));
    try {
      const [program] = await db
        .insert(ptProgramsTable)
        .values({
          refType: ref.refType,
          refId: ref.refId,
          staffId: me.id,
          staffName: me.name,
          memberName: member.name,
          memberPhone: member.phone,
          userId,
          gymId: member.gymId,
          gymName: member.gymName,
        })
        .returning();
      // Tell the member their trainer is confirmed (in-app notification —
      // the app's poller turns it into a local push). Never block the
      // accept on this: notification failure must not undo the program.
      if (userId !== null) {
        const when = member.preferredDate
          ? ` Your session is planned for ${member.preferredDate}${member.preferredTime ? ` at ${member.preferredTime}` : ""}.`
          : "";
        try {
          await db.insert(notificationsTable).values({
            recipientType: "user",
            recipientId: userId,
            title: "Your trainer is confirmed! 💪",
            body: `${me.name} has accepted your kick-starter PT request${member.gymName ? ` at ${member.gymName}` : ""}.${when} Check your fitness journey on Home for next steps.`,
            batchId: randomUUID(),
          });
        } catch {
          // Best-effort only.
        }
      }
      res.status(201).json(program);
    } catch (e) {
      if (isUniqueViolation(e)) {
        res
          .status(409)
          .json({ error: "Another trainer already accepted this request" });
        return;
      }
      res.status(500).json({ error: "Failed to accept request" });
    }
  },
);

// ── Program lifecycle (owner-only, one-shot conditional updates) ────────────

router.post(
  "/staff/pt/programs/:id/start",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = Number(req.params.id);
    const [updated] = await db
      .update(ptProgramsTable)
      .set({ status: "ongoing", startedAt: new Date() })
      .where(
        and(
          eq(ptProgramsTable.id, id),
          eq(ptProgramsTable.staffId, me.id),
          eq(ptProgramsTable.status, "accepted"),
        ),
      )
      .returning();
    if (!updated) {
      res.status(409).json({
        error: "Only the trainer who accepted can start, and only once",
      });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/staff/pt/programs/:id/sessions/:n/done",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = Number(req.params.id);
    const n = Number(req.params.n);
    if (n !== 1 && n !== 2) {
      res.status(400).json({ error: "Session must be 1 or 2" });
      return;
    }
    const field = n === 1 ? ptProgramsTable.session1DoneAt : ptProgramsTable.session2DoneAt;
    const patch =
      n === 1 ? { session1DoneAt: new Date() } : { session2DoneAt: new Date() };
    const [updated] = await db
      .update(ptProgramsTable)
      .set(patch)
      .where(
        and(
          eq(ptProgramsTable.id, id),
          eq(ptProgramsTable.staffId, me.id),
          eq(ptProgramsTable.status, "ongoing"),
          sql`${field} IS NULL`,
        ),
      )
      .returning();
    if (!updated) {
      res.status(409).json({
        error: "Start training first — sessions can be marked once, by the accepting trainer",
      });
      return;
    }
    res.json(updated);
  },
);

router.post(
  "/staff/pt/programs/:id/complete",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = Number(req.params.id);
    const [updated] = await db
      .update(ptProgramsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(
        and(
          eq(ptProgramsTable.id, id),
          eq(ptProgramsTable.staffId, me.id),
          eq(ptProgramsTable.status, "ongoing"),
        ),
      )
      .returning();
    if (!updated) {
      res.status(409).json({ error: "Only your ongoing programs can be completed" });
      return;
    }
    res.json(updated);
  },
);

// ── Dashboard & members ─────────────────────────────────────────────────────

router.get(
  "/staff/pt/dashboard",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const month = typeof req.query.month === "string" ? req.query.month : "";
    let programs = await db
      .select()
      .from(ptProgramsTable)
      .where(eq(ptProgramsTable.staffId, me.id))
      .orderBy(desc(ptProgramsTable.acceptedAt));
    if (/^\d{4}-\d{2}$/.test(month)) {
      // Month filter on the accept date, rendered in IST (the studio's zone).
      programs = programs.filter((p) => {
        const ist = new Date(p.acceptedAt.getTime() + 5.5 * 3600 * 1000);
        const label = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
        return label === month;
      });
    }
    const [byUser, byPhone] = await Promise.all([
      avatarsByUserId(programs.map((p) => p.userId)),
      avatarsByPhone(programs.map((p) => p.memberPhone)),
    ]);
    res.json({
      counts: {
        accepted: programs.filter((p) => p.status === "accepted").length,
        ongoing: programs.filter((p) => p.status === "ongoing").length,
        completed: programs.filter((p) => p.status === "completed").length,
      },
      programs: programs.map((p) => ({
        ...p,
        avatarUrl: pickAvatar(byUser, byPhone, p.userId, p.memberPhone),
      })),
    });
  },
);

router.get(
  "/staff/pt/programs/:id",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = Number(req.params.id);
    const [program] = await db
      .select()
      .from(ptProgramsTable)
      .where(and(eq(ptProgramsTable.id, id), eq(ptProgramsTable.staffId, me.id)));
    if (!program) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [bmi, diets, exercises] = await Promise.all([
      db
        .select()
        .from(memberBmiRecordsTable)
        .where(eq(memberBmiRecordsTable.programId, id))
        .orderBy(desc(memberBmiRecordsTable.createdAt)),
      db
        .select()
        .from(memberDietPlansTable)
        .where(eq(memberDietPlansTable.programId, id))
        .orderBy(desc(memberDietPlansTable.createdAt)),
      db
        .select()
        .from(memberAssignedExercisesTable)
        .where(eq(memberAssignedExercisesTable.programId, id))
        .orderBy(desc(memberAssignedExercisesTable.createdAt)),
    ]);
    const [byUser, byPhone] = await Promise.all([
      avatarsByUserId([program.userId]),
      avatarsByPhone([program.memberPhone]),
    ]);
    res.json({
      program: {
        ...program,
        avatarUrl: pickAvatar(byUser, byPhone, program.userId, program.memberPhone),
      },
      bmi,
      diets,
      exercises,
    });
  },
);

// ── BMI records & diet plans ────────────────────────────────────────────────

router.post(
  "/staff/pt/bmi",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const programId = Number(b.programId);
    const heightCm = Number(b.heightCm);
    const weightKg = Number(b.weightKg);
    const note = typeof b.note === "string" ? b.note.trim() : "";
    if (!Number.isInteger(programId)) {
      res.status(400).json({ error: "programId required" });
      return;
    }
    const [program] = await db
      .select()
      .from(ptProgramsTable)
      .where(
        and(eq(ptProgramsTable.id, programId), eq(ptProgramsTable.staffId, me.id)),
      );
    if (!program) {
      res.status(404).json({ error: "Program not found" });
      return;
    }
    const validHeight = Number.isFinite(heightCm) && heightCm > 50 && heightCm < 260;
    const validWeight = Number.isFinite(weightKg) && weightKg > 20 && weightKg < 400;
    if (!validHeight || !validWeight) {
      res.status(400).json({ error: "Enter a valid height (cm) and weight (kg)" });
      return;
    }
    const bmi = Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
    const [row] = await db
      .insert(memberBmiRecordsTable)
      .values({
        programId,
        staffId: me.id,
        staffName: me.name,
        memberPhone: program.memberPhone,
        userId: program.userId,
        heightCm,
        weightKg,
        bmi,
        note,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.post(
  "/staff/pt/diet",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const programId = Number(b.programId);
    const title = typeof b.title === "string" ? b.title.trim() : "";
    const content = typeof b.content === "string" ? b.content.trim() : "";
    if (!Number.isInteger(programId)) {
      res.status(400).json({ error: "programId required" });
      return;
    }
    if (!content) {
      res.status(400).json({ error: "Diet plan text required" });
      return;
    }
    const [program] = await db
      .select()
      .from(ptProgramsTable)
      .where(
        and(eq(ptProgramsTable.id, programId), eq(ptProgramsTable.staffId, me.id)),
      );
    if (!program) {
      res.status(404).json({ error: "Program not found" });
      return;
    }
    const [row] = await db
      .insert(memberDietPlansTable)
      .values({
        programId,
        staffId: me.id,
        staffName: me.name,
        memberPhone: program.memberPhone,
        userId: program.userId,
        title: title || "Diet plan",
        content,
      })
      .returning();
    res.status(201).json(row);
  },
);

// ── Assigned exercises ──────────────────────────────────────────────────────

router.post(
  "/staff/pt/exercises",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const programId = Number(b.programId);
    const exerciseSlug =
      typeof b.exerciseSlug === "string" ? b.exerciseSlug.trim() : "";
    const exerciseName =
      typeof b.exerciseName === "string" ? b.exerciseName.trim() : "";
    const sets = typeof b.sets === "string" ? b.sets.trim() : "";
    const reps = typeof b.reps === "string" ? b.reps.trim() : "";
    const note = typeof b.note === "string" ? b.note.trim() : "";
    if (!Number.isInteger(programId)) {
      res.status(400).json({ error: "programId required" });
      return;
    }
    // Slugs come from the app's bundled exercise library; keep the format
    // strict so free text can't sneak in.
    if (!/^[a-z0-9-]{2,64}$/.test(exerciseSlug)) {
      res.status(400).json({ error: "Pick an exercise from the library" });
      return;
    }
    const [program] = await db
      .select()
      .from(ptProgramsTable)
      .where(
        and(eq(ptProgramsTable.id, programId), eq(ptProgramsTable.staffId, me.id)),
      );
    if (!program) {
      res.status(404).json({ error: "Program not found" });
      return;
    }
    const [row] = await db
      .insert(memberAssignedExercisesTable)
      .values({
        programId,
        staffId: me.id,
        staffName: me.name,
        memberPhone: program.memberPhone,
        userId: program.userId,
        exerciseSlug,
        exerciseName: exerciseName || exerciseSlug,
        sets,
        reps,
        note,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.delete(
  "/staff/pt/exercises/:id",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(memberAssignedExercisesTable)
      .where(
        and(
          eq(memberAssignedExercisesTable.id, id),
          // Only the trainer who assigned it can remove it.
          eq(memberAssignedExercisesTable.staffId, me.id),
        ),
      )
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  },
);

// ── Member side: my BMI records & diet plans from my trainer ────────────────

router.get(
  "/pt/records/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [user] = await db
      .select({ id: usersTable.id, mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const norm = normalizeMobile(user.mobile);
    const last10 = norm ? norm.slice(-10) : "";
    const phoneMatch = (
      table:
        | typeof memberBmiRecordsTable
        | typeof memberDietPlansTable
        | typeof memberAssignedExercisesTable,
    ) =>
      last10.length === 10
        ? sql`(${table.userId} = ${user.id} OR (${table.userId} IS NULL AND length(regexp_replace(${table.memberPhone}, '[^0-9]', '', 'g')) >= 10 AND right(regexp_replace(${table.memberPhone}, '[^0-9]', '', 'g'), 10) = ${last10}))`
        : sql`${table.userId} = ${user.id}`;
    const [bmi, diets, exercises] = await Promise.all([
      db
        .select()
        .from(memberBmiRecordsTable)
        .where(phoneMatch(memberBmiRecordsTable))
        .orderBy(desc(memberBmiRecordsTable.createdAt))
        .limit(100),
      db
        .select()
        .from(memberDietPlansTable)
        .where(phoneMatch(memberDietPlansTable))
        .orderBy(desc(memberDietPlansTable.createdAt))
        .limit(100),
      db
        .select()
        .from(memberAssignedExercisesTable)
        .where(phoneMatch(memberAssignedExercisesTable))
        .orderBy(desc(memberAssignedExercisesTable.createdAt))
        .limit(100),
    ]);
    // First-claim backfill: rows matched only by phone (userId NULL) are
    // permanently bound to this account, so a later account that happens to
    // share/recycle the same number can never see them. Best-effort — a
    // failed backfill must not fail the read.
    try {
      const claim = async (
        table:
          | typeof memberBmiRecordsTable
          | typeof memberDietPlansTable
          | typeof memberAssignedExercisesTable,
        ids: number[],
      ) => {
        if (ids.length === 0) return;
        await db
          .update(table)
          .set({ userId: user.id })
          .where(and(inArray(table.id, ids), sql`${table.userId} IS NULL`));
      };
      await Promise.all([
        claim(memberBmiRecordsTable, bmi.filter((r) => r.userId == null).map((r) => r.id)),
        claim(memberDietPlansTable, diets.filter((r) => r.userId == null).map((r) => r.id)),
        claim(
          memberAssignedExercisesTable,
          exercises.filter((r) => r.userId == null).map((r) => r.id),
        ),
      ]);
    } catch {
      // Best-effort only.
    }
    res.json({ bmi, diets, exercises });
  },
);

export default router;
