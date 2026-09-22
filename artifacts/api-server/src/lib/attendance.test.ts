import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ATTENDANCE_METHOD, AttendanceError, activeAttendance, applyAttendanceScan, attendanceMonth,
  attendanceToken, attendanceVisit, istDate, verifyAttendanceToken, type AttendanceRow,
} from "./attendance";
import { authorizeAttendanceMembership, ownsAttendanceGym, requireAttendanceBranch } from "./attendanceMembership";
import type { YoactivMemberProfile } from "./yoactiv";

const now = new Date("2026-07-01T00:00:00+05:30");
const secret = "fixture-only-not-a-real-session-secret";
const status = (code: number) => (error: unknown) => error instanceof AttendanceError && error.status === code;

test("QR signature rejects tampering, manual IDs, full URLs and missing configuration", () => {
  const token = attendanceToken(41, secret);
  assert.equal(verifyAttendanceToken(token, secret), 41);
  for (const bad of [token.replace("41", "42"), `${token.slice(0, -1)}!`, "41", `iconic-app://check-in?code=${token}`, "v2.41.bad"]) {
    assert.throws(() => verifyAttendanceToken(bad, secret), status(400));
  }
  assert.throws(() => verifyAttendanceToken(token, `${secret}changed`), status(400));
  assert.throws(() => attendanceToken(41, ""), status(503));
});

test("IST month boundaries are half-open, including UTC previous-day times", () => {
  const range = attendanceMonth("2026-07", now);
  assert.equal(range.start.toISOString(), "2026-06-30T18:30:00.000Z");
  assert.equal(range.end.toISOString(), "2026-07-31T18:30:00.000Z");
  assert.equal(istDate(new Date(range.start.getTime() - 1)), "2026-06-30");
  assert.equal(attendanceMonth(undefined, now).month, "2026-07");
  assert.equal(attendanceMonth("2026-12", now).end.toISOString(), "2026-12-31T18:30:00.000Z");
  assert.throws(() => attendanceMonth("2026-13", now), status(400));
});

function fixture() {
  let rows: AttendanceRow[] = [];
  let time = new Date(now);
  let authorized = true;
  let inserts = 0;
  let updates = 0;
  // Simulates the DB member row lock, not an actual attendance/payout write.
  let lock = Promise.resolve();
  function scan(action: "checkin" | "checkout", gymId = 1) {
    const pending = lock.then(() => applyAttendanceScan({
      gymId, action, now: time, rows,
      authorize: async () => { if (!authorized) throw new AttendanceError(403, "Expired"); },
      create: async () => {
        const row = { id: ++inserts, gymId, gymName: `Fixture ${gymId}`, checkedInAt: new Date(time), checkedOutAt: null, method: ATTENDANCE_METHOD };
        rows.unshift(row);
        return row;
      },
      close: async row => {
        updates++;
        row.checkedOutAt = new Date(time);
        return row;
      },
    }));
    lock = pending.then(() => undefined, () => undefined);
    return pending;
  }
  return { scan, rows: () => rows, counters: () => ({ inserts, updates }),
    expire: () => { authorized = false; }, time: (value: string) => { time = new Date(value); },
    seed: (value: AttendanceRow[]) => { rows = value; } };
}

test("checkout before checkin rejects; repeated and concurrent scans never duplicate attendance/payout", async () => {
  const f = fixture();
  await assert.rejects(f.scan("checkout"), status(409));
  const results = await Promise.all(Array.from({ length: 20 }, () => f.scan("checkin")));
  assert.equal(results.filter(r => r.outcome === "checked_in").length, 1);
  assert.equal(results.filter(r => r.outcome === "already_checked_in").length, 19);
  f.time("2026-07-01T01:15:00+05:30");
  const exits = await Promise.all(Array.from({ length: 20 }, () => f.scan("checkout")));
  assert.equal(exits.filter(r => r.outcome === "checked_out").length, 1);
  assert.equal(exits[0]!.visit.durationMinutes, 75);
  assert.equal((await f.scan("checkin")).outcome, "already_checked_out");
  assert.deepEqual(f.counters(), { inserts: 1, updates: 1 });
});

test("one active visit across branches and exact cross-midnight checkout even after expiry", async () => {
  const f = fixture();
  f.time("2026-06-30T23:50:00+05:30");
  await f.scan("checkin");
  await assert.rejects(f.scan("checkin", 2), status(409));
  await assert.rejects(f.scan("checkout", 2), status(409));
  f.time("2026-07-01T00:15:00+05:30");
  assert.ok(activeAttendance(f.rows())); // independent of selected July history
  f.expire();
  const result = await f.scan("checkout");
  assert.equal(result.visit.durationMinutes, 25);
  await assert.rejects(f.scan("checkin", 2), status(403));
});

