import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  productOrdersTable,
  productOrderItemsTable,
  productCategoriesTable,
  partnersTable,
} from "@workspace/db";
import { DEFAULT_PRODUCT_CATEGORIES } from "../lib/productCategories.js";
import { optionalUser, requireUser } from "../lib/currentUser";
import { microCache } from "../lib/microCache";
import {
  creditReferralRewardOnce,
  debitWallet,
  walletBalance,
} from "../lib/referrals";
import {
  airpayCheckoutForm,
  airpayConfigured,
  parseAirpayReturn,
} from "../lib/airpay";

const router: IRouter = Router();

/** Absolute public base URL for payment redirect landings. */
function publicBaseUrl(req: Request): string {
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",");
  const domain =
    domains[0]?.trim() || process.env.REPLIT_DEV_DOMAIN?.trim() || req.get("host");
  return `https://${domain}`;
}

// Additive, idempotent DDL so the published database gets the online-payment
// columns on first use (production DDL can't be run by hand).
let orderColumnsEnsured = false;
/** Throws when the columns can't be guaranteed — callers must NOT proceed to
 *  insert orders against a schema that may be missing them. */
async function ensureOrderPaymentColumns(): Promise<void> {
  if (orderColumnsEnsured) return;
  try {
    await db.execute(sql`
      ALTER TABLE product_orders
        ADD COLUMN IF NOT EXISTS token text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS airpay_txn_id text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS paid_at timestamptz
    `);
    orderColumnsEnsured = true;
  } catch (err) {
    // ALTER may be denied (e.g. restricted role) even though the columns
    // already exist — verify before giving up.
    try {
      await db.execute(
        sql`SELECT token, airpay_txn_id, paid_at FROM product_orders LIMIT 1`,
      );
      orderColumnsEnsured = true;
      return;
    } catch {
      /* fall through */
    }
    console.error("[store] could not ensure payment columns:", err);
    throw new Error("store payment columns unavailable");
  }
}

// ── Categories (public) ──

// 30s micro-cache: public storefront catalog is identical for everyone.
const STORE_TTL_MS = 30_000;

router.get(
  "/store/categories",
  microCache(STORE_TTL_MS),
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(productCategoriesTable)
      .where(eq(productCategoriesTable.isActive, true))
      .orderBy(asc(productCategoriesTable.sortOrder), asc(productCategoriesTable.id));
    if (rows.length === 0) {
      // Not yet materialized — fall back to the code default list.
      res.json(
        DEFAULT_PRODUCT_CATEGORIES.map((c) => ({
          name: c.name,
          slug: c.slug,
          sortOrder: c.sortOrder,
        })),
      );
      return;
    }
    res.json(
      rows.map((c) => ({ name: c.name, slug: c.slug, sortOrder: c.sortOrder })),
    );
  },
);

// ── Public storefront ──

router.get(
  "/store/products",
  microCache(STORE_TTL_MS),
  async (req: Request, res: Response): Promise<void> => {
    const { category, q, vendorId } = req.query as Record<string, string | undefined>;
    const all = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.status, "active"))
      .orderBy(desc(productsTable.id));
    const filtered = all.filter((p) => {
      if (category && p.category !== category) return false;
      if (vendorId && p.vendorPartnerId !== Number(vendorId)) return false;
      if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
    res.json(filtered);
  },
);

router.get(
  "/store/products/:slug",
  microCache(STORE_TTL_MS),
  async (req: Request, res: Response): Promise<void> => {
    const slug = String(req.params.slug);
    const [p] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.slug, slug));
    if (!p) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const [vendor] = await db
      .select({
        id: partnersTable.id,
        name: partnersTable.name,
        city: partnersTable.city,
      })
      .from(partnersTable)
      .where(eq(partnersTable.id, p.vendorPartnerId));
    res.json({ ...p, vendor: vendor ?? null });
  },
);

router.get(
  "/store/vendors",
  microCache(STORE_TTL_MS),
  async (_req: Request, res: Response): Promise<void> => {
    // Vendors that have at least one active product
    const products = await db
      .select({ vendorId: productsTable.vendorPartnerId })
      .from(productsTable)
      .where(eq(productsTable.status, "active"));
    const ids = Array.from(new Set(products.map((p) => p.vendorId)));
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        id: partnersTable.id,
        name: partnersTable.name,
        city: partnersTable.city,
      })
      .from(partnersTable)
      .where(inArray(partnersTable.id, ids));
    res.json(rows);
  },
);

