// Generates the CloudFront viewer-request function (cloudfront-js-2.0) that
// implements the hosting contract (docs/seo-hosting.md, docs/deploy-cloudfront.md)
// for one release build:
//
//   node scripts/edge/viewer-request.mjs [distDir] [outFile]
//
// The function is generated from dist/ on every deploy, because it embeds the
// release's page set and its 404.html. It is attached to every cache behaviour
// and decides, per request:
//   1. Host other than PUBLIC host        → 301 to https://PUBLIC host, same path and query.
//   2. /owner, /api/owner, /api/editorial  → 404 (owner tools are never public).
//   3. /api/*, /sitemap.xml, /robots.txt   → unchanged, to the backend origin.
//   4. A path with a file extension        → unchanged, to S3 (a missing key is S3's 404).
//   5. /{locale}/… prerendered page        → S3 key …/index.html (with or without trailing slash).
//   6. /x where /zh-CN/x is a page, and /  → 301 to /zh-CN/x, query kept (seo-redirects.json).
//   7. App-only route (seo-spa-routes.json) → S3 key /index.html, 200.
//   8. Anything else                       → 404 with the release's 404.html as body.
// The 404 is generated here rather than by a CloudFront custom error response,
// because custom error responses apply to the whole distribution and would
// replace the backend's JSON error bodies on /api/* (see the deploy doc).
//
// The source is ES5 so it stays within the CloudFront Functions runtime, and
// the generator checks the result against the 10 KB function size quota and
// against the build's own manifests before anything is deployed.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { LOCALES } from "../seo/inventory.mjs";
import { REDIRECTS_FILE } from "../seo/redirects.mjs";
import { NOT_FOUND_FILE, SPA_ROUTES_FILE } from "../seo/routes.mjs";

export const PUBLIC_HOST = "lifeinuk.info";
/** CloudFront Functions maximum function size (not adjustable). */
export const MAX_FUNCTION_BYTES = 10240;
/** Above this, plan the move of the page set to a CloudFront KeyValueStore. */
export const WARN_FUNCTION_BYTES = 9216;
/** Owner tools: answered with 404 at the edge even though the app has routes for them. */
export const BLOCKED_PREFIXES = ["/owner", "/api/owner", "/api/editorial"];
const SHORT_URL_LOCALE = "zh-CN";

/** Every directory of dist/ holding an index.html, as a path ("/en/renting"); the root is left out. */
function pageDirectories(distDir) {
  const pages = [];
  const walk = (dir, path) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = `${path}/${entry.name}`;
      if (existsSync(join(dir, entry.name, "index.html"))) pages.push(child);
      walk(join(dir, entry.name), child);
    }
  };
  walk(distDir, "");
  return pages.sort();
}

const FUNCTION_SOURCE = String.raw`
function qs(q) {
  var parts = [];
  // CloudFront does not preserve the order of keys in the event object.
  var names = Object.keys(q).sort();
  for (var n = 0; n < names.length; n++) {
    var name = names[n];
    var values = q[name].multiValue ? q[name].multiValue : [q[name]];
    for (var i = 0; i < values.length; i++) parts.push(values[i].value === "" ? name : name + "=" + values[i].value);
  }
  return parts.length ? "?" + parts.join("&") : "";
}
function moved(location) {
  return { statusCode: 301, statusDescription: "Moved Permanently",
    headers: { "location": { value: location }, "cache-control": { value: "no-cache" } } };
}
function notFound() {
  return { statusCode: 404, statusDescription: "Not Found",
    headers: { "content-type": { value: "text/html; charset=utf-8" }, "cache-control": { value: "no-cache" } },
    body: { encoding: "text", data: NOT_FOUND } };
}
function under(path, prefixes, exact) {
  for (var i = 0; i < prefixes.length; i++) {
    var p = prefixes[i];
    if ((exact && path === p) || path.indexOf(exact ? p + "/" : p) === 0) return true;
  }
  return false;
}
// PAGES: sorted fixed-width entries, 7 base-36 digits of the path's FNV-1a hash
// (seeded with SEED) and 1 base-36 digit of the locale bitmask.
function hash(text) {
  var h = (2166136261 ^ SEED) >>> 0;
  for (var i = 0; i < text.length; i++) {
    h = (h ^ text.charCodeAt(i)) >>> 0;
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  var key = h.toString(36);
  while (key.length < 7) key = "0" + key;
  return key;
}
function page(rest, locale) {
  if (locale === -1) return false;
  var key = hash(rest);
  var low = 0;
  var high = PAGES.length / 8 - 1;
  while (low <= high) {
    var mid = (low + high) >> 1;
    var at = PAGES.substr(mid * 8, 7);
    if (at === key) return (parseInt(PAGES.charAt(mid * 8 + 7), 36) & (1 << locale)) !== 0;
    if (at < key) low = mid + 1;
    else high = mid - 1;
  }
  return false;
}
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value.toLowerCase() : "";
  var uri = request.uri;
  if (host !== HOST) return moved("https://" + HOST + uri + qs(request.querystring));
  var path = uri.length > 1 && uri.charAt(uri.length - 1) === "/" ? uri.slice(0, -1) : uri;
  if (under(path, BLOCKED, true)) return notFound();
  if (path.indexOf("/api/") === 0 || path === "/sitemap.xml" || path === "/robots.txt") return request;
  if (path.indexOf(".", path.lastIndexOf("/")) !== -1) return request;
  var slash = path.indexOf("/", 1);
  var locale = LOCALES.indexOf(slash === -1 ? path.slice(1) : path.slice(1, slash));
  if (locale !== -1) {
    if (page(slash === -1 ? "" : path.slice(slash + 1), locale)) {
      request.uri = path + "/index.html";
      return request;
    }
  } else if (page(path.slice(1), SHORT)) {
    return moved("/" + LOCALES[SHORT] + (path === "/" ? "" : path) + qs(request.querystring));
  }
  if (SPA.hasOwnProperty(path) || under(path, SPA_PREFIXES, false)) {
    request.uri = "/index.html";
    return request;
  }
  return notFound();
}
`;

