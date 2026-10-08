const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { gunzipSync } = require("node:zlib");
const { serveStaticFile } = require("./static-response.cjs");

test("Expo assets stream compressed, preserve bytes, and cache only versioned builds", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "expo-static-test-"));
  const asset = "/1791455797707-123/_expo/static/js/ios/bundle.js";
  const content = Buffer.from("console.log('asset test');\n".repeat(1000));
  await fs.mkdir(path.dirname(path.join(root, asset)), { recursive: true });
  await fs.writeFile(path.join(root, asset), content);
  await fs.writeFile(path.join(root, "manifest.json"), JSON.stringify({ assets: [] }));
  const server = http.createServer((req, res) => {
    void serveStaticFile(root, req.url, req, res, { ".js": "application/javascript", ".json": "application/json" });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const request = (url, encoding = "gzip", method = "GET") => new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: server.address().port, path: url, method, headers: { "accept-encoding": encoding } }, res => {
      const parts = [];
      res.on("data", chunk => parts.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts) }));
    });
    req.on("error", reject);
    req.end();
  });
  try {
    const compressed = await request(asset);
    assert.equal(compressed.headers["content-encoding"], "gzip");
    assert.equal(compressed.headers.vary, "Accept-Encoding");
    assert.match(compressed.headers["cache-control"], /immutable/);
    assert.deepEqual(gunzipSync(compressed.body), content);
    assert.ok(compressed.body.length < content.length / 2);
    const raw = await request(asset, "gzip;q=0");
    assert.equal(raw.headers["content-encoding"], undefined);
    assert.deepEqual(raw.body, content);
    const head = await request(asset, "identity", "HEAD");
    assert.equal(head.body.length, 0);
    assert.equal(Number(head.headers["content-length"]), content.length);
    const manifest = await request("/manifest.json");
    assert.equal(manifest.headers["cache-control"], "no-cache");
    assert.equal((await request("/missing.js")).status, 404);
    assert.equal((await request("/../outside.js")).status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  }
});
