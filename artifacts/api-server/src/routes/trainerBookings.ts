import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import {
  db,
  gymsTable,
  ptTrialFeedbackTable,
  trainerBookingsTable,
  usersTable,
} from "@workspace/db";
import {
  ListTrainerPackagesQueryParams,
  ListTrainerPackagesResponse,
  CreateTrainerBookingBody,
  CreateTrainerBookingResponse,
  GetTrainerBookingParams,
  GetTrainerBookingResponse,
  ListMyTrainerBookingsResponse,
  GetMyPtProgramResponse,
  ListMyPtTrialFeedbackResponse,
  SubmitPtTrialFeedbackBody,
  SubmitPtTrialFeedbackResponse,
} from "@workspace/api-zod";
import { desc, sql } from "drizzle-orm";
import { leadsTable } from "@workspace/db";
import { TRAINER_ENQUIRY_SOURCE } from "../lib/trainerEnquiryLeads";
import { fetchPtAssignmentMap } from "../lib/ptAssignments";
import { PT_TOTAL_SESSIONS, listPtSessions } from "../lib/ptSessions";
import { requireUser } from "../lib/currentUser";
import { creditReferralRewardOnce } from "../lib/referrals";
import {
  applyPackagePref,
  isPackageVisible,
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
  const [packages, prefs] = await Promise.all([
    fetchYoactivPackages(gym.yoactivBranchId),
    packagePrefs(gym.yoactivBranchId),
  ]);
  res.json(
    ListTrainerPackagesResponse.parse(
      packages
        .filter((p) => isPackageVisible(p.id, prefs))
        .map((p) => applyPackagePref(p, prefs)),
    ),
  );
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
    // Only admin-enabled (visible) packages are purchasable.
    const [packages, prefs] = await Promise.all([
      fetchYoactivPackages(gym.yoactivBranchId),
      packagePrefs(target.branchId),
    ]);
    const rawPkg = packages.find(
      (p) => p.id === body.packageId && isPackageVisible(p.id, prefs),
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

// The caller's PT bookings (paid/pending/failed rows) merged with their free
// session-request enquiries (leads matched by the account's mobile number).
// Registered BEFORE /:bookingId so "mine" never hits the param route.
router.get(
  "/trainer-bookings/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(trainerBookingsTable)
      .where(
        and(
          eq(trainerBookingsTable.userId, req.userId!),
          // Staff-cancelled bookings drop out so the member can book again.
          ne(trainerBookingsTable.status, "cancelled"),
        ),
      )
      .orderBy(desc(trainerBookingsTable.createdAt));

    const out = rows.map((row) => ({
      id: row.id,
      status: row.status,
      amountInr: row.amountInr,
      packageName: row.packageName,
      trainerName: row.trainerName,
      gymName: row.gymName,
      preferredDate: row.preferredDate,
      createdAt: row.createdAt.toISOString(),
    }));

    // Session-request enquiries are leads keyed by phone, not user id — match
    // them via the account's mobile so "already requested a PT" is visible.
    const [user] = await db
      .select({ mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const mobile = normalizeMobile(user?.mobile ?? "");
    if (mobile) {
      // Match in SQL on the normalized (last-10-digits) phone so every
      // enquiry the member ever sent is found, regardless of formatting.
      const leads = await db
        .select({
          id: leadsTable.id,
          trainerName: leadsTable.className,
          gymName: leadsTable.gymName,
          phone: leadsTable.phone,
          preferredDate: leadsTable.preferredDate,
          createdAt: leadsTable.createdAt,
        })
        .from(leadsTable)
        .where(
          and(
            eq(leadsTable.source, TRAINER_ENQUIRY_SOURCE),
            eq(leadsTable.kind, "general"),
            // Staff-cancelled requests drop out so the member can book again.
            ne(leadsTable.status, "cancelled"),
            sql`right(regexp_replace(${leadsTable.phone}, '\\D', '', 'g'), 10) = ${mobile}`,
          ),
        )
        .orderBy(desc(leadsTable.createdAt));
      for (const l of leads) {
        out.push({
          id: -l.id,
          status: "enquiry",
          amountInr: 0,
          packageName: "Session request",
          trainerName: l.trainerName,
          gymName: l.gymName,
          preferredDate: l.preferredDate,
          createdAt: l.createdAt.toISOString(),
        });
      }
    }

    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(ListMyTrainerBookingsResponse.parse(out));
  },
);

// The caller's active PT program: their newest PT enrolment (paid booking or
// enquiry lead) that has a staff-assigned trainer, plus the scheduled session
// timings. `active:false` when nothing is assigned yet.
router.get(
  "/pt/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const empty = {
      active: false,
      trainerName: "",
      gymName: "",
      packageName: "",
      totalSessions: PT_TOTAL_SESSIONS,
      completedCount: 0,
      sessions: [],
    };

    // Candidate enrolments, newest first: paid bookings by user id, then
    // enquiry leads matched via the account's normalized mobile.
    const bookings = await db
      .select({
        id: trainerBookingsTable.id,
        gymName: trainerBookingsTable.gymName,
        packageName: trainerBookingsTable.packageName,
        createdAt: trainerBookingsTable.createdAt,
      })
      .from(trainerBookingsTable)
      .where(
        and(
          eq(trainerBookingsTable.userId, req.userId!),
          eq(trainerBookingsTable.status, "paid"),
        ),
      )
      .orderBy(desc(trainerBookingsTable.createdAt));

    const [user] = await db
      .select({ mobile: usersTable.mobile })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const mobile = normalizeMobile(user?.mobile ?? "");
    const enquiries = mobile
      ? await db
          .select({
            id: leadsTable.id,
            gymName: leadsTable.gymName,
            createdAt: leadsTable.createdAt,
          })
          .from(leadsTable)
          .where(
            and(
              eq(leadsTable.source, TRAINER_ENQUIRY_SOURCE),
              eq(leadsTable.kind, "general"),
              // Staff-cancelled requests must not count as an active PT program.
              ne(leadsTable.status, "cancelled"),
              sql`right(regexp_replace(${leadsTable.phone}, '\\D', '', 'g'), 10) = ${mobile}`,
            ),
          )
          .orderBy(desc(leadsTable.createdAt))
      : [];

    const [bookingAssign, enquiryAssign] = await Promise.all([
      fetchPtAssignmentMap(
        "booking",
        bookings.map((b) => b.id),
      ),
      fetchPtAssignmentMap(
        "enquiry",
        enquiries.map((l) => l.id),
      ),
    ]);

    type Candidate = {
      refType: "booking" | "enquiry";
      refId: number;
      trainerName: string;
      gymName: string;
      packageName: string;
      createdAt: Date;
    };
    const candidates: Candidate[] = [
      ...bookings
        .filter((b) => bookingAssign.has(b.id))
        .map((b) => ({
          refType: "booking" as const,
          refId: b.id,
          trainerName: bookingAssign.get(b.id)!.trainerName,
          gymName: b.gymName,
          packageName: b.packageName,
          createdAt: b.createdAt,
        })),
      ...enquiries
        .filter((l) => enquiryAssign.has(l.id))
        .map((l) => ({
          refType: "enquiry" as const,
          refId: l.id,
          trainerName: enquiryAssign.get(l.id)!.trainerName,
          gymName: l.gymName ?? "",
          packageName: "Personal training",
          createdAt: l.createdAt,
        })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const current = candidates[0];
    if (!current) {
      res.json(GetMyPtProgramResponse.parse(empty));
      return;
    }
    const sessions = await listPtSessions(current.refType, current.refId);
    res.json(
      GetMyPtProgramResponse.parse({
        active: true,
        trainerName: current.trainerName,
        gymName: current.gymName,
        packageName: current.packageName,
        totalSessions: PT_TOTAL_SESSIONS,
        completedCount: sessions.filter((s) => s.status === "completed").length,
        sessions,
      }),
    );
  },
);

// ─── Kick-starter trial session feedback (Home "fitness journey") ───────────

// The caller's feedback rows for the two trial sessions (1 and 2).
router.get(
  "/pt/trial-feedback/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        sessionNo: ptTrialFeedbackTable.sessionNo,
        rating: ptTrialFeedbackTable.rating,
        comment: ptTrialFeedbackTable.comment,
      })
      .from(ptTrialFeedbackTable)
      .where(eq(ptTrialFeedbackTable.userId, req.userId!))
      .orderBy(ptTrialFeedbackTable.sessionNo);
    res.json(ListMyPtTrialFeedbackResponse.parse(rows));
  },
);

// Submit (or update) feedback for a trial session — upserted per user+session.
router.post(
  "/pt/trial-feedback",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const body = SubmitPtTrialFeedbackBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const { sessionNo, rating } = body.data;
    const comment = body.data.comment ?? "";
    const [row] = await db
      .insert(ptTrialFeedbackTable)
      .values({ userId: req.userId!, sessionNo, rating, comment })
      .onConflictDoUpdate({
        target: [ptTrialFeedbackTable.userId, ptTrialFeedbackTable.sessionNo],
        set: { rating, comment },
      })
      .returning();
    res.json(
      SubmitPtTrialFeedbackResponse.parse({
        sessionNo: row!.sessionNo,
        rating: row!.rating,
        comment: row!.comment,
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
      const [flipped] = await db
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
        )
        .returning();
      // Refer & Earn: a paid PT purchase also counts as the referred member's
      // first purchase (credited once per referred user, idempotent).
      if (flipped && outcome === "paid") {
        await creditReferralRewardOnce(flipped.userId, flipped.amountInr);
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(landingHtml(outcome === "paid"));
  },
);

export default router;
