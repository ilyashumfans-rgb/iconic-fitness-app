import { eq } from "drizzle-orm";
import { db, notificationsTable, usersTable } from "@workspace/db";
import {
  fetchYoactivMemberByMobile,
  pickPrimaryMembership,
  yoactivConfigured,
} from "./yoactiv";
import { logger } from "./logger";

// Renewal reminders are generated lazily when the member's app polls their
// notification feed (no cron infra): if the member's YoActiv plan expires
// within one of the thresholds below, an in-app notification row is inserted
// once per (user, expiry date, threshold). The mobile bell polls every 60s and
// fires a local sound notification for any new row, so reminders both appear
// in the feed and audibly nudge the member.
// Ascending so `find` picks the smallest threshold that is >= daysLeft — i.e.
// the most recently passed reminder milestone. A member who opens the app with
// 6 days left gets the (late) 7-day reminder; at exactly 3/1/0 days they get
// those reminders on the day. Reminders are never sent earlier than their
// milestone, and dedupe below sends each at most once per expiry date.
const THRESHOLD_DAYS = [0, 1, 3, 7] as const;

const IST = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date (YYYY-MM-DD) in IST. */
function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Whole-day difference between two YYYY-MM-DD dates (b - a). */
function dayDiff(a: string, b: string): number {
  const at = Date.parse(`${a}T00:00:00Z`);
  const bt = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(at) || !Number.isFinite(bt)) return Number.NaN;
  return Math.round((bt - at) / DAY_MS);
}

function istDateLabel(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(t)) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(t));
}

// Per-user throttle so a 60s notification poll doesn't hit YoActiv every time.
// The member lookup itself is cached in yoactiv.ts (5 min), so this is just a
// cheap second layer to skip even the cache lookups.
const lastCheckAt = new Map<number, number>();
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Ensure renewal-reminder notifications exist for this member if their plan
 * expires soon. Never throws — reminder generation must not break the feed.
 */
export async function ensureRenewalReminders(userId: number): Promise<void> {
  try {
    if (!yoactivConfigured()) return;
    const last = lastCheckAt.get(userId) ?? 0;
    if (Date.now() - last < CHECK_INTERVAL_MS) return;
    lastCheckAt.set(userId, Date.now());

    const [user] = await db
      .select({ mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user?.mobile) return;
    const profile = await fetchYoactivMemberByMobile(user.mobile);
    const primary = profile ? pickPrimaryMembership(profile) : null;
    if (!primary?.expiryDate) return;
    if (primary.status === "expired") return;

    const daysLeft = dayDiff(istToday(), primary.expiryDate);
    if (!Number.isFinite(daysLeft) || daysLeft < 0 || daysLeft > 7) return;
    // Smallest milestone that has already been reached (t >= daysLeft): exact
    // on the milestone day, catch-up if the member opens the app between
    // milestones. Never fires a milestone early.
    const threshold = THRESHOLD_DAYS.find((t) => t >= daysLeft);
    if (threshold === undefined) return;

    const batchId = `renewal:${userId}:${primary.expiryDate}:${threshold}`;
    const existing = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(eq(notificationsTable.batchId, batchId))
      .limit(1);
    if (existing.length > 0) return;

    const when =
      daysLeft <= 0
        ? "today"
        : daysLeft === 1
          ? "tomorrow"
          : `in ${daysLeft} days`;
    await db.insert(notificationsTable).values({
      recipientType: "user",
      recipientId: userId,
      title: daysLeft <= 1 ? "Your plan is about to expire" : "Plan renewal reminder",
      body: `Your ${primary.planName || "membership"} plan expires ${when} (${istDateLabel(primary.expiryDate)}). Renew now to keep training without a break.`,
      link: "",
      batchId,
      createdByAdminId: null,
    });
  } catch (err) {
    logger.warn({ err, userId }, "renewal reminder generation failed");
  }
}
