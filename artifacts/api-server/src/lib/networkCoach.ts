import { randomBytes } from "node:crypto";
import { networkCoachTax } from "./networkCoachTax";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db, pool, appSettingsTable, gymsTable, staffTable, usersTable } from "@workspace/db";
import { PtCheckoutError } from "./ptTrainerPolicy";
import { resolvePtTrainerRoster } from "./ptTrainerResolver";
import { assignedRoster, listCategories, getCategory, NETWORK_MIGRATION_KEY } from "./coachCategories";

/**
 * Iconic Network Coach — online 1:1 sessions. Scope is ONLY categories carrying the
 * explicit `networkCoach` capability. Everything is IST (UTC+05:30, no DST).
 */
export const IST_OFFSET_MIN = 330;
export const HOLD_MINUTES = 3;
export const JOIN_EARLY_MIN = 10;
export const JOIN_LATE_MIN = 15;
export const MIN_LEAD_MIN = 30;
export const DURATIONS = [30, 45, 60] as const;
export const ACTIVE = ["held", "paid", "completed"] as const;
const PRICE_KEY = "network_coach_prices";

// ---------- pure helpers (unit tested) ----------
export function istToUtc(date: string, time: string): Date {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) throw new PtCheckoutError(400, "Use date YYYY-MM-DD and time HH:MM (IST).");
  const [h, m] = [Number(t[1]), Number(t[2])];
  if (h > 23 || m > 59 || m % 15 !== 0) throw new PtCheckoutError(400, "Start times must be on a 15-minute mark.");
  const ms = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), h, m) - IST_OFFSET_MIN * 60_000;
  const check = new Date(ms + IST_OFFSET_MIN * 60_000);
  if (check.getUTCDate() !== Number(d[3])) throw new PtCheckoutError(400, "That date does not exist.");
  return new Date(ms);
}
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}
/** Join window: JOIN_EARLY_MIN before start until JOIN_LATE_MIN after end. */
export function joinWindowOpen(startsAt: Date, endsAt: Date, now = new Date()) {
  return now.getTime() >= startsAt.getTime() - JOIN_EARLY_MIN * 60_000 && now.getTime() <= endsAt.getTime() + JOIN_LATE_MIN * 60_000;
}
/** Exact paise match — no tolerance, missing/NaN amount is a mismatch. */
export function amountMatches(echoed: number | null, expectedInr: number) {
  return echoed !== null && Number.isFinite(echoed) && Math.round(echoed * 100) === expectedInr * 100;
}
/** 20-digit numeric gateway ref: ms timestamp (13) + zero-padded booking id (7). Distinct from store refs (id+ms). */
export function networkOrderRef(bookingId: number, now = Date.now()) {
  return `${now}${String(bookingId).padStart(7, "0")}`;
}
export const isNetworkOrderRef = (ref: string) => /^1\d{19}$/.test(ref);

export const priceInput = z.object({
  categoryId: z.string().min(1).optional(),
  prices: z.object({ "30": z.number().int().min(0).max(100000).nullable(), "45": z.number().int().min(0).max(100000).nullable(), "60": z.number().int().min(0).max(100000).nullable(),
    cgstPercent: z.number().min(0).max(50).optional(), sgstPercent: z.number().min(0).max(50).optional(),
  }).strict(),
}).strict();
export const planInput = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  duration: z.number().int().positive().max(3650),
  durationUnit: z.enum(["day", "week", "month", "year"]),
  priceInr: z.number().int().positive().max(1_000_000),
  published: z.boolean().default(false),
}).strict();
export type Prices = z.infer<typeof priceInput>["prices"];
export const slotInput = z.object({
  date: z.string(), startTime: z.string(),
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  repeatWeeks: z.number().int().min(0).max(12).default(0),
}).strict();
export const reviewInput = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).default("") }).strict();

/** Strips anything that looks like phone/email/UPI/URL so contact details never land in public comments. */
export function scrubContact(text: string) {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[removed]")
    .replace(/\b[\w.-]+@[a-z]+\b/gi, "[removed]")
    .replace(/(\+?\d[\d\s-]{7,}\d)/g, "[removed]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[removed]");
}

