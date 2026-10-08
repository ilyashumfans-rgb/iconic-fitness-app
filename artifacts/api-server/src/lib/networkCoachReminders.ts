import { pool } from "@workspace/db";
import { JOIN_EARLY_MIN } from "./networkCoach";
import { PtCheckoutError } from "./ptTrainerPolicy";
import { sendPushToUser } from "./pushNotifications";
import { logger } from "./logger";

export type ReminderOwner = { role: "member" | "trainer"; id: number; trainerId?: string };
const key = (bookingId: number, owner: ReminderOwner) => `nc:reminder:${bookingId}:${owner.role}:${owner.id}`;

export async function sessionReminder(bookingId: number, owner: ReminderOwner, enabled?: boolean) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const { rows: [b] } = await c.query(`SELECT * FROM network_coach_bookings WHERE id=$1 FOR UPDATE`, [bookingId]);
    if (!b || (owner.role === "member" ? b.user_id !== owner.id : b.trainer_id !== owner.trainerId || b.staff_id !== owner.id)) {
      throw new PtCheckoutError(404, "Session not found.");
    }
    if (enabled === true && (b.status !== "paid" || !b.paid_at || new Date(b.starts_at).getTime() <= Date.now())) {
      throw new PtCheckoutError(409, "Reminders are available for upcoming paid sessions only.");
    }
    const k = key(bookingId, owner);
    if (enabled !== undefined) {
      await c.query(`INSERT INTO app_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`,
        [k, JSON.stringify({ enabled, bookingId, role: owner.role, recipientId: owner.id })]);
    }
    const { rows: [pref] } = await c.query(`SELECT value FROM app_settings WHERE key=$1`, [k]);
    await c.query("COMMIT");
    return { enabled: pref ? JSON.parse(pref.value).enabled === true : false };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally { c.release(); }
}

/** Background pass, not dependent on either participant opening the app.
 * Booking lock serializes cancellation, opt-out and claiming. A durable marker
 * survives feed deletion, restarts and multiple API replicas.
 */
export async function deliverNetworkCoachReminders(send = sendPushToUser) {
  const { rows: due } = await pool.query(`SELECT id FROM network_coach_bookings
    WHERE status='paid' AND paid_at IS NOT NULL
    AND starts_at <= now() + ($1 * interval '1 minute') AND starts_at > now()`, [JOIN_EARLY_MIN]);
  for (const { id } of due) {
    const c = await pool.connect();
    const messages: { recipientId: number; recipientType: "user" | "staff"; link: string; ttl: number }[] = [];
    try {
      await c.query("BEGIN");
      const { rows: [b] } = await c.query(`SELECT * FROM network_coach_bookings WHERE id=$1 AND status='paid' AND paid_at IS NOT NULL AND starts_at > now() FOR UPDATE`, [id]);
      if (b) for (const role of ["member", "trainer"] as const) {
        const recipientId = role === "member" ? b.user_id : b.staff_id;
        if (!recipientId) continue;
        if (role === "trainer") {
          const active = await c.query(`SELECT 1 FROM staff WHERE id=$1 AND is_active=true AND yoactiv_staff_id=$2 AND gym_id=$3 AND 'pt.manage'=ANY(permissions)`, [recipientId, b.trainer_id, b.gym_id]);
          if (!active.rowCount) continue;
        }
        const k = key(id, { role, id: recipientId });
        const { rows: [pref] } = await c.query(`SELECT value FROM app_settings WHERE key=$1`, [k]);
        if (!pref || JSON.parse(pref.value).enabled !== true) continue;
        const claim = await c.query(`INSERT INTO app_settings(key,value) VALUES($1,'true') ON CONFLICT(key) DO NOTHING RETURNING key`, [`${k}:sent`]);
        if (!claim.rowCount) continue;
        const recipientType = role === "member" ? "user" : "staff";
        const link = `/network-coach/call?bookingId=${id}&role=${role}`;
        await c.query(`INSERT INTO notifications(recipient_type,recipient_id,title,body,link,batch_id)
          VALUES($1,$2,$3,$4,$5,$6)`, [recipientType, recipientId, TITLE, BODY, link, k]);
        messages.push({ recipientId, recipientType, link, ttl: Math.max(1, Math.floor((new Date(b.starts_at).getTime() - Date.now()) / 1000)) });
      }
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK"); throw e; }
    finally { c.release(); }
    // At-most-once dispatch: never retry an ambiguous send and double-alert.
    for (const m of messages) await send(m.recipientId, { title: TITLE, body: BODY, link: m.link, ttl: m.ttl, channelId: "reminders" }, undefined, m.recipientType);
  }
}
const TITLE = "Your online session is ready";
const BODY = "Joining is now open for your scheduled Network Coach session. Tap to open your session.";

export function startNetworkCoachReminderScheduler() {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { await deliverNetworkCoachReminders(); }
    catch (err) { logger.error({ err }, "Network Coach reminder pass failed"); }
    finally { busy = false; }
  };
  void tick();
  setInterval(() => void tick(), 30_000).unref();
}
