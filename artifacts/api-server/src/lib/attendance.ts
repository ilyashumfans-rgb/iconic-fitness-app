import { createHmac, timingSafeEqual } from "node:crypto";

export const ATTENDANCE_METHOD = "qr_attendance";
export class AttendanceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function signature(payload: string, secret: string): string {
  if (!secret) throw new AttendanceError(503, "Attendance QR signing is not configured.");
  return createHmac("sha256", secret).update(`iconic-attendance:${payload}`).digest("base64url");
}
export function attendanceToken(gymId: number, secret: string): string {
  const payload = `v1.${gymId}`;
  return `${payload}.${signature(payload, secret)}`;
}
export function verifyAttendanceToken(code: string, secret: string): number {
  const match = /^v1\.([1-9]\d{0,9})\.([A-Za-z0-9_-]{43})$/.exec(code);
  if (!match) throw new AttendanceError(400, "Invalid branch QR code. Scan the branch attendance QR.");
  const expected = Buffer.from(signature(`v1.${match[1]}`, secret));
  const supplied = Buffer.from(match[2]!);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new AttendanceError(400, "Invalid branch QR signature.");
  }
  return Number(match[1]);
}

export function istDate(now: Date): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}
export function attendanceMonth(month: string | undefined, now: Date) {
  const value = month ?? istDate(now).slice(0, 7);
  if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(value)) {
    throw new AttendanceError(400, "month must be YYYY-MM (2000–2099).");
  }
  const start = new Date(`${value}-01T00:00:00+05:30`);
  const [year, m] = value.split("-").map(Number);
  const end = new Date(Date.UTC(year!, m!, 1) - 330 * 60_000);
  return { month: value, start, end };
}

export type AttendanceRow = {
  id: number; gymId: number; gymName: string; checkedInAt: Date;
  checkedOutAt: Date | null; method: string;
};
export function attendanceVisit(row: AttendanceRow) {
  return {
    ...row,
    checkedInAt: row.checkedInAt.toISOString(),
    checkedOutAt: row.checkedOutAt?.toISOString() ?? null,
    durationMinutes: row.checkedOutAt
      ? Math.max(0, Math.floor((row.checkedOutAt.getTime() - row.checkedInAt.getTime()) / 60_000))
      : null,
  };
}
export function activeAttendance(rows: AttendanceRow[]) {
  return rows.find(r => r.method === ATTENDANCE_METHOD && !r.checkedOutAt) ?? null;
}

// Called inside the member row lock. Legacy QR/manual rows are never inferred
// to be active, nor assigned a synthetic checkout/duration.
export async function applyAttendanceScan(input: {
  gymId: number; action: "checkin" | "checkout"; now: Date;
  rows: AttendanceRow[];
  authorize: () => Promise<void>;
  create: () => Promise<AttendanceRow>;
  close: (row: AttendanceRow) => Promise<AttendanceRow>;
}) {
  const { rows, gymId, action, now } = input;
  const active = activeAttendance(rows);
  if (action === "checkout") {
    if (active && active.gymId !== gymId) {
      throw new AttendanceError(409, "Scan the QR at the branch where you checked in to check out.");
    }
    if (active) return { visit: attendanceVisit(await input.close(active)), outcome: "checked_out" as const };
    const completed = rows.find(r => r.gymId === gymId && r.method === ATTENDANCE_METHOD && r.checkedOutAt);
    if (completed) return { visit: attendanceVisit(completed), outcome: "already_checked_out" as const };
    throw new AttendanceError(409, "No active QR check-in at this branch. Check in first.");
  }
  await input.authorize();
  if (active) {
    if (active.gymId !== gymId) throw new AttendanceError(409, "Check out of your current branch before checking in elsewhere.");
    return { visit: attendanceVisit(active), outcome: "already_checked_in" as const };
  }
  const today = rows.find(r => r.gymId === gymId && istDate(r.checkedInAt) === istDate(now));
  if (today) {
    return { visit: attendanceVisit(today), outcome: today.checkedOutAt ? "already_checked_out" as const : "already_checked_in" as const };
  }
  return { visit: attendanceVisit(await input.create()), outcome: "checked_in" as const };
}

export function isCurrentMembership(plan: { status: string; startDate: string | null; expiryDate: string | null }, now: Date) {
  const day = istDate(now);
  return plan.status === "active" && !!plan.expiryDate &&
    plan.expiryDate.slice(0, 10) >= day && (!plan.startDate || plan.startDate.slice(0, 10) <= day);
}