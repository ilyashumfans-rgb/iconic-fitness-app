import { AttendanceError, isCurrentMembership } from "./attendance";
import { trustedMobileSyncIdentity } from "./fitnessJourney";
import { YOACTIV_BRANCH_NAMES, yoactivMembershipBranchId } from "./yoactivBranchNames";
import type { YoactivMemberProfile } from "./yoactiv";

export function iconicAttendanceBranch(id: number | null) {
  return id !== null && Object.hasOwn(YOACTIV_BRANCH_NAMES, id);
}
export function requireAttendanceBranch(id: number | null) {
  if (!iconicAttendanceBranch(id)) {
    throw new AttendanceError(403, "Attendance is not enabled for this branch. Ask an administrator to link it to a supported Iconic YoActiv membership branch before printing or scanning its QR.");
  }
}
export function ownsAttendanceGym(gymOwner: number | null, partnerId: number | undefined) {
  return !!partnerId && gymOwner === partnerId;
}

// Ports keep entitlement testing entirely on service fixtures (no real member,
// attendance, Clerk or upstream writes).
export async function authorizeAttendanceMembership(input: {
  userId: number | undefined; branchId: number | null; now: Date;
  hasLocalPlan: () => Promise<boolean>;
  loadIdentity: () => Promise<{ receipt: unknown; mobile: string | null }>;
  lookup: (mobile: string) => Promise<YoactivMemberProfile | null>;
}) {
  if (!input.userId) throw new AttendanceError(401, "Unauthorized");
  requireAttendanceBranch(input.branchId);
  try {
    if (await input.hasLocalPlan()) return;
    const { receipt, mobile } = await input.loadIdentity();
    const identity = trustedMobileSyncIdentity(receipt, input.now.getTime());
    if (!identity) throw new AttendanceError(403, "Sync your membership before checking in.");
    if (mobile && mobile !== identity.mobile) throw new AttendanceError(403, "Membership identity changed. Sync your membership again.");
    const profile = await input.lookup(identity.mobile);
    if (!profile) throw new AttendanceError(503, "Membership verification is unavailable. Please retry.");
    if (profile.memberId !== identity.memberId || profile.mobile !== identity.mobile) {
      throw new AttendanceError(403, "Membership identity could not be verified. Sync again.");
    }
    if (!profile.memberships.some(p => isCurrentMembership(p, input.now) &&
      iconicAttendanceBranch(p.branchId) && yoactivMembershipBranchId(p.branchId) === p.branchId &&
      !/\b(personal training|pt)\b/i.test(p.serviceName))) {
      throw new AttendanceError(403, "An active Iconic gym membership is required.");
    }
  } catch (error) {
    if (error instanceof AttendanceError) throw error;
    throw new AttendanceError(503, "Membership verification is unavailable. Please retry.");
  }
}