/** FNV-1a (32-bit) of a page key, as the function computes it: 7 base-36 digits. */
export function pageHash(text, seed) {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h = (h ^ text.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

/** Most seeds to try before giving up; with a few hundred keys the first one virtually always works. */
const MAX_SEEDS = 64;

/**
 * The page set as a sorted string of 8-character entries (hash + locale bitmask)
 * with the first seed under which no two page keys share a hash. Fails rather
 * than emit a table in which two pages could be confused.
 */
export function hashedPageTable(pages, { seeds = MAX_SEEDS } = {}) {
  const keys = Object.keys(pages);
  for (let seed = 0; seed < seeds; seed++) {
    const rows = new Map();
    for (const key of keys) {
      const hashed = pageHash(key, seed);
      if (rows.has(hashed)) break;
      rows.set(hashed, pages[key]);
    }
    if (rows.size !== keys.length) continue;
    const table = [...rows.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([hashed, mask]) => {
      if (mask < 1 || mask > 35) throw new Error(`locale bitmask ${mask} does not fit one base-36 digit`);
      return hashed + mask.toString(36);
    }).join("");
    return { seed, table };
  }
  throw new Error(`page hashes collide under ${seeds} seeds; widen the hash`);
}

/** Evaluates generated function source and returns its handler (also used by the emulator and tests). */
export function loadViewerRequest(code) {
  const context = vm.createContext({ console: { log() {} } });
  vm.runInContext(`${code}\nthis.__handler = handler;`, context, { timeout: 1000 });
  const handler = context.__handler;
  return (event) => handler(JSON.parse(JSON.stringify(event)));
}

/** A CloudFront Functions viewer-request event for a request. */
export function viewerEvent(path, { host = PUBLIC_HOST, query = "", method = "GET" } = {}) {
  const querystring = {};
  for (const part of query.replace(/^\?/, "").split("&").filter(Boolean)) {
    const [name, value = ""] = part.split(/=(.*)/s);
    const entry = { value };
    if (querystring[name]) {
      const existing = querystring[name];
      existing.multiValue = existing.multiValue ?? [{ value: existing.value }];
      existing.multiValue.push(entry);
    } else querystring[name] = entry;
  }
  return {
    version: "1.0",
    context: { eventType: "viewer-request" },
    viewer: { ip: "192.0.2.1" },
    request: { method, uri: path, querystring, headers: host ? { host: { value: host } } : {}, cookies: {} },
  };
}

/**
 * Builds the function for dist/ and checks it: every prerendered page is
 * served, every manifest redirect (and no other) is a 301, every app-only
 * route gets the shell, and the code fits the size quota.
 */
export function generateViewerRequest({ distDir, host = PUBLIC_HOST, maxBytes = MAX_FUNCTION_BYTES } = {}) {
  const dist = resolve(distDir);
  for (const file of [REDIRECTS_FILE, SPA_ROUTES_FILE, NOT_FOUND_FILE, "index.html"])
    if (!existsSync(join(dist, file))) throw new Error(`${file} is missing from ${dist}; run npm run build:release first`);
  const redirects = JSON.parse(readFileSync(join(dist, REDIRECTS_FILE), "utf8")).redirects;
  const spa = JSON.parse(readFileSync(join(dist, SPA_ROUTES_FILE), "utf8"));
  const notFound = readFileSync(join(dist, NOT_FOUND_FILE), "utf8");
  const locales = [...LOCALES];
  const short = locales.indexOf(SHORT_URL_LOCALE);

  const pages = {};
  const aliasPages = [];
  let localizedPages = 0;
  for (const path of pageDirectories(dist)) {
    const [first, ...rest] = path.slice(1).split("/");
    const locale = locales.indexOf(first);
    if (locale === -1) {
      aliasPages.push(path);
      continue;
    }
    const key = rest.join("/");
    pages[key] = (pages[key] ?? 0) | (1 << locale);
    localizedPages++;
  }
  const spaPaths = {};
  for (const path of spa.paths) spaPaths[path] = 1;
  const { seed, table } = hashedPageTable(pages);

  const code = [
    "// Generated by scripts/edge/viewer-request.mjs from a release build. Do not edit.",
    `var HOST = ${JSON.stringify(host)};`,
    `var LOCALES = ${JSON.stringify(locales)};`,
    `var SHORT = ${short};`,
    `var SEED = ${seed};`,
    `var PAGES = ${JSON.stringify(table)};`,
    `var SPA = ${JSON.stringify(spaPaths)};`,
    `var SPA_PREFIXES = ${JSON.stringify(spa.prefixes)};`,
    `var BLOCKED = ${JSON.stringify(BLOCKED_PREFIXES)};`,
    `var NOT_FOUND = ${JSON.stringify(notFound)};`,
    FUNCTION_SOURCE.trim(),
    "",
  ].join("\n");
  const bytes = Buffer.byteLength(code, "utf8");

  // Self-check: the generated function must agree with the build's manifests.
  const errors = [];
  const handle = loadViewerRequest(code);
  const route = (path, query = "") => handle(viewerEvent(path, { host, query }));
  for (const [rest, mask] of Object.entries(pages))
    for (const [index, locale] of locales.entries()) {
      if (!(mask & (1 << index))) continue;
      const path = `/${locale}${rest ? `/${rest}` : ""}`;
      for (const variant of [path, `${path}/`]) {
        const result = route(variant);
        if (result.statusCode || result.uri !== `${path}/index.html`) errors.push(`${variant}: not served as ${path}/index.html`);
      }
    }
  const expectedRedirects = new Map(redirects.map((row) => [row.from, row]));
  for (const row of redirects) {
    const result = route(row.from, "?a=1");
    if (row.status !== 301 || result.statusCode !== 301 || result.headers.location.value !== `${row.to}?a=1`)
      errors.push(`${row.from}: expected 301 to ${row.to}, function gives ${result.statusCode ?? result.uri}`);
  }
  for (const path of aliasPages)
    if (!expectedRedirects.has(path)) errors.push(`${path}: alias page without a redirect in ${REDIRECTS_FILE}`);
  const derived = Object.entries(pages).filter(([, mask]) => mask & (1 << short)).map(([rest]) => (rest ? `/${rest}` : "/"));
  for (const from of derived)
    if (!expectedRedirects.has(from)) errors.push(`${from}: the function would redirect it, but ${REDIRECTS_FILE} does not`);
  for (const path of spa.paths) {
    const result = route(path);
    const blocked = BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    if (expectedRedirects.has(path)) continue;
    if (blocked ? result.statusCode !== 404 : result.statusCode || result.uri !== "/index.html")
      errors.push(`${path}: app-only route not handled (${result.statusCode ?? result.uri})`);
  }
  const unknown = route(`/${locales[0]}/no-such-section-${Date.now()}`);
  if (unknown.statusCode !== 404 || unknown.body?.data !== notFound) errors.push("unknown paths do not get 404.html with status 404");
  if (bytes > maxBytes)
    errors.push(`function is ${bytes} bytes, over the ${maxBytes}-byte CloudFront Functions limit (docs/seo/edge-capacity-plan.md)`);
  if (errors.length) throw new Error(`viewer-request function check failed:\n  ${errors.join("\n  ")}`);

  const warnings = bytes > WARN_FUNCTION_BYTES
    ? [`function is ${bytes} of ${maxBytes} bytes; see docs/seo/edge-capacity-plan.md`] : [];
  return { code, bytes, warnings, stats: { localizedPages, aliasPages: aliasPages.length, redirects: redirects.length, spaPaths: spa.paths.length, pageKeys: Object.keys(pages).length, seed } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] || "dist";
  const out = process.argv[3] || "release/edge/viewer-request.js";
  try {
    const { code, bytes, warnings, stats } = generateViewerRequest({ distDir: dist });
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, code, "utf8");
    console.log(`${out}: ${bytes} bytes (limit ${MAX_FUNCTION_BYTES}); ${stats.localizedPages} pages, ${stats.redirects} redirects, ${stats.spaPaths} app-only routes`);
    for (const warning of warnings) console.warn(`! ${warning}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
