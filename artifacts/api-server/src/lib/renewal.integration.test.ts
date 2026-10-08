// Integration tests against the DEV database with disposable records (random
// high user ids, cleaned up afterwards). The Expo push endpoint is mocked; no
// payments or real pushes are made. Skipped in production or without a DB.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";
import { and, eq, inArray, like } from "drizzle-orm";
import { appSettingsTable, db, notificationsTable, packageBookingsTable, pool } from "@workspace/db";
import { addDays, classifySourceBookings, istDateOf, snapshotKey } from "./renewalPolicy";
import {
  insertReminderOnce,
  listSourceBookings,
  maybeRemindMembership,
  saveRenewalSnapshot,
} from "./renewalStore";
import { checkPushReceipts, registerPushToken, tokenKey, tokensForUser, type FetchLike } from "./pushNotifications";

const skip = !process.env.DATABASE_URL || process.env.NODE_ENV === "production";
const uid = 2_000_000_000 + Math.floor(Math.random() * 100_000_000);
const bookingIds: number[] = [];
const pushToken = `ExponentPushToken[test${randomBytes(8).toString("hex")}]`;

type Sent = { url: string; body: unknown };
function mockExpo(behaviour: "ok" | "unregistered", receipt?: "unregistered"): { fetch: FetchLike; calls: Sent[] } {
  const calls: Sent[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    const body = JSON.parse(init.body) as unknown;
    calls.push({ url, body });
    if (url.endsWith("/getReceipts")) {
      const ids = (body as { ids: string[] }).ids;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: Object.fromEntries(
            ids.map((id) => [id, receipt ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok" }]),
          ),
        }),
      };
    }
    const msgs = body as unknown[];
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: msgs.map(() =>
          behaviour === "ok"
            ? { status: "ok", id: `tkt-${randomBytes(6).toString("hex")}` }
            : { status: "error", details: { error: "DeviceNotRegistered" } },
        ),
      }),
    };
  };
  return { fetch: fetchImpl, calls };
}

async function makeBooking(startDate: string, status: "pending" | "paid"): Promise<number> {
  const [b] = await db
    .insert(packageBookingsTable)
    .values({ token: randomBytes(24).toString("hex"), userId: uid, gymId: 0, startDate, status, packageName: "Test Plan" })
    .returning();
  bookingIds.push(b!.id);
  return b!.id;
}

after(async () => {
  if (skip) return;
  await db.delete(notificationsTable).where(and(eq(notificationsTable.recipientType, "user"), eq(notificationsTable.recipientId, uid)));
  if (bookingIds.length) {
    await db.delete(appSettingsTable).where(inArray(appSettingsTable.key, bookingIds.map((id) => snapshotKey("membership", id))));
    await db.delete(packageBookingsTable).where(inArray(packageBookingsTable.id, bookingIds));
  }
  await db.delete(appSettingsTable).where(eq(appSettingsTable.key, tokenKey(pushToken)));
  await db.delete(appSettingsTable).where(like(appSettingsTable.key, "push:ticket:tkt-%"));
  await pool.end();
});

test("concurrent reminder inserts for one batch create exactly one feed row", { skip }, async () => {
  const batchId = `renewal:${uid}:test:concurrency`;
  const results = await Promise.all(
    Array.from({ length: 6 }, () => insertReminderOnce({ userId: uid, batchId, title: "t", body: "b" })),
  );
  assert.equal(results.filter(Boolean).length, 1);
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.batchId, batchId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.link, "/my-membership?section=renewal");
});

test("feed row then push to registered token; repeat run neither duplicates nor re-pushes", { skip }, async () => {
  await registerPushToken(uid, pushToken, "android");
  const today = istDateOf(new Date());
  const expiry = addDays(today, 3);
  const m = mockExpo("ok");
  const src = { sourceKey: "901:Gym:Push Plan", planName: "Push Plan", expiry };
  assert.equal(await maybeRemindMembership(uid, src, today, m.fetch), true);
  assert.equal(m.calls.length, 1);
  const msg = (m.calls[0]!.body as Array<{ to: string; data: { link: string } }>)[0]!;
  assert.equal(msg.to, pushToken);
  assert.equal(msg.data.link, "/my-membership?section=renewal");
  assert.equal(await maybeRemindMembership(uid, src, today, m.fetch), false);
  assert.equal(m.calls.length, 1);
});

test("reminders outside the 10-day window or after expiry are not created", { skip }, async () => {
  const today = istDateOf(new Date());
  assert.equal(await maybeRemindMembership(uid, { sourceKey: "901:Gym:Far", planName: "Far", expiry: addDays(today, 11) }, today), false);
  assert.equal(await maybeRemindMembership(uid, { sourceKey: "901:Gym:Past", planName: "Past", expiry: addDays(today, -1) }, today), false);
});

