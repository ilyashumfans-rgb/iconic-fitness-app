import sharp from "sharp";

const MAX_RAW_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_STORED_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_INPUT_PIXELS = 36_000_000;

function decodeStillImage(value: unknown): Buffer {
  if (typeof value !== "string") throw new Error("Both beforeImage and afterImage are required");
  const dataUrl = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  const base64 = dataUrl ? dataUrl[2] : value;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new Error("Images must be valid base64-encoded JPEG, PNG, or WebP files");
  }
  const image = Buffer.from(base64, "base64");
  if (!image.length || image.length > MAX_RAW_IMAGE_BYTES) {
    throw new Error("Each image must be no larger than 8MB");
  }
  return image;
}

function sniffStillMime(image: Buffer): string | null {
  if (image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) return "image/jpeg";
  if (image.length >= 12 && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Validate and normalize a user supplied still photo before DB persistence. */
export async function prepareCommunityStill(value: unknown): Promise<{ data: Buffer; mimeType: string }> {
  const raw = decodeStillImage(value);
  if (!sniffStillMime(raw)) throw new Error("Only still JPEG, PNG, and WebP photos are allowed");
  const image = sharp(raw, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Could not read image dimensions");
  const data = await image
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  if (data.length > MAX_STORED_IMAGE_BYTES) {
    throw new Error("Compressed photo is too large; please choose a smaller image");
  }
  return { data, mimeType: "image/webp" };
}