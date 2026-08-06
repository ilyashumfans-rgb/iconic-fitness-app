import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { db, couponsTable, couponRedemptionsTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { optionalUser } from "../lib/currentUser";
import { normalizeCouponCode, quoteCoupon } from "../lib/coupons";

const router: IRouter = Router();

// Preview a coupon for a purchase amount, before payment. Public (guests can
// buy packages) — the same validation runs again server-side at checkout.
router.post(
  "/coupons/preview",
  optionalUser,
  async (req: Request, res: Response): Promise<void> => {
    const code = normalizeCouponCode(req.body?.code);
    const amountInr = Math.round(Number(req.body?.amountInr));
    const kind = req.body?.kind === "pt" ? "pt" : "package";
    if (!code || !Number.isFinite(amountInr) || amountInr <= 0) {
      res.status(400).json({ valid: false, error: "Enter a coupon code" });
      return;
    }
    let mobile: string | null =
      typeof req.body?.mobile === "string" ? req.body.mobile : null;
    if (!mobile && req.userId) {
      const [u] = await db
        .select({ mobile: usersTable.mobile })
        .from(usersTable)
        .where(eq(usersTable.id, req.userId));
      mobile = u?.mobile ?? null;
    }
    const quote = await quoteCoupon({
      code,
      amountInr,
      kind,
      userId: req.userId ?? null,
      mobile,
    });
    if (!quote.ok) {
      res.json({ valid: false, error: quote.error });
      return;
    }
    res.json({
      valid: true,
      code: quote.code,
      discountInr: quote.discountInr,
      finalInr: amountInr - (quote.discountInr ?? 0),
      description: quote.description ?? "",
    });
  },
);

// ── Admin CRUD ──────────────────────────────────────────────────────────────

const TYPES = ["percent", "flat"] as const;
const APPLIES = ["all", "membership", "pt"] as const;

function cleanBody(body: unknown): {
  error?: string;
  values?: typeof couponsTable.$inferInsert;
} {
  const b = (body ?? {}) as Record<string, unknown>;
  const code = normalizeCouponCode(b.code);
  if (!code || code.length < 3)
    return { error: "Code must be at least 3 characters" };
  const discountType = TYPES.includes(b.discountType as never)
    ? (b.discountType as (typeof TYPES)[number])
    : "percent";
  const discountValue = Math.round(Number(b.discountValue));
  if (!Number.isFinite(discountValue) || discountValue <= 0)
    return { error: "Discount value must be a positive number" };
  if (discountType === "percent" && discountValue > 100)
    return { error: "Percent discount cannot exceed 100" };
  const appliesTo = APPLIES.includes(b.appliesTo as never)
    ? (b.appliesTo as (typeof APPLIES)[number])
    : "all";
  const num = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  let expiresOn: string | null = null;
  if (typeof b.expiresOn === "string" && b.expiresOn.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.expiresOn.trim()))
      return { error: "Expiry date must be YYYY-MM-DD" };
    expiresOn = b.expiresOn.trim();
  }
  return {
    values: {
      code,
      description:
        typeof b.description === "string"
          ? b.description.trim().slice(0, 300)
          : "",
      discountType,
      discountValue,
      maxDiscountInr: num(b.maxDiscountInr),
      minAmountInr: num(b.minAmountInr),
      appliesTo,
      maxUses: num(b.maxUses),
      perUserLimit: num(b.perUserLimit),
      expiresOn,
      isActive: b.isActive === false ? false : true,
    },
  };
}

router.get("/admin/coupons", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(couponsTable)
    .orderBy(asc(couponsTable.id));
  res.json(rows);
});

router.post("/admin/coupons", requireAdmin, async (req, res): Promise<void> => {
  const { error, values } = cleanBody(req.body);
  if (!values) {
    res.status(400).json({ error });
    return;
  }
  try {
    const [row] = await db.insert(couponsTable).values(values).returning();
    res.status(201).json(row);
  } catch (err) {
    const cause = (err as { cause?: { code?: string } })?.cause;
    if ((cause?.code ?? (err as { code?: string })?.code) === "23505") {
      res.status(409).json({ error: "That coupon code already exists" });
      return;
    }
    throw err;
  }
});

router.put(
  "/admin/coupons/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const { error, values } = cleanBody(req.body);
    if (!values) {
      res.status(400).json({ error });
      return;
    }
    try {
      const [row] = await db
        .update(couponsTable)
        .set({ ...values, updatedAt: sql`now()` })
        .where(eq(couponsTable.id, id))
        .returning();
      if (!row) {
        res.status(404).json({ error: "Coupon not found" });
        return;
      }
      res.json(row);
    } catch (err) {
      const cause = (err as { cause?: { code?: string } })?.cause;
      if ((cause?.code ?? (err as { code?: string })?.code) === "23505") {
        res.status(409).json({ error: "That coupon code already exists" });
        return;
      }
      throw err;
    }
  },
);

router.delete(
  "/admin/coupons/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(couponsTable).where(eq(couponsTable.id, id));
    res.json({ ok: true });
  },
);

// Redemption history for one coupon (who used it, when, how much).
router.get(
  "/admin/coupons/:id/redemptions",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select()
      .from(couponRedemptionsTable)
      .where(eq(couponRedemptionsTable.couponId, id))
      .orderBy(asc(couponRedemptionsTable.id));
    res.json(rows);
  },
);

export default router;