// ---------- prices ----------
export async function defaultNetworkCategory() {
  return (await listCategories()).find(c => c.networkCoach && c.published)?.id;
}
export async function validatePricingCategory(id: string) {
  const category = await getCategory(id);
  if (!category) throw new PtCheckoutError(400, "Choose an existing coach category.");
}
/** One-time adoption of legacy pricing by its original category, never by newly enabled categories. */
export async function migrateNetworkPricingOnce() {
  await tx(async c => {
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('nc-category-pricing-migration'))`);
    if ((await c.query(`SELECT 1 FROM app_settings WHERE key='network_coach_category_pricing_migrated'`)).rows.length) return;
    const [marker] = (await c.query(`SELECT value FROM app_settings WHERE key=$1`, [NETWORK_MIGRATION_KEY])).rows;
    const legacyIds: string[] = marker ? JSON.parse(marker.value).ids ?? [] : [];
    const categories = await listCategories();
    const category = categories.find(c => legacyIds.includes(c.id))
      ?? (categories.filter(c => c.networkCoach).length === 1 ? categories.find(c => c.networkCoach) : undefined);
    if (category) {
      await c.query(`UPDATE network_coach_plans SET category_id=$1 WHERE category_id IS NULL`, [category.id]);
      await c.query(`INSERT INTO app_settings(key,value) SELECT $1,value FROM app_settings WHERE key=$2 ON CONFLICT(key) DO NOTHING`, [`${PRICE_KEY}:${category.id}`, PRICE_KEY]);
    }
    await c.query(`INSERT INTO app_settings(key,value) VALUES('network_coach_category_pricing_migrated','true') ON CONFLICT(key) DO NOTHING`);
  });
}
export async function getPrices(categoryId?: string): Promise<Prices> {
  const id = categoryId ?? await defaultNetworkCategory();
  const [row] = id ? await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, `${PRICE_KEY}:${id}`)) : [];
  try { const p = priceInput.safeParse({ prices: JSON.parse(row?.value ?? "null") }); if (p.success) return p.data.prices; } catch { /* fallthrough */ }
  return { "30": null, "45": null, "60": null };
}
export async function setPrices(prices: Prices, categoryId: string) {
  await validatePricingCategory(categoryId);
  const value = JSON.stringify(prices);
  await db.insert(appSettingsTable).values({ key: `${PRICE_KEY}:${categoryId}`, value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
  return prices;
}
export const priceFor = (prices: Prices, minutes: number) => prices[String(minutes) as "30" | "45" | "60"] ?? null;
export function pricesIncludingTax(prices: Prices): Prices {
  return { ...prices, ...Object.fromEntries(DURATIONS.map(m => {
    const base = priceFor(prices, m);
    return [String(m), base === null ? null : networkCoachTax(base, prices).amountInr];
  })) };
}

// ---------- eligibility ----------
export type RosterFn = typeof resolvePtTrainerRoster;
export type NetworkTrainer = { id: string; name: string; staffId?: number; gymId: number; categoryId: string };
/** Active, stable-ID-verified, assigned-to-a-network-category coaches at one branch. */
export async function networkTrainersAt(gymId: number, roster: RosterFn = resolvePtTrainerRoster, catIds?: string[]): Promise<NetworkTrainer[]> {
  const ids = catIds ?? (await listCategories()).filter(c => c.networkCoach && c.published).map(c => c.id);
  if (!ids.length) return [];
  const trainers = await assignedRoster(gymId, roster) as { id: string; name: string; staffId?: number; categoryIds: string[] }[];
  return trainers.flatMap(t => {
    return ids.filter(c => t.categoryIds.includes(c)).map(categoryId => ({ id: t.id, name: t.name, staffId: t.staffId, gymId, categoryId }));
  });
}
export async function networkGyms() {
  return (await db.select({ id: gymsTable.id, name: gymsTable.name, branchId: gymsTable.yoactivBranchId, ptBranchId: gymsTable.yoactivPtBranchId }).from(gymsTable))
    .filter(g => g.branchId || g.ptBranchId).map(g => ({ id: g.id, name: g.name }));
}

/** Trainer identity comes from the authenticated staff session only — never a client-supplied ID. */
export async function authorizedTrainer(staffId: number, roster: RosterFn = resolvePtTrainerRoster) {
  const [s] = await db.select().from(staffTable).where(eq(staffTable.id, staffId));
  if (!s || !s.isActive || !s.gymId || !s.yoactivStaffId || !(s.permissions ?? []).includes("pt.manage")) {
    throw new PtCheckoutError(403, "Your studio account is not linked as a coach. Ask an admin to link your YoActiv trainer ID and PT access.");
  }
  // Staff manage their own calendar independently of public category readiness.
  // Keep the same branch/stable-ID verification; member booking eligibility remains stricter.
  const trainers = await assignedRoster(s.gymId, roster) as { id: string; staffId?: number; categoryIds: string[] }[];
  const match = trainers.find(t => t.id === s.yoactivStaffId && (t.staffId === undefined || t.staffId === s.id));
  if (!match) throw new PtCheckoutError(403, "Your PT trainer link could not be verified at your branch. Ask an admin to check your branch and YoActiv trainer ID.");
  const categories = await listCategories();
  const categoryId = categories.find(c => c.networkCoach && c.published && match.categoryIds.includes(c.id))?.id;
  return { staffId: s.id, gymId: s.gymId, trainerId: s.yoactivStaffId, name: s.name, categoryId };
}

// ---------- SQL helpers ----------
type Q = { query: (text: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };
async function tx<T>(fn: (c: Q) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client as unknown as Q);
    await client.query("COMMIT");
    return out;
  } catch (e) { await client.query("ROLLBACK").catch(() => {}); throw e; }
  finally { client.release(); }
}
const q = (text: string, values?: unknown[]) => pool.query(text, values as any[]) as unknown as Promise<{ rows: any[]; rowCount: number | null }>;

/** Release stale holds (lazy expiry). A late payment on an expired hold is handled in settlePayment. */
export async function expireHolds(c: Q = { query: q }) {
  await c.query(`UPDATE network_coach_bookings SET status='expired' WHERE status='held' AND hold_expires_at < now()`);
}

// ---------- trainer slots ----------
export async function trainerSlots(trainerId: string) {
  await expireHolds();
  const { rows } = await q(`
    SELECT s.id, s.gym_id, s.starts_at, s.ends_at,
      (SELECT b.status FROM network_coach_bookings b WHERE b.slot_id=s.id AND b.status IN ('held','paid','completed') LIMIT 1) AS booking_status,
      (SELECT count(*)::int FROM network_coach_bookings b WHERE b.slot_id=s.id AND b.status IN ('paid','completed','paid_conflict')) AS paid_count
    FROM network_coach_slots s WHERE s.trainer_id=$1 AND s.ends_at > now() - interval '1 day' ORDER BY s.starts_at`, [trainerId]);
  return rows.map(r => ({ id: r.id, gymId: r.gym_id, startsAt: new Date(r.starts_at).toISOString(), endsAt: new Date(r.ends_at).toISOString(),
    bookingStatus: r.booking_status as string | null, locked: !!r.booking_status || r.paid_count > 0 }));
}
export async function adminNetworkSlots() {
  const { rows } = await q(`SELECT s.id,s.gym_id AS "gymId",s.trainer_id AS "trainerId",s.staff_id AS "staffId",s.starts_at AS "startsAt",s.ends_at AS "endsAt",g.name AS "branchName",st.name AS "trainerName",
    (SELECT b.status FROM network_coach_bookings b WHERE b.slot_id=s.id AND b.status IN ('held','paid','completed') LIMIT 1) AS "bookingStatus"
    FROM network_coach_slots s LEFT JOIN gyms g ON g.id=s.gym_id LEFT JOIN staff st ON st.id=s.staff_id
    WHERE s.ends_at > now() - interval '1 day' ORDER BY s.starts_at LIMIT 500`);
  return rows.map(r => ({ ...r, startsAt: new Date(r.startsAt).toISOString(), endsAt: new Date(r.endsAt).toISOString(), locked: !!r.bookingStatus }));
}
export async function deleteSlotAsAdmin(slotId: number) {
  const [row] = (await q(`SELECT trainer_id FROM network_coach_slots WHERE id=$1`,[slotId])).rows;
  if (!row) throw new PtCheckoutError(404,"Slot not found.");
  return deleteSlot(row.trainer_id,slotId);
}

export async function createSlots(t: { staffId: number; gymId: number; trainerId: string }, input: z.infer<typeof slotInput>, now = new Date()) {
  const first = istToUtc(input.date, input.startTime);
  const created: number[] = []; const skipped: string[] = [];
  await tx(async c => {
    // Per-trainer advisory lock serializes slot edits (cross-branch, by stable trainer ID).
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('ncslot:' || $1))`, [t.trainerId]);
    for (let w = 0; w <= input.repeatWeeks; w++) {
      const start = new Date(first.getTime() + w * 7 * 86_400_000);
      const end = new Date(start.getTime() + input.durationMinutes * 60_000);
      if (start.getTime() < now.getTime() + MIN_LEAD_MIN * 60_000) { skipped.push(start.toISOString()); continue; }
      const { rows } = await c.query(`SELECT 1 FROM network_coach_slots WHERE trainer_id=$1 AND starts_at < $3 AND ends_at > $2 LIMIT 1`, [t.trainerId, start, end]);
      if (rows.length) { skipped.push(start.toISOString()); continue; }
      const ins = await c.query(`INSERT INTO network_coach_slots (gym_id, trainer_id, staff_id, starts_at, ends_at) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [t.gymId, t.trainerId, t.staffId, start, end]);
      created.push(ins.rows[0].id);
    }
  });
  return { created: created.length, skipped };
}

/** Only never-booked slots owned by this trainer may be removed. */
export async function deleteSlot(trainerId: string, slotId: number) {
  return tx(async c => {
    await expireHolds(c);
    const { rows } = await c.query(`SELECT id FROM network_coach_slots WHERE id=$1 AND trainer_id=$2 FOR UPDATE`, [slotId, trainerId]);
    if (!rows.length) throw new PtCheckoutError(404, "Slot not found.");
    const b = await c.query(`SELECT 1 FROM network_coach_bookings WHERE slot_id=$1 AND status IN ('held','paid','completed','paid_conflict') LIMIT 1`, [slotId]);
    if (b.rows.length) throw new PtCheckoutError(409, "This slot has a booking or payment in progress and can't be changed.");
    await c.query(`DELETE FROM network_coach_slots WHERE id=$1`, [slotId]);
  });
}

// ---------- member side ----------
export async function openSlotsFor(gymId: number, trainerId: string, now = new Date(), categoryId?: string) {
  await expireHolds();
  const { rows } = await q(`
    SELECT s.id, s.starts_at, s.ends_at,
      EXISTS (SELECT 1 FROM network_coach_bookings b WHERE b.slot_id=s.id AND b.status IN ('held','paid','completed','paid_conflict')) AS booked
    FROM network_coach_slots s
    WHERE s.gym_id=$1 AND s.trainer_id=$2 AND s.starts_at > $3
    ORDER BY s.starts_at`, [gymId, trainerId, new Date(now.getTime() + MIN_LEAD_MIN * 60_000)]);
  const prices = await getPrices(categoryId);
  const hasPlanOption = (await q(`SELECT 1 FROM network_coach_plans WHERE published=true AND category_id=$2
    UNION ALL SELECT 1 FROM network_coach_plan_purchases WHERE trainer_id=$1 AND category_id=$2 AND status='paid' AND starts_at <= now() AND ends_at > now() LIMIT 1`, [trainerId, categoryId])).rows.length > 0;
  return rows.map(r => {
    const s = new Date(r.starts_at), e = new Date(r.ends_at);
    const minutes = Math.round((e.getTime() - s.getTime()) / 60_000);
    return { id: r.id as number, startsAt: s.toISOString(), endsAt: e.toISOString(), durationMinutes: minutes, priceInr: priceFor(pricesIncludingTax(prices), minutes), booked: !!r.booked };
  }).filter(s => s.booked || s.priceInr !== null && s.priceInr > 0 || hasPlanOption);
}
export async function openSlotCounts(pairs: { gymId: number; trainerId: string }[], now = new Date()) {
  if (!pairs.length) return new Map<string, number>();
  await expireHolds();
  const { rows } = await q(`
    SELECT s.gym_id, s.trainer_id, count(*)::int AS n FROM network_coach_slots s
    WHERE s.starts_at > $1 AND s.trainer_id = ANY($2::text[])
      AND NOT EXISTS (SELECT 1 FROM network_coach_bookings b WHERE b.slot_id=s.id AND b.status IN ('held','paid','completed','paid_conflict'))
    GROUP BY s.gym_id, s.trainer_id`, [new Date(now.getTime() + MIN_LEAD_MIN * 60_000), pairs.map(p => p.trainerId)]);
  return new Map(rows.map(r => [`${r.gym_id}:${r.trainer_id}`, r.n as number]));
}

export async function reserveSlot(userId: number, slotId: number, roster: RosterFn = resolvePtTrainerRoster, now = new Date(), categoryId?: string) {
  const [slotRow] = (await q(`SELECT * FROM network_coach_slots WHERE id=$1`, [slotId])).rows;
  if (!slotRow) throw new PtCheckoutError(404, "That time is no longer available.");
  // Re-verify the coach is still active + assigned before taking money.
  const trainer = (await networkTrainersAt(slotRow.gym_id, roster)).find(t => t.id === slotRow.trainer_id && (!categoryId || t.categoryId === categoryId));
  if (!trainer) throw new PtCheckoutError(409, "This coach is no longer offering online sessions. Please pick another.");
  const start = new Date(slotRow.starts_at), end = new Date(slotRow.ends_at);
  if (start.getTime() < now.getTime() + MIN_LEAD_MIN * 60_000) throw new PtCheckoutError(409, "That time is too soon to book. Pick a later slot.");
  return tx(async c => {
    await c.query(`SELECT id FROM network_coach_slots WHERE id=$1 FOR UPDATE`, [slotId]);
    await expireHolds(c);
    const taken = await c.query(`SELECT 1 FROM network_coach_bookings WHERE slot_id=$1 AND status IN ('held','paid','completed','paid_conflict') LIMIT 1`, [slotId]);
    if (taken.rows.length) throw new PtCheckoutError(409, "Someone just took that time. Please choose another.");
    const entitlement = await c.query(`SELECT id FROM network_coach_plan_purchases WHERE user_id=$1 AND trainer_id=$2 AND status='paid' AND starts_at <= $3 AND ends_at >= $4 AND category_id=$5 ORDER BY ends_at DESC LIMIT 1 FOR UPDATE`, [userId, slotRow.trainer_id, start, end, trainer.categoryId]);
    const planEntitlementId = entitlement.rows[0]?.id as number | undefined;
    const prices = await getPrices(trainer.categoryId);
    const amount = planEntitlementId ? 0 : priceFor(prices, Math.round((end.getTime() - start.getTime()) / 60_000));
    if (amount === null || amount <= 0 && !planEntitlementId) throw new PtCheckoutError(409, "Online session pricing isn't set yet. Please try later.");
    const tax = networkCoachTax(amount, planEntitlementId ? {} : prices);
    // Member can't hold two overlapping sessions.
    const clash = await c.query(`SELECT 1 FROM network_coach_bookings WHERE user_id=$1 AND status IN ('held','paid') AND starts_at < $3 AND ends_at > $2 LIMIT 1`, [userId, start, end]);
    if (clash.rows.length) throw new PtCheckoutError(409, "You already have a session at that time.");
    const ins = await c.query(`
      INSERT INTO network_coach_bookings (slot_id,user_id,gym_id,trainer_id,staff_id,category_id,starts_at,ends_at,amount_inr,status,hold_expires_at,pay_token,room_name,plan_entitlement_id,paid_at,tax)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [slotId, userId, slotRow.gym_id, slotRow.trainer_id, slotRow.staff_id, trainer.categoryId, start, end, tax.amountInr,
        planEntitlementId ? "paid" : "held", planEntitlementId ? new Date(end.getTime() + 60_000) : new Date(now.getTime() + HOLD_MINUTES * 60_000),
        randomBytes(24).toString("hex"), `nc-${randomBytes(16).toString("hex")}`, planEntitlementId ?? null, planEntitlementId ? now : null, JSON.stringify(tax)]);
    const b = ins.rows[0];
    if (!planEntitlementId) {
      const ref = networkOrderRef(b.id);
      await c.query(`UPDATE network_coach_bookings SET airpay_order_ref=$1 WHERE id=$2`, [ref, b.id]);
      return { ...b, airpay_order_ref: ref };
    }
    return b;
  });
}

