import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ─────────────────────────── Public ───────────────────────────

router.get("/blogs", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.isPublished, true))
    .orderBy(desc(blogPostsTable.publishedAt));
  res.json(rows);
});

router.get(
  "/blogs/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const slug = String(req.params.slug ?? "");
    const [row] = await db
      .select()
      .from(blogPostsTable)
      .where(
        and(
          eq(blogPostsTable.slug, slug),
          eq(blogPostsTable.isPublished, true),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(row);
  },
);

// ─────────────────────────── Admin CRUD ───────────────────────────

router.get(
  "/admin/blogs",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select()
      .from(blogPostsTable)
      .orderBy(desc(blogPostsTable.createdAt));
    res.json(rows);
  },
);

router.post(
  "/admin/blogs",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }
    const slugRaw =
      typeof b.slug === "string" && b.slug.trim()
        ? slugify(b.slug)
        : slugify(title);
    const slug = `${slugRaw}-${Math.random().toString(36).slice(2, 6)}`;
    const [row] = await db
      .insert(blogPostsTable)
      .values({
        slug,
        title,
        excerpt: typeof b.excerpt === "string" ? b.excerpt : "",
        content: typeof b.content === "string" ? b.content : "",
        coverImage: typeof b.coverImage === "string" ? b.coverImage : "",
        videoUrl: typeof b.videoUrl === "string" ? b.videoUrl : "",
        author:
          typeof b.author === "string" && b.author.trim()
            ? b.author
            : "GYMCO Team",
        category:
          typeof b.category === "string" && b.category.trim()
            ? b.category
            : "Fitness",
        isPublished: b.isPublished !== false,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/admin/blogs/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of [
      "title",
      "excerpt",
      "content",
      "coverImage",
      "videoUrl",
      "author",
      "category",
    ] as const) {
      if (typeof b[k] === "string") patch[k] = b[k];
    }
    if (typeof b.isPublished === "boolean") patch.isPublished = b.isPublished;
    const [row] = await db
      .update(blogPostsTable)
      .set(patch)
      .where(eq(blogPostsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/admin/blogs/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
