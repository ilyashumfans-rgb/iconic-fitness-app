import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { db, pool, appSettingsTable, staffTable, gymsTable } from "@workspace/db";
import { ensureNetworkCoachSchema } from "./networkCoachSchema";
import {
  amountMatches, istToUtc, joinWindowOpen, networkOrderRef, isNetworkOrderRef, scrubContact, getPrices, setPrices, openSlotsFor,
  createSlots, reserveSlot, settlePayment, deleteSlot, completeBooking, addReview, bookingForCall, cancelByMember, authorizedTrainer,
  savePlan, createPlanPurchase, settlePlanPayment, publishedPlansFor, memberPlans, adminPlans, adminNetworkSlots, deletePlan, addTerm, planInput,
  type RosterFn,
} from "./networkCoach";
import { issueCallToken, type Minter } from "./networkCall";
import { categoryKey, assignmentKey, updateCategory, setNetworkCapability, getCategory } from "./coachCategories";
import { onlineBilling } from "./onlineBilling";

// Disposable DEVELOPMENT fixtures: unique trainer ids/category, fake roster + fake LiveKit minter. No network, payments or calls.
const tag = `nctest${randomBytes(4).toString("hex")}`;
const GYM = 2_000_000_000 + Math.floor(Math.random() * 1000);
const TRAINER = `${tag}-T1`;
const CAT = `${tag}-cat`;
const roster = (async () => [{ id: TRAINER, name: "Test Coach", staffId: -1 }]) as unknown as RosterFn;
const minted: { identity: string; room: string; ttlSeconds: number }[] = [];
const fakeMint: Minter = async a => { minted.push(a); return `fake.${a.identity}`; };
const tr = { staffId: -1, gymId: GYM, trainerId: TRAINER };

async function futureSlot(daysAhead: number, time = "10:00", duration: 30 | 45 | 60 = 60) {
  const d = new Date(Date.now() + daysAhead * 86_400_000 + 330 * 60_000).toISOString().slice(0, 10);
  await createSlots(tr, { date: d, startTime: time, durationMinutes: duration, repeatWeeks: 0 });
  const { rows } = await pool.query(`SELECT id FROM network_coach_slots WHERE trainer_id=$1 AND starts_at=$2 LIMIT 1`, [TRAINER, istToUtc(d, time)]);
  return rows[0].id as number;
}
const status = async (id: number) => (await pool.query(`SELECT status, refund_status FROM network_coach_bookings WHERE id=$1`, [id])).rows[0];
const refOf = async (id: number) => (await pool.query(`SELECT airpay_order_ref, amount_inr FROM network_coach_bookings WHERE id=$1`, [id])).rows[0];

before(async () => {
  await ensureNetworkCoachSchema(pool);
  await db.insert(appSettingsTable).values({ key: categoryKey(CAT), value: JSON.stringify({ id: CAT, title: "Test Network", summary: "", benefits: [], details: "", imageUrl: "", published: true, sortOrder: 9999, networkCoach: true }) });
  await setPrices({ "30": 499, "45": 699, "60": 899 }, CAT);
  await db.insert(appSettingsTable).values({ key: assignmentKey(GYM, TRAINER), value: JSON.stringify({ categoryIds: [CAT] }) });
});
after(async () => {
  await pool.query(`DELETE FROM network_coach_reviews WHERE trainer_id LIKE $1`, [`${tag}%`]);
  await pool.query(`DELETE FROM network_coach_bookings WHERE trainer_id LIKE $1`, [`${tag}%`]);
  await pool.query(`DELETE FROM network_coach_slots WHERE trainer_id LIKE $1`, [`${tag}%`]);
  await pool.query(`DELETE FROM network_coach_plan_purchases WHERE trainer_id LIKE $1`, [`${tag}%`]);
  await pool.query(`DELETE FROM network_coach_plans WHERE name LIKE $1`, [`${tag}%`]);
  await db.delete(appSettingsTable).where(eq(appSettingsTable.key, categoryKey(CAT)));
  await db.delete(appSettingsTable).where(like(appSettingsTable.key, `coach_category_assign:${GYM}:%`));
  await db.delete(appSettingsTable).where(eq(appSettingsTable.key, `network_coach_prices:${CAT}`));
  await pool.end();
});

