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
  for (var name in q) {
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
function page(rest, locale) {
  var mask = PAGES.hasOwnProperty(rest) ? PAGES[rest] : 0;
  return locale !== -1 && (mask & (1 << locale)) !== 0;
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

  const code = [
    "// Generated by scripts/edge/viewer-request.mjs from a release build. Do not edit.",
    `var HOST = ${JSON.stringify(host)};`,
    `var LOCALES = ${JSON.stringify(locales)};`,
    `var SHORT = ${short};`,
    `var PAGES = ${JSON.stringify(pages)};`,
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
    errors.push(`function is ${bytes} bytes, over the ${maxBytes}-byte CloudFront Functions limit: move the page set to a KeyValueStore`);
  if (errors.length) throw new Error(`viewer-request function check failed:\n  ${errors.join("\n  ")}`);

  const warnings = bytes > WARN_FUNCTION_BYTES
    ? [`function is ${bytes} of ${maxBytes} bytes; plan moving the page set to a CloudFront KeyValueStore`] : [];
  return { code, bytes, warnings, stats: { localizedPages, aliasPages: aliasPages.length, redirects: redirects.length, spaPaths: spa.paths.length } };
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
