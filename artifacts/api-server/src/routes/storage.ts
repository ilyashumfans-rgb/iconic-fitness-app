import express, { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { db, uploadedImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const svc = new ObjectStorageService();

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_PREFIXES = ["image/", "application/pdf"];

function isSignedIn(req: Request): boolean {
  const s = req.session as { adminId?: number; partnerId?: number; staffId?: number };
  return Boolean(s.adminId || s.partnerId || s.staffId);
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
  return null;
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
    const mimeType = sniffMimeType(body);
    if (!mimeType) {
      res.status(415).json({ error: "Only PNG, JPEG, GIF, WebP images and PDF files are allowed" });
      return;
    }
    try {
      const id = randomUUID();
      await db.insert(uploadedImagesTable).values({
        id,
        fileName,
        mimeType,
        sizeBytes: body.length,
        dataBase64: body.toString("base64"),
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
    const [row] = await db
      .select()
      .from(uploadedImagesTable)
      .where(eq(uploadedImagesTable.id, id))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    const buf = Buffer.from(row.dataBase64, "base64");
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Length", buf.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (row.mimeType === "application/pdf") {
      res.setHeader("Content-Disposition", "attachment");
    }
    res.send(buf);
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
