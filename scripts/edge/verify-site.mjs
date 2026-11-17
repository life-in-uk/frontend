// Verifies a deployed (or emulated) site against the hosting contract, with
// every expectation taken from the release build in dist/:
//
//   node scripts/edge/verify-site.mjs --base https://lifeinuk.info --production
//   node scripts/edge/verify-site.mjs --base https://lifeinuk.info --connect 203.0.113.10 --production   (before DNS)
//   node scripts/edge/verify-site.mjs --base http://127.0.0.1:4180 --host lifeinuk.info                   (emulator)
//
// Checks: every canonical page (with and without a trailing slash) is the
// release's file with status 200 and Cache-Control no-cache; every zh-CN short
// URL and the root are 301s that keep the query string; app-only routes get the
// shell; unknown paths, unpublished translations and owner paths are real 404s
// with the noindex 404 page; missing assets are 404s; the API answers on the
// same origin and keeps JSON error bodies; sitemap.xml and robots.txt come from
// the backend; the five locale home pages are served in their language; other
// hosts redirect to the public host. --production also requires compressed API
// responses, sitemap and robots.txt on the public origin, and the HTTP → HTTPS
// and www → apex redirects over the real network. Exits nonzero on any failure.
import { readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, brotliDecompressSync } from "node:zlib";
import { GUIDE_LOCALE_HREFLANG, GUIDE_LOCALE_LANG } from "../../src/guides/locales.ts";
import { LOCALES } from "../seo/inventory.mjs";
import { REDIRECTS_FILE } from "../seo/redirects.mjs";
import { NOT_FOUND_FILE, SPA_ROUTES_FILE } from "../seo/routes.mjs";
import { IMMUTABLE, uploadObjects } from "./objects.mjs";
import { BLOCKED_PREFIXES } from "./viewer-request.mjs";

/** One HTTP exchange; redirects are never followed. connectIp pins the TCP target (like curl --resolve). */
export function exchange(url, { method = "GET", headers = {}, host, connectIp, timeout = 20000 } = {}) {
  const target = new URL(url);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  const options = { method, headers: { "accept-encoding": "identity", ...headers }, timeout };
  if (host) {
    options.headers.host = host;
    if (target.protocol === "https:") options.servername = host;
  }
  if (connectIp) options.lookup = (_name, opts, callback) =>
    opts?.all ? callback(null, [{ address: connectIp, family: connectIp.includes(":") ? 6 : 4 }]) : callback(null, connectIp, connectIp.includes(":") ? 6 : 4);
  return new Promise((resolvePromise, reject) => {
    const req = send(target, options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolvePromise({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error(`timeout after ${timeout} ms`)));
    req.on("error", reject);
    req.end();
  });
}

function decoded(response) {
  const encoding = response.headers["content-encoding"];
  if (encoding === "gzip") return gunzipSync(response.body);
  if (encoding === "br") return brotliDecompressSync(response.body);
  return response.body;
}

async function pool(items, limit, work) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await work(items[next++]);
  });
  await Promise.all(runners);
}

/** Expectations from the release build. */
export function releaseExpectations(distDir) {
  const dist = resolve(distDir);
  const objects = uploadObjects(dist);
  const pages = [];
  for (const { key } of objects) {
    if (!key.endsWith("/index.html")) continue;
    const path = `/${key.slice(0, -"/index.html".length)}`;
    const [locale, ...rest] = path.slice(1).split("/");
    if (LOCALES.includes(locale)) pages.push({ path, locale, rest, file: join(dist, key) });
  }
  const redirects = JSON.parse(readFileSync(join(dist, REDIRECTS_FILE), "utf8")).redirects;
  const spa = JSON.parse(readFileSync(join(dist, SPA_ROUTES_FILE), "utf8"));
  const shell = readFileSync(join(dist, "index.html"));
  const notFound = readFileSync(join(dist, NOT_FOUND_FILE));
  const asset = objects.find((object) => object.key.startsWith("assets/") && object.key.endsWith(".js"));
  return { pages, redirects, spa, shell, notFound, asset };
}

