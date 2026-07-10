import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, gymsTable, packageBookingsTable, usersTable } from "@workspace/db";
import {
  ListMembershipPackagesQueryParams,
  ListMembershipPackagesResponse,
  CreatePackageBookingBody,
  CreatePackageBookingResponse,
  GetPackageBookingParams,
  GetPackageBookingResponse,
  ListMyPackageBookingsResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import {
  applyPackagePref,
  packagePrefs,
} from "../lib/yoactivPackagePrefs";
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

// Purchasable membership packages (live prices) for a branch: every paid
// non-PT service variation, cheapest first.
router.get("/membership-packages", async (req, res): Promise<void> => {
  const parsed = ListMembershipPackagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!yoactivConfigured()) {
    res.json(ListMembershipPackagesResponse.parse([]));
    return;
  }
  const [gym] = await db
    .select({ yoactivBranchId: gymsTable.yoactivBranchId })
    .from(gymsTable)
    .where(eq(gymsTable.id, parsed.data.gymId));
  // No branch mapping → no paid packages; the app falls back to enquiries.
  if (!gym?.yoactivBranchId) {
    res.json(ListMembershipPackagesResponse.parse([]));
    return;
  }
  const [all, prefs] = await Promise.all([
    fetchYoactivPackages(gym.yoactivBranchId),
    packagePrefs(gym.yoactivBranchId),
  ]);
  const memberships = all
    .filter((p) => !p.pt && !prefs.get(p.id)?.hidden)
    .map((p) => applyPackagePref(p, prefs))
    .sort((a, b) => a.amountInr - b.amountInr);
  res.json(ListMembershipPackagesResponse.parse(memberships));
});

// Start a paid package purchase: verify the package server-side, register the
// member in the gym-management system if needed, create a pending purchase row,
// and hand back YoActiv's hosted Razorpay payment link (valid ~5 minutes).
router.post(
  "/package-bookings",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CreatePackageBookingBody.safeParse(req.body);
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      res.status(400).json({ error: "Invalid start date" });
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
    // Admin-hidden packages are not purchasable either.
    const [packages, prefs] = await Promise.all([
      fetchYoactivPackages(gym.yoactivBranchId),
      packagePrefs(target.branchId),
    ]);
    const rawPkg = packages.find(
      (p) => p.id === body.packageId && !p.pt && !prefs.get(p.id)?.hidden,
    );
    if (!rawPkg) {
      res.status(400).json({ error: "That package is no longer available" });
      return;
    }
    // Snapshot the curated display name so purchase history matches what
    // the member saw when buying; price always comes from live YoActiv data.
    const pkg = applyPackagePref(rawPkg, prefs);
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
      .insert(packageBookingsTable)
      .values({
        token,
        userId: req.userId!,
        gymId: gym.id,
        gymName: gym.name,
        branchId: target.branchId,
        memberName: body.name.trim(),
        mobile,
        packageName: pkg.name,
        serviceName: pkg.serviceName,
        amountInr: Math.round(pkg.amountInr),
        startDate: body.startDate,
        status: "pending",
      })
      .returning();

    const base = publicBaseUrl(req);
    const paymentUrl = await createYoactivPaymentUrl({
      target,
      memberId,
      variationId: pkg.id,
      amountInr: Math.round(pkg.amountInr),
      startDateIso: body.startDate,
      successUrl: `${base}/api/pay/package/${token}/success`,
      failedUrl: `${base}/api/pay/package/${token}/failed`,
    });
    if (!paymentUrl) {
      await db
        .update(packageBookingsTable)
        .set({ status: "failed" })
        .where(eq(packageBookingsTable.id, booking!.id));
      res.status(502).json({
        error: "Could not start the payment. Please try again.",
      });
      return;
    }
    res.json(
      CreatePackageBookingResponse.parse({
        id: booking!.id,
        status: "pending",
        amountInr: Math.round(pkg.amountInr),
        paymentUrl,
      }),
    );
  },
);

function toApiBooking(row: typeof packageBookingsTable.$inferSelect) {
  return {
    id: row.id,
    status: row.status,
    amountInr: row.amountInr,
    packageName: row.packageName,
    serviceName: row.serviceName,
    gymName: row.gymName,
    startDate: row.startDate,
    createdAt: row.createdAt.toISOString(),
  };
}

// The caller's own purchases, newest first (shown on the app Profile).
router.get(
  "/package-bookings/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(packageBookingsTable)
      .where(eq(packageBookingsTable.userId, req.userId!))
      .orderBy(desc(packageBookingsTable.createdAt))
      .limit(50);
    res.json(ListMyPackageBookingsResponse.parse(rows.map(toApiBooking)));
  },
);

// Status polling for the member who made the purchase.
router.get(
  "/package-bookings/:bookingId",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const params = GetPackageBookingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .select()
      .from(packageBookingsTable)
      .where(
        and(
          eq(packageBookingsTable.id, params.data.bookingId),
          eq(packageBookingsTable.userId, req.userId!),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Purchase not found" });
      return;
    }
    res.json(GetPackageBookingResponse.parse(toApiBooking(row)));
  },
);

// ─── Payment redirect landings (opened by YoActiv's hosted page) ────────────

function landingHtml(ok: boolean): string {
  const title = ok ? "Payment successful" : "Payment failed";
  const msg = ok
    ? "Your membership package is active. You can close this page and return to the Iconic Fitness app."
    : "The payment didn't go through. You can close this page, return to the app and try again.";
  const accent = ok ? "#C7F000" : "#ff6b6b";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">
<div style="padding:32px;max-width:360px"><div style="font-size:48px">${ok ? "✓" : "✕"}</div>
<h1 style="color:${accent};font-size:22px;margin:12px 0">${title}</h1>
<p style="color:#aaa;font-size:15px;line-height:1.5">${msg}</p></div></body></html>`;
}

router.get(
  "/pay/package/:token/:outcome",
  async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token ?? "");
    const outcome = req.params.outcome === "success" ? "paid" : "failed";
    if (/^[0-9a-f]{48}$/.test(token)) {
      // Only move pending rows — a landing page reload can't flip a final state.
      await db
        .update(packageBookingsTable)
        .set(
          outcome === "paid"
            ? { status: "paid", paidAt: new Date() }
            : { status: "failed" },
        )
        .where(
          and(
            eq(packageBookingsTable.token, token),
            eq(packageBookingsTable.status, "pending"),
          ),
        );
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(landingHtml(outcome === "paid"));
  },
);

export default router;