test("prepaid plan purchase settles once and grants zero-charge bookings only for the bound trainer", async () => {
  assert.equal(addTerm(new Date("2032-01-31T12:00:00Z"), 1, "month").toISOString(), "2032-02-29T12:00:00.000Z");
  assert.equal(addTerm(new Date("2032-01-01T12:00:00Z"), 2, "week").toISOString(), "2032-01-15T12:00:00.000Z");
  const p = await savePlan(null, { categoryId: CAT, name: `${tag} Starter`, duration: 2, durationUnit: "week", priceInr: 2345, published: true });
  const purchase = await createPlanPurchase(-707, TRAINER, GYM, p.id, roster);
  const row = await pool.query(`SELECT airpay_order_ref FROM network_coach_plan_purchases WHERE id=$1`, [purchase.id]);
  const orderId = row.rows[0].airpay_order_ref as string;
  assert.equal((await settlePlanPayment({ ok: true, orderId, airpayTxnId: `${tag}-txn`, amountInr: 2345, merchantId: "merchant" }, "merchant")).outcome, "paid");
  assert.equal((await settlePlanPayment({ ok: true, orderId, airpayTxnId: `${tag}-txn`, amountInr: 2345, merchantId: "merchant" }, "merchant")).outcome, "noop");
  const active = await publishedPlansFor(-707, TRAINER, GYM, CAT);
  assert.equal(active.entitlement?.planName, `${tag} Starter`);
  assert.equal(active.plans.length, 0);
  assert.equal((await memberPlans(-707))[0]?.status, "active");
  assert.ok(Array.isArray(await adminNetworkSlots()));
  const slot = await futureSlot(13);
  const booked = await reserveSlot(-707, slot, roster);
  assert.equal(booked.status, "paid");
  assert.equal(booked.amount_inr, 0);
  assert.ok(booked.plan_entitlement_id);
  assert.equal(booked.airpay_order_ref, "");
  assert.equal((await adminPlans()).some(x => x.id === p.id), true);
  const late = await createPlanPurchase(-708, TRAINER, GYM, p.id, roster);
  const lateRow = await pool.query(`SELECT airpay_order_ref FROM network_coach_plan_purchases WHERE id=$1`,[late.id]);
  await pool.query(`UPDATE network_coach_plan_purchases SET hold_expires_at=now()-interval '1 minute' WHERE id=$1`,[late.id]);
  assert.equal((await settlePlanPayment({ok:true,orderId:lateRow.rows[0].airpay_order_ref,airpayTxnId:`${tag}-late`,amountInr:2345,merchantId:"merchant"},"merchant")).outcome,"conflict");
  const lateState = await pool.query(`SELECT status,refund_status FROM network_coach_plan_purchases WHERE id=$1`,[late.id]);
  assert.equal(lateState.rows[0].status,"paid_conflict");
  assert.equal(lateState.rows[0].refund_status,"pending_admin");
  await deletePlan(p.id);
  assert.equal((await publishedPlansFor(-708, TRAINER, GYM, CAT)).plans.length, 0);
});

test("plan validation rejects non-positive terms and prices", () => {
  assert.throws(() => planInput.parse({ categoryId: CAT, name: "Bad", duration: 0, durationUnit: "month", priceInr: 5, published: false }));
  assert.throws(() => planInput.parse({ categoryId: CAT, name: "Bad", duration: 1, durationUnit: "month", priceInr: 0, published: false }));
  assert.throws(() => planInput.parse({ name: "Bad", duration: 1, durationUnit: "month", priceInr: 10, published: false }));
});

