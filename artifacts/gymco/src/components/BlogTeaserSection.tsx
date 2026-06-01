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
  title = "From the Iconic Fitness Journal",
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
      <div className="flex items-end justify-between mb-4 md:mb-6">
        <div>
          <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.28em] text-lime-600 mb-1.5 md:mb-2 flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 md:h-3.5 md:w-3.5" /> Journal
          </div>
          <h2 className="text-xl md:text-4xl font-black tracking-[-0.02em] leading-tight">
            {title}
          </h2>
          <p className="text-[13px] md:text-base text-muted-foreground mt-1 md:mt-1.5 max-w-xl">
            {subtitle}
          </p>
        </div>
        <Link
          href="/blog"
          className="hidden sm:inline-flex items-center text-sm text-lime-600 font-bold hover:gap-2 transition-all"
        >
          View all articles <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <Skeleton className="aspect-[16/10] md:aspect-auto md:h-[420px] rounded-2xl md:row-span-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 md:h-32 rounded-2xl" />
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
                <div className="group relative aspect-[16/10] md:aspect-auto md:h-full min-h-[200px] md:min-h-[360px] rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer ring-1 ring-border/60 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.5)]">
                  <img
                    src={feature.coverImage || FALLBACK}
                    alt={feature.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-lime-500 text-white text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase mb-2 md:mb-3 shadow-lg">
                      Featured · {feature.category}
                    </div>
                    <h3 className="text-lg md:text-4xl font-black text-white tracking-tight leading-[1.12] drop-shadow-[0_3px_14px_rgba(0,0,0,0.5)] line-clamp-2">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 md:mt-3 text-white/85 text-[13px] md:text-base line-clamp-1 md:line-clamp-2 max-w-md">
                      {feature.excerpt}
                    </p>
                    <div className="mt-2 md:mt-4 flex items-center gap-2.5 md:gap-3 text-white/80 text-[11px] md:text-xs font-semibold">
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
                      <span className="ml-auto inline-flex items-center gap-1 text-lime-300 group-hover:translate-x-1 transition-transform">
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
                <div className="group relative flex gap-4 p-3 rounded-2xl bg-card border border-border/60 hover:border-lime-500/50 hover:shadow-[0_18px_40px_-22px_rgba(101, 163, 13,0.45)] transition-all cursor-pointer h-full">
                  <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden bg-muted">
                    <img
                      src={p.coverImage || FALLBACK}
                      alt={p.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                  <div className="flex-1 min-w-0 py-1 flex flex-col">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-600 mb-1">
                      {p.category}
                    </div>
                    <h3 className="font-black leading-snug line-clamp-2 text-base md:text-lg tracking-tight group-hover:text-lime-600 transition-colors">
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
                      <ArrowRight className="h-3.5 w-3.5 ml-auto text-lime-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
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
          className="inline-flex items-center text-sm text-lime-600 font-bold"
        >
          View all articles <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </section>
  );
}
