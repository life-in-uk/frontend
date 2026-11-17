// Release-build safeguards for the static SEO pages: the shared prerender
// pipeline plus validation must accept a correct build for any inventory size
// and reject missing pages, local origins, wrong hreflang, SPA-only output,
// fallback pages posing as translations and a missing redirect manifest. The
// reference static host must follow the documented hosting contract.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expectedPages } from "../scripts/seo/inventory.mjs";
import { resolveReleaseOrigin } from "../scripts/seo/origin.mjs";
import { prerender } from "../scripts/seo/prerender.mjs";
import { REDIRECTS_FILE, writeRedirects } from "../scripts/seo/redirects.mjs";
import { createStaticHost } from "../scripts/seo/static-host.mjs";
import { validateSeoOutput } from "../scripts/seo/validate.mjs";

const ORIGIN = "https://lifeinuk.info";
const SHELL = '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <title>Life in UK</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" crossorigin src="/assets/index-abc123.js"></script>\n  </body>\n</html>\n';

const LONG = "This paragraph explains the rule in plain words, with the details a tenant needs before acting. ".repeat(4);
function guide(slug, locale, category = "renting") {
  const title = `${slug} title (${locale})`;
  const meta = { slug, category, title, summary: `${slug} summary in ${locale}.`, publishedAt: "2026-11-16T14:25:00Z", updatedAt: "2026-11-16T14:25:00Z" };
  return {
    meta,
    detail: {
      ...meta,
      content: `# ${title}\n\n## What to do\n\n${LONG}\n\n- First step. [See the official source](#guide-evidence-key-one)\n`,
      sources: [{ key: "gov", organisation: "GOV.UK", title: "Source", url: "https://www.gov.uk/example", accessedAt: "2026-11-16T14:14:24Z" }],
      evidence: [{ key: "key-one", statement: "A statement from the source.", supports: [{ sourceKey: "gov", locator: "x", excerpt: null, note: null }] }],
    },
  };
}

/** Inventory from { locale: [[slug, category?], …] }. */
function inventory(spec) {
  const lists = {};
  const details = {};
  for (const locale of ["zh-CN", "zh-TW", "en", "ur", "hi"]) {
    const rows = (spec[locale] ?? []).map(([slug, category]) => guide(slug, locale, category));
    lists[locale] = rows.map((row) => row.meta);
    details[locale] = new Map(rows.map((row) => [row.meta.slug, row.detail]));
  }
  return { lists, details };
}

const BASE = {
  "zh-CN": [["renting-alpha"], ["renting-beta"], ["registering-with-a-gp", "health-nhs"]],
  en: [["renting-alpha"], ["registering-with-a-gp", "health-nhs"]],
  ur: [["renting-alpha"]],
};

async function build(inv, { origin = ORIGIN, release = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "seo-release-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), SHELL);
  writeFileSync(join(dir, "assets", "index-abc123.js"), "console.log(1)");
  await prerender({ distDir: dir, origin, inventory: inv });
  if (release) await writeRedirects(dir, expectedPages(inv));
  return dir;
}

const validate = (dir, inv, origin = ORIGIN, release = true) => validateSeoOutput({ distDir: dir, inventory: inv, origin, release });

test("a correct release build validates, with counts taken from the inventory", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv);
  const { errors, report } = await validate(dir, inv);
  assert.deepEqual(errors, []);
  // Guides: alpha ×3 locales, beta ×1, GP ×2. Hubs: renting zh-CN/en/ur, health zh-CN/en. Home pages: always five.
  // No Family & Visa Guide is published, so no topic page. zh-CN short URLs: 3 Guides + 2 hubs (alias pages) + the root.
  assert.deepEqual(report.expected, { guides: 6, hubs: 5, homes: 5, topics: 0, aliases: 6 });
  assert.deepEqual(report.valid, { guide: 6, hub: 5, home: 5, topic: 0, alias: 5 });
  assert.equal(report.redirects, 6);
  rmSync(dir, { recursive: true });
});

test("growing the inventory grows the expected pages; no total is hardcoded", async () => {
  const inv = inventory({ ...BASE, hi: [["renting-gamma"]], "zh-CN": [...BASE["zh-CN"], ["renting-gamma"]] });
  const dir = await build(inv);
  const { errors, report } = await validate(dir, inv);
  assert.deepEqual(errors, []);
  assert.deepEqual(report.expected, { guides: 8, hubs: 6, homes: 5, topics: 0, aliases: 7 });
  rmSync(dir, { recursive: true });
});

