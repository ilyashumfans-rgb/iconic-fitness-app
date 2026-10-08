import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { istDateOf, renewalWindow } from "./renewalPolicy";
import { maybeRemindMembership, pickCurrentYoactivTerm, rememberRenewalCandidate, yoactivSourceKey } from "./renewalStore";
import {
  fetchYoactivMemberByMobile,
  yoactivConfigured,
} from "./yoactiv";
import { logger } from "./logger";

// Renewal reminders are generated lazily when the member's app polls their
// notification feed (no cron infra): if the member's YoActiv plan expires
// within one of the thresholds below, an in-app notification row is inserted
// once per (user, expiry date, threshold). The mobile bell polls every 60s and
// fires a local sound notification for any new row, so reminders both appear
// in the feed and audibly nudge the member.
// Milestones and dedupe live in renewalPolicy/renewalStore.

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
    const primary = profile ? pickCurrentYoactivTerm(profile, istDateOf(new Date())) : null;
    if (!primary?.expiryDate) return;
    if (primary.status === "expired") return;

    const candidate = {
      source: "yoactiv" as const,
      sourceKey: yoactivSourceKey(primary),
      planName: primary.planName,
      expiry: primary.expiryDate,
      checkedAt: Date.now(),
    };
    // Feed the bounded background sweep so reminders keep arriving while the
    // app is closed; then fire today's milestone (10/7/3/1/0) if due.
    const w = renewalWindow(primary.expiryDate, istDateOf(new Date()));
    await rememberRenewalCandidate(userId, w.expired ? null : candidate);
    await maybeRemindMembership(userId, candidate, istDateOf(new Date()));
  } catch (err) {
    logger.warn({ err, userId }, "renewal reminder generation failed");
  }
}