// ---------- prepaid plans (templates are shared; entitlements are bound to one trainer) ----------
export async function adminPlans() {
  return (await q(`SELECT id,category_id AS "categoryId",name,duration,duration_unit AS "durationUnit",price_inr AS "priceInr",published,sort_order AS "sortOrder" FROM network_coach_plans ORDER BY sort_order,id`)).rows;
}
export async function savePlan(id: number | null, input: z.infer<typeof planInput>) {
  await validatePricingCategory(input.categoryId);
  if (id === null) {
    const r = await q(`INSERT INTO network_coach_plans(name,duration,duration_unit,price_inr,published,category_id,sort_order) VALUES($1,$2,$3,$4,$5,$6,COALESCE((SELECT max(sort_order)+1 FROM network_coach_plans),0)) RETURNING id,sort_order`, [input.name,input.duration,input.durationUnit,input.priceInr,input.published,input.categoryId]);
    return { id: r.rows[0].id, sortOrder: r.rows[0].sort_order, ...input };
  }
  const r = await q(`UPDATE network_coach_plans SET name=$2,duration=$3,duration_unit=$4,price_inr=$5,published=$6,category_id=$7,updated_at=now() WHERE id=$1 AND (category_id IS NULL OR category_id=$7) RETURNING id,sort_order`, [id,input.name,input.duration,input.durationUnit,input.priceInr,input.published,input.categoryId]);
  if (!r.rows.length) throw new PtCheckoutError(404,"Plan not found.");
  return { id, sortOrder: r.rows[0].sort_order, ...input };
}
export async function deletePlan(id: number) {
  const r = await q(`DELETE FROM network_coach_plans WHERE id=$1 RETURNING id`, [id]);
  if (!r.rows.length) throw new PtCheckoutError(404,"Plan not found.");
  return { ok: true };
}
export function addTerm(start: Date, duration: number, unit: string) {
  const end = new Date(start);
  if (unit === "day") end.setUTCDate(end.getUTCDate() + duration);
  else if (unit === "week") end.setUTCDate(end.getUTCDate() + duration * 7);
  else {
    const monthDelta = unit === "month" ? duration : duration * 12;
    const dayOfMonth = end.getUTCDate();
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + monthDelta);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(dayOfMonth, lastDay));
  }
  return end;
}
export async function publishedPlansFor(userId: number | null, trainerId: string, gymId: number, categoryId?: string) {
  const [active] = userId === null ? [] : (await q(`SELECT id,plan_name AS "planName",starts_at AS "startsAt",ends_at AS "endsAt" FROM network_coach_plan_purchases WHERE user_id=$1 AND trainer_id=$2 AND category_id=$3 AND status='paid' AND starts_at <= now() AND ends_at > now() ORDER BY ends_at DESC LIMIT 1`, [userId,trainerId,categoryId])).rows;
  const plans = (await q(`SELECT id,category_id AS "categoryId",name,duration,duration_unit AS "durationUnit",price_inr AS "priceInr",published,sort_order AS "sortOrder" FROM network_coach_plans WHERE published=true AND category_id=$1 ORDER BY sort_order,id`, [categoryId])).rows;
  const rates = await getPrices(categoryId);
  return { plans: active ? [] : plans.map(p => ({ ...p, priceInr: networkCoachTax(p.priceInr, rates).amountInr })), entitlement: active ? { ...active, startsAt: new Date(active.startsAt).toISOString(), endsAt: new Date(active.endsAt).toISOString() } : null };
}
export async function createPlanPurchase(userId: number, trainerId: string, gymId: number, planId: number, roster: RosterFn = resolvePtTrainerRoster, categoryId?: string) {
  const trainer = (await networkTrainersAt(gymId,roster)).find(t => t.id === trainerId && (!categoryId || t.categoryId === categoryId));
  if (!trainer) throw new PtCheckoutError(404,"This coach isn't offering online sessions.");
  return tx(async c => {
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('ncplan:' || $1 || ':' || $2))`,[userId,trainerId]);
    await c.query(`UPDATE network_coach_plan_purchases SET status='expired' WHERE user_id=$1 AND trainer_id=$2 AND status='held' AND hold_expires_at < now()`,[userId,trainerId]);
    const p = await c.query(`SELECT * FROM network_coach_plans WHERE id=$1 AND published=true AND category_id=$2 FOR SHARE`,[planId,trainer.categoryId]);
    if (!p.rows.length) throw new PtCheckoutError(404,"This plan is no longer available.");
    const active = await c.query(`SELECT 1 FROM network_coach_plan_purchases WHERE user_id=$1 AND trainer_id=$2 AND category_id=$3 AND (status='held' AND hold_expires_at > now() OR status='paid' AND ends_at > now()) LIMIT 1`,[userId,trainerId,trainer.categoryId]);
    if (active.rows.length) throw new PtCheckoutError(409,"You already have an active plan for this coach.");
    const plan=p.rows[0];
    const tax = networkCoachTax(plan.price_inr, await getPrices(trainer.categoryId));
    const ins=await c.query(`INSERT INTO network_coach_plan_purchases(plan_id,plan_name,duration,duration_unit,amount_inr,user_id,gym_id,trainer_id,staff_id,category_id,status,hold_expires_at,pay_token,tax) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'held',now()+interval '3 minutes',$11,$12) RETURNING *`,
      [plan.id,plan.name,plan.duration,plan.duration_unit,tax.amountInr,userId,gymId,trainerId,trainer.staffId,trainer.categoryId,randomBytes(24).toString("hex"),JSON.stringify(tax)]);
    const row=ins.rows[0], ref=`2${String(Date.now()).slice(-12)}${String(row.id).padStart(7,"0")}`;
    await c.query(`UPDATE network_coach_plan_purchases SET airpay_order_ref=$1 WHERE id=$2`,[ref,row.id]);
    return { id: row.id as number, amountInr: row.amount_inr as number, holdExpiresAt: new Date(row.hold_expires_at).toISOString(), paymentUrl: "", payToken: row.pay_token as string, airpayOrderRef: ref };
  });
}
export async function planPurchaseByToken(token: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  return (await q(`SELECT p.*,u.name AS user_name,u.email AS user_email,u.mobile AS user_mobile FROM network_coach_plan_purchases p JOIN users u ON u.id=p.user_id WHERE p.pay_token=$1`,[token])).rows[0] ?? null;
}
export async function settlePlanPayment(result: {ok:boolean;orderId:string;airpayTxnId:string;amountInr:number|null;merchantId:string|null}, merchantId=(process.env.AIRPAY_MERCHANT_ID??"").trim()): Promise<SettleResult> {
  return tx(async c=>{
    const {rows}=await c.query(`SELECT * FROM network_coach_plan_purchases WHERE airpay_order_ref=$1 FOR UPDATE`,[result.orderId]);
    if(rows.length!==1) return {handled:rows.length>1,outcome:rows.length>1?"rejected" as const:undefined};
    const p=rows[0];
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('ncplan:' || $1 || ':' || $2))`,[p.user_id,p.trainer_id]);
    if(!result.ok){await c.query(`UPDATE network_coach_plan_purchases SET status='payment_failed',airpay_txn_id=$2 WHERE id=$1 AND status='held'`,[p.id,result.airpayTxnId]);return {handled:true,outcome:"failed" as const,bookingId:p.id};}
    if(!amountMatches(result.amountInr,p.amount_inr)||(merchantId!==""&&result.merchantId!==merchantId)) return {handled:true,outcome:"rejected" as const,bookingId:p.id};
    if(p.status==="paid") return {handled:true,outcome:"noop" as const,bookingId:p.id};
    if(p.status!=="held"||new Date(p.hold_expires_at).getTime()<Date.now()) {
      await c.query(`UPDATE network_coach_plan_purchases SET status='paid_conflict',refund_status='pending_admin',paid_at=now(),airpay_txn_id=$2 WHERE id=$1`,[p.id,result.airpayTxnId]);
      return {handled:true,outcome:"conflict" as const,bookingId:p.id};
    }
    const start=new Date(), end=addTerm(start,p.duration,p.duration_unit);
    const other = await c.query(`SELECT 1 FROM network_coach_plan_purchases WHERE user_id=$1 AND trainer_id=$2 AND id<>$3 AND status='paid' AND ends_at > $4 AND category_id=$5 LIMIT 1`,[p.user_id,p.trainer_id,p.id,start,p.category_id]);
    if(other.rows.length) {
      await c.query(`UPDATE network_coach_plan_purchases SET status='paid_conflict',refund_status='pending_admin',paid_at=$2,airpay_txn_id=$3 WHERE id=$1`,[p.id,start,result.airpayTxnId]);
      return {handled:true,outcome:"conflict" as const,bookingId:p.id};
    }
    await c.query(`UPDATE network_coach_plan_purchases SET status='paid',paid_at=$2,starts_at=$2,ends_at=$3,airpay_txn_id=$4 WHERE id=$1`,[p.id,start,end,result.airpayTxnId]);
    return {handled:true,outcome:"paid" as const,bookingId:p.id};
  });
}

