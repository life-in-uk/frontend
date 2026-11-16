// Reference implementation of the hosting contract for the release build
// (see docs/seo-hosting.md). Not production infrastructure: it exists so the
// expected behaviour can be smoke-tested locally with no dependencies.
//
//   node scripts/seo/static-host.mjs [distDir] [port]
//
// 1. Redirects from seo-redirects.json (zh-CN short URLs) → 301.
// 2. An existing file is served as is (hashed /assets/* cached for a year).
// 3. /path and /path/ serve dist/path/index.html (prerendered page).
// 4. Anything else that looks like an app route gets the SPA shell (index.html).
// 5. HTML is served with Cache-Control: no-cache so updated Guides show at once.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { REDIRECTS_FILE } from "./redirects.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
};

export function createStaticHost(distDir) {
  const dist = resolve(distDir);
  const manifest = join(dist, REDIRECTS_FILE);
  const redirects = new Map(
    existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")).redirects.map((row) => [row.from, row]) : [],
  );
  const isFile = (file) => file.startsWith(dist + sep) && existsSync(file) && statSync(file).isFile();
  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://host");
    let path;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const send = (file, status = 200) => {
      const type = TYPES[extname(file)] ?? "application/octet-stream";
      const cache = file.startsWith(join(dist, "assets") + sep) ? "public, max-age=31536000, immutable" : "no-cache";
      res.writeHead(status, { "Content-Type": type, "Cache-Control": cache });
      res.end(req.method === "HEAD" ? undefined : readFileSync(file));
    };
    const bare = path.length > 1 ? path.replace(/\/$/, "") : path;
    const redirect = redirects.get(bare);
    if (redirect) {
      res.writeHead(redirect.status, { Location: redirect.to + url.search, "Cache-Control": "no-cache" }).end();
      return;
    }
    const direct = join(dist, path);
    if (isFile(direct)) return send(direct);
    const page = join(dist, bare, "index.html");
    if (bare !== "/" && isFile(page)) return send(page);
    // Missing files (with an extension) are 404s; app routes get the SPA shell.
    if (extname(bare)) {
      res.writeHead(404, { "Cache-Control": "no-cache" }).end();
      return;
    }
    send(join(dist, "index.html"));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] || "dist";
  const port = Number(process.argv[3] || 4174);
  createStaticHost(dist).listen(port, "127.0.0.1", () => console.log(`serving ${dist} on http://127.0.0.1:${port}`));
}
