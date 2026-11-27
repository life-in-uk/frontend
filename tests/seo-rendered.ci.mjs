// Rendered SEO regression test for CI (SEO audit remediation): what a
// JavaScript-rendering crawler sees, deterministically. No production request:
// a small site is prerendered from recorded API fixtures (tests/fixtures/
// seo-api.json, re-recorded with tests/fixtures/record-seo-api.mjs) with this
// build's app bundle (dist/index.html and dist/assets from `build:release`),
// and the app is served the same fixtures, so static HTML and API data agree.
//
// Checked for every Guide and hub of the fixture site:
// - API working: the app keeps the page's canonical, hreflang and H1, is not
//   noindex, and a Guide render asks the API at most twice (SEO F2);
// - API 429, 500, unreachable: the prerendered page and its head tags stay;
// - a withdrawn Guide (404) shows the not-found page, noindex;
// - an in-app navigation whose Guide request fails shows the prerendered page.
//
//   npm run build:release && PLAYWRIGHT_CHANNEL=chrome node tests/seo-rendered.ci.mjs
//   (locally without PLAYWRIGHT_CHANNEL it uses Playwright's own Chromium)
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expectedPages, loadInventory } from "../scripts/seo/inventory.mjs";
import { prerender } from "../scripts/seo/prerender.mjs";
import { writeRedirects } from "../scripts/seo/redirects.mjs";
import { createStaticHost } from "../scripts/seo/static-host.mjs";
import { RELEASE_PAGES_FILE, renderReleasePages, sitemapEntries } from "../scripts/seo/sitemap.mjs";
import { writeFileSync } from "node:fs";

const ORIGIN = "https://lifeinuk.info";
const DIST = process.env.DIST || "dist";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const fixture = JSON.parse(readFileSync(new URL("./fixtures/seo-api.json", import.meta.url), "utf8")).responses;

assert.ok(existsSync(join(DIST, "index.html")) && existsSync(join(DIST, "assets")), `${DIST}/ is not an app build: run npm run build:release first`);
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`)));
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

// 1. The fixture site: this build's shell and assets, pages prerendered from the fixtures.
const api = createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  return path in fixture ? json(res, 200, fixture[path]) : json(res, 404, { code: "NOT_FOUND" });
});
const apiBase = await listen(api);
const site = mkdtempSync(join(tmpdir(), "seo-rendered-"));
for (const entry of readdirSync(DIST, { withFileTypes: true }))
  if (entry.name === "assets" || (entry.isFile() && !entry.name.endsWith(".json") && entry.name !== "sitemap.xml")) cpSync(join(DIST, entry.name), join(site, entry.name), { recursive: true });
const inventory = await loadInventory(apiBase);
const pages = expectedPages(inventory);
await prerender({ distDir: site, origin: ORIGIN, inventory });
await writeRedirects(site, pages);
writeFileSync(join(site, RELEASE_PAGES_FILE), renderReleasePages(sitemapEntries(site, ORIGIN)));
const host = createStaticHost(site);
const base = await listen(host);

const head = (html) => ({
  canonical: html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null,
  hreflang: [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${new URL(m[2]).pathname}`).sort(),
  h1: html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, "").trim() ?? null,
});
const STATIC = new Map(pages.map((page) => [page.path, head(readFileSync(join(site, page.path, "index.html"), "utf8"))]));
const TESTED = pages.filter((page) => page.kind === "guide" || page.kind === "hub");

let failures = 0;
const ok = (condition, message) => { if (!condition) failures++; if (!condition || process.env.VERBOSE) console.log(`${condition ? "PASS" : "FAIL"} ${message}`); };
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});

/** A page whose /api requests are answered by `answer(path)`: a fixture, a failure, or a 404. */
async function open(path, answer) {
  const page = await browser.newPage({ viewport: { width: 412, height: 900 } });
  const errors = [];
  const calls = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const state = { answer };
  await page.route("**/api/**", (route) => {
    const apiPath = new URL(route.request().url()).pathname;
    calls.push(apiPath);
    const mode = state.answer(apiPath);
    if (mode === "network") return route.abort();
    if (typeof mode === "number") return route.fulfill({ status: mode, contentType: "application/json", body: '{"code":"X"}' });
    return apiPath in fixture
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture[apiPath]) })
      : route.fulfill({ status: 404, contentType: "application/json", body: '{"code":"NOT_FOUND"}' });
  });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { page, errors, calls, state };
}
const seen = (page) => page.evaluate(() => ({
  robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.content).join(","),
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
  hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => `${l.getAttribute("hreflang")} ${new URL(l.href).pathname}`).sort(),
  h1: document.querySelector("main h1, h1")?.textContent?.trim() ?? null,
  app: !!document.querySelector("header select"),
}));

