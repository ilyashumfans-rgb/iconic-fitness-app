import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { ApplyReferralCodeBody, GetMyReferralInfoResponse } from "@workspace/api-zod";
import { requireUser } from "../lib/currentUser";
import { requireAdmin } from "../lib/adminAuth";
import {
  getReferralSettings,
  referralSummary,
  saveReferralSettings,
} from "../lib/referrals";

const router: IRouter = Router();

// ── Member endpoints ──

router.get(
  "/referrals/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const summary = await referralSummary(req.userId!);
    res.json(GetMyReferralInfoResponse.parse(summary));
  },
);

// Apply someone's code to my account — once, never my own code.
router.post(
  "/referrals/apply",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = ApplyReferralCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please enter a referral code" });
      return;
    }
    const code = parsed.data.code.trim().toUpperCase();
    const [me] = await db
      .select({ id: usersTable.id, referredBy: usersTable.referredBy })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    if (!me) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    if (me.referredBy > 0) {
      res.status(409).json({ error: "You've already used a referral code" });
      return;
    }
    const [referrer] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, code));
    if (!referrer) {
      res.status(404).json({ error: "That referral code doesn't exist" });
      return;
    }
    if (referrer.id === me.id) {
      res.status(400).json({ error: "You can't use your own code" });
      return;
    }
    // Conditional update: only flips from "not referred" so a concurrent
    // duplicate submission can never overwrite an already-applied code.
    const applied = await db
      .update(usersTable)
      .set({ referredBy: referrer.id })
      .where(and(eq(usersTable.id, me.id), eq(usersTable.referredBy, 0)))
      .returning({ id: usersTable.id });
    if (applied.length === 0) {
      res.status(409).json({ error: "You've already used a referral code" });
      return;
    }
    const summary = await referralSummary(req.userId!);
    res.json(GetMyReferralInfoResponse.parse(summary));
  },
);

// ── Admin settings (session-authenticated, manual client on the web app) ──

router.get(
  "/admin/referral-settings",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    res.json(await getReferralSettings());
  },
);

router.put(
  "/admin/referral-settings",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const rewardType = b.rewardType === "percent" ? "percent" : "fixed";
    const rewardValue = Math.round(Number(b.rewardValue));
    if (!Number.isFinite(rewardValue) || rewardValue < 0) {
      res.status(400).json({ error: "Reward value must be a non-negative number" });
      return;
    }
    if (rewardType === "percent" && rewardValue > 100) {
      res.status(400).json({ error: "Percentage reward can't exceed 100%" });
      return;
    }
    const saved = await saveReferralSettings({
      rewardType,
      rewardValue,
      isActive: b.isActive !== false,
    });
    res.json(saved);
  },
);

export default router;