// ── Checkout (online payment via Airpay) ──

router.post(
  "/store/checkout",
  optionalUser,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const customerName = String(b.customerName ?? "").trim();
    const customerEmail = String(b.customerEmail ?? "").trim();
    const customerPhone = String(b.customerPhone ?? "").trim();
    const shippingAddress = String(b.shippingAddress ?? "").trim();
    const shippingCity = String(b.shippingCity ?? "").trim();
    const shippingPincode = String(b.shippingPincode ?? "").trim();
    const items = Array.isArray(b.items)
      ? (b.items as Array<{
          productId: number;
          qty: number;
          size?: string;
          color?: string;
        }>)
      : [];
    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !shippingAddress ||
      !shippingCity ||
      !shippingPincode ||
      items.length === 0
    ) {
      res.status(400).json({ error: "Missing required fields or empty cart" });
      return;
    }
    // Dedupe ids: the same product can appear on multiple cart lines (one per
    // size/color variant), but SQL IN returns each row once.
    const ids = Array.from(
      new Set(
        items
          .map((i) => Number(i.productId))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    );
    if (ids.length === 0) {
      res.status(400).json({ error: "Invalid items" });
      return;
    }
    const products = await db
      .select()
      .from(productsTable)
      .where(inArray(productsTable.id, ids));
    if (products.length !== ids.length) {
      res.status(400).json({ error: "Some products no longer available" });
      return;
    }
    // Compute server-side total — never trust client prices.
    let total = 0;
    const lineItems: Array<{
      productId: number;
      vendorPartnerId: number;
      productName: string;
      unitPriceInr: number;
      qty: number;
      variant: string;
    }> = [];
    for (const i of items) {
      const p = products.find((x) => x.id === Number(i.productId));
      if (!p) {
        res.status(400).json({ error: "Invalid product in cart" });
        return;
      }
      const qty = Math.max(1, Math.min(99, Number(i.qty) || 1));
      total += p.priceInr * qty;
      // Compose a human-readable variant label, validating against the product's
      // configured options so clients can't inject arbitrary text.
      const size =
        i.size && p.sizes.includes(String(i.size)) ? String(i.size) : "";
      const color =
        i.color && p.colors.includes(String(i.color)) ? String(i.color) : "";
      const variant = [size, color].filter(Boolean).join(" / ");
      lineItems.push({
        productId: p.id,
        vendorPartnerId: p.vendorPartnerId,
        productName: p.name,
        unitPriceInr: p.priceInr,
        qty,
        variant,
      });
    }

    if (!airpayConfigured()) {
      res.status(503).json({ error: "Payments are temporarily unavailable" });
      return;
    }
    try {
      await ensureOrderPaymentColumns();
    } catch {
      res.status(503).json({ error: "Payments are temporarily unavailable" });
      return;
    }

    // Refer & Earn: signed-in members may apply wallet points (1 point = ₹1).
    // Clamp to their balance and keep at least ₹1 payable so the payment page
    // always has a real charge. Points are debited at the paid-flip, so a
    // pending order that never completes costs nothing.
    let redeemInr = 0;
    const requestedRedeem = Math.round(Number(b.redeemPoints) || 0);
    if (req.userId && requestedRedeem > 0) {
      const balance = await walletBalance(req.userId);
      redeemInr = Math.max(
        0,
        Math.min(requestedRedeem, balance, Math.max(total - 1, 0)),
      );
    }

    const token = randomBytes(24).toString("hex");
    const [order] = await db
      .insert(productOrdersTable)
      .values({
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        shippingCity,
        shippingPincode,
        totalInr: total - redeemInr,
        userId: req.userId ?? 0,
        pointsRedeemedInr: redeemInr,
        paymentMethod: "online",
        status: "payment_pending",
        token,
      })
      .returning();
    await db.insert(productOrderItemsTable).values(
      lineItems.map((li) => ({ ...li, orderId: order!.id })),
    );
    res.json({
      ok: true,
      orderId: order!.id,
      total: total - redeemInr,
      redeemedInr: redeemInr,
      // The app opens this in the system browser; it forwards to Airpay's
      // hosted payment page (UPI / cards / netbanking).
      paymentUrl: `${publicBaseUrl(req)}/api/pay/store/${token}/start`,
    });
  },
);

// ─── Airpay payment pages ────────────────────────────────────────────────────

