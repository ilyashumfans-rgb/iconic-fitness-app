import { and, asc, eq, gte, inArray, isNotNull, lte, like, sql } from "drizzle-orm";
import {
  appSettingsTable,
  db,
  notificationsTable,
  packageBookingsTable,
  pool,
  ptMembershipsTable,
  trainerBookingsTable,
  usersTable,
} from "@workspace/db";
import {
  fetchYoactivMemberByMobile,
  pickCurrentMembership,
  yoactivConfigured,
  type YoactivMemberProfile,
  type YoactivMembership,
} from "./yoactiv";
import { logger } from "./logger";
import { checkPushReceipts, sendPushToUser, type FetchLike } from "./pushNotifications";
import {
  RENEWAL_LINK,
  RENEWAL_WINDOW_DAYS,
  addDays,
  dueMilestone,
  isIsoDate,
  istDateOf,
  reminderBatchId,
  reminderDue,
  classifySourceBookings,
  snapshotKey,
  type RenewalSnapshot,
  type SourceBooking,
} from "./renewalPolicy";

// ─── Renewal snapshots (app_settings; no schema churn) ──────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Exec = typeof db | Tx;

export async function saveRenewalSnapshot(s: RenewalSnapshot, exec: Exec = db): Promise<void> {
  const value = JSON.stringify(s);
  await exec
    .insert(appSettingsTable)
    .values({ key: snapshotKey(s.kind, s.bookingId), value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
}

export async function patchRenewalSnapshot(
  kind: "membership" | "pt",
  bookingId: number,
  patch: Partial<RenewalSnapshot>,
  exec: Exec = db,
): Promise<void> {
  const current = await loadRenewalSnapshot(kind, bookingId, exec);
  if (current) await saveRenewalSnapshot({ ...current, ...patch }, exec);
}

export async function loadRenewalSnapshot(
  kind: "membership" | "pt",
  bookingId: number,
  exec: Exec = db,
): Promise<RenewalSnapshot | null> {
  const [row] = await exec
    .select({ value: appSettingsTable.value })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, snapshotKey(kind, bookingId)));
  try {
    return row?.value ? (JSON.parse(row.value) as RenewalSnapshot) : null;
  } catch {
    return null;
  }
}

/** Serialise checkout create/resume per exact source term (xact advisory lock). */
export async function withSourceLock<T>(lockKey: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
    return fn(tx);
  });
}

/** Checkouts recorded for one exact source term, joined to their booking rows. */
export async function listSourceBookings(
  kind: "membership" | "pt",
  userId: number,
  sourceIdentity: string,
  sourceExpiry: string,
  exec: Exec = db,
): Promise<SourceBooking[]> {
  const snaps = await exec
    .select({ value: appSettingsTable.value })
    .from(appSettingsTable)
    .where(
      and(
        like(appSettingsTable.key, `renewal:snapshot:${kind}:%`),
        sql`(${appSettingsTable.value})::jsonb->>'userId' = ${String(userId)}`,
        sql`(${appSettingsTable.value})::jsonb->>'sourceIdentity' = ${sourceIdentity}`,
        sql`(${appSettingsTable.value})::jsonb->>'sourceExpiry' = ${sourceExpiry}`,
      ),
    )
    .limit(50);
  const parsed: RenewalSnapshot[] = [];
  for (const r of snaps) {
    try {
      parsed.push(JSON.parse(r.value ?? "") as RenewalSnapshot);
    } catch {
      /* ignore corrupt row */
    }
  }
  if (parsed.length === 0) return [];
  const ids = parsed.map((p) => p.bookingId);
  const bookings =
    kind === "membership"
      ? (
          await exec
            .select()
            .from(packageBookingsTable)
            .where(and(inArray(packageBookingsTable.id, ids), eq(packageBookingsTable.userId, userId)))
        ).map((b) => ({ id: b.id, status: b.status, token: b.token, startDate: b.startDate, packageName: b.packageName, userId: b.userId, createdAt: b.createdAt }))
      : (
          await exec
            .select()
            .from(trainerBookingsTable)
            .where(and(inArray(trainerBookingsTable.id, ids), eq(trainerBookingsTable.userId, userId)))
        ).map((b) => ({ id: b.id, status: b.status, token: b.token, startDate: b.preferredDate, packageName: b.packageName, userId: b.userId, createdAt: b.createdAt }));
  const byId = new Map(bookings.map((b) => [b.id, b]));
  return parsed
    .filter((p) => byId.has(p.bookingId))
    .map((snap) => ({ snap, booking: byId.get(snap.bookingId)! }))
    .sort((x, y) => Date.parse(y.snap.createdAt) - Date.parse(x.snap.createdAt));
}

