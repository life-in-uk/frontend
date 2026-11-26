// A read-only stand-in for the local backend, for the browser suites that need real published
// data (renting, settlement, work-visa, family-visit, guide-references, money-ni-number, ...):
//
//   node scripts/dev/readonly-api-proxy.mjs [port=8080] [origin=https://lifeinuk.info]
//   npm run dev            # the dev server proxies /api to http://127.0.0.1:8080 by default
//   FRONTEND_URL=http://127.0.0.1:5173 node tests/renting.browser.mjs
//
// - Only GET and HEAD are forwarded; every other method is refused with 405, so a test run can never
//   write anything.
// - Identical GETs are answered from memory for the life of the process: a suite opens hundreds of
//   pages that read the same Guide lists, and production allows 10 requests/s per visitor (burst 100;
//   backend deploy/nginx), so an uncached run is answered 429 "RATE_LIMITED" part-way through and
//   the Guide pages then (correctly) show "temporarily unavailable".
// - Upstream requests are paced (at most 5 per second) for the same reason.
// - Live data that must stay fresh (travel status, weather, markets, places) is never cached.
import http from "node:http";
import https from "node:https";

const port = Number(process.argv[2] ?? 8080);
const origin = new URL(process.argv[3] ?? "https://lifeinuk.info");
const CACHEABLE = /^\/(api\/guides(\/|$)|api\/bank-holidays$|sitemap\.xml$|robots\.txt$)/;
const SPACING_MS = 200;
const cache = new Map();
let next = 0;

function upstream(path, method) {
  const wait = Math.max(0, next - Date.now());
  next = Math.max(next, Date.now()) + SPACING_MS;
  return new Promise((resolve, reject) => setTimeout(() => {
    const client = origin.protocol === "https:" ? https : http;
    const req = client.request({ host: origin.hostname, port: origin.port || undefined, path, method,
      headers: { accept: "application/json, */*", "user-agent": "lifeinuk-readonly-test-proxy" } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  }, wait));
}

http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end('{"code":"READ_ONLY_PROXY"}');
    return;
  }
  const path = req.url;
  try {
    const key = new URL(path, "http://x").pathname;
    let answer = CACHEABLE.test(key) ? cache.get(path) : undefined;
    if (!answer) {
      answer = await upstream(path, "GET");
      if (CACHEABLE.test(key) && answer.status === 200) cache.set(path, answer);
    }
    const headers = { ...answer.headers };
    delete headers["content-encoding"];
    delete headers["transfer-encoding"];
    delete headers["content-length"];
    res.writeHead(answer.status, headers);
    res.end(req.method === "HEAD" ? undefined : answer.body);
  } catch {
    res.writeHead(502, { "content-type": "application/json" });
    res.end('{"code":"UPSTREAM_UNREACHABLE"}');
  }
}).listen(port, "127.0.0.1", () => console.log(`read-only API proxy on 127.0.0.1:${port} -> ${origin.origin} (GET/HEAD only)`));