export async function bookingByToken(token: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  return (await q(`SELECT b.*, u.name AS user_name, u.email AS user_email, u.mobile AS user_mobile FROM network_coach_bookings b JOIN users u ON u.id=b.user_id WHERE b.pay_token=$1`, [token])).rows[0] ?? null;
}

export type SettleResult = { handled: boolean; outcome?: "paid" | "failed" | "conflict" | "rejected" | "noop"; bookingId?: number };
/**
 * Settle an AUTHENTICATED Airpay result (caller has decrypted/verified it). Binds exact
 * amount + merchant to our booking. Late payment on an expired hold only re-acquires
 * the slot if nobody else holds it; otherwise it's marked paid_conflict for admin refund review.
 */
export async function settlePayment(result: { ok: boolean; orderId: string; airpayTxnId: string; amountInr: number | null; merchantId: string | null }, merchantId = (process.env.AIRPAY_MERCHANT_ID ?? "").trim()): Promise<SettleResult> {
  if (/^2\d{19}$/.test(result.orderId)) return settlePlanPayment(result, merchantId);
  if (!isNetworkOrderRef(result.orderId)) return { handled: false };
  return tx(async c => {
    // Match reservation's lock order (slot, then booking) so a late gateway
    // return and a new reservation cannot deadlock or both acquire one slot.
    const lookup = await c.query(`SELECT slot_id FROM network_coach_bookings WHERE airpay_order_ref=$1`, [result.orderId]);
    if (lookup.rows.length !== 1) return { handled: lookup.rows.length > 1, outcome: lookup.rows.length > 1 ? "rejected" as const : undefined };
    await c.query(`SELECT id FROM network_coach_slots WHERE id=$1 FOR UPDATE`, [lookup.rows[0].slot_id]);
    const { rows } = await c.query(`SELECT * FROM network_coach_bookings WHERE airpay_order_ref=$1 FOR UPDATE`, [result.orderId]);
    if (rows.length !== 1) return { handled: rows.length > 1, outcome: rows.length > 1 ? "rejected" as const : undefined };
    const b = rows[0];
    if (!result.ok) {
      const u = await c.query(`UPDATE network_coach_bookings SET status='payment_failed', airpay_txn_id=$2 WHERE id=$1 AND status='held' RETURNING id`, [b.id, result.airpayTxnId]);
      return { handled: true, outcome: u.rowCount ? "failed" as const : "noop" as const, bookingId: b.id };
    }
    const merchantOk = merchantId === "" || result.merchantId === merchantId;
    if (!amountMatches(result.amountInr, b.amount_inr) || !merchantOk) return { handled: true, outcome: "rejected" as const, bookingId: b.id };
    // Expiration is otherwise lazy. Never rely on another request having
    // materialized it before the gateway returns.
    if (b.status === "held" && (new Date(b.hold_expires_at).getTime() <= Date.now() || new Date(b.starts_at).getTime() <= Date.now())) {
      b.status = "expired";
    }
    if (b.status === "held") {
      await c.query(`UPDATE network_coach_bookings SET status='paid', paid_at=now(), airpay_txn_id=$2 WHERE id=$1`, [b.id, result.airpayTxnId]);
      return { handled: true, outcome: "paid" as const, bookingId: b.id };
    }
    if (b.status === "expired" || b.status === "payment_failed" || b.status === "cancelled") {
      await c.query(`SELECT id FROM network_coach_slots WHERE id=$1 FOR UPDATE`, [b.slot_id]);
      const other = await c.query(`SELECT 1 FROM network_coach_bookings WHERE slot_id=$1 AND id<>$2 AND status IN ('held','paid','completed','paid_conflict') LIMIT 1`, [b.slot_id, b.id]);
      const slotExists = (await c.query(`SELECT 1 FROM network_coach_slots WHERE id=$1`, [b.slot_id])).rows.length > 0;
      if (!other.rows.length && slotExists && b.status !== "cancelled" && new Date(b.starts_at).getTime() > Date.now()) {
        await c.query(`UPDATE network_coach_bookings SET status='paid', paid_at=now(), airpay_txn_id=$2 WHERE id=$1`, [b.id, result.airpayTxnId]);
        return { handled: true, outcome: "paid" as const, bookingId: b.id };
      }
      await c.query(`UPDATE network_coach_bookings SET status='paid_conflict', refund_status='pending_admin', paid_at=now(), airpay_txn_id=$2,
        admin_note='Payment arrived after the hold was released; slot unavailable. Refund needs manual action in the Airpay dashboard.' WHERE id=$1`, [b.id, result.airpayTxnId]);
      return { handled: true, outcome: "conflict" as const, bookingId: b.id };
    }
    return { handled: true, outcome: "noop" as const, bookingId: b.id };
  });
}