test("a missing Guide page fails the release", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv);
  rmSync(join(dir, "ur", "renting", "renting-alpha"), { recursive: true });
  const { errors } = await validate(dir, inv);
  assert.ok(errors.some((e) => e === "/ur/renting/renting-alpha: missing guide page"), errors.join("\n"));
  rmSync(dir, { recursive: true });
});

test("localhost canonicals fail the release, but are allowed in a local build", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv, { origin: "http://127.0.0.1:5198" });
  const local = await validate(dir, inv, "http://127.0.0.1:5198", false);
  assert.deepEqual(local.errors, []);
  const release = await validate(dir, inv, "http://127.0.0.1:5198", true);
  assert.ok(release.errors.some((e) => e.startsWith("release origin must be public https")), release.errors.join("\n"));
  assert.ok(release.errors.some((e) => e.includes("local or private URL http://127.0.0.1:5198")));
  // Pages built for localhost do not pass as a release for the public origin either.
  const mismatch = await validate(dir, inv, ORIGIN, true);
  assert.ok(mismatch.errors.some((e) => e.includes("canonical http://127.0.0.1:5198")));
  rmSync(dir, { recursive: true });
});

test("incorrect hreflang fails the release", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv);
  const file = join(dir, "en", "renting", "renting-alpha", "index.html");
  writeFileSync(file, readFileSync(file, "utf8").replace(/\n\s*<link rel="alternate" hreflang="ur"[^>]*>/, ""));
  const { errors } = await validate(dir, inv);
  assert.ok(errors.includes("/en/renting/renting-alpha: hreflang alternates do not match the published locales"), errors.join("\n"));
  rmSync(dir, { recursive: true });
});

test("SPA-only output fails the release", async () => {
  const inv = inventory(BASE);
  const dir = mkdtempSync(join(tmpdir(), "seo-spa-only-"));
  writeFileSync(join(dir, "index.html"), SHELL);
  const { errors } = await validate(dir, inv);
  assert.ok(errors.includes("SPA-only output: no prerendered pages were generated"), errors.join("\n"));
  // A page directory holding only the SPA shell is rejected too.
  const built = await build(inv);
  cpSync(join(built, "index.html"), join(built, "en", "renting", "renting-alpha", "index.html"));
  const shellOnly = await validate(built, inv);
  assert.ok(shellOnly.errors.includes("/en/renting/renting-alpha: no prerendered content (SPA shell only)"), shellOnly.errors.join("\n"));
  rmSync(dir, { recursive: true });
  rmSync(built, { recursive: true });
});

test("a fallback page posing as a translation fails the release", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv);
  // renting-beta is published in zh-CN only; an English copy must not exist.
  mkdirSync(join(dir, "en", "renting", "renting-beta"), { recursive: true });
  cpSync(join(dir, "zh-CN", "renting", "renting-beta", "index.html"), join(dir, "en", "renting", "renting-beta", "index.html"));
  const { errors } = await validate(dir, inv);
  assert.ok(errors.includes("/en/renting/renting-beta: unexpected page (not a published Guide or hub in this locale)"), errors.join("\n"));
  rmSync(dir, { recursive: true });
});

test("zh-CN short URLs: canonical on /zh-CN/…, a 301 in the manifest, never a separate canonical", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv);
  const manifest = JSON.parse(readFileSync(join(dir, REDIRECTS_FILE), "utf8")).redirects;
  assert.deepEqual(manifest.map((row) => `${row.from} ${row.to} ${row.status}`), [
    "/ /zh-CN 301",
    "/health /zh-CN/health 301",
    "/health/registering-with-a-gp /zh-CN/health/registering-with-a-gp 301",
    "/renting /zh-CN/renting 301",
    "/renting/renting-alpha /zh-CN/renting/renting-alpha 301",
    "/renting/renting-beta /zh-CN/renting/renting-beta 301",
  ]);
  const aliasHtml = readFileSync(join(dir, "renting", "renting-alpha", "index.html"), "utf8");
  assert.match(aliasHtml, /<link rel="canonical" href="https:\/\/lifeinuk\.info\/zh-CN\/renting\/renting-alpha"/);
  // The root keeps the app shell (served for app-only routes); hosts redirect it instead.
  assert.match(readFileSync(join(dir, "index.html"), "utf8"), /<div id="root"><\/div>/);
  // Internal links go straight to /zh-CN/…: a link to a short URL (a 301) fails the release.
  const zhHome = join(dir, "zh-CN", "index.html");
  const homeHtml = readFileSync(zhHome, "utf8");
  assert.ok(!/href="\/(renting|health)[/"]/.test(homeHtml) && homeHtml.includes('href="/zh-CN/renting"'));
  writeFileSync(zhHome, homeHtml.replace('href="/zh-CN/renting"', 'href="/renting"'));
  assert.ok((await validate(dir, inv)).errors.some((error) => error.includes("internal link /renting is a redirecting short URL")));
  writeFileSync(zhHome, homeHtml);
  rmSync(join(dir, REDIRECTS_FILE));
  const { errors } = await validate(dir, inv);
  assert.ok(errors.includes(`${REDIRECTS_FILE} missing`), errors.join("\n"));
  rmSync(dir, { recursive: true });
});

