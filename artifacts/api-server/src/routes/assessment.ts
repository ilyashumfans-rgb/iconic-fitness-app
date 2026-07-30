import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import {
  adminsTable,
  assessmentBookingsTable,
  db,
  memberBmiRecordsTable,
  notificationsTable,
  ptProgramsTable,
  usersTable,
} from "@workspace/db";
import {
  GetMyAssessmentResponse,
  BookAssessmentResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import {
  requireStaffPermission,
  loadStaffOrUnauthorized,
} from "../lib/staffAuth";
import { requireAdmin } from "../lib/adminAuth";
import { istToday } from "../lib/engagementPlan";
import { normalizeMobile } from "../lib/yoactiv";
import { avatarsByUserId } from "../lib/memberAvatars";

/**
 * Empty-stomach fitness assessment (Member Success Journey): after the
 * kick-starter trial request is accepted, members book an early-morning
 * slot for a BMI + measurements assessment (done before breakfast). Staff
 * (pt.manage) and GYMCO admins see the upcoming roster and record results —
 * recording creates a member_bmi_records row and completes the booking.
 * A lazy reminder notification fires the evening before (from the member's
 * notification-feed poll — same pattern as renewal reminders).
 */
const router: IRouter = Router();

/** Bookable early-morning slots (IST) — assessments must be pre-breakfast. */
export const ASSESSMENT_SLOT_TIMES = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
];

/** Current hour (0-23) in IST. */
function istHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
}

/** YYYY-MM-DD of the IST day `offset` days after `dateStr`. */
function addDays(dateStr: string, offset: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function fmtSlot(dateStr: string, time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const hour12 = h! % 12 === 0 ? 12 : h! % 12;
  const mer = h! >= 12 ? "PM" : "AM";
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${day}, ${hour12}:${String(m).padStart(2, "0")} ${mer}`;
}

/**
 * Trial acceptance = a trainer accepted the member's kick-starter PT request
 * (a pt_programs row exists for the user id or their phone).
 */
async function trialAccepted(
  userId: number,
): Promise<{ eligible: boolean; program: typeof ptProgramsTable.$inferSelect | null }> {
  const [user] = await db
    .select({ mobile: usersTable.mobile })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const mobile = normalizeMobile(user?.mobile ?? "") ?? "";
  const phoneMatch = mobile
    ? sql`right(regexp_replace(${ptProgramsTable.memberPhone}, '\\D', '', 'g'), 10) = ${mobile}`
    : sql`false`;
  const [program] = await db
    .select()
    .from(ptProgramsTable)
    .where(sql`${ptProgramsTable.userId} = ${userId} OR ${phoneMatch}`)
    .orderBy(desc(ptProgramsTable.acceptedAt))
    .limit(1);
  return { eligible: !!program, program: program ?? null };
}

/**
 * Lazy evening-before reminder: once it's 5pm IST the day before the slot
 * (or any time on the slot day itself, as a catch-up), flip reminder_sent_at
 * via a conditional UPDATE (race-safe) and insert the notification. Called
 * fire-and-forget from the member notification feed poll; never throws.
 */
export async function ensureAssessmentReminder(userId: number): Promise<void> {
  try {
    const [booking] = await db
      .select()
      .from(assessmentBookingsTable)
      .where(
        and(
          eq(assessmentBookingsTable.userId, userId),
          eq(assessmentBookingsTable.status, "booked"),
        ),
      );
    if (!booking || booking.reminderSentAt) return;
    const today = istToday();
    const evening = addDays(booking.slotDate, -1);
    const due =
      today > evening || (today === evening && istHour() >= 17);
    if (!due) return;
    const [won] = await db
      .update(assessmentBookingsTable)
      .set({ reminderSentAt: new Date() })
      .where(
        and(
          eq(assessmentBookingsTable.id, booking.id),
          isNull(assessmentBookingsTable.reminderSentAt),
        ),
      )
      .returning({ id: assessmentBookingsTable.id });
    if (!won) return;
    await db.insert(notificationsTable).values({
      recipientType: "user",
      recipientId: userId,
      title: "Fitness assessment tomorrow morning ⏰",
      body: `Your empty-stomach fitness assessment is at ${fmtSlot(booking.slotDate, booking.slotTime)}. Please come on an empty stomach — no food after midnight, water is fine. We'll record your BMI and measurements.`,
      batchId: randomUUID(),
    });
  } catch {
    // Best-effort — the next feed poll retries.
  }
}

function bookingJson(b: typeof assessmentBookingsTable.$inferSelect) {
  return {
    id: b.id,
    slotDate: b.slotDate,
    slotTime: b.slotTime,
    status: b.status as "booked" | "completed" | "cancelled",
    gymName: b.gymName,
    createdAt: b.createdAt.toISOString(),
  };
}