test("category pricing, plans and entitlements stay isolated for a coach offering both categories", async () => {
  const cat2 = `${tag}-cat2`;
  const original = await getPrices(CAT);
  await db.insert(appSettingsTable).values({ key: categoryKey(cat2), value: JSON.stringify({ id: cat2, title: "Test Yoga", summary: "", benefits: [], details: "", imageUrl: "", published: true, sortOrder: 9999, networkCoach: true }) });
  try {
    assert.deepEqual(await getPrices(cat2), { "30": null, "45": null, "60": null });
    await setPrices({ "30": 1200, "45": 1500, "60": 1800 }, cat2);
    assert.deepEqual(await getPrices(CAT), original);
    await db.update(appSettingsTable).set({ value: JSON.stringify({ categoryIds: [CAT, cat2] }) }).where(eq(appSettingsTable.key, assignmentKey(GYM, TRAINER)));
    const a = await savePlan(null, { categoryId: CAT, name: `${tag} Category A`, duration: 1, durationUnit: "year", priceInr: 2000, published: true });
    const b = await savePlan(null, { categoryId: cat2, name: `${tag} Category B`, duration: 1, durationUnit: "year", priceInr: 4000, published: true });
    assert.equal((await publishedPlansFor(null, TRAINER, GYM, CAT)).plans.some(p => p.id === b.id), false);
    assert.equal((await publishedPlansFor(null, TRAINER, GYM, cat2)).plans.some(p => p.id === b.id), true);
    await assert.rejects(createPlanPurchase(-909, TRAINER, GYM, b.id, roster, CAT), /no longer available/);
    await assert.rejects(savePlan(a.id, { categoryId: cat2, name: `${tag} moved`, duration: 1, durationUnit: "year", priceInr: 20, published: true }));
    const purchaseA = await createPlanPurchase(-909, TRAINER, GYM, a.id, roster, CAT);
    const purchaseB = await createPlanPurchase(-909, TRAINER, GYM, b.id, roster, cat2);
    assert.ok(purchaseA.id && purchaseB.id, "Both categories may have independent holds");
    await settlePlanPayment({ ok: true, orderId: purchaseA.airpayOrderRef, airpayTxnId: `${tag}-catA`, amountInr: 2000, merchantId: "merchant" }, "merchant");
    assert.equal((await publishedPlansFor(-909, TRAINER, GYM, cat2)).entitlement, null);
    const slotB = await futureSlot(42);
    const paidSeparately = await reserveSlot(-909, slotB, roster, new Date(), cat2);
    assert.equal(paidSeparately.amount_inr, 1800);
    assert.equal(paidSeparately.plan_entitlement_id, null);
    await setPrices({ "30": 100, "45": 200, "60": 300 }, cat2);
    assert.equal((await refOf(paidSeparately.id)).amount_inr, 1800, "Held booking retains original price");
    const slotA = await futureSlot(43);
    assert.equal((await reserveSlot(-909, slotA, roster, new Date(), CAT)).amount_inr, 0);
    await deletePlan(a.id);
    assert.ok((await publishedPlansFor(-909, TRAINER, GYM, CAT)).entitlement, "Deleting template preserves paid entitlement");
    await deletePlan(b.id);
    await assert.rejects(reserveSlot(-910, await futureSlot(44), roster, new Date(), "unassigned-category"));
  } finally {
    await db.update(appSettingsTable).set({ value: JSON.stringify({ categoryIds: [CAT] }) }).where(eq(appSettingsTable.key, assignmentKey(GYM, TRAINER)));
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, categoryKey(cat2)));
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, `network_coach_prices:${cat2}`));
  }
});

test("pure policy helpers", () => {
  assert.equal(istToUtc("2030-01-15", "10:00").toISOString(), "2030-01-15T04:30:00.000Z");
  assert.throws(() => istToUtc("2030-02-30", "10:00"));
  assert.throws(() => istToUtc("2030-01-15", "10:10"));
  const s = new Date("2030-01-15T04:30:00Z"), e = new Date("2030-01-15T05:30:00Z");
  assert.equal(joinWindowOpen(s, e, new Date("2030-01-15T04:19:00Z")), false);
  assert.equal(joinWindowOpen(s, e, new Date("2030-01-15T04:21:00Z")), true);
  assert.equal(joinWindowOpen(s, e, new Date("2030-01-15T05:46:00Z")), false);
  assert.equal(amountMatches(899, 899), true);
  assert.equal(amountMatches(899.01, 899), false);
  assert.equal(amountMatches(null, 899), false);
  assert.equal(amountMatches(Number.NaN, 899), false);
  const ref = networkOrderRef(42, 1_760_000_000_000);
  assert.equal(ref, "17600000000000000042"); assert.ok(isNetworkOrderRef(ref)); assert.ok(!isNetworkOrderRef("421760000000000"));
  assert.equal(scrubContact("call me 98450 12345 or a@b.com or pay x@okaxis https://wa.me/1"), "call me [removed] or [removed] or pay [removed] [removed]");
});

test("capacity one: concurrent reservations of one slot → exactly one hold", async () => {
  const slot = await futureSlot(3);
  const r = await Promise.allSettled([reserveSlot(-101, slot, roster), reserveSlot(-102, slot, roster), reserveSlot(-103, slot, roster)]);
  assert.equal(r.filter(x => x.status === "fulfilled").length, 1);
  await assert.rejects(deleteSlot(TRAINER, slot), /booking or payment/);
});

