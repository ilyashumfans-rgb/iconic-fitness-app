import express, { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { db, uploadedImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import sharp from "sharp";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();
const svc = new ObjectStorageService();

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_PREFIXES = ["image/", "application/pdf"];
const DB_IMAGE_CACHE_MAX_BYTES = 32 * 1024 * 1024;
const DB_IMAGE_CACHE_ITEM_MAX_BYTES = 2 * 1024 * 1024;
type CachedDbImage = { data: Buffer; mimeType: string };
const dbImageCache = new Map<string, CachedDbImage>();
const dbImageLoads = new Map<string, Promise<CachedDbImage | null>>();
let dbImageCacheBytes = 0;

function cacheDbImage(id: string, image: CachedDbImage): void {
  if (image.data.length > DB_IMAGE_CACHE_ITEM_MAX_BYTES) return;
  while (
    dbImageCache.size > 0 &&
    dbImageCacheBytes + image.data.length > DB_IMAGE_CACHE_MAX_BYTES
  ) {
    const oldest = dbImageCache.entries().next().value as
      | [string, CachedDbImage]
      | undefined;
    if (!oldest) break;
    dbImageCache.delete(oldest[0]);
    dbImageCacheBytes -= oldest[1].data.length;
  }
  dbImageCache.set(id, image);
  dbImageCacheBytes += image.data.length;
}

async function loadDbImage(id: string): Promise<CachedDbImage | null> {
  const cached = dbImageCache.get(id);
  if (cached) {
    dbImageCache.delete(id);
    dbImageCache.set(id, cached);
    return cached;
  }
  const existing = dbImageLoads.get(id);
  if (existing) return existing;

  const pending = (async () => {
    const [row] = await db
      .select({
        mimeType: uploadedImagesTable.mimeType,
        dataBase64: uploadedImagesTable.dataBase64,
      })
      .from(uploadedImagesTable)
      .where(eq(uploadedImagesTable.id, id))
      .limit(1);
    if (!row) return null;
    const image = {
      data: Buffer.from(row.dataBase64, "base64"),
      mimeType: row.mimeType,
    };
    cacheDbImage(id, image);
    return image;
  })().finally(() => {
    dbImageLoads.delete(id);
  });
  dbImageLoads.set(id, pending);
  return pending;
}

// Uploads are for signed-in users: staff sessions (admin/partner/staff) or
// authenticated Clerk members (profile photo uploads from the mobile app).
function isSignedIn(req: Request): boolean {
  const s = req.session as { adminId?: number; partnerId?: number; staffId?: number };
  if (s.adminId || s.partnerId || s.staffId) return true;
  try {
    return Boolean(getAuth(req)?.userId);
  } catch {
    return false;
  }
}

// Detect the real file type from magic bytes instead of trusting the
// client-supplied Content-Type. Returns a canonical MIME type, or null if the
// bytes don't match an allowed raster image / PDF. SVG and other active
// content are intentionally NOT supported (stored-XSS vector).
function sniffMimeType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 6 && buf.toString("ascii", 0, 6) === "GIF87a") return "image/gif";
  if (buf.length >= 6 && buf.toString("ascii", 0, 6) === "GIF89a") return "image/gif";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.length >= 5 && buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  // Audio formats (for admin-uploaded notification sounds).
  // MP3: ID3 tag or MPEG frame sync (0xFFEx/0xFFFx).
  if (buf.length >= 3 && buf.toString("ascii", 0, 3) === "ID3") return "audio/mpeg";
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg";
  // WAV: RIFF....WAVE
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  ) {
    return "audio/wav";
  }
  // OGG
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "OggS") return "audio/ogg";
  // M4A/AAC in MP4 container: ....ftyp
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") return "audio/mp4";
  return null;
}

function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

const MAX_IMAGE_DIMENSION = 1280;
const WEBP_QUALITY = 80;

