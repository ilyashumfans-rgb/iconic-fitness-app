import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
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
import {
  creditReferralRewardOnce,
  debitWallet,
  walletBalance,
} from "../lib/referrals";

const router: IRouter = Router();

// ── Categories (public) ──

router.get(
  "/store/categories",
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

// ── Checkout (Cash on Delivery) ──

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

    // Refer & Earn: signed-in members may apply wallet points (1 point = ₹1).
    // Clamp to their balance and the order total; the debit happens right away
    // because a COD order is placed immediately (no payment flip to wait for).
    let redeemInr = 0;
    const requestedRedeem = Math.round(Number(b.redeemPoints) || 0);
    if (req.userId && requestedRedeem > 0) {
      const balance = await walletBalance(req.userId);
      redeemInr = Math.max(0, Math.min(requestedRedeem, balance, total));
    }

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
        paymentMethod: "cod",
        status: "placed",
      })
      .returning();
    await db.insert(productOrderItemsTable).values(
      lineItems.map((li) => ({ ...li, orderId: order!.id })),
    );
    if (req.userId && redeemInr > 0) {
      // Re-clamped inside; if the balance moved, charge the difference as COD.
      const debited = await debitWallet({
        userId: req.userId,
        amountInr: redeemInr,
        label: `Points redeemed — store order #${order!.id}`,
        refType: "order_redeem",
        refId: String(order!.id),
      });
      if (debited < redeemInr) {
        await db
          .update(productOrdersTable)
          .set({ totalInr: total - debited, pointsRedeemedInr: debited })
          .where(eq(productOrdersTable.id, order!.id));
        redeemInr = debited;
      }
    }
    // A placed COD order counts as the referred member's first purchase; the
    // reward base is the full pre-redemption order value. Never throws.
    await creditReferralRewardOnce(req.userId, total);
    res.json({
      ok: true,
      orderId: order!.id,
      total: total - redeemInr,
      redeemedInr: redeemInr,
    });
  },
);

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