function storeLandingHtml(ok: boolean, orderId: number): string {
  const title = ok ? "Payment successful" : "Payment failed";
  const msg = ok
    ? `Order #${orderId} is confirmed. You can close this page and return to the Iconic Fitness app — we'll be in touch about delivery.`
    : "The payment didn't go through and no money was captured. You can close this page, return to the app and try again.";
  const accent = ok ? "#C7F000" : "#ff6b6b";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">
<div style="padding:32px;max-width:360px"><div style="font-size:48px">${ok ? "✓" : "✕"}</div>
<h1 style="color:${accent};font-size:22px;margin:12px 0">${title}</h1>
<p style="color:#aaa;font-size:15px;line-height:1.5">${msg}</p>
<a href="iconic-app://" style="display:inline-block;margin-top:20px;padding:14px 28px;border-radius:999px;background:${accent};color:#0A0C08;font-weight:700;text-decoration:none">Back to the app</a></div>
<script>setTimeout(function(){window.location.href="iconic-app://";},600);</script></body></html>`;
}

// Step 1: the buyer's browser opens this URL; we fetch a fresh Airpay token
// and render an auto-submitting form to Airpay's hosted checkout.
router.get(
  "/pay/store/:token/start",
  async (req: Request, res: Response): Promise<void> => {
    const token = String(req.params.token ?? "");
    res.setHeader("Cache-Control", "no-store");
    if (!/^[0-9a-f]{48}$/.test(token)) {
      res.status(404).send("Not found");
      return;
    }
    const [order] = await db
      .select()
      .from(productOrdersTable)
      .where(eq(productOrdersTable.token, token));
    if (!order || order.status !== "payment_pending") {
      res
        .status(410)
        .send(
          order
            ? storeLandingHtml(order.status !== "payment_failed", order.id)
            : "Not found",
        );
      return;
    }
    const base = publicBaseUrl(req);
    const form = await airpayCheckoutForm({
      orderId: token, // unguessable; echoed back in the return callback
      amountInr: order.totalInr,
      buyerName: order.customerName,
      buyerEmail: order.customerEmail,
      buyerPhone: order.customerPhone.replace(/\D/g, "").slice(-10),
      buyerAddress: order.shippingAddress,
      buyerCity: order.shippingCity,
      buyerPincode: order.shippingPincode,
      successUrl: `${base}/api/pay/store/return`,
      failureUrl: `${base}/api/pay/store/return`,
    });
    if (!form) {
      res
        .status(502)
        .send(
          `<!doctype html><html><body style="font-family:system-ui;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h1 style="font-size:20px">Payment unavailable</h1><p style="color:#aaa">Could not reach the payment gateway. Please go back to the app and try again.</p></div></body></html>`,
        );
      return;
    }
    const inputs = Object.entries(form.fields)
      .map(
        ([k, v]) =>
          `<input type="hidden" name="${k}" value="${v.replace(/"/g, "&quot;")}">`,
      )
      .join("");
    res.status(200).send(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redirecting to payment…</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center" onload="document.forms[0].submit()">
<div><p style="color:#aaa">Taking you to the secure payment page…</p>
<form method="POST" action="${form.action}">${inputs}<button type="submit" style="margin-top:12px;padding:12px 24px;border-radius:999px;border:0;background:#C7F000;color:#0A0C08;font-weight:700">Continue to payment</button></form></div></body></html>`,
    );
  },
);

// Step 2: Airpay sends the buyer (and the result) back here. The encdata blob
// is encrypted with our merchant key — a successful decrypt authenticates it.
async function handleStoreReturn(req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const body = {
    ...(req.query as Record<string, unknown>),
    ...((req.body ?? {}) as Record<string, unknown>),
  };
  const result = parseAirpayReturn(body);
  if (!result || !/^[0-9a-f]{48}$/.test(result.orderId)) {
    console.error(
      "[store] unverifiable Airpay return:",
      JSON.stringify(body).slice(0, 500),
    );
    res
      .status(400)
      .send(
        `<!doctype html><html><body style="font-family:system-ui;background:#0A0C08;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h1 style="font-size:20px">Payment status unclear</h1><p style="color:#aaa">Please return to the app and check My Orders. If money was deducted, it will be reconciled automatically.</p></div></body></html>`,
      );
    return;
  }
  // Bind the gateway's echoed amount/merchant to OUR pending order before any
  // flip — decrypt alone proves the key, not that this result matches this order.
  if (result.ok) {
    const [pending] = await db
      .select()
      .from(productOrdersTable)
      .where(eq(productOrdersTable.token, result.orderId));
    const mercid = (process.env.AIRPAY_MERCHANT_ID ?? "").trim();
    const amountMismatch =
      pending !== undefined &&
      result.amountInr !== null &&
      Number.isFinite(result.amountInr) &&
      Math.round(result.amountInr) !== pending.totalInr;
    const merchantMismatch =
      result.merchantId !== null && mercid !== "" && result.merchantId !== mercid;
    if (pending && pending.status === "payment_pending" && (amountMismatch || merchantMismatch)) {
      console.error(
        `[store] Airpay return REJECTED for order #${pending.id}: ` +
          `amount ${result.amountInr} vs ${pending.totalInr}, merchant ${result.merchantId}`,
      );
      res.status(400).send("Payment verification failed");
      return;
    }
  }
  // Only move payment_pending rows — a reload can't flip a final state.
  const [flipped] = await db
    .update(productOrdersTable)
    .set(
      result.ok
        ? {
            status: "placed",
            paidAt: new Date(),
            airpayTxnId: result.airpayTxnId,
          }
        : { status: "payment_failed", airpayTxnId: result.airpayTxnId },
    )
    .where(
      and(
        eq(productOrdersTable.token, result.orderId),
        eq(productOrdersTable.status, "payment_pending"),
      ),
    )
    .returning();
  if (flipped && result.ok) {
    // Settle wallet points and referral reward exactly once, on the paid flip.
    // debitWallet is idempotent per (refType, refId), so a failure here can be
    // re-run manually without double-debiting; log loudly for reconciliation.
    try {
      if (flipped.userId > 0 && flipped.pointsRedeemedInr > 0) {
        const debited = await debitWallet({
          userId: flipped.userId,
          amountInr: flipped.pointsRedeemedInr,
          label: `Points redeemed — store order #${flipped.id}`,
          refType: "order_redeem",
          refId: String(flipped.id),
        });
        if (debited < flipped.pointsRedeemedInr) {
          console.error(
            `[store] UNDER-DEBIT order #${flipped.id}: redeemed ₹${flipped.pointsRedeemedInr}, ` +
              `debited ₹${debited} (balance dropped between quote and settlement)`,
          );
        }
      }
      await creditReferralRewardOnce(
        flipped.userId > 0 ? flipped.userId : undefined,
        flipped.totalInr + flipped.pointsRedeemedInr,
      );
    } catch (err) {
      console.error(
        `[store] SETTLEMENT FAILED for paid order #${flipped.id} — needs manual reconciliation:`,
        err,
      );
    }
  }
  // On a reload of a final state, still show the right landing page.
  const [order] = flipped
    ? [flipped]
    : await db
        .select()
        .from(productOrdersTable)
        .where(eq(productOrdersTable.token, result.orderId));
  if (!order) {
    res.status(404).send("Not found");
    return;
  }
  res
    .status(200)
    .send(storeLandingHtml(order.status !== "payment_failed", order.id));
}

