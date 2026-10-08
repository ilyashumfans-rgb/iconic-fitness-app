const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream");
const { createGzip } = require("node:zlib");

// Timestamped Expo build assets are immutable. Manifests must always revalidate
// so a device can discover the current build instead of retaining stale URLs.
async function serveStaticFile(root, pathname, req, res, mimeTypes) {
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(`${path.resolve(root)}${path.sep}`)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  let stat;
  try {
    stat = await fs.promises.stat(file);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 500).end("File unavailable");
    return;
  }
  if (!stat.isFile()) {
    res.writeHead(404).end("Not Found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const text = [".js", ".json", ".css", ".html", ".svg", ".map"].includes(ext);
  const encodings = String(req.headers["accept-encoding"] || "").split(",").map(part => part.trim());
  const gzip = text && stat.size >= 1024 && encodings.some(part => {
    const [name, ...params] = part.split(";").map(v => v.trim());
    const quality = params.find(p => p.startsWith("q="));
    return name === "gzip" && (!quality || Number(quality.slice(2)) > 0);
  });
  const immutable = /^\/\d{13}-\d+\/_expo\//.test(pathname);
  const headers = {
    "content-type": mimeTypes[ext] || (ext === ".webp" ? "image/webp" : "application/octet-stream"),
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    "x-content-type-options": "nosniff",
    ...(text ? { vary: "Accept-Encoding" } : {}),
    ...(gzip ? { "content-encoding": "gzip" } : { "content-length": stat.size }),
  };
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const streams = [fs.createReadStream(file), ...(gzip ? [createGzip()] : []), res];
  pipeline(...streams, error => {
    if (error && !res.destroyed) res.destroy(error);
  });
}

module.exports = { serveStaticFile };
