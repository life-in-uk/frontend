// What a rendering crawler sees when the Guide API is rate limited (429) or
// unreachable (SEO audit 2026-11-27). Serves the release build (dist/, from
// `npm run build:release`) with scripts/seo/static-host.mjs and answers every
// /api request with 429: prerendered Guide and topic pages keep their content
// and head tags (no noindex, canonical and hreflang unchanged), and hubs are
// never marked noindex. As a control, with the published API (read-only GETs to
// API_ORIGIN, default https://lifeinuk.info) the app still starts on those pages.
//
//   npm run build:release && node tests/seo-api-failure.browser.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const DIST = "dist";
const PORT = Number(process.env.PORT || 4179);
const BASE = `http://127.0.0.1:${PORT}`;
const API_ORIGIN = process.env.API_ORIGIN || "https://lifeinuk.info";
const PAGES = [
  { path: "/en/renting/renting-deposits-fees", kind: "guide" },
  { path: "/ur/work-visa/graduate-visa-uk", kind: "guide" },
  { path: "/zh-CN/health/registering-with-a-gp-england", kind: "guide" },
  { path: "/hi/family-visa/topics/children-from-previous-relationship", kind: "topic" },
  { path: "/zh-TW/education", kind: "hub" },
  { path: "/en/household-services", kind: "hub" },
  { path: "/ur/work-visa", kind: "hub" },
];

assert.ok(existsSync(join(DIST, "seo-spa-routes.json")), "run npm run build:release first");
const head = (html) => ({
  canonical: html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null,
  hreflang: [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`).sort(),
  h1: html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, "").trim() ?? null,
});

const host = spawn(process.execPath, ["scripts/seo/static-host.mjs", DIST, String(PORT)], { stdio: "ignore" });
let failures = 0;
const ok = (condition, message) => { if (!condition) failures++; console.log(`${condition ? "PASS" : "FAIL"} ${message}`); };
try {
  for (let i = 0; i < 50 && !(await fetch(BASE + "/zh-CN").then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 100));
  const browser = await chromium.launch();
  for (const mode of ["429", "network", "published"]) {
    for (const { path, kind } of PAGES) {
      const expected = head(readFileSync(join(DIST, path, "index.html"), "utf8"));
      const page = await browser.newPage({ viewport: { width: 412, height: 900 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.route("**/api/**", async (route) => {
        if (mode === "429") return route.fulfill({ status: 429, contentType: "application/json", body: '{"code":"RATE_LIMITED"}' });
        if (mode === "network") return route.abort();
        const url = new URL(route.request().url());
        const response = await fetch(API_ORIGIN + url.pathname + url.search, { method: "GET" });
        return route.fulfill({ status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" }, body: Buffer.from(await response.arrayBuffer()) });
      });
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const seen = await page.evaluate(() => ({
        robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.content),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => `${l.getAttribute("hreflang")} ${l.getAttribute("href")}`).sort(),
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
        app: !!document.querySelector("header select"),
      }));
      const label = `${mode} ${path}`;
      ok(seen.robots.every((content) => !/noindex/.test(content)), `${label}: not noindex (${seen.robots.join(",") || "no robots tag"})`);
      // The running app writes its canonical for the current origin (localhost here): compare paths.
      const canonicalPath = (href) => href && new URL(href).pathname;
      ok(mode === "published" ? canonicalPath(seen.canonical) === canonicalPath(expected.canonical) : seen.canonical === expected.canonical,
        `${label}: canonical kept (${seen.canonical})`);
      ok(mode === "published" || JSON.stringify(seen.hreflang) === JSON.stringify(expected.hreflang), `${label}: hreflang kept (${seen.hreflang.length})`);
      // Hubs: the app's hub has its own heading, so only Guide and topic content is compared.
      if (kind !== "hub") ok(seen.h1 === expected.h1, `${label}: content kept (${seen.h1?.slice(0, 40)})`);
      if (mode === "published") ok(seen.app, `${label}: the app started`);
      else if (kind !== "hub") ok(!seen.app, `${label}: the prerendered page stayed`);
      ok(errors.length === 0, `${label}: no page errors ${errors.join(" | ")}`);
      await page.close();
    }
  }
  await browser.close();
} finally {
  host.kill();
}
console.log(failures ? `${failures} FAILED` : "PASS seo api failure");
process.exit(failures ? 1 : 0);