test("amount mismatch rejected; exact amount pays; replay is a no-op", async () => {
  const slot = await futureSlot(4);
  const b = await reserveSlot(-201, slot, roster);
  const { airpay_order_ref: ref, amount_inr: amt } = await refOf(b.id);
  assert.equal(amt, 899);
  assert.equal((await settlePayment({ ok: true, orderId: ref, airpayTxnId: "x", amountInr: 1, merchantId: "M" }, "M")).outcome, "rejected");
  assert.equal((await settlePayment({ ok: true, orderId: ref, airpayTxnId: "x", amountInr: amt, merchantId: "OTHER" }, "M")).outcome, "rejected");
  assert.equal((await status(b.id)).status, "held");
  assert.equal((await settlePayment({ ok: true, orderId: ref, airpayTxnId: "x", amountInr: amt, merchantId: "M" }, "M")).outcome, "paid");
  assert.equal((await settlePayment({ ok: false, orderId: ref, airpayTxnId: "x", amountInr: amt, merchantId: "M" }, "M")).outcome, "noop");
  assert.equal((await status(b.id)).status, "paid");
  assert.equal((await settlePayment({ ok: true, orderId: "123", airpayTxnId: "", amountInr: 1, merchantId: null }, "M")).handled, false);
});

test("expired hold + late payment never double-assigns: conflict → refund pending admin", async () => {
  const slot = await futureSlot(5);
  const first = await reserveSlot(-301, slot, roster);
  await pool.query(`UPDATE network_coach_bookings SET hold_expires_at=now()-interval '1 minute' WHERE id=$1`, [first.id]);
  const second = await reserveSlot(-302, slot, roster);
  const { airpay_order_ref: ref, amount_inr: amt } = await refOf(first.id);
  assert.equal((await settlePayment({ ok: true, orderId: ref, airpayTxnId: "late", amountInr: amt, merchantId: "M" }, "M")).outcome, "conflict");
  assert.deepEqual(await status(first.id), { status: "paid_conflict", refund_status: "pending_admin" });
  assert.equal((await status(second.id)).status, "held");
});

test("expired hold + late payment re-acquires slot when still free", async () => {
  const slot = await futureSlot(6);
  const b = await reserveSlot(-401, slot, roster);
  await pool.query(`UPDATE network_coach_bookings SET hold_expires_at=now()-interval '1 minute' WHERE id=$1`, [b.id]);
  const { airpay_order_ref: ref, amount_inr: amt } = await refOf(b.id);
  assert.equal((await settlePayment({ ok: true, orderId: ref, airpayTxnId: "late", amountInr: amt, merchantId: "M" }, "M")).outcome, "paid");
});

test("late return without lazy expiry cannot confirm a session that already started", async () => {
  const slot = await futureSlot(47);
  const b = await reserveSlot(-4791, slot, roster);
  await pool.query(`UPDATE network_coach_bookings SET hold_expires_at=now()-interval '1 minute', starts_at=now()-interval '1 minute' WHERE id=$1`, [b.id]);
  assert.equal((await status(b.id)).status, "held");
  const { airpay_order_ref: orderId, amount_inr: amountInr } = await refOf(b.id);
  const payment = { ok: true, orderId, amountInr, airpayTxnId: "late-after-start", merchantId: "M" };
  assert.equal((await settlePayment(payment, "M")).outcome, "conflict");
  assert.deepEqual(await status(b.id), { status: "paid_conflict", refund_status: "pending_admin" });
  assert.equal((await settlePayment(payment, "M")).outcome, "noop");
});

test("late return racing a new reservation never gives two members the same slot", async () => {
  const slot = await futureSlot(48);
  const b = await reserveSlot(-4891, slot, roster);
  await pool.query(`UPDATE network_coach_bookings SET hold_expires_at=now()-interval '1 minute' WHERE id=$1`, [b.id]);
  const { airpay_order_ref: orderId, amount_inr: amountInr } = await refOf(b.id);
  const outcomes = await Promise.allSettled([
    settlePayment({ ok: true, orderId, amountInr, airpayTxnId: "late-race", merchantId: "M" }, "M"),
    reserveSlot(-4892, slot, roster),
  ]);
  assert.equal(outcomes[0].status, "fulfilled", "Gateway settlement must not deadlock");
  const active = await pool.query(`SELECT id FROM network_coach_bookings WHERE slot_id=$1 AND status IN ('held','paid','completed')`, [slot]);
  assert.equal(active.rows.length, 1);
});