// ---------- listing / views (never expose phone/email) ----------
async function decorate(rows: any[], viewer: "member" | "trainer" | "admin") {
  const gyms = new Map((await db.select({ id: gymsTable.id, name: gymsTable.name }).from(gymsTable)).map(g => [g.id, g.name]));
  const staffIds = [...new Set(rows.map(r => r.staff_id as number))];
  const userIds = [...new Set(rows.map(r => r.user_id as number))];
  const staff = staffIds.length ? new Map((await db.select({ id: staffTable.id, name: staffTable.name }).from(staffTable).where(inArray(staffTable.id, staffIds))).map(s => [s.id, s.name])) : new Map();
  const users = userIds.length && viewer !== "member" ? new Map((await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds))).map(u => [u.id, u.name])) : new Map();
  const reviews = rows.length ? new Map((await q(`SELECT booking_id, rating, comment FROM network_coach_reviews WHERE booking_id = ANY($1::int[])`, [rows.map(r => r.id)])).rows.map(r => [r.booking_id, r])) : new Map();
  const now = new Date();
  return rows.map(r => {
    const s = new Date(r.starts_at), e = new Date(r.ends_at);
    const rv = reviews.get(r.id);
    return {
      id: r.id as number, status: r.status as string, gymId: r.gym_id as number, branchName: gyms.get(r.gym_id) ?? "",
      trainerId: r.trainer_id as string, trainerName: staff.get(r.staff_id) ?? "Coach",
      memberName: viewer === "member" ? null : (users.get(r.user_id) ?? "Member").split(" ")[0],
      startsAt: s.toISOString(), endsAt: e.toISOString(), amountInr: r.amount_inr as number, currency: "INR",
      holdExpiresAt: r.status === "held" ? new Date(r.hold_expires_at).toISOString() : null,
      refundStatus: (r.refund_status as string) || null,
      adminNote: viewer === "admin" ? (r.admin_note as string) || null : null,
      paymentReference: viewer === "admin" ? (r.airpay_order_ref as string) || null : null,
      canJoin: r.status === "paid" && joinWindowOpen(s, e, now),
      planCovered: !!r.plan_entitlement_id,
      canReview: viewer === "member" && r.status === "completed" && !rv,
      review: rv ? { rating: rv.rating as number, comment: rv.comment as string } : null,
    };
  });
}
export async function memberBookings(userId: number) {
  await expireHolds();
  return decorate((await q(`SELECT * FROM network_coach_bookings WHERE user_id=$1 ORDER BY starts_at DESC LIMIT 100`, [userId])).rows, "member");
}
export async function memberPlans(userId: number) {
  const { rows } = await q(`SELECT p.id,p.plan_name AS "planName",p.duration,p.duration_unit AS "durationUnit",p.amount_inr AS "amountInr",p.trainer_id AS "trainerId",s.name AS "trainerName",g.name AS "branchName",p.starts_at AS "startsAt",p.ends_at AS "endsAt",CASE WHEN p.status='paid' AND p.starts_at <= now() AND p.ends_at > now() THEN 'active' WHEN p.status='paid' AND p.ends_at <= now() THEN 'expired' ELSE p.status END AS status
    FROM network_coach_plan_purchases p LEFT JOIN staff s ON s.yoactiv_staff_id=p.trainer_id LEFT JOIN gyms g ON g.id=p.gym_id
    WHERE p.user_id=$1 AND p.status IN ('paid','paid_conflict') ORDER BY p.created_at DESC LIMIT 100`,[userId]);
  return rows.map(r=>({...r,startsAt:r.startsAt ? new Date(r.startsAt).toISOString() : null,endsAt:r.endsAt ? new Date(r.endsAt).toISOString() : null}));
}
export async function trainerBookings(trainerId: string) {
  return decorate((await q(`SELECT * FROM network_coach_bookings WHERE trainer_id=$1 AND status IN ('paid','completed','paid_conflict') ORDER BY starts_at DESC LIMIT 200`, [trainerId])).rows, "trainer");
}
export async function adminBookings() {
  await expireHolds();
  return decorate((await q(`SELECT * FROM network_coach_bookings ORDER BY (status='paid_conflict' OR refund_status='pending_admin') DESC, created_at DESC LIMIT 300`)).rows, "admin");
}

