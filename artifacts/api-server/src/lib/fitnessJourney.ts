/** Plan-start recency was explicitly approved; it is NOT original gym joining. */
export const JOURNEY_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

export function recentTimestamp(value: number, now: number): boolean {
  return Number.isFinite(value) && value <= now && now - value < JOURNEY_WINDOW_MS;
}

export function planStartTimestamp(value: string | null): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const midnightUtc = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(midnightUtc) || new Date(midnightUtc).toISOString().slice(0, 10) !== value) return NaN;
  return midnightUtc - 330 * 60 * 1000; // YoActiv date-only values are IST.
}

export function matchingMobileSync(
  receipt: unknown, mobile: string, memberId: number, now: number,
): boolean {
  const identity = trustedMobileSyncIdentity(receipt, now);
  return identity?.mobile === mobile && identity.memberId === memberId;
}

/** A mobile is trusted for unattended refresh only when it came from our private receipt. */
export function trustedMobileSyncIdentity(
  receipt: unknown, now: number,
): { mobile: string; memberId: number } | null {
  if (!receipt || typeof receipt !== "object") return null;
  const r = receipt as Record<string, unknown>;
  if (r.version !== 1 || typeof r.mobile !== "string" || !/^\d{10}$/.test(r.mobile) ||
    typeof r.memberId !== "number" || !Number.isInteger(r.memberId) || r.memberId <= 0 ||
    typeof r.syncedAt !== "number" || !Number.isFinite(r.syncedAt) || r.syncedAt > now) {
    return null;
  }
  return { mobile: r.mobile, memberId: r.memberId };
}

export function journeyDecision(input: {
  synced: boolean; active: boolean; accountCreatedAt: number;
  planStartedOn: string | null; now: number; hasPaidPt: boolean;
  trialCompleted: boolean; trialInProgress: boolean;
  trialNeedsFeedback?: boolean;
}): string {
  if (!input.synced) return "mobile_sync_required";
  if (!input.active) return "active_membership_required";
  if (input.hasPaidPt) return "paid_pt";
  // This is completion of a real existing journey, never a second trial offer.
  if (input.trialCompleted) return input.trialNeedsFeedback ? "feedback_only" : "trial_completed";
  // Preserve a real trainer-accepted free enquiry program, never a generic
  // paid booking/assignment. A time window must not interrupt an actual trial.
  if (input.trialInProgress) return "in_progress";
  if (!recentTimestamp(input.accountCreatedAt, input.now)) return "account_not_recent";
  if (!recentTimestamp(planStartTimestamp(input.planStartedOn), input.now)) return "plan_not_recent";
  return "new_offer";
}