test("call tokens only for paid participants inside window; completion by assigned trainer only; one review", async () => {
  const slot = await futureSlot(7, "11:00", 30);
  const b = await reserveSlot(-501, slot, roster);
  const unpaid = await bookingForCall(b.id, { userId: -501 });
  await assert.rejects(issueCallToken(unpaid, { identity: "member--501", name: "M" }, fakeMint), /Only paid/);
  const { airpay_order_ref: ref, amount_inr: amt } = await refOf(b.id);
  await settlePayment({ ok: true, orderId: ref, airpayTxnId: "t", amountInr: amt, merchantId: "M" }, "M");
  assert.equal(await bookingForCall(b.id, { userId: -999 }), null);
  assert.equal(await bookingForCall(b.id, { trainerId: "someone-else", staffId: 1 }), null);
  await assert.rejects(issueCallToken(await bookingForCall(b.id, { userId: -501 }), { identity: "m", name: "M" }, fakeMint), /opens 10 minutes/);
  await assert.rejects(completeBooking(b.id, { trainerId: TRAINER }), /has started/);
  await assert.rejects(addReview(-501, b.id, { rating: 5, comment: "" }), /marks it completed/);
  await pool.query(`UPDATE network_coach_bookings SET starts_at=now()-interval '2 minutes', ends_at=now()+interval '28 minutes' WHERE id=$1`, [b.id]);
  const tok = await issueCallToken(await bookingForCall(b.id, { userId: -501 }), { identity: "member--501", name: "M" }, fakeMint);
  assert.equal(tok.token, "fake.member--501");
  assert.ok(tok.expiresInSeconds <= 600 && tok.expiresInSeconds >= 60);
  assert.match(minted.at(-1)!.room, /^nc-[0-9a-f]{32}$/);
  await assert.rejects(cancelByMember(-501, b.id), /already started/);
  await assert.rejects(completeBooking(b.id, { trainerId: "wrong" }), /Only a paid/);
  await completeBooking(b.id, { trainerId: TRAINER });
  await assert.rejects(issueCallToken(await bookingForCall(b.id, { userId: -501 }), { identity: "m", name: "M" }, fakeMint), /already completed/);
  await assert.rejects(addReview(-999, b.id, { rating: 5, comment: "" }), /not found/);
  await addReview(-501, b.id, { rating: 4, comment: "Great, ping me at 9845012345" });
  await assert.rejects(addReview(-501, b.id, { rating: 5, comment: "" }), /already reviewed/);
  const { rows } = await pool.query(`SELECT comment FROM network_coach_reviews WHERE booking_id=$1`, [b.id]);
  assert.equal(rows[0].comment, "Great, ping me at [removed]");
});

test("paid cancel before start is flagged refund pending admin (never auto-refunded)", async () => {
  const slot = await futureSlot(8);
  const b = await reserveSlot(-601, slot, roster);
  const { airpay_order_ref: ref, amount_inr: amt } = await refOf(b.id);
  await settlePayment({ ok: true, orderId: ref, airpayTxnId: "t", amountInr: amt, merchantId: "M" }, "M");
  await cancelByMember(-601, b.id);
  assert.deepEqual(await status(b.id), { status: "cancelled", refund_status: "pending_admin" });
});

test("unassigned trainer cannot be booked; unknown staff cannot manage availability", async () => {
  const slot = await futureSlot(9);
  await assert.rejects(reserveSlot(-701, slot, (async () => [{ id: "other", name: "X" }]) as unknown as RosterFn), /no longer offering/);
  await assert.rejects(authorizedTrainer(-123456, roster), /not linked/);
});

test("member calendar keeps booked slots visible without exposing member details and reopens cancelled holds", async () => {
  const slotId = await futureSlot(45, "12:00");
  const read = async () => (await openSlotsFor(GYM, TRAINER, new Date(), CAT)).find(s => s.id === slotId);
  assert.equal((await read())?.booked, false);
  const booking = await reserveSlot(-703, slotId, roster, new Date(), CAT);
  const held = await read();
  assert.equal(held?.booked, true);
  assert.deepEqual(Object.keys(held!).sort(), ["id", "startsAt", "endsAt", "durationMinutes", "priceInr", "booked"].sort());
  await assert.rejects(reserveSlot(-704, slotId, roster, new Date(), CAT));
  await cancelByMember(-703, booking.id);
  assert.equal((await read())?.booked, false);
  const next = await reserveSlot(-704, slotId, roster, new Date(), CAT);
  const { airpay_order_ref: orderId, amount_inr: amountInr } = await refOf(next.id);
  await settlePayment({ ok: true, orderId, airpayTxnId: "calendar-test", amountInr, merchantId: "M" }, "M");
  assert.equal((await read())?.booked, true);
});

