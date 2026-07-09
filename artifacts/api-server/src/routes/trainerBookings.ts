import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, gymsTable, trainerBookingsTable, usersTable } from "@workspace/db";
import {
  ListTrainerPackagesQueryParams,
  ListTrainerPackagesResponse,
  CreateTrainerBookingBody,
  CreateTrainerBookingResponse,
  GetTrainerBookingParams,
  GetTrainerBookingResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import {
  createYoactivPaymentUrl,
  ensureYoactivMemberId,
  fetchYoactivPackages,
  normalizeMobile,
  resolveBranchTarget,
  yoactivConfigured,
} from "../lib/yoactiv";

const router: IRouter = Router();

/** Absolute public base URL for payment redirect landings. */
function publicBaseUrl(req: Request): string {
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",");
  const domain =
    domains[0]?.trim() || process.env.REPLIT_DEV_DOMAIN?.trim() || req.get("host");
  return `https://${domain}`;
}

// Purchasable packages (live prices) for a branch.
router.get("/trainer-packages", async (req, res): Promise<void> => {
  const parsed = ListTrainerPackagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!yoactivConfigured()) {
    res.json(ListTrainerPackagesResponse.parse([]));
    return;
  }
  const [gym] = await db
    .select({ yoactivBranchId: gymsTable.yoactivBranchId })
    .from(gymsTable)
    .where(eq(gymsTable.id, parsed.data.gymId));
  // No branch mapping → no paid packages; the app falls back to enquiries.
  if (!gym?.yoactivBranchId) {
    res.json(ListTrainerPackagesResponse.parse([]));
    return;
  }
  const packages = await fetchYoactivPackages(gym.yoactivBranchId);
  res.json(ListTrainerPackagesResponse.parse(packages));
});

// Start a paid booking: verify the package server-side, register the member in
// the gym-management system if needed, create a pending booking row, and hand
// back YoActiv's hosted Razorpay payment link (valid ~5 minutes).
router.post(
  "/trainer-bookings",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CreateTrainerBookingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const body = parsed.data;
    if (!yoactivConfigured()) {
      res.status(503).json({ error: "Payments are temporarily unavailable" });
      return;
    }
    const mobile = normalizeMobile(body.mobile);
    if (!mobile) {
      res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.preferredDate)) {
      res.status(400).json({ error: "Invalid preferred date" });
      return;
    }
    const [gym] = await db
      .select({
        id: gymsTable.id,
        name: gymsTable.name,
        yoactivBranchId: gymsTable.yoactivBranchId,
      })
      .from(gymsTable)
      .where(eq(gymsTable.id, body.gymId));
    if (!gym) {
      res.status(404).json({ error: "Branch not found" });
      return;
    }
    const target = await resolveBranchTarget(gym.yoactivBranchId);
    if (!target) {
      res.status(409).json({
        error: "Online payment isn't available for this branch yet",
      });
      return;
    }
    // Never trust the client's price — re-read the package from YoActiv.
    const packages = await fetchYoactivPackages(gym.yoactivBranchId);
    const pkg = packages.find((p) => p.id === body.packageId);
    if (!pkg) {
      res.status(400).json({ error: "That package is no longer available" });
      return;
    }
    const [user] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const memberId = await ensureYoactivMemberId(
      target,
      mobile,
      body.name.trim(),
      user?.email ?? null,
    );
    if (!memberId) {
      res.status(502).json({
        error: "Could not register you with the gym system. Please try again.",
      });
      return;
    }

    const token = randomBytes(24).toString("hex");
    const [booking] = await db
      .insert(trainerBookingsTable)
      .values({
        token,
        userId: req.userId!,
        gymId: gym.id,
        gymName: gym.name,
        branchId: target.branchId,
        trainerId: body.trainerId ?? "",
        trainerName: body.trainerName ?? "",
        memberName: body.name.trim(),
        mobile,
        packageName: pkg.name,
        serviceName: pkg.serviceName,
        amountInr: Math.round(pkg.amountInr),
        preferredDate: body.preferredDate,
        status: "pending",
      })
      .returning();

    const base = publicBaseUrl(req);
    const paymentUrl = await createYoactivPaymentUrl({
      target,
      memberId,
      variationId: pkg.id,
      amountInr: Math.round(pkg.amountInr),
      startDateIso: body.preferredDate,
      successUrl: `${base}/api/pay/trainer/${token}/success`,
      failedUrl: `${base}/api/pay/trainer/${token}/failed`,
    });
    if (!paymentUrl) {
      await db
        .update(trainerBookingsTable)
        .set({ status: "failed" })
        .where(eq(trainerBookingsTable.id, booking!.id));
      res.status(502).json({
        error: "Could not start the payment. Please try again.",
      });
      return;
    }
    res.json(
      CreateTrainerBookingResponse.parse({
        id: booking!.id,
        status: "pending",
        amountInr: Math.round(pkg.amountInr),
        paymentUrl,
      }),
    );
  },
);

// Status polling for the member who made the booking.
router.get(
  "/trainer-bookings/:bookingId",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const params = GetTrainerBookingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .select()
      .from(trainerBookingsTable)
      .where(
        and(
          eq(trainerBookingsTable.id, params.data.bookingId),
          eq(trainerBookingsTable.userId, req.userId!),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(
      GetTrainerBookingResponse.parse({
        id: row.id,
        status: row.status,
        amountInr: row.amountInr,
        packageName: row.packageName,
        trainerName: row.trainerName,
        gymName: row.gymName,
        preferredDate: row.preferredDate,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  },
);

// ─── Payment redirect landings (opened by YoActiv's hosted page) ────────────

function landingHtml(ok: boolean): string {
  const title = ok ? "Payment successful" : "Payment failed";
  const msg = ok
    ? "Your trainer session is booked. You can close this page and return to the Iconic Fitness app."
    : "The payment didn't go through. You can close this page, return to the app and try again.";
  const accent = ok ? "#C7F000" : "#ff6b6b";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">
<div style="padding:32px;max-width:360px"><div style="font-size:48px">${ok ? "✓" : "✕"}</div>
<h1 style="color:${accent};font-size:22px;margin:12px 0">${title}</h1>
<p style="color:#aaa;font-size:15px;line-height:1.5">${msg}</p></div></body></html>`;
}

router.get(
  "/pay/trainer/:token/:outcome",
  async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token ?? "");
    const outcome = req.params.outcome === "success" ? "paid" : "failed";
    if (/^[0-9a-f]{48}$/.test(token)) {
      // Only move pending rows — a landing page reload can't flip a final state.
      await db
        .update(trainerBookingsTable)
        .set(
          outcome === "paid"
            ? { status: "paid", paidAt: new Date() }
            : { status: "failed" },
        )
        .where(
          and(
            eq(trainerBookingsTable.token, token),
            eq(trainerBookingsTable.status, "pending"),
          ),
        );
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(landingHtml(outcome === "paid"));
  },
);

export default router;