router.post("/pay/store/return", handleStoreReturn);
router.get("/pay/store/return", handleStoreReturn);

// NOTE: a public order-lookup endpoint was removed intentionally.
// Looking up by enumerable integer id would leak customer PII to anyone.
// Signed-in members list their own orders below (scoped by userId — safe).

// ── My orders (signed-in members) ──

router.get(
  "/store/orders/mine",
  requireUser,
  async (req: Request, res: Response): Promise<void> => {
    const orders = await db
      .select()
      .from(productOrdersTable)
      .where(eq(productOrdersTable.userId, req.userId!))
      .orderBy(desc(productOrdersTable.id));
    if (orders.length === 0) {
      res.json([]);
      return;
    }
    const items = await db
      .select()
      .from(productOrderItemsTable)
      .where(
        inArray(
          productOrderItemsTable.orderId,
          orders.map((o) => o.id),
        ),
      );
    res.json(
      orders.map((o) => ({
        id: o.id,
        totalInr: o.totalInr,
        pointsRedeemedInr: o.pointsRedeemedInr,
        paymentMethod: o.paymentMethod,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        shippingAddress: o.shippingAddress,
        shippingCity: o.shippingCity,
        shippingPincode: o.shippingPincode,
        items: items
          .filter((i) => i.orderId === o.id)
          .map((i) => ({
            id: i.id,
            productName: i.productName,
            unitPriceInr: i.unitPriceInr,
            qty: i.qty,
            variant: i.variant,
            status: i.status,
          })),
      })),
    );
  },
);

// Suppress unused import warning
void and;

export default router;