export async function cancelByMember(userId: number, bookingId: number) {
  return tx(async c => {
    const { rows } = await c.query(`SELECT * FROM network_coach_bookings WHERE id=$1 AND user_id=$2 FOR UPDATE`, [bookingId, userId]);
    const b = rows[0];
    if (!b) throw new PtCheckoutError(404, "Booking not found.");
    if (b.status === "held") {
      await c.query(`UPDATE network_coach_bookings SET status='cancelled', cancelled_at=now() WHERE id=$1`, [b.id]);
    } else if (b.status === "paid" && b.plan_entitlement_id) {
      if (new Date(b.starts_at).getTime() <= Date.now()) throw new PtCheckoutError(409, "This session has already started and can't be cancelled.");
      await c.query(`UPDATE network_coach_bookings SET status='cancelled', cancelled_at=now() WHERE id=$1`, [b.id]);
    } else if (b.status === "paid") {
      if (new Date(b.starts_at).getTime() <= Date.now()) throw new PtCheckoutError(409, "This session has already started and can't be cancelled.");
      // Refunds aren't automatable via a documented Airpay API here — flag honestly for admin.
      await c.query(`UPDATE network_coach_bookings SET status='cancelled', cancelled_at=now(), refund_status='pending_admin',
        admin_note='Member cancelled a paid session; refund pending manual admin action.' WHERE id=$1`, [b.id]);
    } else throw new PtCheckoutError(409, "This booking can't be cancelled.");
    return { ok: true };
  });
}