try {
  assert.ok(TESTED.length >= 12, `fixture site has ${TESTED.length} Guide and hub pages`);
  for (const mode of ["published", 429, 500, "network"]) {
    for (const target of TESTED) {
      const expected = STATIC.get(target.path);
      const { page, errors, calls } = await open(target.path, () => (mode === "published" ? "fixture" : mode));
      const now = await seen(page);
      const label = `${mode} ${target.path}`;
      ok(!/noindex/.test(now.robots), `${label}: not noindex`);
      ok(now.canonical && new URL(now.canonical).pathname === target.path, `${label}: canonical ${now.canonical}`);
      ok(JSON.stringify(now.hreflang) === JSON.stringify(expected.hreflang), `${label}: hreflang ${now.hreflang.join("|")}`);
      if (target.kind === "guide") ok(now.h1 === expected.h1, `${label}: H1 "${now.h1}"`);
      if (mode === "published") {
        ok(now.app, `${label}: the app started`);
        if (target.kind === "guide") ok(calls.filter((c) => c.startsWith("/api/guides")).length <= 2, `${label}: ${calls.length} Guide API requests`);
        ok(errors.length === 0, `${label}: page errors ${errors.join(" | ")}`);
      } else if (target.kind === "guide") ok(!now.app, `${label}: the prerendered page stayed`);
      await page.close();
    }
  }
  // A withdrawn Guide: its page is still deployed, the API answers 404.
  {
    const target = TESTED.find((page) => page.kind === "guide" && page.locale === "en");
    const { page } = await open(target.path, (path) => (path.includes(`/api/guides/${target.slug}`) ? 404 : "fixture"));
    const now = await seen(page);
    ok(/noindex/.test(now.robots) && !now.canonical, `withdrawn ${target.path}: not-found page, noindex`);
    await page.close();
  }
  // In-app navigation whose Guide request fails: the target's prerendered page is shown.
  {
    const from = TESTED.find((page) => page.kind === "guide" && page.locale === "en" && page.slug === "renting-deposits-fees");
    const { page, state } = await open(from.path, () => "fixture");
    const link = page.locator('main a[href="/en/renting/renting-tenancy-agreement"]').first();
    ok(await link.count() === 1, "in-app: related link present");
    state.answer = () => 429;
    await link.click();
    await page.waitForURL((url) => url.pathname === "/en/renting/renting-tenancy-agreement");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    const now = await seen(page);
    ok(now.h1 === STATIC.get("/en/renting/renting-tenancy-agreement").h1 && !/noindex/.test(now.robots) && !now.app,
      `in-app failure: prerendered page shown (${now.h1})`);
    await page.close();
  }
  // Catalogue consistency: the API lists a Guide this release has no page for (published after it,
  // or removed by a rollback). No app surface may link it.
  {
    const hidden = "/en/renting/renting-tenancy-agreement";
    const release = pages.filter((page) => page.path !== hidden).map((page) => page.path);
    for (const path of ["/en/renting", "/en/renting/renting-deposits-fees", "/en/guides", "/en"]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.route("**/release-pages.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ pages: release }) }));
      await page.route("**/api/**", (route) => {
        const apiPath = new URL(route.request().url()).pathname;
        return apiPath in fixture
          ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture[apiPath]) })
          : route.fulfill({ status: 404, contentType: "application/json", body: '{"code":"NOT_FOUND"}' });
      });
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const started = await page.locator("header select").count() > 0;
      const links = await page.locator(`a[href="${hidden}"]`).count();
      ok(started && links === 0, `catalogue ${path}: no link to ${hidden} (${links}) once the app runs`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  host.close();
  api.close();
  rmSync(site, { recursive: true, force: true });
}
console.log(failures ? `${failures} FAILED` : `PASS rendered SEO: ${TESTED.length} pages × 4 API states, withdrawal, in-app failure, catalogue consistency`);
process.exit(failures ? 1 : 0);