/** Trusted paid evidence only: a paid booking row tied to this exact source term. */
export async function paidRenewalFor(
  kind: "membership" | "pt",
  userId: number,
  sourceIdentity: string,
  sourceExpiry: string,
  exec: Exec = db,
): Promise<SourceBooking | null> {
  const rows = await listSourceBookings(kind, userId, sourceIdentity, sourceExpiry, exec);
  return classifySourceBookings(rows, { userId, mode: "renew", packageId: -1, now: Date.now() }).paid;
}

export async function hasPaidMembershipRenewal(userId: number, sourceIdentity: string, expiry: string): Promise<boolean> {
  return !!(await paidRenewalFor("membership", userId, sourceIdentity, expiry));
}

export async function hasPaidPtRenewal(userId: number, sourceIdentity: string, expiry: string): Promise<boolean> {
  return !!(await paidRenewalFor("pt", userId, sourceIdentity, expiry));
}

/** Newest checkout for this source term (paid wins) for display. */
export async function latestMembershipRenewal(userId: number, sourceIdentity: string, expiry: string) {
  const rows = (await listSourceBookings("membership", userId, sourceIdentity, expiry)).filter(
    (r) => r.booking.startDate === r.snap.nextStartDate,
  );
  return rows.find((r) => r.booking.status === "paid") ?? rows[0] ?? null;
}

/** Expire stale links / fail orphans found under the lock. */
export async function settleStaleCheckouts(
  kind: "membership" | "pt",
  expireIds: number[],
  orphanIds: number[],
  tx: Tx,
): Promise<void> {
  for (const id of expireIds) {
    // The booking stays pending: only the gateway landing may decide paid or
    // failed. We just stop offering the old link.
    await patchRenewalSnapshot(kind, id, { urlState: "expired" }, tx);
  }
  for (const id of orphanIds) {
    await patchRenewalSnapshot(kind, id, { urlState: "gateway_failed" }, tx);
    // No hosted link was ever produced, so this row can't be paid.
    if (kind === "membership") {
      await tx.update(packageBookingsTable).set({ status: "failed" }).where(and(eq(packageBookingsTable.id, id), eq(packageBookingsTable.status, "pending")));
    } else {
      await tx.update(trainerBookingsTable).set({ status: "failed" }).where(and(eq(trainerBookingsTable.id, id), eq(trainerBookingsTable.status, "pending")));
    }
  }
}

/** Renewal source term (running term authoritative until the next start). */
export function pickCurrentYoactivTerm(profile: YoactivMemberProfile, today: string): YoactivMembership | null {
  return pickCurrentMembership(profile, today)?.membership ?? null;
}

// ─── Candidate cache (bounded scheduler input) ──────────────────────────────

type Candidate = {
  source: "yoactiv";
  sourceKey: string;
  planName: string;
  expiry: string;
  checkedAt: number;
};

const candidateKey = (userId: number) => `renewal:candidate:${userId}`;

export async function rememberRenewalCandidate(userId: number, c: Candidate | null): Promise<void> {
  if (!c) {
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, candidateKey(userId)));
    return;
  }
  await db
    .insert(appSettingsTable)
    .values({ key: candidateKey(userId), value: JSON.stringify(c) })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: JSON.stringify(c), updatedAt: new Date() },
    });
}

// ─── Deduped in-app reminder insert ──────────────────────────────────────────