// ─── Member ──────────────────────────────────────────────────────────────────

router.get(
  "/assessment/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { eligible } = await trialAccepted(userId);
    const rows = await db
      .select()
      .from(assessmentBookingsTable)
      .where(eq(assessmentBookingsTable.userId, userId))
      .orderBy(desc(assessmentBookingsTable.createdAt))
      .limit(10);
    const booking = rows.find((r) => r.status === "booked") ?? null;
    const lastCompleted = rows.find((r) => r.status === "completed") ?? null;
    // Opening the assessment screen also counts as a reminder opportunity.
    void ensureAssessmentReminder(userId);
    res.json(
      GetMyAssessmentResponse.parse({
        eligible,
        slotTimes: ASSESSMENT_SLOT_TIMES,
        booking: booking ? bookingJson(booking) : null,
        lastCompleted: lastCompleted ? bookingJson(lastCompleted) : null,
      }),
    );
  },
);

router.post(
  "/assessment/book",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const b = (req.body ?? {}) as Record<string, unknown>;
    const slotDate = String(b.slotDate ?? "");
    const slotTime = String(b.slotTime ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate) || slotDate < istToday()) {
      res.status(400).json({ error: "Pick today or a future date" });
      return;
    }
    if (!ASSESSMENT_SLOT_TIMES.includes(slotTime)) {
      res.status(400).json({ error: "Pick one of the morning slot times" });
      return;
    }
    const { eligible, program } = await trialAccepted(userId);
    if (!eligible) {
      res.status(403).json({
        error:
          "Assessment booking unlocks once your kick-starter trial request is accepted",
      });
      return;
    }
    const [user] = await db
      .select({ name: usersTable.name, mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    const [existing] = await db
      .select()
      .from(assessmentBookingsTable)
      .where(
        and(
          eq(assessmentBookingsTable.userId, userId),
          eq(assessmentBookingsTable.status, "booked"),
        ),
      );
    let row: typeof assessmentBookingsTable.$inferSelect;
    if (existing) {
      // Reschedule — reset the reminder so it fires again for the new slot.
      const [updated] = await db
        .update(assessmentBookingsTable)
        .set({ slotDate, slotTime, reminderSentAt: null })
        .where(eq(assessmentBookingsTable.id, existing.id))
        .returning();
      row = updated!;
    } else {
      const [created] = await db
        .insert(assessmentBookingsTable)
        .values({
          userId,
          memberName: user?.name ?? "",
          memberPhone: normalizeMobile(user?.mobile ?? "") ?? "",
          gymId: program?.gymId ?? null,
          gymName: program?.gymName ?? "",
          slotDate,
          slotTime,
        })
        .returning();
      row = created!;
    }
    try {
      await db.insert(notificationsTable).values({
        recipientType: "user",
        recipientId: userId,
        title: existing ? "Assessment rescheduled ✅" : "Assessment booked ✅",
        body: `Your empty-stomach fitness assessment is set for ${fmtSlot(slotDate, slotTime)}. Come on an empty stomach — we'll record your BMI and measurements.`,
        batchId: randomUUID(),
      });
    } catch {
      // Best-effort only.
    }
    res.json(BookAssessmentResponse.parse(bookingJson(row)));
  },
);

router.post(
  "/assessment/cancel",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    await db
      .update(assessmentBookingsTable)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(assessmentBookingsTable.userId, req.userId!),
          eq(assessmentBookingsTable.status, "booked"),
        ),
      );
    res.json({ ok: true });
  },
);

// ─── Staff / admin: roster + record results ─────────────────────────────────

async function rosterRows() {
  const today = istToday();
  const upcoming = await db
    .select()
    .from(assessmentBookingsTable)
    .where(
      and(
        eq(assessmentBookingsTable.status, "booked"),
        gte(assessmentBookingsTable.slotDate, today),
      ),
    )
    .orderBy(assessmentBookingsTable.slotDate, assessmentBookingsTable.slotTime);
  const recent = await db
    .select()
    .from(assessmentBookingsTable)
    .where(eq(assessmentBookingsTable.status, "completed"))
    .orderBy(desc(assessmentBookingsTable.slotDate))
    .limit(50);
  const bmiIds = recent
    .map((r) => r.bmiRecordId)
    .filter((id): id is number => id != null);
  const bmiRows = bmiIds.length
    ? await db
        .select({
          id: memberBmiRecordsTable.id,
          heightCm: memberBmiRecordsTable.heightCm,
          weightKg: memberBmiRecordsTable.weightKg,
          bmi: memberBmiRecordsTable.bmi,
        })
        .from(memberBmiRecordsTable)
        .where(inArray(memberBmiRecordsTable.id, bmiIds))
    : [];
  const bmiById = new Map(bmiRows.map((r) => [r.id, r]));
  // Member profile photo so staff can visually verify the person at the door.
  const avatarMap = await avatarsByUserId(
    [...upcoming, ...recent].map((b) => b.userId),
  );
  const json = (b: typeof assessmentBookingsTable.$inferSelect) => ({
    id: b.id,
    userId: b.userId,
    avatarUrl: avatarMap.get(b.userId) ?? null,
    memberName: b.memberName,
    memberPhone: b.memberPhone,
    gymName: b.gymName,
    slotDate: b.slotDate,
    slotTime: b.slotTime,
    status: b.status,
    isToday: b.slotDate === today,
    recordedBy: b.recordedByStaffName,
    bmi: b.bmiRecordId ? (bmiById.get(b.bmiRecordId) ?? null) : null,
  });
  return { upcoming: upcoming.map(json), recent: recent.map(json) };
}

