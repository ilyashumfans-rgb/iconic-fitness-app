import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ArrowRight } from "lucide-react";

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

  return (
    <div className="max-w-6xl mx-auto py-8 md:py-12">
      <div className="mb-10">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600 mb-2">
          GYMCO Journal
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Training tips, recovery & nutrition
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Insights from our trainers and partner gyms to help you train smarter.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No posts yet. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rows.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`}>
              <Card className="overflow-hidden hover-elevate cursor-pointer group h-full flex flex-col">
                <div className="relative h-44 bg-muted overflow-hidden">
                  {p.coverImage && (
                    <img
                      src={p.coverImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-2">
                    {p.category}
                  </div>
                  <h3 className="font-bold text-lg leading-snug">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">
                    {p.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(p.publishedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <ArrowRight className="h-4 w-4 text-orange-600 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
