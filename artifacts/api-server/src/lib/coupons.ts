/**
 * Discount coupons for membership packages ("package") and PT sessions ("pt").
 *
 * Money-path rules (matches the wallet conventions):
 * - Validation at order creation is a best-effort gate (friendly errors).
 * - The coupon is only CONSUMED at the pending→paid flip: a conditional
 *   UPDATE increments used_count (never past max_uses), and the redemption
 *   row's (kind, booking_id) unique index makes the flip idempotent.
 */
import { and, eq, sql } from "drizzle-orm";
import { db, couponsTable, couponRedemptionsTable } from "@workspace/db";

export type CouponKind = "package" | "pt";

export type CouponQuote = {
  ok: boolean;
  /** Friendly reason when ok=false. */
  error?: string;
  couponId?: number;
  code?: string;
  discountInr?: number;
  description?: string;
};

function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeCouponCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
}

/**
 * Validate a coupon for a purchase and compute the discount.
 * amountInr must be the server-trusted list price (before wallet points).
 */
export async function quoteCoupon(opts: {
  code: string;
  amountInr: number;
  kind: CouponKind;
  userId?: number | null;
  mobile?: string | null;
}): Promise<CouponQuote> {
  const code = normalizeCouponCode(opts.code);
  if (!code) return { ok: false, error: "Enter a coupon code" };

  const [c] = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.code, code));
  const invalid = { ok: false, error: "This coupon code is not valid" };
  if (!c || !c.isActive) return invalid;

  if (c.expiresOn && istToday() > c.expiresOn)
    return { ok: false, error: "This coupon has expired" };

  const wants = opts.kind === "pt" ? "pt" : "membership";
  if (c.appliesTo !== "all" && c.appliesTo !== wants)
    return {
      ok: false,
      error:
        c.appliesTo === "pt"
          ? "This coupon is only for PT sessions"
          : "This coupon is only for membership packages",
    };

  if (c.maxUses > 0 && c.usedCount >= c.maxUses)
    return { ok: false, error: "This coupon has been fully used" };

  if (c.minAmountInr > 0 && opts.amountInr < c.minAmountInr)
    return {
      ok: false,
      error: `This coupon needs a minimum purchase of ₹${c.minAmountInr}`,
    };

  // Per-user limit — count PAID redemptions by account id or mobile.
  if (c.perUserLimit > 0) {
    const last10 = (opts.mobile ?? "").replace(/\D/g, "").slice(-10);
    const conds = [] as ReturnType<typeof eq>[];
    if (opts.userId) conds.push(eq(couponRedemptionsTable.userId, opts.userId));
    if (conds.length > 0 || last10) {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(couponRedemptionsTable)
        .where(
          and(
            eq(couponRedemptionsTable.couponId, c.id),
            opts.userId && last10
              ? sql`(${couponRedemptionsTable.userId} = ${opts.userId} OR right(regexp_replace(${couponRedemptionsTable.mobile}, '\\D', '', 'g'), 10) = ${last10})`
              : opts.userId
                ? eq(couponRedemptionsTable.userId, opts.userId)
                : sql`right(regexp_replace(${couponRedemptionsTable.mobile}, '\\D', '', 'g'), 10) = ${last10}`,
          ),
        );
      if ((row?.n ?? 0) >= c.perUserLimit)
        return { ok: false, error: "You have already used this coupon" };
    }
  }

  let discount =
    c.discountType === "flat"
      ? c.discountValue
      : Math.floor((opts.amountInr * c.discountValue) / 100);
  if (c.discountType === "percent" && c.maxDiscountInr > 0)
    discount = Math.min(discount, c.maxDiscountInr);
  // Keep at least ₹1 payable so the hosted payment page has a real charge.
  discount = Math.max(0, Math.min(discount, opts.amountInr - 1));
  if (discount <= 0)
    return { ok: false, error: "This coupon gives no discount on this amount" };

  return {
    ok: true,
    couponId: c.id,
    code: c.code,
    discountInr: discount,
    description: c.description,
  };
}

/**
 * Consume a coupon at the pending→paid flip. Settles against the immutable
 * coupon ID snapshotted on the booking (rename/delete-safe). Idempotent:
 * the redemption row's unique (kind, booking_id) index makes a double flip
 * a no-op, and used_count is only incremented when the redemption row is
 * new. The increment is conditional so used_count never exceeds max_uses —
 * concurrent pending checkouts can't over-count a limited coupon (payment
 * was already collected, so an over-limit paid flip is logged, not blocked).
 */
export async function recordCouponRedemption(opts: {
  couponId: number;
  code: string;
  kind: CouponKind;
  bookingId: number;
  discountInr: number;
  userId?: number | null;
  mobile?: string | null;
}): Promise<void> {
  if (opts.couponId <= 0 || opts.discountInr <= 0) return;
  try {
    await db.insert(couponRedemptionsTable).values({
      couponId: opts.couponId,
      couponCode: normalizeCouponCode(opts.code),
      userId: opts.userId ?? null,
      mobile: opts.mobile ?? "",
      kind: opts.kind,
      bookingId: opts.bookingId,
      discountInr: opts.discountInr,
    });
    // Only reached when the insert was new (no 23505) — count the use.
    // Atomic conditional increment: never push used_count past max_uses.
    const bumped = await db
      .update(couponsTable)
      .set({ usedCount: sql`${couponsTable.usedCount} + 1` })
      .where(
        and(
          eq(couponsTable.id, opts.couponId),
          sql`(${couponsTable.maxUses} = 0 OR ${couponsTable.usedCount} < ${couponsTable.maxUses})`,
        ),
      )
      .returning({ id: couponsTable.id });
    if (bumped.length === 0) {
      console.warn(
        `coupon ${opts.code} redeemed past its limit or after deletion (booking ${opts.kind}/${opts.bookingId})`,
      );
    }
  } catch (err) {
    // 23505 = this booking already consumed the coupon (landing page reload).
    const cause = (err as { cause?: { code?: string } })?.cause;
    const codeStr =
      cause?.code ?? (err as { code?: string })?.code ?? undefined;
    if (codeStr === "23505") return;
    // Never block a paid landing page on coupon bookkeeping.
    console.error("coupon redemption failed", err);
  }
}
