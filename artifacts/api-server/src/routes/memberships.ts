import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  gymsTable,
  membershipsTable,
  packageBookingsTable,
  packageCategoriesTable,
  userMembershipsTable,
  usersTable,
} from "@workspace/db";
import {
  ListMembershipsResponse,
  ListPackageCategoriesResponse,
  GetMyMembershipResponse,
  ListMyMembershipPaymentsResponse,
  CreateMembershipRenewalResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import {
  createYoactivPaymentUrl,
  ensureYoactivMemberId,
  fetchYoactivMemberByMobile,
  fetchYoactivPackages,
  pickPrimaryMembership,
  resolveBranchTarget,
  yoactivConfigured,
} from "../lib/yoactiv";

const router: IRouter = Router();

router.get("/memberships", async (_req, res): Promise<void> => {
  const rows = await db.select().from(membershipsTable);
  res.json(ListMembershipsResponse.parse(rows));
});

// Active admin-managed categories for the app's Packages tab, in admin order.
router.get("/package-categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(packageCategoriesTable)
    .where(eq(packageCategoriesTable.isActive, true))
    .orderBy(packageCategoriesTable.sortOrder, packageCategoriesTable.id);
  res.json(ListPackageCategoriesResponse.parse(rows));
});

router.get("/memberships/mine", requireUser, async (req, res): Promise<void> => {
  // Source of truth is YoActiv (the gym-management software) when the member
  // can be matched there by mobile number; the local row is the fallback so
  // nothing breaks if YoActiv is unreachable or the member isn't linked.
  if (yoactivConfigured()) {
    const [user] = await db
      .select({ mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const profile = await fetchYoactivMemberByMobile(user?.mobile);
    const primary = profile ? pickPrimaryMembership(profile) : null;
    if (primary) {
      res.json(
        GetMyMembershipResponse.parse({
          planId: 0,
          planName: primary.planName,
          renewsOn: primary.expiryDate
            ? `${primary.expiryDate}T00:00:00.000Z`
            : new Date().toISOString(),
          classesUsed: primary.sessionsUsed ?? 0,
          classesIncluded: primary.sessionsTotal ?? 0,
          gymsAccessed: profile!.branchCount,
          status: primary.status,
          source: "yoactiv",
          photoUrl: profile!.photoUrl,
          startedOn: primary.startDate,
          branchName: primary.branchName,
          expiryKnown: !!primary.expiryDate,
        }),
      );
      return;
    }
  }

  const [um] = await db
    .select()
    .from(userMembershipsTable)
    .where(eq(userMembershipsTable.userId, req.userId!));
  if (!um) {
    res.json(null);
    return;
  }
  const [plan] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.id, um.planId));
  res.json(
    GetMyMembershipResponse.parse({
      planId: um.planId,
      planName: plan?.name ?? "GYMCO Member",
      renewsOn: um.renewsOn,
      classesUsed: um.classesUsed,
      classesIncluded: plan?.classesPerMonth ?? 0,
      gymsAccessed: um.gymsAccessed,
      status: um.status,
      source: "local",
      photoUrl: null,
      startedOn: null,
      branchName: "",
      expiryKnown: true,
    }),
  );
});

/** Absolute public base URL for payment redirect landings. */
function publicBaseUrl(req: Request): string {
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",");
  const domain =
    domains[0]?.trim() || process.env.REPLIT_DEV_DOMAIN?.trim() || req.get("host");
  return `https://${domain}`;
}