export async function verifySite({ base, distDir = "dist", host, connectIp, production = false, concurrency = 8, apiDetails = true, log = () => {} }) {
  const baseUrl = new URL(base);
  const publicHost = host ?? baseUrl.hostname;
  const origin = `https://${publicHost}`;
  const expect = releaseExpectations(distDir);
  const results = new Map();
  const failures = [];
  const warnings = [];
  const record = (group, ok, message) => {
    const entry = results.get(group) ?? { passed: 0, failed: 0 };
    if (ok) entry.passed++;
    else {
      entry.failed++;
      failures.push(`[${group}] ${message}`);
    }
    results.set(group, entry);
  };
  const get = (path, options = {}) => exchange(new URL(path, baseUrl), { host: publicHost, connectIp, ...options });
  const attempt = async (group, label, check) => {
    try {
      const message = await check();
      record(group, !message, `${label}: ${message}`);
    } catch (error) {
      record(group, false, `${label}: ${error.message}`);
    }
  };

  // 1. Canonical pages, with and without a trailing slash.
  const noCache = (response) => /\bno-cache\b/.test(response.headers["cache-control"] ?? "");
  const pageChecks = expect.pages.flatMap((page) => [page.path, `${page.path}/`].map((path) => ({ page, path })));
  log(`pages: ${expect.pages.length} canonical URLs × 2`);
  await pool(pageChecks, concurrency, ({ page, path }) => attempt("canonical pages", path, async () => {
    const response = await get(path);
    if (response.status !== 200) return `status ${response.status}`;
    if (!String(response.headers["content-type"]).startsWith("text/html")) return `content-type ${response.headers["content-type"]}`;
    if (!noCache(response)) return `cache-control ${response.headers["cache-control"]}`;
    if (!decoded(response).equals(readFileSync(page.file))) return "body differs from the release file";
    return "";
  }));

  // 2. The five locale home pages.
  for (const locale of LOCALES) await attempt("locale home pages", `/${locale}`, async () => {
    const html = decoded(await get(`/${locale}`)).toString("utf8");
    if (!html.includes(`<html lang="${GUIDE_LOCALE_LANG[locale]}"`)) return `lang attribute is not ${GUIDE_LOCALE_LANG[locale]}`;
    if (!html.includes(`<link rel="canonical" href="${origin}/${locale}"`)) return `canonical is not ${origin}/${locale}`;
    for (const [alternate, path] of [...LOCALES.map((l) => [GUIDE_LOCALE_HREFLANG[l], `/${l}`]), ["x-default", "/zh-CN"]])
      if (!html.includes(`<link rel="alternate" hreflang="${alternate}" href="${origin}${path}"`)) return `missing hreflang ${alternate} → ${path}`;
    return "";
  });

  // 3. Redirects keep the query string.
  const query = "?utm_source=verify&x=%E4%B8%AD&x=2";
  const redirectChecks = expect.redirects.flatMap((row) => [row, ...(row.from === "/" ? [] : [{ ...row, from: `${row.from}/` }])]);
  log(`redirects: ${expect.redirects.length} (+ trailing-slash variants)`);
  await pool(redirectChecks, concurrency, (row) => attempt("redirects", row.from, async () => {
    const response = await get(row.from + query);
    if (response.status !== 301) return `status ${response.status}`;
    const location = new URL(response.headers.location ?? "", `${baseUrl.protocol}//${publicHost}`);
    if (location.pathname !== row.to || location.search !== query) return `Location ${response.headers.location}, expected ${row.to}${query}`;
    if (location.host !== publicHost) return `redirects to another host (${location.host})`;
    return "";
  }));

  // 4. App-only routes get the shell; owner paths are 404.
  const blocked = (path) => BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  const redirectFrom = new Set(expect.redirects.map((row) => row.from));
  for (const path of expect.spa.paths.filter((p) => !blocked(p) && !redirectFrom.has(p)))
    await attempt("app-only routes", path, async () => {
      const response = await get(path);
      if (response.status !== 200) return `status ${response.status}`;
      return decoded(response).equals(expect.shell) ? "" : "body is not the app shell";
    });

  // 5. Real 404s with the noindex 404 page.
  const sample = expect.pages.find((page) => page.rest.length === 2) ?? expect.pages[0];
  const section = sample.rest[0];
  const missingTranslation = (() => {
    const byRest = new Map();
    for (const page of expect.pages) byRest.set(page.rest.join("/"), [...(byRest.get(page.rest.join("/")) ?? []), page.locale]);
    for (const [rest, locales] of byRest) {
      const absent = LOCALES.find((locale) => !locales.includes(locale));
      if (absent && rest) return `/${absent}/${rest}`;
    }
    return null;
  })();
  const notFoundPaths = [
    ...LOCALES.map((locale) => `/${locale}/no-such-section`),
    ...LOCALES.map((locale) => `/${locale}/${section}/no-such-guide`),
    `${sample.path}/extra`,
    `/${section}/no-such-guide`,
    "/no-such-top-level-page",
    `/${LOCALES[2].toUpperCase()}`,
    "/api",
    ...(missingTranslation ? [missingTranslation] : []),
    ...["/owner/editorial", "/owner/editorial/batches", "/owner"].filter(blocked),
  ];
  for (const path of notFoundPaths) await attempt("404 responses", path, async () => {
    const response = await get(path);
    if (response.status !== 404) return `status ${response.status}`;
    if (!String(response.headers["content-type"]).startsWith("text/html")) return `content-type ${response.headers["content-type"]}`;
    const body = decoded(response);
    if (!body.equals(expect.notFound)) return "body is not the release's 404.html";
    return body.toString("utf8").includes('name="robots" content="noindex"') ? "" : "404 page is not noindex";
  });
  for (const path of ["/api/owner/editorial/session", "/api/owner/editorial/batches", "/api/editorial/guide-batches"])
    await attempt("owner tools blocked", path, async () => {
      const response = await get(path);
      return response.status === 404 ? "" : `status ${response.status}`;
    });

  // 6. Static assets.
  if (expect.asset) await attempt("assets", `/${expect.asset.key}`, async () => {
    const response = await get(`/${expect.asset.key}`);
    if (response.status !== 200) return `status ${response.status}`;
    return response.headers["cache-control"] === IMMUTABLE ? "" : `cache-control ${response.headers["cache-control"]}`;
  });
  await attempt("assets", "/assets/no-such-file-0000.js", async () => {
    const response = await get("/assets/no-such-file-0000.js");
    return response.status === 404 ? "" : `status ${response.status}`;
  });

  // 7. API on the same origin; JSON errors are not rewritten.
  const json = (response) => JSON.parse(decoded(response).toString("utf8"));
  const guides = expect.pages.filter((page) => page.rest.length === 2);
  await attempt("api", "/api/guides", async () => {
    const response = await get("/api/guides");
    if (response.status !== 200) return `status ${response.status}`;
    const slugs = new Set(json(response).map((guide) => guide.slug));
    const missing = [...new Set(guides.map((page) => page.rest[1]))].filter((slug) => !slugs.has(slug));
    return missing.length ? `published pages missing from the API: ${missing.join(", ")}` : "";
  });
  for (const locale of LOCALES) await attempt("api", `/api/guides/locales/${locale}`, async () => {
    const response = await get(`/api/guides/locales/${locale}`);
    if (response.status !== 200) return `status ${response.status}`;
    const slugs = new Set(json(response).map((guide) => guide.slug));
    const missing = guides.filter((page) => page.locale === locale && !slugs.has(page.rest[1])).map((page) => page.rest[1]);
    return missing.length ? `missing ${missing.join(", ")}` : "";
  });
  if (apiDetails) {
    log(`api: ${guides.length} localized Guide details`);
    await pool(guides, concurrency, (page) => attempt("api guide details", `${page.rest[1]} (${page.locale})`, async () => {
      const response = await get(`/api/guides/${page.rest[1]}/locales/${page.locale}`);
      if (response.status !== 200) return `status ${response.status}`;
      const body = json(response);
      return body.contentHash && body.guide?.slug === page.rest[1] ? "" : "no contentHash or wrong slug";
    }));
  }
  await attempt("api errors keep JSON", "/api/guides/no-such-guide-verify", async () => {
    const response = await get("/api/guides/no-such-guide-verify");
    if (response.status !== 404) return `status ${response.status}`;
    if (!String(response.headers["content-type"]).includes("json")) return `content-type ${response.headers["content-type"]} (an error page replaced the API body?)`;
    json(response);
    return "";
  });
  await attempt("api compression", "/api/guides gzip", async () => {
    const response = await get("/api/guides", { headers: { "accept-encoding": "gzip, br" } });
    if (["gzip", "br"].includes(response.headers["content-encoding"])) return "";
    if (production) return `not compressed (content-encoding ${response.headers["content-encoding"] ?? "none"})`;
    warnings.push("API responses are not compressed here (required in production)");
    return "";
  });

  // 8. sitemap.xml and robots.txt from the backend.
  const originCheck = (found, what) => {
    if (found === origin) return "";
    if (production) return `${what} uses ${found}, expected ${origin}`;
    warnings.push(`${what} uses ${found} (production must use ${origin})`);
    return "";
  };
  await attempt("sitemap and robots", "/sitemap.xml", async () => {
    const response = await get("/sitemap.xml");
    if (response.status !== 200) return `status ${response.status}`;
    if (!String(response.headers["content-type"]).includes("xml")) return `content-type ${response.headers["content-type"]}`;
    const locs = [...decoded(response).toString("utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]));
    const paths = new Set(locs.map((url) => url.pathname));
    const want = new Set(expect.pages.map((page) => page.path));
    const missing = [...want].filter((path) => !paths.has(path));
    const extra = [...paths].filter((path) => !want.has(path));
    if (missing.length || extra.length) return `${missing.length} missing, ${extra.length} unexpected (e.g. ${[...missing, ...extra].slice(0, 3).join(", ")})`;
    const origins = [...new Set(locs.map((url) => url.origin))];
    return origins.length === 1 ? originCheck(origins[0], "sitemap") : `several origins: ${origins.join(", ")}`;
  });
  await attempt("sitemap and robots", "/robots.txt", async () => {
    const response = await get("/robots.txt");
    if (response.status !== 200) return `status ${response.status}`;
    const line = decoded(response).toString("utf8").match(/^Sitemap:\s*(\S+)\s*$/m);
    if (!line) return "no Sitemap line";
    return new URL(line[1]).pathname === "/sitemap.xml" ? originCheck(new URL(line[1]).origin, "robots.txt") : `Sitemap ${line[1]}`;
  });

  // 9. One public host.
  const canonicalHost = async (url, options, label) => attempt("host and scheme", label, async () => {
    const response = await exchange(url, options);
    if (response.status !== 301) return `status ${response.status}`;
    return response.headers.location === `${origin}/en?x=1` ? "" : `Location ${response.headers.location}`;
  });
  await canonicalHost(new URL("/en?x=1", baseUrl), { host: `www.${publicHost}`, connectIp }, `www.${publicHost} → ${origin}`);
  if (production) {
    await canonicalHost(`http://${publicHost}/en?x=1`, { connectIp }, `http://${publicHost} → ${origin}`);
    const www = await exchange(`https://www.${publicHost}/en?x=1`, { connectIp }).catch((error) => ({ error }));
    record("host and scheme", www.status === 301 && www.headers?.location === `${origin}/en?x=1`,
      `https://www.${publicHost}: ${www.error?.message ?? `status ${www.status}, Location ${www.headers?.location}`}`);
  }

  return { results: Object.fromEntries(results), failures, warnings };
}

function parseArgs(argv) {
  const args = { dist: "dist", concurrency: 8, production: false, apiDetails: true };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    const value = () => argv[++i];
    if (name === "--base") args.base = value();
    else if (name === "--host") args.host = value();
    else if (name === "--connect") args.connectIp = value();
    else if (name === "--dist") args.dist = value();
    else if (name === "--concurrency") args.concurrency = Number(value());
    else if (name === "--production") args.production = true;
    else if (name === "--skip-api-details") args.apiDetails = false;
    else throw new Error(`unknown option ${name}`);
  }
  if (!args.base) throw new Error("--base is required (for example https://lifeinuk.info)");
  return args;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const { results, failures, warnings } = await verifySite({ ...args, distDir: args.dist, log: (line) => console.log(`… ${line}`) });
    console.log(`\nSite verification: ${args.base}${args.host ? ` (Host ${args.host})` : ""}${args.connectIp ? ` via ${args.connectIp}` : ""}${args.production ? ", production" : ""}`);
    for (const [group, { passed, failed }] of Object.entries(results))
      console.log(`  ${failed ? "✗" : "✓"} ${group}: ${passed} passed${failed ? `, ${failed} failed` : ""}`);
    for (const warning of new Set(warnings)) console.log(`  ! ${warning}`);
    if (failures.length) {
      console.log(`\n${failures.length} failure(s):`);
      for (const failure of failures.slice(0, 50)) console.log(`  - ${failure}`);
      process.exitCode = 1;
    } else console.log("\nAll checks passed.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