test("the release origin must be explicit, https and public", () => {
  assert.equal(resolveReleaseOrigin("https://lifeinuk.info"), "https://lifeinuk.info");
  assert.equal(resolveReleaseOrigin("https://lifeinuk.info/"), "https://lifeinuk.info");
  for (const bad of [undefined, "", "http://lifeinuk.info", "https://localhost", "https://127.0.0.1", "https://192.168.1.5",
    "https://10.0.0.1", "https://site.local", "https://[::1]", "https://lifeinuk.info/en", "not a url"])
    assert.throws(() => resolveReleaseOrigin(bad), String(bad));
});

test("the reference static host follows the hosting contract", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv);
  const server = createStaticHost(dir);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path) => fetch(base + path, { redirect: "manual" });
  try {
    for (const path of ["/en/renting/renting-alpha", "/en/renting/renting-alpha/", "/ur/renting"]) {
      const response = await get(path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("cache-control"), "no-cache", path);
      assert.match(await response.text(), new RegExp(`<link rel="canonical" href="${ORIGIN}${path.replace(/\/$/, "")}"`), path);
    }
    const alias = await get("/renting/renting-alpha?ref=x");
    assert.equal(alias.status, 301);
    assert.equal(alias.headers.get("location"), "/zh-CN/renting/renting-alpha?ref=x");
    const root = await get("/?ref=x");
    assert.equal(root.status, 301);
    assert.equal(root.headers.get("location"), "/zh-CN?ref=x");
    // Home pages are prerendered, with their own canonical.
    for (const path of ["/zh-CN", "/en", "/ur/"]) {
      const response = await get(path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), new RegExp(`<link rel="canonical" href="${ORIGIN}${path.replace(/\/$/, "")}"`), path);
    }
    const spa = await get("/travel");
    assert.equal(spa.status, 200);
    assert.match(await spa.text(), /<div id="root"><\/div>/, "app routes fall back to the SPA shell");
    const asset = await get("/assets/index-abc123.js");
    assert.equal(asset.headers.get("cache-control"), "public, max-age=31536000, immutable");
    assert.equal((await get("/assets/missing.js")).status, 404);
    assert.equal((await get("/%E0%A4%A")).status, 400);
    // App-only routes answer 200 with the shell; unknown paths, unknown or untranslated Guide slugs answer 404 with a noindex page.
    // (The topic page is app-only here: no Family & Visa Guide is published in this inventory.)
    for (const path of ["/ur/travel", "/zh-CN/travel", "/hi/guides", "/family-visa/topics/children-from-previous-relationship", "/en/family-visa/topics/children-from-previous-relationship", "/owner/editorial/batches"]) {
      const response = await get(path);
      assert.equal(response.status, 200, path);
      assert.doesNotMatch(await response.text(), /noindex/, path);
    }
    for (const path of ["/en/renting/no-such-guide", "/hi/renting/renting-alpha", "/renting/no-such-guide", "/en/no-such-section", "/no-such-page", "/en/travel/x", "/family-visa/topics/unknown"]) {
      const response = await get(path);
      assert.equal(response.status, 404, path);
      const html = await response.text();
      assert.match(html, /<meta name="robots" content="noindex"/, path);
      assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json/, path);
      assert.match(html, /<script type="module"/, `${path}: the app still loads and shows its not-found page`);
    }
  } finally {
    server.close();
    rmSync(dir, { recursive: true });
  }
});