/** Completion is only ever recorded by the assigned trainer (or an admin), after the session start. Never by a member click. */
export async function completeBooking(bookingId: number, by: { trainerId: string } | "admin") {
  const params: unknown[] = [bookingId];
  let extra = "";
  if (by !== "admin") { params.push(by.trainerId); extra = " AND trainer_id=$2"; }
  const { rows } = await q(`UPDATE network_coach_bookings SET status='completed', completed_at=now() WHERE id=$1 AND status='paid' AND starts_at <= now()${extra} RETURNING id`, params);
  if (!rows.length) throw new PtCheckoutError(409, "Only a paid session that has started can be marked complete.");
  return { ok: true };
}
export async function setRefundResolved(bookingId: number, note: string) {
  const { rows } = await q(`UPDATE network_coach_bookings SET refund_status='refunded_manual', admin_note=$2 WHERE id=$1 AND refund_status='pending_admin' RETURNING id`, [bookingId, note.slice(0, 500)]);
  if (!rows.length) throw new PtCheckoutError(409, "No pending refund on this booking.");
  return { ok: true };
}
export async function adminPlanPurchases() {
  const { rows } = await q(`SELECT p.id,p.plan_name AS "planName",p.duration,p.duration_unit AS "durationUnit",p.amount_inr AS "amountInr",p.trainer_id AS "trainerId",p.status,p.refund_status AS "refundStatus",p.airpay_order_ref AS "paymentReference",p.starts_at AS "startsAt",p.ends_at AS "endsAt",p.admin_note AS "adminNote",u.name AS "memberName" FROM network_coach_plan_purchases p JOIN users u ON u.id=p.user_id ORDER BY (p.refund_status='pending_admin') DESC,p.created_at DESC LIMIT 300`);
  return rows;
}
export async function resolvePlanRefund(id: number, note: string) {
  const { rows } = await q(`UPDATE network_coach_plan_purchases SET refund_status='refunded_manual',admin_note=$2 WHERE id=$1 AND refund_status='pending_admin' RETURNING id`,[id,note.slice(0,500)]);
  if (!rows.length) throw new PtCheckoutError(409,"No pending plan refund on this purchase.");
  return { ok: true };
}