test("a paid same-date purchase for a DIFFERENT source does not stop reminders; exact source paid does", { skip }, async () => {
  const today = istDateOf(new Date());
  const expiry = addDays(today, 7);
  const next = addDays(expiry, 1);
  const otherId = await makeBooking(next, "paid");
  await saveRenewalSnapshot({
    kind: "membership", mode: "renew", userId: uid, bookingId: otherId,
    sourceIdentity: "902:Gym:Other Plan", sourceExpiry: expiry, nextStartDate: next,
    packageId: 1, listedPriceInr: 100, createdAt: new Date().toISOString(), urlState: "ready",
  });
  const srcA = { sourceKey: "901:Gym:Source A", planName: "A", expiry };
  assert.equal(await maybeRemindMembership(uid, srcA, today), true, "other-source payment must not stop A");

  const srcB = { sourceKey: "901:Gym:Source B", planName: "B", expiry };
  const paidB = await makeBooking(next, "paid");
  await saveRenewalSnapshot({
    kind: "membership", mode: "renew", userId: uid, bookingId: paidB,
    sourceIdentity: srcB.sourceKey, sourceExpiry: expiry, nextStartDate: next,
    packageId: 2, listedPriceInr: 100, createdAt: new Date().toISOString(), urlState: "ready",
  });
  assert.equal(await maybeRemindMembership(uid, srcB, today), false, "paid renewal of B stops B");

  // Pending (not paid) renewal does not stop reminders.
  const srcC = { sourceKey: "901:Gym:Source C", planName: "C", expiry };
  const pendC = await makeBooking(next, "pending");
  await saveRenewalSnapshot({
    kind: "membership", mode: "renew", userId: uid, bookingId: pendC,
    sourceIdentity: srcC.sourceKey, sourceExpiry: expiry, nextStartDate: next,
    packageId: 3, listedPriceInr: 100, createdAt: new Date().toISOString(), urlState: "ready",
  });
  assert.equal(await maybeRemindMembership(uid, srcC, today), true);
});

test("source context: listing is scoped to user + exact source; fresh pending link is reused", { skip }, async () => {
  const today = istDateOf(new Date());
  const expiry = addDays(today, 20);
  const next = addDays(expiry, 1);
  const id = await makeBooking(next, "pending");
  await saveRenewalSnapshot({
    kind: "membership", mode: "upgrade", userId: uid, bookingId: id,
    sourceIdentity: "901:Gym:Ctx", sourceExpiry: expiry, nextStartDate: next,
    packageId: 44, listedPriceInr: 15000, createdAt: new Date().toISOString(),
    urlState: "ready", paymentUrl: "https://pay.example.test/x", urlCreatedAt: new Date().toISOString(),
  });
  const rows = await listSourceBookings("membership", uid, "901:Gym:Ctx", expiry);
  assert.equal(rows.length, 1);
  assert.equal((await listSourceBookings("membership", uid + 1, "901:Gym:Ctx", expiry)).length, 0, "other user sees nothing");
  assert.equal((await listSourceBookings("membership", uid, "901:Gym:Ctx", addDays(expiry, 1))).length, 0, "other expiry sees nothing");
  const c = classifySourceBookings(rows, { userId: uid, mode: "upgrade", packageId: 44, now: Date.now() });
  assert.equal(c.reuse?.booking.id, id);
  const later = classifySourceBookings(rows, { userId: uid, mode: "upgrade", packageId: 44, now: Date.now() + 5 * 60_000 });
  assert.equal(later.reuse, null);
  assert.deepEqual(later.expireIds, [id]);
});

test("DeviceNotRegistered tickets and receipts remove the token", { skip }, async () => {
  await registerPushToken(uid, pushToken, "android");
  const today = istDateOf(new Date());
  const m = mockExpo("unregistered");
  await maybeRemindMembership(uid, { sourceKey: "901:Gym:Dead", planName: "Dead", expiry: addDays(today, 1) }, today, m.fetch);
  assert.equal((await tokensForUser(uid)).length, 0);

  // Receipt path: register again, seed an aged ticket, receipt says unregistered.
  await registerPushToken(uid, pushToken, "ios");
  await db.insert(appSettingsTable).values({
    key: "push:ticket:tkt-aged",
    value: JSON.stringify({ tokenKey: tokenKey(pushToken), createdAt: Date.now() - 20 * 60_000 }),
  }).onConflictDoNothing();
  const r = mockExpo("ok", "unregistered");
  await checkPushReceipts(r.fetch);
  assert.equal((await tokensForUser(uid)).length, 0);
});

test("registering a token for another account moves it (shared phone)", { skip }, async () => {
  await registerPushToken(uid, pushToken, "android");
  await registerPushToken(uid + 1, pushToken, "android");
  assert.equal((await tokensForUser(uid)).length, 0);
  assert.equal((await tokensForUser(uid + 1)).length, 1);
});

import { pickCurrentYoactivTerm } from "./renewalStore";

test("YoActiv renewal context keeps the running term until the paid future term starts", { skip }, () => {
  const row = (planName: string, startDate: string, expiryDate: string) => ({
    branchId: 9, branchName: "B", serviceName: "Gym", planName, status: "active" as const,
    startDate, expiryDate, sessionsTotal: null, sessionsUsed: null, billId: planName,
    invoiceDate: null, amountInr: null, discountInr: null,
  });
  const profile = {
    memberId: 1, name: "T", mobile: "9999999999", photoUrl: null,
    memberships: [row("Future", "2025-03-03", "2025-06-02"), row("Current", "2024-12-03", "2025-03-02")],
  } as unknown as Parameters<typeof pickCurrentYoactivTerm>[0];
  assert.equal(pickCurrentYoactivTerm(profile, "2025-02-25")?.planName, "Current");
  assert.equal(pickCurrentYoactivTerm(profile, "2025-03-02")?.planName, "Current");
  assert.equal(pickCurrentYoactivTerm(profile, "2025-03-03")?.planName, "Future");
});
