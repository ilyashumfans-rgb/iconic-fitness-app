import { Router, type IRouter, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { and, desc, eq, gt } from "drizzle-orm";
import { db, checkinsTable, gymsTable, membershipsTable, userMembershipsTable, usersTable } from "@workspace/db";
import { ScanAttendanceBody } from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { requireAdmin } from "../lib/adminAuth";
import { requirePartner, requirePartnerPerm } from "../lib/partnerAuth";
import { fetchYoactivMemberByMobile, normalizeMobile } from "../lib/yoactiv";
import { authorizeAttendanceMembership, ownsAttendanceGym, requireAttendanceBranch } from "../lib/attendanceMembership";
import {
  ATTENDANCE_METHOD, AttendanceError, activeAttendance, applyAttendanceScan,
  attendanceMonth, attendanceToken, attendanceVisit, verifyAttendanceToken,
} from "../lib/attendance";

const router: IRouter = Router();
const selection = {
  id: checkinsTable.id, gymId: checkinsTable.gymId, gymName: gymsTable.name,
  checkedInAt: checkinsTable.checkedInAt, checkedOutAt: checkinsTable.checkedOutAt, method: checkinsTable.method,
};
type Gym = typeof gymsTable.$inferSelect;

async function authorizeMembership(connection: Pick<typeof db, "select">, userId: number, clerkUserId: string | undefined, gym: Gym, now: Date) {
  return authorizeAttendanceMembership({
    userId, branchId: gym.yoactivBranchId, now,
    hasLocalPlan: async () => {
      const [local] = await connection.select({ id: userMembershipsTable.id }).from(userMembershipsTable)
        .innerJoin(membershipsTable, eq(membershipsTable.id, userMembershipsTable.planId))
        .where(and(eq(userMembershipsTable.userId, userId), eq(userMembershipsTable.status, "active"),
          gt(userMembershipsTable.renewsOn, now), gt(membershipsTable.gymsIncluded, 0))).limit(1);
      return !!local;
    },
    loadIdentity: async () => {
      if (!clerkUserId) throw new AttendanceError(403, "Sync your membership before checking in.");
      const account = await clerkClient.users.getUser(clerkUserId);
      const [user] = await connection.select({ mobile: usersTable.mobile }).from(usersTable).where(eq(usersTable.id, userId));
      return { receipt: account.privateMetadata.iconicMobileSync, mobile: normalizeMobile(user?.mobile) };
    },
    lookup: mobile => fetchYoactivMemberByMobile(mobile, { requireComplete: true }),
  });
}

function failure(res: Response, error: unknown) {
  if (error instanceof AttendanceError) res.status(error.status).json({ error: error.message });
  else res.status(503).json({ error: "Attendance is temporarily unavailable. Please retry." });
}

router.get("/partner/gyms/:gymId/attendance-qr", requirePartner, requirePartnerPerm("checkins"), async (req, res) => {
  try {
    const id = Number(req.params.gymId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new AttendanceError(400, "Invalid gym ID.");
    const [gym] = await db.select().from(gymsTable).where(and(eq(gymsTable.id, id), eq(gymsTable.ownerPartnerId, req.session.partnerId!)));
    if (!gym || !ownsAttendanceGym(gym.ownerPartnerId, req.session.partnerId)) throw new AttendanceError(404, "Branch not found.");
    if (!gym.isVerified) throw new AttendanceError(403, "Branch must be verified before attendance is enabled.");
    requireAttendanceBranch(gym.yoactivBranchId);
    res.json({ gymId: gym.id, gymName: gym.name, address: gym.address,
      code: attendanceToken(gym.id, process.env.SESSION_SECRET ?? "") });
  } catch (error) { failure(res, error); }
});

router.get("/admin/partners/:partnerId/gyms/:gymId/attendance-qr", requireAdmin, async (req, res) => {
  try {
    const gymId = Number(req.params.gymId);
    const partnerId = Number(req.params.partnerId);
    if (![gymId, partnerId].every(id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647)) {
      throw new AttendanceError(400, "Invalid partner or branch ID.");
    }
    const [gym] = await db.select().from(gymsTable).where(and(
      eq(gymsTable.id, gymId), eq(gymsTable.ownerPartnerId, partnerId),
    ));
    if (!gym) throw new AttendanceError(404, "This branch is not assigned to the selected partner.");
    if (!gym.isVerified) throw new AttendanceError(403, "Branch must be verified before attendance is enabled.");
    requireAttendanceBranch(gym.yoactivBranchId);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ gymId: gym.id, gymName: gym.name, address: gym.address,
      code: attendanceToken(gym.id, process.env.SESSION_SECRET ?? "") });
  } catch (error) { failure(res, error); }
});