export async function addReview(userId: number, bookingId: number, input: z.infer<typeof reviewInput>) {
  const { rows } = await q(`SELECT * FROM network_coach_bookings WHERE id=$1 AND user_id=$2`, [bookingId, userId]);
  const b = rows[0];
  if (!b) throw new PtCheckoutError(404, "Booking not found.");
  if (b.status !== "completed" || !b.paid_at) throw new PtCheckoutError(409, "You can review a session once your coach marks it completed.");
  try {
    await q(`INSERT INTO network_coach_reviews (booking_id,user_id,gym_id,trainer_id,rating,comment) VALUES ($1,$2,$3,$4,$5,$6)`,
      [b.id, userId, b.gym_id, b.trainer_id, input.rating, scrubContact(input.comment)]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new PtCheckoutError(409, "You've already reviewed this session.");
    throw e;
  }
  return { ok: true };
}
export async function reviewStats(trainerIds: string[]) {
  if (!trainerIds.length) return new Map<string, { avg: number; count: number }>();
  const { rows } = await q(`SELECT trainer_id, avg(rating)::float AS avg, count(*)::int AS n FROM network_coach_reviews WHERE trainer_id = ANY($1::text[]) GROUP BY trainer_id`, [trainerIds]);
  return new Map(rows.map(r => [r.trainer_id as string, { avg: Math.round(r.avg * 10) / 10, count: r.n as number }]));
}
export async function trainerReviews(trainerId: string) {
  const { rows } = await q(`SELECT rating, comment, created_at FROM network_coach_reviews WHERE trainer_id=$1 ORDER BY created_at DESC LIMIT 30`, [trainerId]);
  return rows.map(r => ({ rating: r.rating as number, comment: r.comment as string, createdAt: new Date(r.created_at).toISOString() }));
}

/** Booking row for call authorization — returns null unless the caller is the booked member or assigned trainer. */
export async function bookingForCall(bookingId: number, who: { userId: number } | { trainerId: string; staffId: number }) {
  const { rows } = await q(`SELECT * FROM network_coach_bookings WHERE id=$1`, [bookingId]);
  const b = rows[0];
  if (!b) return null;
  if ("userId" in who ? b.user_id !== who.userId : (b.trainer_id !== who.trainerId)) return null;
  return b as { id: number; status: string; starts_at: Date; ends_at: Date; room_name: string; user_id: number; staff_id: number };
}
