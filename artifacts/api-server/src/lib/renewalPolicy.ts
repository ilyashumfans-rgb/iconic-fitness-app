// Pure renewal/upgrade policy (IST, date-only). No I/O so it is unit-testable.
//
// Rules (product decision):
// - Renew/upgrade checkout is allowed any time before or on the expiry day
//   (IST). The 10-day window only governs reminders and UI emphasis. After
//   expiry, renewal is hidden; the member uses the normal new-plan checkout.
// - Renewals and upgrades both start the day AFTER the current expiry, so the
//   remaining days are preserved. Upgrades charge the full listed price of the
//   new plan. Never prorate, never credit.
// - Reminder milestones: 10, 7, 3, 1, 0 days before expiry.

export const RENEWAL_WINDOW_DAYS = 10;
export const REMINDER_MILESTONES = [0, 1, 3, 7, 10] as const;
export const RENEWAL_LINK = "/my-membership?section=renewal";

const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function istDateOf(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && ISO.test(s) && Number.isFinite(Date.parse(`${s}T00:00:00Z`));
}

/** b - a in whole days. */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export type RenewalWindow = {
  daysLeft: number | null;
  expired: boolean;
  eligible: boolean;
  nextStartDate: string | null;
};

export function renewalWindow(expiry: string | null | undefined, today: string): RenewalWindow {
  if (!isIsoDate(expiry)) {
    return { daysLeft: null, expired: false, eligible: false, nextStartDate: null };
  }
  const daysLeft = dayDiff(today, expiry);
  const expired = daysLeft < 0;
  return {
    daysLeft,
    expired,
    eligible: !expired && daysLeft <= RENEWAL_WINDOW_DAYS,
    nextStartDate: expired ? null : addDays(expiry, 1),
  };
}

/**
 * The milestone due today: the smallest milestone >= daysLeft. Catch-up for a
 * skipped milestone fires the latest reached one only (never older/backdated
 * ones). Returns null outside the window or after expiry.
 */
export function dueMilestone(expiry: string | null | undefined, today: string): number | null {
  const w = renewalWindow(expiry, today);
  if (!w.eligible || w.daysLeft === null) return null;
  return REMINDER_MILESTONES.find((m) => m >= w.daysLeft!) ?? null;
}

export function reminderBatchId(
  userId: number,
  source: string,
  sourceKey: string,
  expiry: string,
  milestone: number,
): string {
  return `renewal:${userId}:${source}:${sourceKey}:${expiry}:${milestone}`;
}

export type CheckoutMode = "renew" | "upgrade";

export type CheckoutDecision =
  | { ok: true; startDate: string; amountInr: number }
  | { ok: false; status: number; error: string };

/**
 * Server-side authority for renewal/upgrade checkout. Client-supplied start
 * dates and prices are ignored; only the source plan's expiry and the live
 * listed price decide.
 */
export function decideCheckout(input: {
  mode: CheckoutMode;
  expiry: string | null | undefined;
  today: string;
  listedPriceInr: number;
  alreadyPaidForNextStart: boolean;
}): CheckoutDecision {
  const w = renewalWindow(input.expiry, input.today);
  if (w.daysLeft === null) {
    return { ok: false, status: 409, error: "Your plan's expiry date isn't available, so it can't be renewed online" };
  }
  if (w.expired) {
    return { ok: false, status: 409, error: "Your plan has expired. Please buy a new plan instead." };
  }
  if (input.alreadyPaidForNextStart) {
    return { ok: false, status: 409, error: "Your renewal is already paid" };
  }
  if (!Number.isFinite(input.listedPriceInr) || input.listedPriceInr < 1) {
    return { ok: false, status: 409, error: "That plan isn't available for online payment" };
  }
  // Full listed price for both modes; no proration or credit, ever.
  return { ok: true, startDate: w.nextStartDate!, amountInr: Math.round(input.listedPriceInr) };
}

/** Time-based PT remaining (staff PT dashboard rule), separate from delivered. */
export function ptTimeRemaining(
  originalSessions: number,
  durationDays: number,
  startDate: string,
  endDate: string,
  today: string,
): number {
  if (today > endDate) return 0;
  if (today < startDate || durationDays <= 0) return originalSessions;
  const elapsed = dayDiff(startDate, today);
  return Math.max(0, Math.round(originalSessions - (originalSessions / durationDays) * elapsed));
}

export type RenewalSnapshot = {
  kind: "membership" | "pt";
  mode: CheckoutMode;
  userId: number;
  bookingId: number;
  sourceIdentity: string;
  sourceExpiry: string;
  nextStartDate: string;
  packageId: number;
  listedPriceInr: number;
  createdAt: string;
  /** Hosted payment link lifecycle (persisted so retries reuse, never fork). */
  urlState?: "creating" | "ready" | "expired" | "gateway_failed";
  paymentUrl?: string;
  urlCreatedAt?: string;
};

/** YoActiv hosted links live ~5 minutes; reuse only well inside that. */
export const PENDING_URL_TTL_MS = 4 * 60 * 1000;
/** A "creating" row older than this lost its gateway call (crash/timeout). */
export const CREATING_ORPHAN_MS = 2 * 60 * 1000;