test("online billing issues stable receipts only after payment and scopes member and partner reads", async () => {
  const originalPrices = await getPrices(CAT);
  await setPrices({ ...originalPrices, cgstPercent: 9, sgstPercent: 9 }, CAT);
  const slot = await futureSlot(46);
  const booked = await reserveSlot(-8701, slot, roster, new Date(), CAT);
  await setPrices(originalPrices, CAT);
  const mine = () => onlineBilling({ kind: "member", id: -8701 });
  assert.equal((await mine()).find(r => r.id === booked.id && r.kind === "session")?.invoiceNumber, null);
  const { airpay_order_ref: orderId, amount_inr: amountInr } = await refOf(booked.id);
  await settlePayment({ ok: true, orderId, airpayTxnId: "billing-test", amountInr, merchantId: "M" }, "M");
  const bill = (await mine()).find(r => r.id === booked.id && r.kind === "session")!;
  assert.equal(bill.paid, true);
  assert.equal(bill.amountInr, amountInr);
  assert.equal(bill.cgstPercent, 9);
  assert.equal(bill.sgstPercent, 9);
  assert.equal(bill.cgstInr, Math.round(bill.subtotalInr * 0.09));
  assert.equal(bill.amountInr, bill.subtotalInr + bill.cgstInr + bill.sgstInr);
  assert.equal(bill.paymentReference, "billing-test");
  assert.equal(bill.invoiceNumber, `IC-ONLINE-S-${booked.id}`);
  assert.equal((await onlineBilling({ kind: "member", id: -8702 })).some(r => r.id === booked.id && r.kind === "session"), false);
  assert.deepEqual(await onlineBilling({ kind: "partner", id: -8702 }), []);
  await cancelByMember(-8701, booked.id);
  const cancelled = (await mine()).find(r => r.id === booked.id && r.kind === "session")!;
  assert.equal(cancelled.invoiceNumber, bill.invoiceNumber);
  assert.equal(cancelled.refundStatus, "pending_admin");
});

test("prepaid plans snapshot GST and settle only the tax-inclusive total", async () => {
  const original = await getPrices(CAT);
  try {
    await setPrices({ ...original, cgstPercent: 9, sgstPercent: 9 }, CAT);
    const plan = await savePlan(null, { categoryId: CAT, name: `${tag} GST plan`, duration: 1, durationUnit: "month", priceInr: 1000, published: true });
    const listed = await publishedPlansFor(-8791, TRAINER, GYM, CAT);
    assert.equal(listed.plans.find(p => p.id === plan.id)?.priceInr, 1180);
    const purchase = await createPlanPurchase(-8791, TRAINER, GYM, plan.id, roster, CAT);
    assert.equal(purchase.amountInr, 1180);
    await setPrices(original, CAT);
    const result = { ok: true, orderId: purchase.airpayOrderRef, airpayTxnId: `${tag}-gst`, merchantId: "M" };
    assert.equal((await settlePlanPayment({ ...result, amountInr: 1000 }, "M")).outcome, "rejected");
    await settlePlanPayment({ ...result, amountInr: 1180 }, "M");
    const receipt = (await onlineBilling({ kind: "member", id: -8791 })).find(r => r.kind === "plan" && r.id === purchase.id)!;
    assert.equal(receipt.paid, true);
    assert.equal(receipt.subtotalInr, 1000);
    assert.equal(receipt.cgstInr, 90);
    assert.equal(receipt.sgstInr, 90);
    assert.equal(receipt.amountInr, 1180);
    assert.equal(receipt.invoiceNumber, `IC-ONLINE-P-${purchase.id}`);
  } finally { await setPrices(original, CAT); }
});

test("200 earlier booked slots cannot hide later available times", async () => {
  const trainerId = `${tag}-long-calendar`;
  const { rows } = await pool.query(`
    INSERT INTO network_coach_slots (gym_id, trainer_id, staff_id, starts_at, ends_at)
    SELECT $1, $2, -1, now() + interval '60 days' + n * interval '1 hour',
      now() + interval '60 days' + (n + 1) * interval '1 hour'
    FROM generate_series(1, 201) n
    RETURNING id, starts_at, ends_at`, [GYM, trainerId]);
  const ordered = rows.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  await pool.query(`
    INSERT INTO network_coach_bookings
      (slot_id, user_id, gym_id, trainer_id, staff_id, category_id, starts_at, ends_at,
       amount_inr, status, hold_expires_at, pay_token, room_name)
    SELECT id, -705, gym_id, trainer_id, staff_id, $2, starts_at, ends_at,
      899, 'paid', now() + interval '1 hour', $3 || '-pay-' || id, $3 || '-room-' || id
    FROM network_coach_slots WHERE trainer_id=$1 AND id <> $4`,
    [trainerId, CAT, tag, ordered[200].id]);
  const calendar = await openSlotsFor(GYM, trainerId, new Date(), CAT);
  assert.equal(calendar.filter(s => s.booked).length, 200);
  assert.equal(calendar.find(s => s.id === ordered[200].id)?.booked, false);
  assert.deepEqual(calendar.map(s => s.id), ordered.map(s => s.id));
});