/** Insert one notification per batchId, serialised by a transaction advisory lock. */
export async function insertReminderOnce(input: {
  userId: number;
  batchId: string;
  title: string;
  body: string;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.batchId}))`);
    const [existing] = await tx
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(eq(notificationsTable.batchId, input.batchId))
      .limit(1);
    if (existing) return false;
    await tx.insert(notificationsTable).values({
      recipientType: "user",
      recipientId: input.userId,
      title: input.title,
      body: input.body,
      link: RENEWAL_LINK,
      batchId: input.batchId,
      createdByAdminId: null,
    });
    return true;
  });
}

function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function whenText(milestoneDaysLeft: number): string {
  return milestoneDaysLeft <= 0 ? "today" : milestoneDaysLeft === 1 ? "tomorrow" : `in ${milestoneDaysLeft} days`;
}

/** Feed row first (always), then push to registered devices for new rows only. */
async function remindAndPush(
  input: { userId: number; batchId: string; title: string; body: string },
  fetchImpl?: FetchLike,
): Promise<boolean> {
  const inserted = await insertReminderOnce(input);
  if (inserted) {
    await sendPushToUser(input.userId, { title: input.title, body: input.body, link: RENEWAL_LINK }, fetchImpl);
  }
  return inserted;
}

export async function maybeRemindMembership(
  userId: number,
  c: { sourceKey: string; planName: string; expiry: string },
  today: string,
  fetchImpl?: FetchLike,
): Promise<boolean> {
  if (dueMilestone(c.expiry, today) === null) return false;
  const milestone = reminderDue(c.expiry, today, await hasPaidMembershipRenewal(userId, c.sourceKey, c.expiry));
  if (milestone === null) return false;
  const daysLeft = Math.round((Date.parse(`${c.expiry}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return remindAndPush({
    userId,
    batchId: reminderBatchId(userId, "yoactiv", c.sourceKey, c.expiry, milestone),
    title: daysLeft <= 1 ? "Your plan is about to expire" : "Plan renewal reminder",
    body: `Your ${c.planName || "membership"} plan expires ${whenText(daysLeft)} (${dateLabel(c.expiry)}). Renew now and your new term starts the day after, with no days lost.`,
  }, fetchImpl);
}

export function yoactivSourceKey(m: { branchId: number; serviceName: string; planName: string }): string {
  return `${m.branchId}:${m.serviceName}:${m.planName}`;
}

// ─── Bounded periodic sweep ──────────────────────────────────────────────────

const SWEEP_LOCK_ID = 74_210_331; // arbitrary constant for pg_try_advisory_lock
const MAX_CANDIDATES_PER_RUN = 500;
const MAX_UPSTREAM_REFRESH_PER_RUN = 25;
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;

