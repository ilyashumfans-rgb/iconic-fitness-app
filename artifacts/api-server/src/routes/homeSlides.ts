import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { db, homeSlidesTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

const KINDS = ["image", "gif", "youtube"] as const;
type SlideKind = (typeof KINDS)[number];

function toPublicDto(row: typeof homeSlidesTable.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    mediaUrl: row.mediaUrl,
    title: row.title,
    subtitle: row.subtitle,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
  };
}

function cleanKind(value: unknown): SlideKind {
  return KINDS.includes(value as SlideKind) ? (value as SlideKind) : "image";
}

function cleanStr(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isValidYoutube(url: string): boolean {
  if (/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))[\w-]{11}/.test(url))
    return true;
  return /^[\w-]{11}$/.test(url.trim());
}

// A media URL must be consistent with its kind. Returns an error string when
// invalid, or null when acceptable.
function validateMedia(kind: SlideKind, mediaUrl: string): string | null {
  if (!mediaUrl) return "A media URL or uploaded file is required";
  if (kind === "youtube") {
    if (!isValidYoutube(mediaUrl))
      return "Provide a valid YouTube link for a YouTube slide";
    return null;
  }
  // image / gif slides must reference an http(s) URL or an uploaded db-image.
  if (!/^(https?:\/\/|\/)/.test(mediaUrl))
    return "Upload an image/GIF or provide a valid image URL";
  if (isValidYoutube(mediaUrl))
    return "That looks like a YouTube link — choose the YouTube option instead";
  return null;
}

// Public — active slides for the mobile Home screen.
router.get("/home-slides", async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(homeSlidesTable)
    .where(eq(homeSlidesTable.isActive, true))
    .orderBy(asc(homeSlidesTable.sortOrder), asc(homeSlidesTable.id));
  res.json(rows.map(toPublicDto));
});

// Admin — full list including inactive rows.
router.get(
  "/admin/home-slides",
  requireAdmin,
  async (_req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(homeSlidesTable)
      .orderBy(asc(homeSlidesTable.sortOrder), asc(homeSlidesTable.id));
    res.json(rows);
  },
);

router.post(
  "/admin/home-slides",
  requireAdmin,
  async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const kind = cleanKind(body.kind);
    const mediaUrl = cleanStr(body.mediaUrl, 2000);
    const mediaErr = validateMedia(kind, mediaUrl);
    if (mediaErr) {
      res.status(400).json({ error: mediaErr });
      return;
    }
    const [{ nextOrder }] = await db
      .select({
        nextOrder: sql<number>`coalesce(max(${homeSlidesTable.sortOrder}), 0) + 1`,
      })
      .from(homeSlidesTable);
    const [row] = await db
      .insert(homeSlidesTable)
      .values({
        kind,
        mediaUrl,
        title: cleanStr(body.title),
        subtitle: cleanStr(body.subtitle),
        ctaLabel: cleanStr(body.ctaLabel, 80),
        ctaUrl: cleanStr(body.ctaUrl, 2000),
        isActive: body.isActive === false ? false : true,
        sortOrder:
          typeof body.sortOrder === "number" ? body.sortOrder : nextOrder,
      })
      .returning();
    res.status(201).json(row);
  },
);

router.patch(
  "/admin/home-slides/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = req.body ?? {};
    const patch: Partial<typeof homeSlidesTable.$inferInsert> = {};
    if (body.kind !== undefined) patch.kind = cleanKind(body.kind);
    if (body.mediaUrl !== undefined) patch.mediaUrl = cleanStr(body.mediaUrl, 2000);
    if (body.title !== undefined) patch.title = cleanStr(body.title);
    if (body.subtitle !== undefined) patch.subtitle = cleanStr(body.subtitle);
    if (body.ctaLabel !== undefined) patch.ctaLabel = cleanStr(body.ctaLabel, 80);
    if (body.ctaUrl !== undefined) patch.ctaUrl = cleanStr(body.ctaUrl, 2000);
    if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
    if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    // If kind or mediaUrl is changing, validate the resulting combination
    // against the existing row so records never end up inconsistent.
    if (patch.kind !== undefined || patch.mediaUrl !== undefined) {
      const [existing] = await db
        .select()
        .from(homeSlidesTable)
        .where(eq(homeSlidesTable.id, id));
      if (!existing) {
        res.status(404).json({ error: "Slide not found" });
        return;
      }
      const effKind = (patch.kind ?? existing.kind) as SlideKind;
      const effUrl = patch.mediaUrl ?? existing.mediaUrl;
      const mediaErr = validateMedia(effKind, effUrl);
      if (mediaErr) {
        res.status(400).json({ error: mediaErr });
        return;
      }
    }
    const [row] = await db
      .update(homeSlidesTable)
      .set(patch)
      .where(eq(homeSlidesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Slide not found" });
      return;
    }
    res.json(row);
  },
);

router.delete(
  "/admin/home-slides/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(homeSlidesTable).where(eq(homeSlidesTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
