import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { storeApi, type Product, type Vendor } from "@/lib/storeApi";
import { useCart } from "@/lib/cart";
import {
  ShoppingCart,
  Search,
  Sparkles,
  ShieldCheck,
  Truck,
  Flame,
  ArrowRight,
  Tag,
} from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const cart = useCart();

  // Vendors are stable — fetch once on mount.
  useEffect(() => {
    let cancelled = false;
    storeApi
      .listVendors()
      .then((vs) => {
        if (!cancelled) setVendors(vs);
      })
      .catch(() => {
        // Vendor list is decorative for filtering; ignore failures silently.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Products re-fetch when filters change; use a request token so stale
  // responses from a slower earlier request can't overwrite newer ones.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    storeApi
      .listProducts({
        category: category || undefined,
        vendorId: vendorId || undefined,
        q: q || undefined,
      })
      .then((ps) => {
        if (!cancelled) setProducts(ps);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load products",
          );
          setProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, vendorId, q]);

  const vendorById = useMemo(() => {
    const m = new Map<number, Vendor>();
    vendors.forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  const featured = useMemo(() => {
    return [...products]
      .filter((p) => p.originalPriceInr > p.priceInr && p.stock > 0)
      .sort(
        (a, b) =>
          (b.originalPriceInr - b.priceInr) / b.originalPriceInr -
          (a.originalPriceInr - a.priceInr) / a.originalPriceInr,
      )
      .slice(0, 1)[0];
  }, [products]);

  return (
    <div>
      {/* ───────────────────────────── Filter bar ───────────────────────────── */}
      <div
        id="grid"
        className="mt-8 flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card border border-border sticky top-16 z-30 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      >
        <div className="relative flex-1 min-w-[220px]">
          <label htmlFor="store-search" className="sr-only">
            Search store
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="store-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, vendors, categories…"
            aria-label="Search store"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/60"
          />
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={active}
                className={`px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                  active
                    ? "bg-gradient-brand text-white border-transparent shadow-[0_6px_20px_-6px_hsl(18_100%_55%/0.6)]"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-orange-500/40"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <label htmlFor="store-vendor" className="sr-only">
          Filter by vendor
        </label>
        <select
          id="store-vendor"
          value={vendorId}
          onChange={(e) =>
            setVendorId(e.target.value === "" ? "" : Number(e.target.value))
          }
          aria-label="Filter by vendor"
          className="px-3 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/60"
        >
          <option value="">All vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {v.city}
            </option>
          ))}
        </select>
      </div>

      {/* ───────────────────────────── Grid ───────────────────────────── */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-1/3 bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-5 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="text-center py-24 rounded-2xl border border-dashed border-red-500/40 bg-red-500/5"
          >
            <Sparkles className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <div className="text-lg font-bold">Couldn't load products</div>
            <div className="text-sm text-muted-foreground mt-1">{error}</div>
            <button
              type="button"
              onClick={() => setQ((s) => s)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-brand text-white text-sm font-bold"
            >
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-border bg-card/50">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div className="text-lg font-bold">Nothing matches yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Try clearing filters or searching for something else.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => {
              const v = vendorById.get(p.vendorPartnerId);
              const disc =
                p.originalPriceInr > p.priceInr
                  ? Math.round(
                      ((p.originalPriceInr - p.priceInr) /
                        p.originalPriceInr) *
                        100,
                    )
                  : 0;
              return (
                <Link
                  key={p.id}
                  href={`/store/${p.slug}`}
                  className="group relative block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-[0_20px_60px_-20px_hsl(18_100%_55%/0.55)] hover:border-orange-500/40 transition-all hover:-translate-y-1"
                >
                  <div className="aspect-square bg-muted overflow-hidden relative">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {disc > 0 && (
                      <span className="absolute top-2.5 left-2.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-md">
                        {disc}% off
                      </span>
                    )}
                    {p.stock <= 0 && (
                      <span className="absolute top-2.5 right-2.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-900/90 text-white">
                        Sold out
                      </span>
                    )}
                    {p.stock > 0 && p.stock <= 5 && (
                      <span className="absolute top-2.5 right-2.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-orange-500 text-white shadow-md">
                        Only {p.stock} left
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
                      {v ? `${v.name} · ${v.city}` : p.category}
                    </div>
                    <div className="mt-1 font-bold text-foreground truncate group-hover:text-orange-500 transition-colors">
                      {p.name}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-foreground">
                          ₹{p.priceInr.toLocaleString("en-IN")}
                        </span>
                        {p.originalPriceInr > p.priceInr && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{p.originalPriceInr.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-foreground group-hover:bg-gradient-brand group-hover:text-white transition-all">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