export async function runRenewalSweep(now = new Date()): Promise<{ sent: number }> {
  const client = await pool.connect();
  let sent = 0;
  try {
    const lock = await client.query<{ ok: boolean }>("select pg_try_advisory_lock($1) as ok", [SWEEP_LOCK_ID]);
    if (!lock.rows[0]?.ok) return { sent };
    try {
      const today = istDateOf(now);
      const horizon = addDays(today, RENEWAL_WINDOW_DAYS);

      // YoActiv members seen recently (cache filled by app opens / feed polls).
      const rows = await db
        .select({ key: appSettingsTable.key, value: appSettingsTable.value })
        .from(appSettingsTable)
        .where(and(
          like(appSettingsTable.key, "renewal:candidate:%"),
          sql`${appSettingsTable.value}::jsonb->>'expiry' >= ${today}`,
          sql`${appSettingsTable.value}::jsonb->>'expiry' <= ${horizon}`,
        ))
        .orderBy(asc(appSettingsTable.updatedAt), asc(appSettingsTable.key))
        .limit(MAX_CANDIDATES_PER_RUN);
      // Rotate examined candidates, including failed upstream reads. Otherwise
      // a fixed first page can permanently starve later members.
      if (rows.length) {
        await db.update(appSettingsTable).set({ updatedAt: now })
          .where(inArray(appSettingsTable.key, rows.map(row => row.key)));
      }
      let refreshes = 0;
      for (const row of rows) {
        const userId = Number(row.key.split(":")[2]);
        let c: Candidate;
        try {
          c = JSON.parse(row.value ?? "") as Candidate;
        } catch {
          continue;
        }
        if (!Number.isInteger(userId) || !isIsoDate(c.expiry)) continue;
        if (c.expiry < today || c.expiry > horizon) continue;
        // Re-verify stale entries upstream, bounded per run. An upstream
        // error never counts as truth: skip this user until the next run.
        if (Date.now() - c.checkedAt > REFRESH_AFTER_MS && yoactivConfigured()) {
          if (refreshes >= MAX_UPSTREAM_REFRESH_PER_RUN) continue;
          refreshes++;
          try {
            const [u] = await db.select({ mobile: usersTable.mobile }).from(usersTable).where(eq(usersTable.id, userId));
            const profile = await fetchYoactivMemberByMobile(u?.mobile, { throwOnError: true });
            const primary = profile ? pickCurrentYoactivTerm(profile, today) : null;
            if (!primary?.expiryDate || primary.status === "expired") {
              await rememberRenewalCandidate(userId, null);
              continue;
            }
            c = {
              source: "yoactiv",
              sourceKey: yoactivSourceKey(primary),
              planName: primary.planName,
              expiry: primary.expiryDate,
              checkedAt: Date.now(),
            };
            await rememberRenewalCandidate(userId, c);
          } catch (err) {
            logger.warn({ err, userId }, "renewal sweep: upstream refresh failed");
            continue;
          }
        }
        try {
          if (await maybeRemindMembership(userId, c, today)) sent++;
        } catch (err) {
          logger.warn({ err, userId }, "renewal sweep: reminder failed");
        }
      }

      // Local PT plans (DB only, account-linked via the originating booking).
      const cursorKey = "renewal:sweep:pt-cursor";
      const [savedCursor] = await db.select({ value: appSettingsTable.value }).from(appSettingsTable)
        .where(eq(appSettingsTable.key, cursorKey));
      const parsedCursor = Number(savedCursor?.value ?? 0);
      const cursor = Number.isSafeInteger(parsedCursor) && parsedCursor >= 0 ? parsedCursor : 0;
      const pt = await db
        .select({ m: ptMembershipsTable, userId: trainerBookingsTable.userId })
        .from(ptMembershipsTable)
        .innerJoin(trainerBookingsTable, eq(ptMembershipsTable.bookingId, trainerBookingsTable.id))
        .where(
          and(
            eq(ptMembershipsTable.paymentStatus, "paid"),
            gte(ptMembershipsTable.id, cursor + 1),
            isNotNull(trainerBookingsTable.userId),
            gte(ptMembershipsTable.endDate, today),
            lte(ptMembershipsTable.endDate, horizon),
          ),
        )
        .orderBy(asc(ptMembershipsTable.id))
        .limit(MAX_CANDIDATES_PER_RUN);
      const nextCursor = String(pt.length < MAX_CANDIDATES_PER_RUN ? 0 : pt[pt.length - 1]!.m.id);
      await db.insert(appSettingsTable).values({ key: cursorKey, value: nextCursor })
        .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: nextCursor, updatedAt: now } });
      for (const { m, userId } of pt) {
        if (!userId) continue;
        try {
          if (await maybeRemindPt(userId, m, today)) sent++;
        } catch (err) {
          logger.warn({ err, userId }, "renewal sweep: PT reminder failed");
        }
      }
      try {
        await checkPushReceipts();
      } catch (err) {
        logger.warn({ err }, "renewal sweep: push receipts failed");
      }
    } finally {
      await client.query("select pg_advisory_unlock($1)", [SWEEP_LOCK_ID]);
    }
  } finally {
    client.release();
  }
  return { sent };
}

export async function maybeRemindPt(
  userId: number,
  m: { id: number; packageName: string; endDate: string },
  today: string,
  fetchImpl?: FetchLike,
): Promise<boolean> {
  if (dueMilestone(m.endDate, today) === null) return false;
  const milestone = reminderDue(m.endDate, today, await hasPaidPtRenewal(userId, `pt-local:${m.id}`, m.endDate));
  if (milestone === null) return false;
  const daysLeft = Math.round((Date.parse(`${m.endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return remindAndPush({
    userId,
    batchId: reminderBatchId(userId, "pt-local", String(m.id), m.endDate, milestone),
    title: "PT plan renewal reminder",
    body: `Your ${m.packageName || "PT"} plan ends ${whenText(daysLeft)} (${dateLabel(m.endDate)}). Renew to keep your sessions going.`,
  }, fetchImpl);
}

let started = false;
const SWEEP_EVERY_MS = 30 * 60 * 1000;

/**
 * In-process bounded scheduler started from the existing API process
 * lifecycle (no extra workflow). Multi-instance safe via the advisory lock;
 * dedupe is enforced per batchId in insertReminderOnce.
 */
export function startRenewalScheduler(): void {
  if (started || process.env.NODE_ENV === "test" || process.env.RENEWAL_SCHEDULER === "off") return;
  started = true;
  const tick = () => {
    void runRenewalSweep().catch((err) => logger.warn({ err }, "renewal sweep failed"));
  };
  setTimeout(tick, 60_000).unref();
  setInterval(tick, SWEEP_EVERY_MS).unref();
}