test("verified PT staff manage their own calendar before category publication, without widening member eligibility", async () => {
  const [gym] = await db.select({ id: gymsTable.id }).from(gymsTable).limit(1);
  assert.ok(gym, "Development fixture needs an existing gym");
  const trainerId = `${tag}-self-service`;
  const [staff] = await db.insert(staffTable).values({
    name: "Disposable calendar test", email: `${tag}@example.invalid`, passwordHash: "disabled-test-login",
    gymId: gym.id, yoactivStaffId: trainerId, permissions: ["pt.manage"],
  }).returning();
  const ownRoster = (async (gymId: number) => {
    assert.equal(gymId, gym.id);
    return [{ id: trainerId, name: staff.name, staffId: staff.id }];
  }) as unknown as RosterFn;
  try {
    const identity = await authorizedTrainer(staff.id, ownRoster);
    assert.equal(identity.trainerId, trainerId);
    assert.equal(identity.categoryId, undefined);
    const date = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    assert.equal((await createSlots(identity, { date, startTime: "10:00", durationMinutes: 60, repeatWeeks: 0 })).created, 1);
    const { rows } = await pool.query("SELECT id FROM network_coach_slots WHERE trainer_id=$1", [trainerId]);
    await assert.rejects(reserveSlot(-702, rows[0].id, ownRoster), /no longer offering/);
    await deleteSlot(trainerId, rows[0].id);
    await assert.rejects(authorizedTrainer(staff.id, (async () => []) as unknown as RosterFn), /could not be verified/);
    await db.update(staffTable).set({ permissions: [] }).where(eq(staffTable.id, staff.id));
    await assert.rejects(authorizedTrainer(staff.id, ownRoster), /not linked/);
    await db.update(staffTable).set({ permissions: ["pt.manage"], isActive: false }).where(eq(staffTable.id, staff.id));
    await assert.rejects(authorizedTrainer(staff.id, ownRoster), /not linked/);
  } finally {
    await pool.query("DELETE FROM network_coach_slots WHERE trainer_id=$1", [trainerId]);
    await db.delete(staffTable).where(eq(staffTable.id, staff.id));
  }
});

test("capability survives ordinary category edits (stable flag, not title)", async () => {
  await updateCategory(CAT, { title: "Renamed", summary: "", benefits: [], details: "", imageUrl: "", published: true });
  assert.equal((await getCategory(CAT))?.networkCoach, true);
  await setNetworkCapability(CAT, false);
  assert.equal((await getCategory(CAT))?.networkCoach, false);
  await setNetworkCapability(CAT, true);
});

