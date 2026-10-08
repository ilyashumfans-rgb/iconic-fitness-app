import { Router, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, gymsTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { requirePartner, requirePartnerPerm } from "../lib/partnerAuth";
import { onlineBilling } from "../lib/onlineBilling";
import { requireUser } from "../lib/currentUser";
import { requireStaffPermission } from "../lib/staffAuth";
import { PtCheckoutError } from "../lib/ptTrainerPolicy";
import { resolvePtTrainerRoster } from "../lib/ptTrainerResolver";
import { trainerPhotoMap } from "../lib/trainerPhotos";
import { trainerProfileMap } from "../lib/liveTrainerProfiles";
import { airpayCheckoutForm } from "../lib/airpay";
import { autoPostHtml, billingFormHtml, billingInput, publicOrigin } from "../lib/networkPayHandoff";
import { listCategories, setNetworkCapability, categoryId } from "../lib/coachCategories";
import {
  addReview, adminBookings, adminNetworkSlots, adminPlanPurchases, adminPlans, authorizedTrainer, bookingByToken, bookingForCall, cancelByMember, completeBooking, createSlots,
  createPlanPurchase, deletePlan, deleteSlot, deleteSlotAsAdmin, getPrices, memberBookings, memberPlans, networkGyms, networkTrainersAt, openSlotCounts, openSlotsFor,
  planInput, planPurchaseByToken, priceInput, pricesIncludingTax, publishedPlansFor, reserveSlot, reviewInput, reviewStats, savePlan, setPrices,
  resolvePlanRefund, setRefundResolved, slotInput, trainerBookings, trainerReviews, trainerSlots, type RosterFn,
} from "../lib/networkCoach";
import { issueCallToken, type Minter, livekitMinter } from "../lib/networkCall";
import { sessionReminder, type ReminderOwner } from "../lib/networkCoachReminders";
import { isExpoPushToken, registerPushToken } from "../lib/pushNotifications";
import { SetNetworkCoachReminderBody } from "@workspace/api-zod";

const handle = (fn: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (error) {
    if (error instanceof PtCheckoutError) { res.status(error.status).json({ error: error.message }); return; }
    next(error);
  }
};
const parse = <T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> => {
  const r = schema.safeParse(body);
  if (!r.success) throw new PtCheckoutError(400, r.error.issues[0]?.message ?? "Invalid input");
  return r.data;
};
const intParam = (v: unknown) => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw new PtCheckoutError(404, "Not found."); return n; };
const baseUrl = publicOrigin;
const page = (title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px"><div><h1 style="font-size:20px">${title}</h1><p style="color:#aaa;max-width:340px">${body}</p></div></body></html>`;

export function createNetworkCoachRouter(deps: { roster?: RosterFn; mint?: Minter; checkout?: typeof airpayCheckoutForm } = {}) {
  const router = Router();
  const roster = deps.roster ?? resolvePtTrainerRoster;
  const mint = deps.mint ?? livekitMinter;
  const checkout = deps.checkout ?? airpayCheckoutForm;
  const reminderGate: RequestHandler = async (req, res, next) => {
    if (req.params.role === "member") { await requireUser(req, res, next); return; }
    if (req.params.role === "trainer") { await requireStaffPermission("pt.manage")(req, res, next); return; }
    res.status(404).json({ error: "Not found." });
  };
  const reminderOwner = async (req: Request): Promise<ReminderOwner> => {
    if (req.params.role === "member") return { role: "member", id: req.userId! };
    const t = await authorizedTrainer(req.session.staffId!, roster);
    return { role: "trainer", id: t.staffId, trainerId: t.trainerId };
  };
  router.get("/network-coach/reminders/:role/:id", reminderGate, handle(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await sessionReminder(intParam(req.params.id), await reminderOwner(req)));
  }));
  router.put("/network-coach/reminders/:role/:id", reminderGate, handle(async (req, res) => {
    const input = parse(SetNetworkCoachReminderBody, req.body);
    if (input.token !== undefined && !isExpoPushToken(input.token)) throw new PtCheckoutError(400, "Invalid push token.");
    const owner = await reminderOwner(req);
    // Authorize before touching the device, then register before opt-in becomes
    // visible to the scheduler (otherwise the first push could miss this phone).
    await sessionReminder(intParam(req.params.id), owner);
    if (input.enabled && input.token) {
      await registerPushToken(owner.id, input.token, input.platform ?? "", owner.role === "member" ? "user" : "staff");
      if (owner.role === "trainer") req.session.networkCoachPushToken = input.token;
    }
    res.json(await sessionReminder(intParam(req.params.id), owner, input.enabled));
  }));

  // ---------------- member ----------------
  router.get("/network-coach/overview", handle(async (req, res) => {
    const cats = (await listCategories()).filter(c => c.networkCoach === true && c.published);
    res.setHeader("Cache-Control", "no-store");
    const branches = await networkGyms();
    const selected = req.query.categoryId ? cats.find(c => c.id === req.query.categoryId) : cats[0];
    const prices = selected ? pricesIncludingTax(await getPrices(selected.id)) : { "30": null, "45": null, "60": null };
    if (!selected) { res.json({ category: null, categories: cats, branches, prices, trainers: [], partial: false }); return; }
    const filter = req.query.gymId ? Number(req.query.gymId) : null;
    const target = filter ? branches.filter(b => b.id === filter) : branches;
    const ids = [selected.id];
    const settled = await Promise.allSettled(target.map(async g => ({ g, list: await networkTrainersAt(g.id, roster, ids) })));
    const partial = settled.some(s => s.status === "rejected");
    const rows = settled.flatMap(s => s.status === "fulfilled" ? s.value.list.map(t => ({ ...t, branchName: s.value.g.name })) : []);
    const tIds = [...new Set(rows.map(r => r.id))];
    const [photos, counts, stats] = await Promise.all([trainerPhotoMap(tIds), openSlotCounts(rows.map(r => ({ gymId: r.gymId, trainerId: r.id }))), reviewStats(tIds)]);
    const profileByGym = new Map<number, Map<string, { photoUrl?: string | null }>>();
    for (const gid of new Set(rows.map(r => r.gymId))) profileByGym.set(gid, await trainerProfileMap(gid, rows.filter(r => r.gymId === gid).map(r => r.id)) as Map<string, { photoUrl?: string | null }>);
    res.json({
      category: { id: selected.id, title: selected.title, summary: selected.summary },
      categories: cats,
      branches, prices, partial,
      trainers: rows.map(r => ({
        id: r.id, name: r.name, gymId: r.gymId, branchName: r.branchName, categoryId: r.categoryId,
        photoUrl: profileByGym.get(r.gymId)?.get(r.id)?.photoUrl || photos.get(r.id) || null,
        openSlots: counts.get(`${r.gymId}:${r.id}`) ?? 0,
        rating: stats.get(r.id)?.avg ?? null, reviewCount: stats.get(r.id)?.count ?? 0,
      })).sort((a, b) => b.openSlots - a.openSlots || a.name.localeCompare(b.name)),
    });
  }));
  router.get("/network-coach/trainers/:trainerId/slots", handle(async (req, res) => {
    const gymId = intParam(req.query.gymId);
    const trainerId = String(req.params.trainerId);
    const trainer = (await networkTrainersAt(gymId, roster)).find(t => t.id === trainerId && (!req.query.categoryId || t.categoryId === req.query.categoryId));
    if (!trainer) throw new PtCheckoutError(404, "This coach isn't offering online sessions.");
    const [slots, reviews, stats] = await Promise.all([
      openSlotsFor(gymId, trainerId, new Date(), trainer.categoryId),
      trainerReviews(trainerId),
      reviewStats([trainerId]),
    ]);
    const rating = stats.get(trainerId);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      trainer: { id: trainer.id, name: trainer.name, gymId, rating: rating?.avg ?? null, reviewCount: rating?.count ?? 0 },
      slots, reviews, timezone: "Asia/Kolkata",
    });
  }));
  router.get("/network-coach/trainers/:trainerId/plans", handle(async (req, res) => {
    const gymId = intParam(req.query.gymId);
    const trainerId = String(req.params.trainerId);
    const trainer = (await networkTrainersAt(gymId, roster)).find(t => t.id === trainerId && (!req.query.categoryId || t.categoryId === req.query.categoryId));
    if (!trainer) throw new PtCheckoutError(404, "This coach isn't offering online sessions.");
    res.setHeader("Cache-Control", "no-store");
    res.json(await publishedPlansFor(req.userId ?? null, trainerId, gymId, trainer.categoryId));
  }));
  router.post("/network-coach/bookings", requireUser, handle(async (req, res) => {
    const { slotId, categoryId } = parse(z.object({ slotId: z.number().int().positive(), categoryId: z.string().min(1).optional() }).strict(), req.body);
    const b = await reserveSlot(req.userId!, slotId, roster, new Date(), categoryId);
    res.status(201).json({ bookingId: b.id, amountInr: b.amount_inr, currency: "INR", holdExpiresAt: b.plan_entitlement_id ? null : new Date(b.hold_expires_at).toISOString(),
      planCovered: !!b.plan_entitlement_id, paymentUrl: b.plan_entitlement_id ? null : `${baseUrl(req)}/api/pay/network-coach/${b.pay_token}/start` });
  }));
  router.post("/network-coach/plans/purchase", requireUser, handle(async (req, res) => {
    const input = parse(z.object({ trainerId: z.string().min(1).max(100), gymId: z.number().int().positive(), planId: z.number().int().positive(), categoryId: z.string().min(1).optional() }).strict(), req.body);
    const purchase = await createPlanPurchase(req.userId!, input.trainerId, input.gymId, input.planId, roster, input.categoryId);
    res.status(201).json({ purchaseId: purchase.id, amountInr: purchase.amountInr, holdExpiresAt: purchase.holdExpiresAt,
      paymentUrl: `${baseUrl(req)}/api/pay/network-coach-plan/${purchase.payToken}/start` });
  }));
  router.get("/network-coach/bookings", requireUser, handle(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await memberBookings(req.userId!));
  }));
  router.get("/admin/online-billing", requireAdmin, handle(async (_req, res) => {
    res.set("Cache-Control", "private, no-store").json(await onlineBilling({ kind: "admin" }));
  }));
  router.get("/partner/online-billing", requirePartner, requirePartnerPerm("bookings"), handle(async (req, res) => {
    res.set("Cache-Control", "private, no-store").json(await onlineBilling({ kind: "partner", id: req.session.partnerId! }));
  }));
  router.get("/network-coach/billing", requireUser, handle(async (req, res) => {
    res.set("Cache-Control", "private, no-store").json(await onlineBilling({ kind: "member", id: req.userId! }));
  }));
  router.get("/network-coach/plans", requireUser, handle(async (req,res) => {
    res.setHeader("Cache-Control","no-store");
    res.json(await memberPlans(req.userId!));
  }));
  router.post("/network-coach/bookings/:id/cancel", requireUser, handle(async (req, res) => { res.json(await cancelByMember(req.userId!, intParam(req.params.id))); }));
  router.post("/network-coach/bookings/:id/review", requireUser, handle(async (req, res) => {
    res.status(201).json(await addReview(req.userId!, intParam(req.params.id), parse(reviewInput, req.body)));
  }));
  router.post("/network-coach/bookings/:id/join", requireUser, handle(async (req, res) => {
    const booking = await bookingForCall(intParam(req.params.id), { userId: req.userId! });
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
    res.setHeader("Cache-Control", "no-store");
    res.json(await issueCallToken(booking, { identity: `member-${req.userId}`, name: (u?.name ?? "Member").split(" ")[0]! }, mint));
  }));

  // ---------------- payment (Airpay hosted checkout; settlement happens ONLY in the verified return handler) ----------------
  // Step 1 (GET): validate token + live hold, then ask the buyer for their real billing details.
  // Step 2 (POST): re-validate token + hold, validate billing, then build the Airpay form. Nothing is invented.
  const liveHold = async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const b = await bookingByToken(String(req.params.token ?? ""));
    if (!b) { res.status(404).send(page("Not found", "This payment link is invalid.")); return null; }
    if (b.status !== "held" || new Date(b.hold_expires_at).getTime() < Date.now()) {
      res.status(410).send(page(b.status === "paid" ? "Already paid" : "Hold expired", b.status === "paid" ? "Your session is confirmed. Return to the app." : "Your reserved time was released. Go back to the app and pick a time again."));
      return null;
    }
    return b;
  };
  const startPath = (req: Request) => `/api/pay/network-coach/${encodeURIComponent(String(req.params.token))}/start`;
  router.get("/pay/network-coach/:token/start", handle(async (req: Request, res: Response) => {
    const b = await liveHold(req, res); if (!b) return;
    res.status(200).type("html").send(billingFormHtml({ action: startPath(req), amountInr: b.amount_inr, tax: b.tax, expiresAt: b.hold_expires_at }));
  }));
  router.get("/pay/network-coach-plan/:token/start", handle(async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const p = await planPurchaseByToken(String(req.params.token ?? ""));
    if (!p) { res.status(404).send(page("Not found", "This payment link is invalid.")); return; }
    if (p.status !== "held" || new Date(p.hold_expires_at).getTime() < Date.now()) {
      res.status(410).send(page("Plan hold expired", "Return to the app to choose an available plan again.")); return;
    }
    res.type("html").send(billingFormHtml({ action: `/api/pay/network-coach-plan/${encodeURIComponent(String(req.params.token))}/start`, amountInr: p.amount_inr, tax: p.tax, expiresAt: p.hold_expires_at }));
  }));
  router.post("/pay/network-coach-plan/:token/start", handle(async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const p = await planPurchaseByToken(String(req.params.token ?? ""));
    if (!p) { res.status(404).send(page("Not found", "This payment link is invalid.")); return; }
    if (p.status !== "held" || new Date(p.hold_expires_at).getTime() < Date.now()) { res.status(410).send(page("Plan hold expired", "Return to the app to choose an available plan again.")); return; }
    const raw = { address: String(req.body?.address ?? ""), city: String(req.body?.city ?? ""), pincode: String(req.body?.pincode ?? "") };
    const parsed = billingInput.safeParse(raw);
    if (!parsed.success) {
      res.status(400).type("html").send(billingFormHtml({ action: `/api/pay/network-coach-plan/${encodeURIComponent(String(req.params.token))}/start`, amountInr: p.amount_inr, tax: p.tax, expiresAt: p.hold_expires_at, values: raw, error: parsed.error.issues[0]?.message ?? "Check your billing details." }));
      return;
    }
    const origin = publicOrigin(req);
    const form = await checkout({ orderId: p.airpay_order_ref, amountInr: p.amount_inr, buyerName: p.user_name || "Member", buyerEmail: p.user_email,
      buyerPhone: String(p.user_mobile ?? "").replace(/\D/g, "").slice(-10), buyerAddress: parsed.data.address, buyerCity: parsed.data.city, buyerPincode: parsed.data.pincode,
      successUrl: `${origin}/api/pay/store/return`, failureUrl: `${origin}/api/pay/store/return` });
    if (!form) { res.status(502).send(page("Payment unavailable", "Could not reach the payment gateway. Go back to the app and try again.")); return; }
    res.type("html").send(autoPostHtml(form.action, form.fields));
  }));
  router.post("/pay/network-coach/:token/start", handle(async (req: Request, res: Response) => {
    const b = await liveHold(req, res); if (!b) return;
    const raw = { address: String(req.body?.address ?? ""), city: String(req.body?.city ?? ""), pincode: String(req.body?.pincode ?? "") };
    const parsed = billingInput.safeParse(raw);
    if (!parsed.success) {
      res.status(400).type("html").send(billingFormHtml({ action: startPath(req), amountInr: b.amount_inr, tax: b.tax, expiresAt: b.hold_expires_at, values: raw, error: parsed.error.issues[0]?.message ?? "Check your billing details." }));
      return;
    }
    const origin = publicOrigin(req);
    const form = await checkout({
      orderId: b.airpay_order_ref, amountInr: b.amount_inr, buyerName: b.user_name || "Member", buyerEmail: b.user_email,
      buyerPhone: String(b.user_mobile ?? "").replace(/\D/g, "").slice(-10), buyerAddress: parsed.data.address,
      buyerCity: parsed.data.city, buyerPincode: parsed.data.pincode,
      successUrl: `${origin}/api/pay/store/return`, failureUrl: `${origin}/api/pay/store/return`,
    });
    if (!form) { res.status(502).send(page("Payment unavailable", "Could not reach the payment gateway. Go back to the app and try again.")); return; }
    res.status(200).type("html").send(autoPostHtml(form.action, form.fields));
  }));

  // ---------------- trainer (staff session; identity from session only) ----------------
  const staffGate = requireStaffPermission("pt.manage");
  const me = (req: Request) => authorizedTrainer(req.session.staffId!, roster);
  router.get("/staff/network-coach/me", staffGate, handle(async (req, res) => {
    const t = await me(req);
    const [gym] = await db.select({ name: gymsTable.name }).from(gymsTable).where(eq(gymsTable.id, t.gymId));
    res.json({ name: t.name, gymId: t.gymId, branchName: gym?.name ?? "", prices: t.categoryId ? await getPrices(t.categoryId) : { "30": null, "45": null, "60": null }, categoryReady: !!t.categoryId, timezone: "Asia/Kolkata" });
  }));
  router.get("/staff/network-coach/slots", staffGate, handle(async (req, res) => { const t = await me(req); res.json(await trainerSlots(t.trainerId)); }));
  router.post("/staff/network-coach/slots", staffGate, handle(async (req, res) => {
    const t = await me(req);
    res.status(201).json(await createSlots(t, parse(slotInput, req.body)));
  }));
  router.delete("/staff/network-coach/slots/:id", staffGate, handle(async (req, res) => {
    const t = await me(req); await deleteSlot(t.trainerId, intParam(req.params.id)); res.status(204).end();
  }));
  router.get("/staff/network-coach/bookings", staffGate, handle(async (req, res) => { const t = await me(req); res.json(await trainerBookings(t.trainerId)); }));
  router.post("/staff/network-coach/bookings/:id/complete", staffGate, handle(async (req, res) => {
    const t = await me(req); res.json(await completeBooking(intParam(req.params.id), { trainerId: t.trainerId }));
  }));
  router.post("/staff/network-coach/bookings/:id/join", staffGate, handle(async (req, res) => {
    const t = await me(req);
    const booking = await bookingForCall(intParam(req.params.id), { trainerId: t.trainerId, staffId: t.staffId });
    res.setHeader("Cache-Control", "no-store");
    res.json(await issueCallToken(booking, { identity: `trainer-${t.staffId}`, name: `Coach ${t.name.split(" ")[0]}` }, mint));
  }));

  // ---------------- admin ----------------
  router.get("/admin/network-coach/slots", requireAdmin, handle(async (_req, res) => { res.json(await adminNetworkSlots()); }));
  router.post("/admin/network-coach/slots", requireAdmin, handle(async (req, res) => {
    const input = parse(slotInput.extend({ trainerId: z.string().min(1), gymId: z.number().int().positive() }).strict(), req.body);
    const trainer = (await networkTrainersAt(input.gymId, roster)).find(t => t.id === input.trainerId);
    if (!trainer || typeof trainer.staffId !== "number") throw new PtCheckoutError(404,"This coach isn't offering online sessions.");
    res.status(201).json(await createSlots({ staffId: trainer.staffId, gymId: trainer.gymId, trainerId: trainer.id }, input));
  }));
  router.delete("/admin/network-coach/slots/:id", requireAdmin, handle(async (req, res) => { await deleteSlotAsAdmin(intParam(req.params.id)); res.status(204).end(); }));
  router.get("/admin/network-coach/settings", requireAdmin, handle(async (_req, res) => {
    const cats = await listCategories();
    const categoryPrices = Object.fromEntries(await Promise.all(cats.map(async c => [c.id, await getPrices(c.id)])));
    res.json({ prices: await getPrices(), categoryPrices, plans: await adminPlans(), categories: cats.map(c => ({ id: c.id, title: c.title, published: c.published, networkCoach: c.networkCoach === true })) });
  }));
  router.post("/admin/network-coach/plans", requireAdmin, handle(async (req, res) => { res.status(201).json(await savePlan(null, parse(planInput, req.body))); }));
  router.put("/admin/network-coach/plans/:id", requireAdmin, handle(async (req, res) => { res.json(await savePlan(intParam(req.params.id), parse(planInput, req.body))); }));
  router.delete("/admin/network-coach/plans/:id", requireAdmin, handle(async (req, res) => { res.json(await deletePlan(intParam(req.params.id))); }));
  router.put("/admin/network-coach/prices", requireAdmin, handle(async (req, res) => {
    const input = parse(priceInput.extend({ categoryId: z.string().min(1) }), req.body);
    res.json(await setPrices(input.prices, input.categoryId));
  }));
  router.put("/admin/network-coach/categories/:categoryId", requireAdmin, handle(async (req, res) => {
    const { enabled } = parse(z.object({ enabled: z.boolean() }).strict(), req.body);
    const c = await setNetworkCapability(categoryId(req.params.categoryId), enabled);
    res.json({ id: c.id, title: c.title, published: c.published, networkCoach: c.networkCoach === true });
  }));
  router.get("/admin/network-coach/bookings", requireAdmin, handle(async (_req, res) => { res.json(await adminBookings()); }));
  router.get("/admin/network-coach/plan-purchases", requireAdmin, handle(async (_req, res) => { res.json(await adminPlanPurchases()); }));
  router.post("/admin/network-coach/plan-purchases/:id/refund-resolved", requireAdmin, handle(async (req, res) => {
    const { note } = parse(z.object({ note: z.string().trim().min(3).max(500) }).strict(), req.body);
    res.json(await resolvePlanRefund(intParam(req.params.id), note));
  }));
  router.post("/admin/network-coach/bookings/:id/refund-resolved", requireAdmin, handle(async (req, res) => {
    const { note } = parse(z.object({ note: z.string().trim().min(3).max(500) }).strict(), req.body);
    res.json(await setRefundResolved(intParam(req.params.id), note));
  }));
  router.post("/admin/network-coach/bookings/:id/complete", requireAdmin, handle(async (req, res) => { res.json(await completeBooking(intParam(req.params.id), "admin")); }));
  return router;
}

export const networkCoachLandingHtml = (outcome: string | undefined) =>
  outcome === "paid" ? page("Session confirmed", "Payment verified. Return to the Iconic app — your session is in My online sessions.")
  : outcome === "conflict" ? page("Payment received", "The payment arrived after its hold expired or an active plan already existed. The purchase was not activated; our team will review a manual refund.")
  : outcome === "failed" ? page("Payment failed", "No session was booked. Return to the app to try again.")
  : page("Payment status", "Return to the app and check My online sessions.");

export default createNetworkCoachRouter();
