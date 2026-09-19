import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { compressImage } from "./storage";

test("inline upload compression caps generated raster dimensions", async () => {
  const source = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: "#2a7fff" },
  })
    .jpeg({ quality: 95 })
    .toBuffer();

  const compressed = await compressImage(source, "image/jpeg");
  const metadata = await sharp(compressed.data).metadata();
  assert.equal(compressed.mimeType, "image/webp");
  assert.ok(metadata.width && metadata.width <= 1280);
  assert.ok(metadata.height && metadata.height <= 1280);
});

test("inline upload compression retains alpha in generated PNGs", async () => {
  const source = await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 4,
      background: { r: 20, g: 140, b: 255, alpha: 0.45 },
    },
  })
    .png()
    .toBuffer();

  const compressed = await compressImage(source, "image/png");
  const metadata = await sharp(compressed.data).metadata();
  assert.equal(compressed.mimeType, "image/webp");
  assert.equal(metadata.hasAlpha, true);
});

test("inline upload compression retains generated GIF animation as WebP", async () => {
  const red = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#ef4444" },
  })
    .png()
    .toBuffer();
  const blue = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#3b82f6" },
  })
    .png()
    .toBuffer();
  const source = await sharp([red, blue], { join: { animated: true } })
    .gif({ loop: 0, delay: [100, 100] })
    .toBuffer();

  const compressed = await compressImage(source, "image/gif");
  const metadata = await sharp(compressed.data, { animated: true }).metadata();
  assert.equal(compressed.mimeType, "image/webp");
  assert.equal(metadata.pages, 2);
});