/** Today's date (YYYY-MM-DD) in IST. */
function istTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** The day after `isoDate` (YYYY-MM-DD), computed in UTC (safe for date-only). */
function dayAfter(isoDate: string): string {
  const t = Date.parse(`${isoDate}T00:00:00Z`) + 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

// One-tap plan renewal: find the member's current YoActiv plan, match it to
// the live package catalog on their home branch, and hand back YoActiv's
// hosted Razorpay payment link. Reuses the package-purchase pipeline (pending
// packageBookings row + /api/pay/package/:token landings + status polling).
router.post(
  "/memberships/mine/renew",
  requireUser,
  async (req, res): Promise<void> => {
    if (!yoactivConfigured()) {
      res.status(409).json({ error: "Online renewal isn't available right now" });
      return;
    }
    const [user] = await db
      .select({
        name: usersTable.name,
        mobile: usersTable.mobile,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const profile = await fetchYoactivMemberByMobile(user?.mobile);
    const primary = profile ? pickPrimaryMembership(profile) : null;
    if (!primary) {
      res.status(409).json({
        error: "We couldn't find your plan in the gym system",
      });
      return;
    }
    // Strict branch scoping (money path): the renewal must be billed on the
    // member's own branch — never a fallback branch.
    const target = await resolveBranchTarget(primary.branchId);
    if (!target) {
      res.status(409).json({
        error: "Online renewal isn't available for your branch yet",
      });
      return;
    }
    // Re-find the member's plan in the live catalog for the live price. The
    // member is already on this plan, so admin visibility prefs don't apply.
    // Names come back from two different YoActiv endpoints, so match exactly
    // first and fall back to a whitespace/case-insensitive comparison.
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const packages = await fetchYoactivPackages(primary.branchId);
    const pkg =
      packages.find(
        (p) =>
          p.serviceName === primary.serviceName && p.name === primary.planName,
      ) ??
      packages.find(
        (p) =>
          norm(p.serviceName) === norm(primary.serviceName) &&
          norm(p.name) === norm(primary.planName),
      );
    if (!pkg) {
      res.status(409).json({
        error: "Your plan can't be renewed online — please contact your branch",
      });
      return;
    }
    const memberId = await ensureYoactivMemberId(
      target,
      profile!.mobile,
      profile!.name || user?.name || "Member",
      user?.email ?? null,
    );
    if (!memberId) {
      res.status(502).json({
        error: "Could not reach the gym system. Please try again.",
      });
      return;
    }

    // Renewal starts the day after expiry when the plan is still running,
    // otherwise today (IST).
    const today = istTodayStr();
    const startDate =
      primary.expiryDate && primary.expiryDate >= today
        ? dayAfter(primary.expiryDate)
        : today;

    // Map the branch back to a gym for display; plain-int reference, 0 = none.
    const [gym] = await db
      .select({ id: gymsTable.id, name: gymsTable.name })
      .from(gymsTable)
      .where(eq(gymsTable.yoactivBranchId, primary.branchId));

    const token = randomBytes(24).toString("hex");
    const [booking] = await db
      .insert(packageBookingsTable)
      .values({
        token,
        userId: req.userId!,
        gymId: gym?.id ?? 0,
        gymName: gym?.name || primary.branchName,
        branchId: target.branchId,
        memberName: profile!.name || user?.name || "Member",
        mobile: profile!.mobile,
        packageName: pkg.name,
        serviceName: pkg.serviceName,
        amountInr: Math.round(pkg.amountInr),
        startDate,
        status: "pending",
      })
      .returning();

    const base = publicBaseUrl(req);
    const paymentUrl = await createYoactivPaymentUrl({
      target,
      memberId,
      variationId: pkg.id,
      amountInr: Math.round(pkg.amountInr),
      startDateIso: startDate,
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
      CreateMembershipRenewalResponse.parse({
        id: booking!.id,
        status: "pending",
        amountInr: Math.round(pkg.amountInr),
        paymentUrl,
        token,
      }),
    );
  },
);

router.get(
  "/memberships/mine/payments",
  requireUser,
  async (req, res): Promise<void> => {
    if (!yoactivConfigured()) {
      res.json([]);
      return;
    }
    const [user] = await db
      .select({ mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const profile = await fetchYoactivMemberByMobile(user?.mobile);
    if (!profile) {
      res.json([]);
      return;
    }
    const payments = [...profile.memberships]
      .sort((a, b) =>
        (b.invoiceDate ?? b.startDate ?? "").localeCompare(
          a.invoiceDate ?? a.startDate ?? "",
        ),
      )
      .map((m) => ({
        billId: m.billId,
        planName: m.planName,
        serviceName: m.serviceName,
        branchName: m.branchName,
        status: m.status,
        invoiceDate: m.invoiceDate,
        startDate: m.startDate,
        expiryDate: m.expiryDate,
        amountInr: m.amountInr,
        discountInr: m.discountInr,
      }));
    res.json(ListMyMembershipPaymentsResponse.parse(payments));
  },
);

export default router;