test("real LiveKit minter: join-only grant for one room, short TTL (dummy in-process creds, no network)", async () => {
  const saved = { u: process.env.LIVEKIT_URL, k: process.env.LIVEKIT_API_KEY, s: process.env.LIVEKIT_API_SECRET };
  process.env.LIVEKIT_URL = "wss://example.invalid"; process.env.LIVEKIT_API_KEY = "testkey"; process.env.LIVEKIT_API_SECRET = "testsecret-testsecret-testsecret-123";
  try {
    const { livekitMinter } = await import("./networkCall");
    const jwt = await livekitMinter({ identity: "member-1", name: "M", room: "nc-abc", ttlSeconds: 300 });
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1]!, "base64url").toString());
    assert.equal(payload.sub, "member-1");
    assert.equal(payload.video.room, "nc-abc");
    assert.equal(payload.video.roomJoin, true);
    assert.ok(!payload.video.roomCreate && !payload.video.roomRecord && !payload.video.roomAdmin);
    assert.ok(payload.exp - payload.nbf <= 300);
  } finally {
    for (const [k, v] of [["LIVEKIT_URL", saved.u], ["LIVEKIT_API_KEY", saved.k], ["LIVEKIT_API_SECRET", saved.s]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test("hosted payment handoff: GET asks for billing; POST validates, re-checks hold, uses typed billing + request origin; escapes output", async () => {
  const express = (await import("express")).default;
  const { createNetworkCoachRouter } = await import("../routes/networkCoach");
  const { escapeHtml, publicOrigin } = await import("./networkPayHandoff");
  const uid = (await pool.query(`INSERT INTO users (clerk_user_id, email, name, mobile, gender, avatar_url, city, member_code) VALUES ($1,$2,$3,'9845012345','other','','Pune',$1) RETURNING id`, [`${tag}-u`, `${tag}@test.invalid`, `<b>Member</b>`])).rows[0].id as number;
  const calls: Record<string, unknown>[] = [];
  const checkout = (async (i: Record<string, unknown>) => { calls.push(i); return { action: "https://pay.example/\"x", fields: { a: '"><script>alert(1)</script>' } }; }) as never;
  const app = express(); app.set("trust proxy", 1); app.use(express.urlencoded({ extended: true }));
  app.use("/api", createNetworkCoachRouter({ roster, mint: fakeMint, checkout }));
  const server = app.listen(0); const port = (server.address() as { port: number }).port;
  const saved = process.env.PUBLIC_APP_ORIGIN; delete process.env.PUBLIC_APP_ORIGIN;
  try {
    const slot = await futureSlot(9);
    const b = await reserveSlot(uid, slot, roster);
    const url = `http://127.0.0.1:${port}/api/pay/network-coach/${b.pay_token}/start`;
    const hdr = { "X-Forwarded-Proto": "https", "X-Forwarded-Host": "app.iconic.example" };
    const g = await fetch(url, { headers: hdr }); const gh = await g.text();
    assert.equal(g.status, 200); assert.match(gh, /name="pincode"/); assert.equal(calls.length, 0);
    assert.doesNotMatch(gh, /560001|Bengaluru|Online coaching session/);
    const post = (body: Record<string, string>) => fetch(url, { method: "POST", headers: { ...hdr, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
    const bad = await post({ address: "<script>x</script>", city: "Pune", pincode: "012345" });
    assert.equal(bad.status, 400); const bh = await bad.text();
    assert.doesNotMatch(bh, /<script>x/); assert.equal(calls.length, 0);
    const ok = await post({ address: "12 MG Road, Flat 4B", city: "Pune", pincode: "411001" });
    const oh = await ok.text();
    assert.equal(ok.status, 200);
    assert.match(oh, /<meta name="referrer" content="strict-origin">/);
    assert.doesNotMatch(oh, /content="no-referrer"/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.buyerAddress, "12 MG Road, Flat 4B"); assert.equal(calls[0]!.buyerCity, "Pune"); assert.equal(calls[0]!.buyerPincode, "411001");
    assert.equal(calls[0]!.successUrl, "https://app.iconic.example/api/pay/store/return");
    assert.doesNotMatch(oh, /"><script>alert/); assert.match(oh, /&quot;&gt;&lt;script&gt;/);
    // bad token / expired hold never reach checkout
    assert.equal((await fetch(url.replace(b.pay_token, "0".repeat(48)), { method: "POST", headers: hdr })).status, 404);
    await pool.query(`UPDATE network_coach_bookings SET hold_expires_at=now()-interval '1 minute' WHERE id=$1`, [b.id]);
    assert.equal((await post({ address: "12 MG Road", city: "Pune", pincode: "411001" })).status, 410);
    assert.equal(calls.length, 1);
    const template = await savePlan(null,{categoryId:CAT,name:`${tag} Hosted plan`,duration:1,durationUnit:"month",priceInr:2999,published:true});
    const purchase = await createPlanPurchase(uid,TRAINER,GYM,template.id,roster);
    const planUrl = `http://127.0.0.1:${port}/api/pay/network-coach-plan/${purchase.payToken}/start`;
    const planGet = await fetch(planUrl,{headers:hdr});
    assert.equal(planGet.status,200);
    assert.match(await planGet.text(),/Billing details/);
    const planPost = await fetch(planUrl,{method:"POST",headers:{...hdr,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({address:"14 Residency Road",city:"Mysuru",pincode:"570001"})});
    assert.equal(planPost.status,200);
    assert.equal(calls.length,2);
    assert.equal(calls[1]!.amountInr,2999);
    assert.equal(calls[1]!.buyerAddress,"14 Residency Road");
    assert.equal(calls[1]!.buyerCity,"Mysuru");
    assert.equal(calls[1]!.buyerPincode,"570001");
    assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
    assert.throws(() => publicOrigin({ hostname: "evil.com/<x>", get: () => "evil.com/<x>", protocol: "https" } as never));
  } finally {
    if (saved !== undefined) process.env.PUBLIC_APP_ORIGIN = saved;
    server.close();
    await pool.query(`DELETE FROM network_coach_bookings WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM users WHERE id=$1`, [uid]);
  }
});