router.get("/attendance/mine", requireUser, async (req, res) => {
  try {
    if (req.query.month !== undefined && typeof req.query.month !== "string") throw new AttendanceError(400, "Invalid month.");
    const range = attendanceMonth(req.query.month as string | undefined, new Date());
    const rows = await db.select(selection).from(checkinsTable)
      .innerJoin(gymsTable, eq(gymsTable.id, checkinsTable.gymId))
      .where(eq(checkinsTable.userId, req.userId!)).orderBy(desc(checkinsTable.checkedInAt));
    const visits = rows.filter(r => r.checkedInAt >= range.start && r.checkedInAt < range.end).map(attendanceVisit);
    const active = activeAttendance(rows);
    res.json({ month: range.month, visits, activeVisit: active ? attendanceVisit(active) : null,
      summary: { visits: visits.length, completedVisits: visits.filter(v => v.checkedOutAt !== null).length,
        totalMinutes: visits.reduce((sum, v) => sum + (v.durationMinutes ?? 0), 0) } });
  } catch (error) { failure(res, error); }
});

router.post("/attendance/scan", requireUser, async (req, res) => {
  try {
    const parsed = ScanAttendanceBody.safeParse(req.body);
    if (!parsed.success) throw new AttendanceError(400, "Provide a valid QR code and checkin or checkout action.");
    const gymId = verifyAttendanceToken(parsed.data.code, process.env.SESSION_SECRET ?? "");
    const result = await db.transaction(async tx => {
      // All attendance transitions serialize on the authenticated member, even
      // across branches/processes. Database unique index remains the backstop.
      const [user] = await tx.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.id, req.userId!)).for("update");
      if (!user) throw new AttendanceError(401, "Unauthorized");
      const now = new Date();
      const [gym] = await tx.select().from(gymsTable).where(eq(gymsTable.id, gymId));
      if (!gym || !gym.isVerified) throw new AttendanceError(403, "Branch not found or not verified.");
      const rows = await tx.select(selection).from(checkinsTable)
        .innerJoin(gymsTable, eq(gymsTable.id, checkinsTable.gymId))
        .where(eq(checkinsTable.userId, user.id)).orderBy(desc(checkinsTable.checkedInAt));
      return applyAttendanceScan({
        gymId, action: parsed.data.action, now, rows,
        authorize: () => authorizeMembership(tx, user.id, req.clerkUserId, gym, now),
        create: async () => {
          const baseInr = gym.payoutPerVisitInr;
          const taxPct = gym.payoutTaxPct;
          const taxInr = Math.round(baseInr * taxPct / 100);
          const [row] = await tx.insert(checkinsTable).values({
            userId: user.id, gymId, checkedInAt: now, method: ATTENDANCE_METHOD,
            baseInr, taxPct, taxInr, payoutInr: baseInr - taxInr,
          }).returning();
          return { ...row!, gymName: gym.name };
        },
        close: async active => {
          const [row] = await tx.update(checkinsTable).set({ checkedOutAt: now })
            .where(eq(checkinsTable.id, active.id)).returning();
          return { ...row!, gymName: gym.name };
        },
      });
    });
    res.json(result);
  } catch (error) { failure(res, error); }
});

export default router;