test("concurrent cross-branch checkins yield one winner", async () => {
  const f = fixture();
  const results = await Promise.allSettled([f.scan("checkin", 1), f.scan("checkin", 2)]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(f.counters().inserts, 1);
});

test("legacy open rows never block future QR flow or get invented checkout/duration", async () => {
  const f = fixture();
  const legacy = { id: 99, gymId: 1, gymName: "Legacy", checkedInAt: new Date("2025-01-01"), checkedOutAt: null, method: "manual" };
  f.seed([legacy]);
  assert.equal(activeAttendance(f.rows()), null);
  assert.equal(attendanceVisit(legacy).durationMinutes, null);
  assert.equal((await f.scan("checkin")).outcome, "checked_in");
  assert.equal(legacy.checkedOutAt, null);
});

const profile: YoactivMemberProfile = {
  memberId: 123, name: "Fixture", mobile: "9999999999", photoUrl: null, branchCount: 1,
  memberships: [{ branchId: 5431, branchName: "Fixture", serviceName: "Gym", planName: "Annual",
    status: "active", startDate: "2026-01-01", expiryDate: "2026-12-31",
    sessionsTotal: null, sessionsUsed: null, billId: "", invoiceDate: null, amountInr: null, discountInr: null }],
};
const receipt = { version: 1, memberId: 123, mobile: profile.mobile, syncedAt: now.getTime() - 1000 };
function entitlement(overrides: Partial<Parameters<typeof authorizeAttendanceMembership>[0]> = {}) {
  return authorizeAttendanceMembership({
    userId: 1, branchId: 5472, now, hasLocalPlan: async () => false,
    loadIdentity: async () => ({ receipt, mobile: profile.mobile }), lookup: async () => profile,
    ...overrides,
  });
}

test("same Iconic network crossbranch and legitimate local plan allowed without upstream", async () => {
  await entitlement();
  await entitlement({ hasLocalPlan: async () => true,
    loadIdentity: async () => { throw Error("must not contact Clerk"); },
    lookup: async () => { throw Error("must not contact YoActiv"); } });
});

test("unauthenticated, expired, paused, unknown-brand and PT-only plans denied", async () => {
  await assert.rejects(entitlement({ userId: undefined, hasLocalPlan: async () => true }), status(401));
  await assert.rejects(entitlement({ branchId: 999999, hasLocalPlan: async () => true }), status(403));
  for (const patch of [{ status: "expired" as const }, { status: "paused" as const },
    { expiryDate: "2026-06-30" }, { branchId: 999999 }, { branchId: 6793 }, { serviceName: "Personal Training" }]) {
    await assert.rejects(entitlement({ lookup: async () => ({
      ...profile, memberships: [{ ...profile.memberships[0]!, ...patch }],
    }) }), status(403));
  }
});

test("membership outage fails closed, no email/client mobile authorization or receipt substitution", async () => {
  await assert.rejects(entitlement({ lookup: async () => null }), status(503));
  await assert.rejects(entitlement({ lookup: async () => { throw Error("upstream offline"); } }), status(503));
  await assert.rejects(entitlement({ loadIdentity: async () => ({ receipt: null, mobile: profile.mobile }) }), status(403));
  await assert.rejects(entitlement({ loadIdentity: async () => ({ receipt, mobile: "8888888888" }) }), status(403));
  await assert.rejects(entitlement({ lookup: async () => ({ ...profile, memberId: 321 }) }), status(403));
});

test("crosspartner and unauthenticated ownership denied", () => {
  assert.equal(ownsAttendanceGym(12, 12), true);
  assert.equal(ownsAttendanceGym(12, 13), false);
  assert.equal(ownsAttendanceGym(null, 12), false);
  assert.equal(ownsAttendanceGym(12, undefined), false);
});

test("printable QR requires supported branch mapping, with no missing/unknown override", () => {
  assert.doesNotThrow(() => requireAttendanceBranch(5431));
  for (const id of [null, 0, 999999]) {
    assert.throws(() => requireAttendanceBranch(id), error =>
      status(403)(error) && (error as Error).message.includes("Ask an administrator to link"));
  }
  const route = readFileSync(new URL("../routes/attendance.ts", import.meta.url), "utf8");
  const printing = route.split('router.get("/partner/gyms/:gymId/attendance-qr"')[1]!.split('router.get("/attendance/mine"')[0]!;
  assert.ok(printing.indexOf("requireAttendanceBranch(gym.yoactivBranchId)") < printing.indexOf("attendanceToken(gym.id"));
});

test("route security wiring: auth, verified gym, exact owner, permission, DB lock and no legacy write bypass", () => {
  const route = readFileSync(new URL("../routes/attendance.ts", import.meta.url), "utf8");
  const old = readFileSync(new URL("../routes/tracking.ts", import.meta.url), "utf8").split('router.post("/checkins"')[1]!;
  const partner = readFileSync(new URL("../routes/partner.ts", import.meta.url), "utf8");
  assert.match(route, /router\.post\("\/attendance\/scan", requireUser/);
  assert.match(route, /router\.get\("\/attendance\/mine", requireUser/);
  assert.match(route, /requirePartner, requirePartnerPerm\("checkins"\)/);
  assert.match(route, /eq\(gymsTable.ownerPartnerId, req.session.partnerId!\)/);
  assert.match(route, /!gym\.isVerified/);
  assert.match(route, /db\.transaction/);
  assert.match(route, /\.where\(eq\(usersTable.id, req.userId!\)\)\.for\("update"\)/);
  assert.match(route, /requireComplete: true/);
  assert.doesNotMatch(route, /VerifiedEmail|req\.body\.mobile|req\.body\.userId/);
  assert.match(old, /requireUser/);
  assert.match(old, /status\(409\)/);
  assert.doesNotMatch(old, /\.insert\(/);
  assert.match(partner, /attendance-qr/);
  assert.match(partner, /\["\/partner\/gyms", "checkins"\]/);
});