// Resize to <=1280px and re-encode as (animated) WebP. Keeps the original
// bytes only when they are already WebP and smaller than the re-encode.
async function compressImage(
  body: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; mimeType: string }> {
  const animated = mimeType === "image/gif" || mimeType === "image/webp";
  const image = sharp(body, { animated, failOn: "error" });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Could not read image dimensions");
  }
  const out = await image
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
  // If the original was already a smaller WebP, keep it as-is.
  if (mimeType === "image/webp" && body.length <= out.length) {
    return { data: body, mimeType };
  }
  return { data: out, mimeType: "image/webp" };
}

router.post(
  "/storage/uploads/inline",
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  async (req: Request, res: Response) => {
    if (!isSignedIn(req)) {
      res.status(401).json({ error: "Sign in to upload files" });
      return;
    }
    const fileName = req.get("x-filename") || "upload";
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "Empty upload" });
      return;
    }
    if (body.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)` });
      return;
    }
    // Derive the MIME type from the actual bytes, not the client header.
    const sniffedType = sniffMimeType(body);
    if (!sniffedType) {
      res.status(415).json({
        error:
          "Only PNG, JPEG, GIF, WebP images, PDF files and MP3/WAV/OGG/M4A audio are allowed",
      });
      return;
    }
    // Audio (notification sounds) should stay small — cap at 2MB.
    if (isAudioMime(sniffedType) && body.length > 2 * 1024 * 1024) {
      res.status(413).json({ error: "Audio file too large (max 2MB)" });
      return;
    }
    // Compress images before storing so raw multi-MB blobs never hit the DB.
    // PDFs and audio are stored as-is.
    let stored = { data: body, mimeType: sniffedType };
    if (sniffedType !== "application/pdf" && !isAudioMime(sniffedType)) {
      try {
        stored = await compressImage(body, sniffedType);
      } catch (error) {
        req.log.error({ err: error }, "Failed to process uploaded image");
        res.status(422).json({
          error: "Could not process this image. Please upload a valid PNG, JPEG, GIF or WebP file.",
        });
        return;
      }
    }
    try {
      const id = randomUUID();
      await db.insert(uploadedImagesTable).values({
        id,
        fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.data.length,
        dataBase64: stored.data.toString("base64"),
      });
      res.json({ objectPath: `/db-images/${id}`, url: `/api/storage/db-images/${id}` });
    } catch (error) {
      req.log.error({ err: error }, "Error storing uploaded image");
      res.status(500).json({ error: "Failed to store upload" });
    }
  },
);

router.get("/storage/db-images/:id", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId.join("") : rawId;
    const etag = `"${id}"`;
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    if (req.get("if-none-match") === etag) {
      res.status(304).end();
      return;
    }
    const image = await loadDbImage(id);
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    res.setHeader("Content-Type", image.mimeType);
    res.setHeader("Content-Length", image.data.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (image.mimeType === "application/pdf") {
      res.setHeader("Content-Disposition", "attachment");
    }
    res.send(image.data);
  } catch (error) {
    req.log.error({ err: error }, "Error serving db image");
    res.status(500).json({ error: "Failed to serve image" });
  }
});

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const s = req.session as { adminId?: number; partnerId?: number; staffId?: number };
  if (!s.adminId && !s.partnerId && !s.staffId) {
    res.status(401).json({ error: "Sign in to upload files" });
    return;
  }
  const { name, size, contentType } = req.body ?? {};
  if (typeof name !== "string" || !name || typeof size !== "number" || size <= 0 || typeof contentType !== "string" || !contentType) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  if (size > MAX_UPLOAD_BYTES) {
    res.status(413).json({ error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)` });
    return;
  }
  if (!ALLOWED_PREFIXES.some((p) => contentType.startsWith(p))) {
    res.status(415).json({ error: "Only images and PDF files are allowed" });
    return;
  }
  try {
    const uploadURL = await svc.getObjectEntityUploadURL();
    const objectPath = svc.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await svc.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await svc.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await svc.getObjectEntityFile(objectPath);
    const response = await svc.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
