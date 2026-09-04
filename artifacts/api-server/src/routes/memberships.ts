import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { clerkClient } from "@clerk/express";
import { and, eq, sql } from "drizzle-orm";
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
  LookupMembershipBody,
  LookupMembershipResponse,
} from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { normalizeMemberUsername } from "../lib/memberUsername";
import { microCache } from "../lib/microCache";
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

// 30s micro-cache for the public plan/category catalogs (admin edits rare).
const CATALOG_TTL_MS = 30_000;

function recordMembershipLookup(userId: number, hasMembership: boolean): void {
  void db
    .update(usersTable)
    .set({ hasMembership })
    .where(
      and(
        eq(usersTable.id, userId),
        sql`${usersTable.hasMembership} IS DISTINCT FROM ${hasMembership}`,
      ),
    )
    .catch((error) => {
      console.error("membership classification update failed", error);
    });
}

router.get("/memberships", microCache(CATALOG_TTL_MS), async (_req, res): Promise<void> => {
  const rows = await db.select().from(membershipsTable);
  res.json(ListMembershipsResponse.parse(rows));
});

// Active admin-managed categories for the app's Packages tab, in admin order.
router.get("/package-categories", microCache(CATALOG_TTL_MS), async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(packageCategoriesTable)
    .where(eq(packageCategoriesTable.isActive, true))
    .orderBy(packageCategoriesTable.sortOrder, packageCategoriesTable.id);
  res.json(ListPackageCategoriesResponse.parse(rows));
});

// ── Pre-signup membership lookup ─────────────────────────────────────────
// Public: the sign-in/up screens let a member verify their registered mobile
// against the gym system before creating an account. Response is deliberately
// minimal (found flag + masked name + branch) so it can't be used to harvest
// member details, and lookups are rate-limited per client.

/** "Rahul Kumar" → "Rah••• K." — enough to reassure the member, useless to a stranger. */
function maskMemberName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]!;
  const head = first.slice(0, Math.min(3, first.length));
  const masked = head + (first.length > head.length ? "•••" : "");
  const rest = words
    .slice(1)
    .map((w) => `${w[0]!.toUpperCase()}.`)
    .join(" ");
  return rest ? `${masked} ${rest}` : masked;
}

const LOOKUP_WINDOW_MS = 5 * 60 * 1000;
const LOOKUP_MAX_PER_WINDOW = 15;
const lookupHits = new Map<string, { windowStart: number; count: number }>();

function lookupRateLimited(clientKey: string): boolean {
  const now = Date.now();
  // Opportunistic sweep so the map can't grow unbounded.
  if (lookupHits.size > 5000) {
    for (const [k, v] of lookupHits) {
      if (now - v.windowStart > LOOKUP_WINDOW_MS) lookupHits.delete(k);
    }
  }
  const hit = lookupHits.get(clientKey);
  if (!hit || now - hit.windowStart > LOOKUP_WINDOW_MS) {
    lookupHits.set(clientKey, { windowStart: now, count: 1 });
    return false;
  }
  hit.count += 1;
  return hit.count > LOOKUP_MAX_PER_WINDOW;
}

router.post("/membership-lookup", async (req, res): Promise<void> => {
  const parsed = LookupMembershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid mobile number is required" });
    return;
  }
  const clientKey = req.ip ?? "unknown";
  if (lookupRateLimited(clientKey)) {
    res.status(429).json({ error: "Too many attempts — please try again in a few minutes" });
    return;
  }
  const notFound = { found: false, memberName: "", branchName: "" };
  if (!yoactivConfigured()) {
    res.json(LookupMembershipResponse.parse(notFound));
    return;
  }
  const profile = await fetchYoactivMemberByMobile(parsed.data.mobile);
  if (!profile) {
    res.json(LookupMembershipResponse.parse(notFound));
    return;
  }
  const primary = pickPrimaryMembership(profile);
  res.json(
    LookupMembershipResponse.parse({
      found: true,
      memberName: maskMemberName(profile.name),
      branchName: primary?.branchName ?? "",
    }),
  );
});

// ── Member identifier + password login ────────────────────────────────────
// Username/email/mobile resolves only to linked Clerk ids. Password checking
// stays server-side and the app receives only a short-lived sign-in ticket.
// No account detail is revealed, and all credential failures are generic.
const PW_LOGIN_MAX_PER_WINDOW = 10;
const pwLoginHits = new Map<string, { windowStart: number; count: number }>();

function pwLoginRateLimited(clientKey: string): boolean {
  const now = Date.now();
  if (pwLoginHits.size > 5000) {
    for (const [k, v] of pwLoginHits) {
      if (now - v.windowStart > LOOKUP_WINDOW_MS) pwLoginHits.delete(k);
    }
  }
  const hit = pwLoginHits.get(clientKey);
  if (!hit || now - hit.windowStart > LOOKUP_WINDOW_MS) {
    pwLoginHits.set(clientKey, { windowStart: now, count: 1 });
    return false;
  }
  hit.count += 1;
  return hit.count > PW_LOGIN_MAX_PER_WINDOW;
}