test("unknown-path contract: app-only routes are real routes, never prerendered pages; 404.html is noindex", async () => {
  const { spaRoutes, isSpaRoute, NOT_FOUND_FILE, SPA_ROUTES_FILE } = await import("../scripts/seo/routes.mjs");
  const { matchRoute } = await import("../src/router.ts");
  const inv = inventory(BASE);
  const routes = spaRoutes(expectedPages(inv));
  for (const path of routes.paths) assert.notEqual(matchRoute(path).name, "not-found", path);
  // Home pages are prerendered pages; only the root (the shell, redirected by hosts) stays an app route.
  assert.ok(routes.paths.includes("/") && !["/zh-CN", "/en", "/ur"].some((path) => routes.paths.includes(path)));
  for (const path of routes.paths) assert.ok(!["guide", "localized-guide", "hub", "localized-hub"].includes(matchRoute(path).name), `${path} must be prerendered, not app-only`);
  assert.ok(isSpaRoute("/owner/editorial/x", routes) && !isSpaRoute("/owner", routes));
  const dir = await build(inv);
  try {
    assert.deepEqual(JSON.parse(readFileSync(join(dir, SPA_ROUTES_FILE), "utf8")).paths, routes.paths);
    assert.match(readFileSync(join(dir, NOT_FOUND_FILE), "utf8"), /<title>Page not found · Life in UK<\/title>/);
    // A 404 page that could be indexed fails the release.
    writeFileSync(join(dir, NOT_FOUND_FILE), SHELL);
    const { errors } = await validate(dir, inv);
    assert.ok(errors.some((error) => error.includes("404.html: no noindex")), errors.join("\n"));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("Guide JSON-LD: one Article + BreadcrumbList matching the page; hubs carry none; a mismatch fails the release", async () => {
  const inv = inventory(BASE);
  const dir = await build(inv);
  try {
    const html = readFileSync(join(dir, "ur/renting/renting-alpha/index.html"), "utf8");
    const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    const [article, crumbs] = JSON.parse(scripts[0][1])["@graph"];
    assert.equal(article["@type"], "Article");
    assert.equal(article.headline, "renting-alpha title (ur)");
    assert.equal(article.inLanguage, "ur");
    assert.equal(article.url, `${ORIGIN}/ur/renting/renting-alpha`);
    assert.equal(article.dateModified, "2026-11-16T14:25:00Z");
    assert.equal(article.author, undefined);
    assert.equal(article.publisher, undefined);
    assert.deepEqual(crumbs.itemListElement.map((row) => row.item), [`${ORIGIN}/ur`, `${ORIGIN}/ur/renting`, `${ORIGIN}/ur/renting/renting-alpha`]);
    assert.doesNotMatch(readFileSync(join(dir, "ur/renting/index.html"), "utf8"), /application\/ld\+json/);
    // Tampered headline: the release must fail.
    writeFileSync(join(dir, "ur/renting/renting-alpha/index.html"), html.replace('"headline":"renting-alpha title (ur)"', '"headline":"Something else"'));
    const { errors } = await validate(dir, inv);
    assert.ok(errors.some((error) => error.includes("/ur/renting/renting-alpha: Article JSON-LD does not match the page")), errors.join("\n"));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("rebuilding never creates freshness: identical pages from the same inventory, dates only from the published Guide", async () => {
  const inv = inventory(BASE);
  const first = await build(inv);
  await new Promise((resolve) => setTimeout(resolve, 1100)); // a later wall-clock second
  const second = await build(inv);
  try {
    const { readdirSync, statSync } = await import("node:fs");
    const files = (dir, base = dir) => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path, base) : [path.slice(base.length)];
    });
    const list = files(first).filter((path) => path.endsWith(".html") || path.endsWith(".json")).sort();
    assert.deepEqual(files(second).filter((path) => path.endsWith(".html") || path.endsWith(".json")).sort(), list);
    for (const path of list) assert.equal(readFileSync(join(second, path), "utf8"), readFileSync(join(first, path), "utf8"), `${path} changed on rebuild`);
    const html = readFileSync(join(first, "en/renting/renting-alpha/index.html"), "utf8");
    const article = JSON.parse(/<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/.exec(html)[1])["@graph"][0];
    assert.equal(article.dateModified, inv.details.en.get("renting-alpha").updatedAt);
    assert.equal(article.datePublished, inv.details.en.get("renting-alpha").publishedAt);
    assert.match(html, new RegExp(`<time datetime="${article.dateModified}">`), "the visible Updated date is the same value");
  } finally {
    rmSync(first, { recursive: true });
    rmSync(second, { recursive: true });
  }
});
