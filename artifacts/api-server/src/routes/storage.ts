import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const svc = new ObjectStorageService();

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_PREFIXES = ["image/", "application/pdf"];

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
