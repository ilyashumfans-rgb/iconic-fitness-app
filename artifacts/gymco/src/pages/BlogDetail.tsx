import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User } from "lucide-react";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  category: string;
  publishedAt: string;
};

export default function BlogDetail() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/blogs/${encodeURIComponent(slug)}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Post not found");
        return r.json();
      })
      .then((j) => setPost(j as Post))
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <Skeleton className="h-8 w-2/3 mb-4" />
        <Skeleton className="h-72 w-full rounded-2xl mb-6" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (err || !post) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-muted-foreground mb-4">
          {err ?? "Post not found"}
        </p>
        <Link href="/blog" className="text-lime-600 font-semibold">
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto py-8 md:py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> All articles
      </Link>
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-lime-600 mb-3">
        {post.category}
      </div>
      <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
        {post.title}
      </h1>
      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
        <span className="inline-flex items-center gap-1.5">
          <User className="h-4 w-4" /> {post.author}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {new Date(post.publishedAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      {post.coverImage && (
        <div className="mt-8 rounded-2xl overflow-hidden">
          <img
            src={post.coverImage}
            alt=""
            className="w-full h-auto object-cover"
          />
        </div>
      )}
      {post.excerpt && (
        <p className="text-lg text-muted-foreground mt-8 leading-relaxed">
          {post.excerpt}
        </p>
      )}
      <div className="prose prose-slate dark:prose-invert max-w-none mt-6 whitespace-pre-wrap text-[16px] leading-relaxed">
        {post.content}
      </div>
    </article>
  );
}