export type SourceBooking = {
  snap: RenewalSnapshot;
  booking: { id: number; status: string; token: string; startDate: string; packageName: string; userId: number | null };
};

export function sourceLockKey(kind: "membership" | "pt", userId: number, sourceIdentity: string, expiry: string): string {
  return `renewal:lock:${kind}:${userId}:${sourceIdentity}:${expiry}`;
}

/**
 * Classify existing checkouts for ONE exact source term. Only rows whose
 * persisted snapshot matches the source identity + expiry and whose booking
 * belongs to the same user and starts on the snapshot's next start count.
 */
export function classifySourceBookings(
  rows: SourceBooking[],
  ctx: { userId: number; mode: CheckoutMode; packageId: number; now: number; amountInr?: number },
): {
  paid: SourceBooking | null;
  reuse: SourceBooking | null;
  expireIds: number[];
  orphanIds: number[];
} {
  const mine = rows.filter(
    (r) => r.snap.userId === ctx.userId && r.booking.userId === ctx.userId && r.booking.startDate === r.snap.nextStartDate,
  );
  const paid = mine.find((r) => r.booking.status === "paid") ?? null;
  let reuse: SourceBooking | null = null;
  const expireIds: number[] = [];
  const orphanIds: number[] = [];
  for (const r of mine) {
    if (r.booking.status !== "pending") continue;
    const age = ctx.now - Date.parse(r.snap.urlCreatedAt ?? r.snap.createdAt);
    if (r.snap.urlState === "creating" && age > CREATING_ORPHAN_MS) orphanIds.push(r.booking.id);
    else if (r.snap.urlState === "ready" && age >= PENDING_URL_TTL_MS) expireIds.push(r.booking.id);
    else if (
      r.snap.urlState === "ready" &&
      !reuse &&
      r.snap.paymentUrl &&
      r.snap.mode === ctx.mode &&
      r.snap.packageId === ctx.packageId &&
      (ctx.amountInr === undefined || r.snap.listedPriceInr === ctx.amountInr)
    )
      reuse = r;
    else if (r.snap.urlState === "ready") expireIds.push(r.booking.id); // different plan chosen
  }
  return { paid, reuse, expireIds, orphanIds };
}

export function snapshotKey(kind: "membership" | "pt", bookingId: number): string {
  return `renewal:snapshot:${kind}:${bookingId}`;
}

type PkgLike = { id: number; name: string; serviceName: string; amountInr: number; pt?: boolean };

const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Pick the package to charge. `packages` MUST be the live catalog of the
 * source plan's own branch, so a package id from another gym never matches.
 * Renew = the exact source plan; upgrade = a different, visible, non-PT plan.
 */
export function resolveCheckoutPackage<P extends PkgLike>(input: {
  mode: CheckoutMode;
  packages: P[];
  source: { serviceName: string; planName: string };
  packageId?: number | null;
  isVisible: (id: number) => boolean;
}): P | null {
  const { packages, source } = input;
  const exact =
    packages.find((p) => p.serviceName === source.serviceName && p.name === source.planName) ??
    packages.find(
      (p) => normName(p.serviceName) === normName(source.serviceName) && normName(p.name) === normName(source.planName),
    ) ??
    null;
  if (input.mode === "renew") {
    if (input.packageId != null && exact && exact.id !== input.packageId) return null;
    return exact;
  }
  if (input.packageId == null) return null;
  const pick = packages.find((p) => p.id === input.packageId && !p.pt && input.isVisible(p.id));
  if (!pick || (exact && pick.id === exact.id)) return null;
  return pick;
}

/** A snapshot may only be read by the user who created it. */
export function snapshotOwnedBy(s: RenewalSnapshot | null, userId: number): boolean {
  return !!s && s.userId === userId;
}

/** Reminder due today, unless a verified paid renewal for the next term exists. */
export function reminderDue(expiry: string | null | undefined, today: string, paidRenewal: boolean): number | null {
  if (paidRenewal) return null;
  return dueMilestone(expiry, today);
}

/**
 * Payment-landing transition: only pending rows move; replays of the success
 * or failure callback against a final row are no-ops (mirrors the SQL guard).
 */
export function landingTransition(current: string, outcome: "paid" | "failed"): "paid" | "failed" | null {
  return current === "pending" ? outcome : null;
}

/**
 * Current term selection: a paid future-start renewal must NOT replace the
 * running term before its start date. Prefer the started, unexpired term with
 * the latest end; else the most recently ended term; only if every row starts
 * in the future, the earliest-starting one.
 */
export function pickCurrentTerm<T extends { startDate: string | null; endDate: string | null }>(
  rows: T[],
  today: string,
): T | null {
  const started = rows.filter((r) => !r.startDate || r.startDate <= today);
  const byEndDesc = (a: T, b: T) => (b.endDate ?? "").localeCompare(a.endDate ?? "");
  const running = started.filter((r) => (r.endDate ?? "") >= today).sort(byEndDesc);
  if (running[0]) return running[0];
  const ended = [...started].sort(byEndDesc);
  if (ended[0]) return ended[0];
  return [...rows].sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))[0] ?? null;
}
