import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { storeApi, type Product, type Vendor } from "@/lib/storeApi";
import { useCart } from "@/lib/cart";
import { ShoppingCart, Search, Store as StoreIcon } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "apparel", label: "Apparel" },
  { value: "supplements", label: "Supplements" },
  { value: "equipment", label: "Equipment" },
  { value: "accessories", label: "Accessories" },
  { value: "wellness", label: "Wellness" },
];

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [category, setCategory] = useState("");
  const [vendorId, setVendorId] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const cart = useCart();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      storeApi.listProducts({
        category: category || undefined,
        vendorId: vendorId || undefined,
        q: q || undefined,
      }),
      storeApi.listVendors(),
    ])
      .then(([ps, vs]) => {
        setProducts(ps);
        setVendors(vs);
      })
      .finally(() => setLoading(false));
  }, [category, vendorId, q]);

  const vendorById = useMemo(() => {
    const m = new Map<number, Vendor>();
    vendors.forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold mb-1">
            <StoreIcon className="h-3.5 w-3.5" /> GYMCO Store
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Shop fitness gear
          </h1>
          <p className="text-muted-foreground mt-1">
            Curated from {vendors.length} verified vendors across India.
          </p>
        </div>
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white font-bold shadow-[0_8px_24px_-8px_hsl(18_100%_55%/0.7)] hover:opacity-95"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cart.count > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-white/25 text-xs">
              {cart.count}
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl bg-card border border-border">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                category === c.value
                  ? "bg-gradient-brand text-white border-transparent"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          value={vendorId}
          onChange={(e) =>
            setVendorId(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/60"
        >
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {v.city}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No products match these filters yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => {
            const v = vendorById.get(p.vendorPartnerId);
            const disc =
              p.originalPriceInr > p.priceInr
                ? Math.round(
                    ((p.originalPriceInr - p.priceInr) / p.originalPriceInr) * 100,
                  )
                : 0;
            return (
              <Link
                key={p.id}
                href={`/store/${p.slug}`}
                className="group block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-[0_16px_48px_-16px_hsl(18_100%_55%/0.4)] transition-all hover:-translate-y-0.5"
              >
                <div className="aspect-square bg-muted overflow-hidden relative">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {disc > 0 && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-1 rounded bg-emerald-500/95 text-white">
                      {disc}% off
                    </span>
                  )}
                  {p.stock <= 0 && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-1 rounded bg-slate-900/90 text-white">
                      Out of stock
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {v ? `${v.name} · ${v.city}` : p.category}
                  </div>
                  <div className="mt-0.5 font-bold text-foreground truncate">
                    {p.name}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-foreground">
                      ₹{p.priceInr.toLocaleString("en-IN")}
                    </span>
                    {p.originalPriceInr > p.priceInr && (
                      <span className="text-xs text-muted-foreground line-through">
                        ₹{p.originalPriceInr.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