function parsePasswordLoginBody(
  body: unknown,
): { identifier: string; password: string } | null {
  const b = body as { identifier?: unknown; password?: unknown } | null;
  if (
    !b ||
    typeof b.identifier !== "string" ||
    typeof b.password !== "string" ||
    b.identifier.trim().length < 3 ||
    b.identifier.trim().length > 254 ||
    b.password.length < 1 ||
    b.password.length > 200
  ) {
    return null;
  }
  return { identifier: b.identifier.trim(), password: b.password };
}

const GENERIC_LOGIN_ERROR =
  "Incorrect username, email, mobile number, or password. If you haven't set a password yet, use “Forgot password”.";

router.post("/auth/username-availability", async (req, res): Promise<void> => {
  const username = normalizeMemberUsername(
    (req.body as { username?: unknown } | null)?.username,
  );
  if (!username) {
    res.status(400).json({ available: false });
    return;
  }
  if (pwLoginRateLimited(`username:${req.ip ?? "unknown"}`)) {
    res.status(429).json({ error: "Too many attempts — please try again in a few minutes" });
    return;
  }
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.username}) = ${username}`)
    .limit(1);
  res.json({ available: !existing });
});

router.post("/auth/password-login", async (req, res): Promise<void> => {
  const parsed = parsePasswordLoginBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Username, email, or mobile and password are required" });
    return;
  }
  const clientKey = req.ip ?? "unknown";
  if (pwLoginRateLimited(clientKey)) {
    res.status(429).json({ error: "Too many attempts — please try again in a few minutes" });
    return;
  }
  const identifierLower = parsed.identifier.toLowerCase();
  const digits = parsed.identifier.replace(/\D/g, "");
  const last10 =
    digits.length >= 10 && /^[+\d\s()-]+$/.test(parsed.identifier)
      ? digits.slice(-10)
      : null;
  const username = normalizeMemberUsername(parsed.identifier);
  const identifierCondition = identifierLower.includes("@")
    ? sql`lower(${usersTable.email}) = ${identifierLower}`
    : last10
      ? sql`right(regexp_replace(${usersTable.mobile}, '\\D', '', 'g'), 10) = ${last10}`
      : username
        ? sql`lower(${usersTable.username}) = ${username}`
        : null;
  if (!identifierCondition) {
    res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    return;
  }
  const rows = await db
    .select({ clerkUserId: usersTable.clerkUserId })
    .from(usersTable)
    .where(sql`${identifierCondition} AND ${usersTable.clerkUserId} IS NOT NULL`);
  const matches = [...new Set(rows.map((r) => r.clerkUserId))].filter(
    (id): id is string => !!id,
  );
  if (matches.length === 0) {
    res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    return;
  }
  // Several accounts can legitimately share a mobile number (e.g. a member
  // signed up twice with different emails). The password disambiguates: only
  // the account whose password actually matches gets signed in. If the
  // password happens to match more than one account, fail closed.
  const verified: string[] = [];
  for (const candidate of matches) {
    try {
      await clerkClient.users.verifyPassword({
        userId: candidate,
        password: parsed.password,
      });
      const clerkUser = await clerkClient.users.getUser(candidate);
      const hasVerifiedEmail = clerkUser.emailAddresses.some(
        (address) => address.verification?.status === "verified",
      );
      if (!hasVerifiedEmail) continue;
      verified.push(candidate);
    } catch {
      // Wrong password, no password, missing account, or no verified identity.
    }
  }
  if (verified.length !== 1) {
    res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    return;
  }
  const clerkUserId = verified[0];
  try {
    const token = await clerkClient.signInTokens.createSignInToken({
      userId: clerkUserId,
      expiresInSeconds: 300,
    });
    res.json({ ticket: token.token });
  } catch (err) {
    console.error("password-login: sign-in token creation failed", err);
    res.status(500).json({ error: "Could not sign you in — please try again" });
  }
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
      recordMembershipLookup(req.userId!, true);
      // Map the plan's YoActiv branch to our local gym so clients can scope
      // branch-specific content (trainers, classes) to the member's home gym.
      const [homeGym] = await db
        .select({ id: gymsTable.id })
        .from(gymsTable)
        .where(eq(gymsTable.yoactivBranchId, primary.branchId));
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
          homeGymId: homeGym?.id ?? null,
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
    recordMembershipLookup(req.userId!, false);
    res.json(null);
    return;
  }
  recordMembershipLookup(req.userId!, true);
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
