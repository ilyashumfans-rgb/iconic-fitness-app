import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { storeApi, type Product, type StoreCategory } from "@/lib/storeApi";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Check,
  Shirt,
  Dumbbell,
  FlaskConical,
  Watch,
  Leaf,
  LayoutGrid,
  ArrowRight,
  Truck,
  ShieldCheck,
  BadgeIndianRupee,
} from "lucide-react";

type Category = {
  key: string;
  label: string;
  icon: typeof Shirt;
  blurb: string;
  image: string;
};

const CATEGORIES: Category[] = [
  {
    key: "apparel",
    label: "Apparel",
    icon: Shirt,
    blurb: "Performance wear",
    image:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80",
  },
  {
    key: "supplements",
    label: "Supplements",
    icon: FlaskConical,
    blurb: "Fuel & recovery",
    image:
      "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=900&q=80",
  },
  {
    key: "equipment",
    label: "Equipment",
    icon: Dumbbell,
    blurb: "Train at home",
    image:
      "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=900&q=80",
  },
  {
    key: "accessories",
    label: "Accessories",
    icon: Watch,
    blurb: "Gear up",
    image:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900&q=80",
  },
  {
    key: "wellness",
    label: "Wellness",
    icon: Leaf,
    blurb: "Feel your best",
    image:
      "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?w=900&q=80",
  },
];

const CATEGORY_ICONS: Record<string, typeof Shirt> = {
  apparel: Shirt,
  supplements: FlaskConical,
  equipment: Dumbbell,
  accessories: Watch,
  wellness: Leaf,
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const [, navigate] = useLocation();
  const [added, setAdded] = useState(false);
  const hasVariants =
    (product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 0;
  const disc =
    product.originalPriceInr > product.priceInr
      ? Math.round(
          ((product.originalPriceInr - product.priceInr) /
            product.originalPriceInr) *
            100,
        )
      : 0;
  const outOfStock = product.stock <= 0;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    if (hasVariants) {
      navigate(`/store/${product.slug}`);
      return;
    }
    cart.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceInr: product.priceInr,
      imageUrl: product.imageUrl,
      vendorPartnerId: product.vendorPartnerId,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <Link href={`/store/${product.slug}`}>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_60px_-30px_hsl(91_56%_45%/0.5)]">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {disc > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-gradient-brand px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow">
              Save {disc}%
            </span>
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
                Out of stock
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={quickAdd}
            disabled={outOfStock}
            aria-label={`Add ${product.name} to cart`}
            className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[0_10px_24px_-8px_hsl(91_56%_45%/0.8)] opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 disabled:opacity-0"
          >
            {added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
          </button>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {product.category}
          </span>
          <h3 className="mt-1 line-clamp-2 font-bold leading-snug text-foreground">
            {product.name}
          </h3>
          <div className="mt-auto flex items-baseline gap-2 pt-3">
            <span className="text-lg font-extrabold text-foreground">
              {inr(product.priceInr)}
            </span>
            {product.originalPriceInr > product.priceInr && (
              <span className="text-sm text-muted-foreground line-through">
                {inr(product.originalPriceInr)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Store() {
  const cart = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    setErr(null);
    storeApi
      .listProducts()
      .then((p) => alive && setProducts(p))
      .catch((e) => alive && setErr(e?.message ?? String(e)));
    storeApi
      .listCategories()
      .then((c) => alive && setCategories(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const okCat = active === "all" || p.category === active;
      const okTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term);
      return okCat && okTerm;
    });
  }, [products, active, q]);

  const countByCat = useMemo(() => {
    const m: Record<string, number> = {};
    (products ?? []).forEach((p) => {
      m[p.category] = (m[p.category] ?? 0) + 1;
    });
    return m;
  }, [products]);

  return (
    <div className="space-y-12">
      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-black">
        <img
          src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1600&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div
          className="absolute inset-0 opacity-70 mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(120% 100% at 0% 100%, hsl(91 52% 51% / 0.6), transparent 55%)",
          }}
        />
        <div className="relative z-10 px-6 py-12 md:px-12 md:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur">
            <ShoppingBag className="h-3.5 w-3.5 text-[hsl(91_60%_55%)]" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-white/90">
              Iconic Store
            </span>
          </span>
          <h1 className="mt-5 max-w-xl text-4xl md:text-5xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-white">
            Gear up.{" "}
            <span className="text-[hsl(91_60%_55%)]">Train like an icon.</span>
          </h1>
          <p className="mt-4 max-w-lg text-white/80">
            Premium apparel, supplements, equipment and accessories — curated by
            the Iconic Fitness team and shipped across India.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#catalog">
              <Button
                size="lg"
                className="bg-gradient-brand text-white border-none h-12 px-7 font-black tracking-wide shadow-[0_16px_50px_-12px_hsl(91_56%_55%/0.7)] hover:opacity-95"
              >
                Shop now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Link href="/cart">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 font-bold bg-white/10 text-white border-white/30 backdrop-blur hover:bg-white/20 hover:text-white"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Cart{cart.count > 0 ? ` · ${cart.count}` : ""}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Shop by category
            </h2>
            <p className="text-muted-foreground mt-1">
              Everything you need, sorted the way you train.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            const n = countByCat[c.key] ?? 0;
            return (
              <motion.button
                key={c.key}
                type="button"
                onClick={() => {
                  setActive(c.key);
                  document
                    .getElementById("catalog")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border text-left"
              >
                <img
                  src={c.image}
                  alt={c.label}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-3.5">
                  <Icon className="mb-2 h-6 w-6 text-[hsl(91_60%_55%)]" />
                  <span className="text-base font-black text-white">{c.label}</span>
                  <span className="text-[11px] font-medium text-white/70">
                    {n > 0 ? `${n} item${n > 1 ? "s" : ""}` : c.blurb}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="scroll-mt-28">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <CategoryPill
              label="All"
              icon={LayoutGrid}
              active={active === "all"}
              onClick={() => setActive("all")}
            />
            {categories.map((c) => (
              <CategoryPill
                key={c.slug}
                label={c.name}
                icon={CATEGORY_ICONS[c.slug] ?? LayoutGrid}
                active={active === c.slug}
                onClick={() => setActive(c.slug)}
              />
            ))}
          </div>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="pl-9"
            />
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <p className="text-muted-foreground">Couldn't load products. {err}</p>
          </div>
        ) : products === null ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl border border-border bg-muted"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No products here yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {q
                ? `Nothing matches “${q}”. Try another search.`
                : "New drops are landing soon — check back shortly."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Trust strip */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: BadgeIndianRupee,
            title: "Cash on Delivery",
            body: "Pay when your order arrives.",
          },
          {
            icon: Truck,
            title: "India-wide shipping",
            body: "Delivered in 4–7 business days.",
          },
          {
            icon: ShieldCheck,
            title: "Verified partners",
            body: "Shipped directly by trusted vendors.",
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-foreground">{f.title}</div>
                <div className="text-sm text-muted-foreground">{f.body}</div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function CategoryPill({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Shirt;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_-10px_hsl(91_56%_45%/0.8)]"
          : "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
