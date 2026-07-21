// Tiny static file server for the petshop-live demo storefront.
// Serves only allowlisted file types from its own directory, no listing, no dotfiles.
// Usage: node server.mjs --host 100.65.70.81 --port 4174

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const host = arg("host", "127.0.0.1");
const port = Number(arg("port", "4174"));

// Only what the storefront needs — everything else (server, README, git) 404s.
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  const started = Date.now();
  const done = (status, headers, body) => {
    res.writeHead(status, headers);
    res.end(req.method === "HEAD" ? undefined : body);
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${status} ${Date.now() - started}ms`);
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    return done(405, { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }, "method not allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
  } catch {
    return done(400, { "content-type": "text/plain; charset=utf-8" }, "bad request");
  }
  if (pathname.includes("\0")) {
    return done(400, { "content-type": "text/plain; charset=utf-8" }, "bad request");
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname.split("/").some((seg) => seg.startsWith("."))) {
    return done(404, { "content-type": "text/plain; charset=utf-8" }, "not found");
  }

  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root + path.sep)) {
    return done(403, { "content-type": "text/plain; charset=utf-8" }, "forbidden");
  }

  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) {
    return done(404, { "content-type": "text/plain; charset=utf-8" }, "not found");
  }

  try {
    const data = await fs.readFile(file);
    return done(200, {
      "content-type": type,
      "content-length": data.length,
      "cache-control": "no-store",
    }, data);
  } catch (err) {
    const status = err.code === "ENOENT" || err.code === "EISDIR" ? 404 : 500;
    return done(status, { "content-type": "text/plain; charset=utf-8" }, status === 404 ? "not found" : "server error");
  }
});

server.listen(port, host, () => {
  console.log(`petshop-live serving ${root} on http://${host}:${port}/`);
});
