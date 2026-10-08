import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { sessionReminder, deliverNetworkCoachReminders } from "./networkCoachReminders";
import { ensureNetworkCoachSchema } from "./networkCoachSchema";
import { registerPushToken, removePushToken, tokensForUser, sendPushToUser } from "./pushNotifications";

const tag = `reminder-test-${randomUUID()}`;
const ids: number[] = [];
let staffId: number;
after(async () => {
  for (const id of ids) {
    await pool.query(`DELETE FROM notifications WHERE batch_id LIKE $1`, [`nc:reminder:${id}:%`]);
    await pool.query(`DELETE FROM app_settings WHERE key LIKE $1`, [`nc:reminder:${id}:%`]);
    await pool.query(`DELETE FROM network_coach_bookings WHERE id=$1`, [id]);
  }
  if (staffId) await pool.query(`DELETE FROM staff WHERE id=$1`, [staffId]);
  await pool.end();
});

test("session opt-in, ownership, timing, cancellation, per-role dedupe and privacy", async () => {
  await ensureNetworkCoachSchema(pool);
  const { rows: [gym] } = await pool.query(`SELECT id FROM gyms LIMIT 1`);
  assert.ok(gym, "Development fixture needs an existing gym");
  staffId = (await pool.query(`INSERT INTO staff(name,email,password_hash,gym_id,yoactiv_staff_id,permissions)
    VALUES('Test Coach',$1,'disabled',$3,$2,ARRAY['pt.manage']) RETURNING id`, [`${tag}@example.invalid`, tag, gym.id])).rows[0].id;
  // No real users or payment providers needed: the booking model snapshots IDs.
  async function booking(minutes: number, status = "paid", paid = true) {
    const id = (await pool.query(`INSERT INTO network_coach_bookings
      (slot_id,user_id,gym_id,trainer_id,staff_id,category_id,starts_at,ends_at,amount_inr,status,hold_expires_at,pay_token,room_name,paid_at)
      VALUES($1,-991,$8,$2,$3,'test',now()+($4*interval '1 minute'),now()+($4*interval '1 minute')+interval '1 hour',
      500,$5,now()+interval '1 hour',$6,$6,CASE WHEN $7 THEN now() ELSE NULL END) RETURNING id`,
      [-Math.floor(Math.random()*1e9), tag, staffId, minutes, status, randomUUID(), paid, gym.id])).rows[0].id as number;
    ids.push(id);
    return id;
  }
  const member = { role: "member" as const, id: -991 };
  const coach = { role: "trainer" as const, id: staffId, trainerId: tag };
  const due = await booking(9);
  assert.deepEqual(await sessionReminder(due, member), { enabled: false });
  await assert.rejects(sessionReminder(due, { ...member, id: -992 }, true), /not found/);
  await assert.rejects(sessionReminder(due, { ...coach, trainerId: "other" }, true), /not found/);
  await sessionReminder(due, member, true);
  await sessionReminder(due, coach, true);
  const early = await booking(11);
  await sessionReminder(early, member, true);
  const cancelled = await booking(8);
  await sessionReminder(cancelled, member, true);
  await pool.query(`UPDATE network_coach_bookings SET status='cancelled' WHERE id=$1`, [cancelled]);
  const optedOut = await booking(7);
  await sessionReminder(optedOut, member, true);
  await sessionReminder(optedOut, member, false);
  for (const state of ["held", "expired", "paid_conflict", "completed", "cancelled"]) {
    await assert.rejects(sessionReminder(await booking(8, state), member, true), /upcoming paid/);
  }
  await assert.rejects(sessionReminder(await booking(8, "paid", false), member, true), /upcoming paid/);
  await assert.rejects(sessionReminder(await booking(-1), member, true), /upcoming paid/);
  const sent: unknown[] = [];
  const send: typeof sendPushToUser = async (...args) => { sent.push(args); return { sent: 1, removed: 0 }; };
  await Promise.all([deliverNetworkCoachReminders(send), deliverNetworkCoachReminders(send)]);
  assert.equal(sent.length, 2);
  const rows = (await pool.query(`SELECT * FROM notifications WHERE batch_id LIKE $1`, [`nc:reminder:${due}:%`])).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].recipient_type, "user");
  assert.equal(rows[0].link, `/network-coach/call?bookingId=${due}&role=member`);
  assert.equal(rows[1].recipient_type, "staff");
  assert.equal(rows[1].recipient_id, staffId);
  assert.equal(rows[1].link, `/network-coach/call?bookingId=${due}&role=trainer`);
  assert.ok(!rows[0].body.includes(tag));
  assert.ok(!rows[0].body.includes("@"));
  await pool.query(`DELETE FROM notifications WHERE batch_id LIKE $1`, [`nc:reminder:${due}:%`]);
  await sessionReminder(due, member, false);
  await sessionReminder(due, member, true);
  await deliverNetworkCoachReminders(send);
  assert.equal(sent.length, 2, "feed deletion and toggle must not resend");
  const inactive = await booking(8);
  await sessionReminder(inactive, coach, true);
  await pool.query(`UPDATE staff SET is_active=false WHERE id=$1`, [staffId]);
  await deliverNetworkCoachReminders(send);
  assert.equal(sent.length, 2, "disabled staff must not receive reminders");
});

test("staff/member push IDs cannot collide; one token has one recipient", async () => {
  const token = `ExpoPushToken[${randomUUID().replaceAll("-", "")}]`;
  try {
    await registerPushToken(-991, token, "ios", "staff");
    assert.equal((await tokensForUser(-991)).length, 0);
    assert.equal((await tokensForUser(-991, "staff")).length, 1);
    await registerPushToken(-991, token, "android");
    assert.equal((await tokensForUser(-991, "staff")).length, 0);
    assert.equal((await tokensForUser(-991)).length, 1);
  } finally { await removePushToken(token); }
});
