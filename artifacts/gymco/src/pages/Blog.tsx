import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  author: string;
  category: string;
  publishedAt: string;
};

const FALLBACK =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80";

export default function Blog() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blogs", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setRows(j as Post[]))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const [featured, ...rest] = rows;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
      {/* Header */}
      <div className="text-center mb-10 md:mb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/30 text-[10.5px] font-black tracking-[0.22em] text-lime-600 uppercase mb-4">
          <BookOpen className="h-3.5 w-3.5" /> Iconic Fitness Journal
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05]">
          Train smarter. <span className="text-gradient-brand">Recover better.</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-base md:text-lg">
          Coaches, nutritionists and athletes share the playbook every week.
        </p>
      </div>

      {loading ? (
        <div className="space-y-8">
          <Skeleton className="h-[420px] rounded-3xl" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No posts yet. Check back soon.
        </div>
      ) : (
        <>
          {/* Featured hero card */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <Link href={`/blog/${featured.slug}`}>
                <div className="group relative aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden cursor-pointer shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] ring-1 ring-border/60">
                  <img
                    src={featured.coverImage || FALLBACK}
                    alt={featured.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime-500 text-white text-[10px] font-black tracking-[0.22em] uppercase mb-3 shadow-lg">
                      Featured · {featured.category}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.05] max-w-3xl drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]">
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-white/85 max-w-2xl text-sm md:text-base line-clamp-2">
                      {featured.excerpt}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-white/80 text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(featured.publishedAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </span>
                      <span>·</span>
                      <span>{featured.author}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-lime-300 group-hover:translate-x-1 transition-transform">
                        Read article <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Grid — dark image cards in the same style as the Classes grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {rest.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: Math.min(i, 8) * 0.05 }}
                >
                  <Link href={`/blog/${p.slug}`}>
                    <div className="group relative aspect-[4/5] md:aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer ring-1 ring-border/60">
                      <img
                        src={p.coverImage || FALLBACK}
                        alt={p.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300 mb-1.5">
                          {p.category}
                        </div>
                        <h3 className="text-lg md:text-2xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)]">
                          {p.title}
                        </h3>
                        <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-white/75 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.publishedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                          <span className="opacity-60">·</span>
                          <span className="truncate">{p.author}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
