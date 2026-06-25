import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { storeApi, type ProductWithVendor } from "@/lib/storeApi";
import { useCart } from "@/lib/cart";
import { ArrowLeft, ShoppingCart, Store as StoreIcon, Check } from "lucide-react";

export default function StoreDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<ProductWithVendor | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useCart();

  useEffect(() => {
    if (!slug) return;
    setErr(null);
    setProduct(null);
    storeApi
      .getProduct(slug)
      .then(setProduct)
      .catch((e) => setErr(e?.message ?? String(e)));
  }, [slug]);

  if (err) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{err}</p>
        <Link
          href="/store"
          className="inline-block mt-4 text-sm font-semibold text-lime-500 hover:underline"
        >
          ← Back to store
        </Link>
      </div>
    );
  }
  if (!product) {
    return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  }

  const disc =
    product.originalPriceInr > product.priceInr
      ? Math.round(
          ((product.originalPriceInr - product.priceInr) / product.originalPriceInr) *
            100,
        )
      : 0;
  const outOfStock = product.stock <= 0;

  const addToCart = () => {
    cart.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceInr: product.priceInr,
        imageUrl: product.imageUrl,
        vendorPartnerId: product.vendorPartnerId,
        vendorName: product.vendor?.name,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const buyNow = () => {
    addToCart();
    navigate("/checkout");
  };

  return (
    <div>
      <Link
        href="/store"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to store
      </Link>
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <div className="aspect-square bg-muted rounded-2xl overflow-hidden border border-border">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          {product.vendor && (
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
              <StoreIcon className="h-3 w-3" /> {product.vendor.name} ·{" "}
              {product.vendor.city}
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            {product.name}
          </h1>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-foreground">
              ₹{product.priceInr.toLocaleString("en-IN")}
            </span>
            {product.originalPriceInr > product.priceInr && (
              <span className="text-lg text-muted-foreground line-through">
                ₹{product.originalPriceInr.toLocaleString("en-IN")}
              </span>
            )}
            {disc > 0 && (
              <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                Save {disc}%
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-5 text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-lg font-bold text-muted-foreground hover:text-foreground"
                disabled={outOfStock}
              >
                −
              </button>
              <span className="px-4 font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="px-3 py-2 text-lg font-bold text-muted-foreground hover:text-foreground"
                disabled={outOfStock}
              >
                +
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {outOfStock
                ? "Out of stock"
                : product.stock < 10
                  ? `Only ${product.stock} left`
                  : "In stock"}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={addToCart}
              disabled={outOfStock}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-muted disabled:opacity-40"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" /> Add to cart
                </>
              )}
            </button>
            <button
              onClick={buyNow}
              disabled={outOfStock}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-brand text-white font-bold shadow-[0_8px_24px_-8px_hsl(91_56%_55%/0.7)] hover:opacity-95 disabled:opacity-40"
            >
              Buy now
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="font-bold text-foreground">Cash on Delivery</div>
              <div className="text-muted-foreground mt-0.5">Pay when it arrives</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="font-bold text-foreground">Vendor shipped</div>
              <div className="text-muted-foreground mt-0.5">
                Direct from {product.vendor?.name ?? "partner"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="font-bold text-foreground">India delivery</div>
              <div className="text-muted-foreground mt-0.5">4–7 business days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