/** Record results: insert a BMI record + complete the booking. */
async function recordResult(
  recorder: { staffId: number; name: string },
  req: Request,
  res: Response,
): Promise<void> {
  const id = Number(req.params.id);
  const b = (req.body ?? {}) as Record<string, unknown>;
  const heightCm = Number(b.heightCm);
  const weightKg = Number(b.weightKg);
  const note = String(b.note ?? "").slice(0, 2000);
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm < 80 ||
    heightCm > 260 ||
    weightKg < 20 ||
    weightKg > 400
  ) {
    res.status(400).json({ error: "Valid heightCm and weightKg required" });
    return;
  }
  const [booking] = await db
    .select()
    .from(assessmentBookingsTable)
    .where(eq(assessmentBookingsTable.id, id));
  if (!booking || booking.status !== "booked") {
    res.status(404).json({ error: "Booking not found or already recorded" });
    return;
  }
  const bmi = Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
  // Atomic: the one-shot completion flip (WHERE status='booked') runs FIRST
  // inside a transaction — a racing duplicate submit loses the flip and the
  // whole transaction rolls back, so no orphan BMI row is ever persisted.
  const result = await db.transaction(async (tx) => {
    const [won] = await tx
      .update(assessmentBookingsTable)
      .set({
        status: "completed",
        recordedByStaffId: recorder.staffId || null,
        recordedByStaffName: recorder.name,
      })
      .where(
        and(
          eq(assessmentBookingsTable.id, id),
          eq(assessmentBookingsTable.status, "booked"),
        ),
      )
      .returning();
    if (!won) return null;
    const [bmiRow] = await tx
      .insert(memberBmiRecordsTable)
      .values({
        staffId: recorder.staffId,
        staffName: recorder.name,
        memberPhone: booking.memberPhone,
        userId: booking.userId,
        heightCm,
        weightKg,
        bmi,
        note: note || "Empty-stomach fitness assessment",
      })
      .returning();
    const [updated] = await tx
      .update(assessmentBookingsTable)
      .set({ bmiRecordId: bmiRow!.id })
      .where(eq(assessmentBookingsTable.id, id))
      .returning();
    return { updated: updated!, bmiRow: bmiRow! };
  });
  if (!result) {
    res.status(409).json({ error: "Already recorded" });
    return;
  }
  const { updated, bmiRow } = result;
  try {
    await db.insert(notificationsTable).values({
      recipientType: "user",
      recipientId: booking.userId,
      title: "Assessment results are in 📊",
      body: `Your fitness assessment is done — BMI ${bmi}. See your full record under Health in the app.`,
      batchId: randomUUID(),
    });
  } catch {
    // Best-effort only.
  }
  res.json({ booking: updated, bmiRecord: bmiRow });
}

router.get(
  "/staff/assessments",
  requireStaffPermission("pt.manage"),
  async (_req: Request, res: Response): Promise<void> => {
    res.json(await rosterRows());
  },
);

router.post(
  "/staff/assessments/:id/record",
  requireStaffPermission("pt.manage"),
  async (req: Request, res: Response): Promise<void> => {
    const me = await loadStaffOrUnauthorized(req, res);
    if (!me) return;
    await recordResult({ staffId: me.id, name: me.name }, req, res);
  },
);

router.get(
  "/admin/assessments",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(await rosterRows());
  },
);

router.post(
  "/admin/assessments/:id/record",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.session.adminId!;
    const [admin] = await db
      .select({ name: adminsTable.name })
      .from(adminsTable)
      .where(eq(adminsTable.id, adminId));
    // staffId 0 = recorded by a GYMCO admin, not a staff row.
    await recordResult(
      { staffId: 0, name: admin?.name ?? "GYMCO admin" },
      req,
      res,
    );
  },
);

export default router;
