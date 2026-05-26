import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen } from "lucide-react";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: string;
};

export function BlogTeaserSection({
  title = "From the GYMCO Journal",
  subtitle = "Workouts, nutrition and recovery tips from our coaches.",
  limit = 3,
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

  return (
    <section className="py-4">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-orange-600 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Journal
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <Link
          href="/blog"
          className="hidden sm:inline-flex items-center text-sm text-orange-600 font-semibold"
        >
          See all <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {rows.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`}>
              <Card className="overflow-hidden hover-elevate cursor-pointer group h-full flex flex-col border-border/60">
                <div className="relative h-40 bg-muted overflow-hidden">
                  {p.coverImage && (
                    <img
                      src={p.coverImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-1.5">
                    {p.category}
                  </div>
                  <h3 className="font-bold leading-snug line-clamp-2">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 flex-1">
                    {p.excerpt}
                  </p>
                  <div className="text-xs text-muted-foreground mt-3">
                    {new Date(p.publishedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
