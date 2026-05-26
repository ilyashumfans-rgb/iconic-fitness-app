import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  author?: string;
  category: string;
  publishedAt: string;
};

const FALLBACK =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80";

export function BlogTeaserSection({
  title = "From the GYMCO Journal",
  subtitle = "Workouts, nutrition and recovery tips from our coaches.",
  limit = 4,
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
}) {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blogs", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setRows((j as Post[]).slice(0, limit)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (!loading && rows.length === 0) return null;

  const [feature, ...rest] = rows;

  return (
    <section className="py-4">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-600 mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Journal
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-[-0.02em] leading-tight">
            {title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1.5 max-w-xl">
            {subtitle}
          </p>
        </div>
        <Link
          href="/blog"
          className="hidden sm:inline-flex items-center text-sm text-orange-600 font-bold hover:gap-2 transition-all"
        >
          View all articles <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-[420px] rounded-2xl md:row-span-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {/* Featured (large, left) */}
          {feature && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="md:row-span-3"
            >
              <Link href={`/blog/${feature.slug}`}>
                <div className="group relative aspect-[4/5] md:aspect-auto md:h-full min-h-[360px] rounded-3xl overflow-hidden cursor-pointer ring-1 ring-border/60 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)]">
                  <img
                    src={feature.coverImage || FALLBACK}
                    alt={feature.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black tracking-[0.22em] uppercase mb-3 shadow-lg">
                      Featured · {feature.category}
                    </div>
                    <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-[1.1] drop-shadow-[0_3px_14px_rgba(0,0,0,0.5)]">
                      {feature.title}
                    </h3>
                    <p className="mt-2 md:mt-3 text-white/85 text-sm md:text-base line-clamp-2 max-w-md">
                      {feature.excerpt}
                    </p>
                    <div className="mt-3 md:mt-4 flex items-center gap-3 text-white/80 text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(feature.publishedAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </span>
                      {feature.author && (
                        <>
                          <span className="opacity-60">·</span>
                          <span className="truncate">{feature.author}</span>
                        </>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-orange-300 group-hover:translate-x-1 transition-transform">
                        Read <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Right column: horizontal compact cards */}
          {rest.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.05 * i }}
            >
              <Link href={`/blog/${p.slug}`}>
                <div className="group relative flex gap-4 p-3 rounded-2xl bg-card border border-border/60 hover:border-orange-500/50 hover:shadow-[0_18px_40px_-22px_rgba(249,115,22,0.45)] transition-all cursor-pointer h-full">
                  <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden bg-muted">
                    <img
                      src={p.coverImage || FALLBACK}
                      alt={p.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                  <div className="flex-1 min-w-0 py-1 flex flex-col">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600 mb-1">
                      {p.category}
                    </div>
                    <h3 className="font-black leading-snug line-clamp-2 text-base md:text-lg tracking-tight group-hover:text-orange-600 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden md:block">
                      {p.excerpt}
                    </p>
                    <div className="mt-auto pt-2 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(p.publishedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      <ArrowRight className="h-3.5 w-3.5 ml-auto text-orange-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-6 sm:hidden">
        <Link
          href="/blog"
          className="inline-flex items-center text-sm text-orange-600 font-bold"
        >
          View all articles <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </section>
  );
}
