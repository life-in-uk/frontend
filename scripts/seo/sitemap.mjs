// The sitemap of a release build, derived from the build's own pages (SEO
// audit F4/F9). Every canonical prerendered page is listed once, with the
// hreflang alternates the page itself declares and, for Guides, <lastmod> from
// the dateModified of the page's Article structured data (the date the page
// shows). Hubs and homes carry no <lastmod>: no single date describes them.
//
// Because the sitemap is read from the HTML that is deployed, any release
// artifact (including an older one redeployed for a rollback) yields exactly
// the sitemap of the pages it serves; nothing else has to be kept in step.
//
// Deployment (scripts/edge/deploy-site.mjs) publishes it in two phases so the
// public sitemap never lists a URL the edge does not serve:
//   1. Before the new edge function goes live: only URLs that both the release
//      being replaced and the new one serve (transitionEntries).
//   2. After the public site has been verified: the full sitemap.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const SITEMAP_FILE = "sitemap.xml";
/**
 * The release's page list for the app (catalogue consistency): the same pages as
 * the sitemap, as paths. The app shows a Guide from an API list only if its page
 * is in this list, so it never links a page the live release does not serve.
 */
export const RELEASE_PAGES_FILE = "release-pages.json";

const decode = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const encode = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function pageFiles(distDir) {
  const files = [];
  const walk = (dir, path) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "assets") continue;
      const child = `${path}/${entry.name}`;
      const file = join(dir, entry.name, "index.html");
      if (existsSync(file)) files.push({ path: child, file });
      walk(join(dir, entry.name), child);
    }
  };
  walk(distDir, "");
  return files;
}

/** The Article dateModified in a page's JSON-LD, if it has one. */
function dateModified(html) {
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(match[1]);
      for (const item of data["@graph"] ?? [data]) if (item["@type"] === "Article" && typeof item.dateModified === "string") return item.dateModified;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * The sitemap entries of a build: each page whose canonical is its own URL on
 * `origin` (zh-CN short-URL copies and noindex pages are left out), sorted by URL.
 */
export function sitemapEntries(distDir, origin) {
  const entries = [];
  for (const { path, file } of pageFiles(distDir)) {
    const html = readFileSync(file, "utf8");
    const head = html.split("</head>")[0];
    const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!canonical || decode(canonical) !== `${origin}${path}`) continue;
    if (/<meta name="robots" content="[^"]*noindex/.test(head)) continue;
    const alternates = [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ hreflang: m[1], href: decode(m[2]) }));
    entries.push({ loc: `${origin}${path}`, lastmod: dateModified(html), alternates });
  }
  return entries.sort((a, b) => (a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0));
}

export function renderSitemap(entries) {
  const urls = entries.map((entry) => {
    const parts = [`<loc>${encode(entry.loc)}</loc>`];
    if (entry.lastmod) parts.push(`<lastmod>${encode(entry.lastmod)}</lastmod>`);
    for (const alt of entry.alternates) parts.push(`<xhtml:link rel="alternate" hreflang="${encode(alt.hreflang)}" href="${encode(alt.href)}"/>`);
    return `  <url>${parts.join("")}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}${urls.length ? "\n" : ""}</urlset>\n`;
}

/** The URLs a sitemap lists. */
export function sitemapLocs(xml) {
  return new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1])));
}

/**
 * The sitemap to publish while one release replaces another: only URLs both
 * serve, and only alternates among them. Pages new in this release join after
 * the switch; pages it withdraws leave before it.
 */
export function transitionEntries(previousLocs, entries) {
  const both = new Set(entries.map((entry) => entry.loc).filter((loc) => previousLocs.has(loc)));
  return entries
    .filter((entry) => both.has(entry.loc))
    .map((entry) => ({ ...entry, alternates: entry.alternates.filter((alt) => both.has(alt.href)) }));
}

/** The release page list for a set of sitemap entries. */
export function renderReleasePages(entries) {
  return `${JSON.stringify({ pages: entries.map((entry) => new URL(entry.loc).pathname) })}\n`;
}

/** The page URLs of a release page list, on `origin`. */
export function releasePageLocs(json, origin) {
  const data = JSON.parse(json);
  if (!Array.isArray(data?.pages)) throw new Error(`${RELEASE_PAGES_FILE} has no pages array`);
  return new Set(data.pages.map((path) => `${origin}${path}`));
}

/** The meta element that binds every HTML file of a release to its embedded page list. */
export const RELEASE_PAGES_META = "release-pages";

function htmlFiles(distDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== "assets") walk(file); }
      else if (entry.name.endsWith(".html")) files.push(file);
    }
  };
  walk(distDir);
  return files;
}

/**
 * Embeds the release's page list in the release: an immutable, content-hashed
 * asset (/assets/release-pages-<hash>.json), named by a <meta> in every HTML
 * file of dist/ (pages, the app shell, the 404 page). A page therefore always
 * knows the page set of the release that served it, also in an open tab after
 * a later deploy (earlier assets stay available for days). Idempotent.
 */
export function embedReleasePages(distDir, entries) {
  const body = renderReleasePages(entries);
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const url = `/assets/release-pages-${hash}.json`;
  mkdirSync(join(distDir, "assets"), { recursive: true });
  writeFileSync(join(distDir, url.slice(1)), body, "utf8");
  const tag = `<meta name="${RELEASE_PAGES_META}" content="${url}">`;
  for (const file of htmlFiles(distDir)) {
    const html = readFileSync(file, "utf8").replace(/\s*<meta name="release-pages" content="[^"]*">/g, "");
    if (!html.includes("<head>")) throw new Error(`${relative(distDir, file).split(sep).join("/")}: no <head>`);
    writeFileSync(file, html.replace("<head>", `<head>\n    ${tag}`), "utf8");
  }
  return url;
}

/** Problems with the embedded page list of a release: every HTML file names the same list, and it lists exactly `paths`. */
export function checkEmbeddedReleasePages(distDir, paths) {
  const errors = [];
  const urls = new Map();
  for (const file of htmlFiles(distDir)) {
    const found = [...readFileSync(file, "utf8").matchAll(/<meta name="release-pages" content="([^"]*)">/g)].map((m) => m[1]);
    const where = relative(distDir, file).split(sep).join("/");
    if (found.length !== 1) errors.push(`${where}: expected one release-pages meta, found ${found.length}`);
    else urls.set(found[0], [...(urls.get(found[0]) ?? []), where]);
  }
  if (urls.size > 1) errors.push(`HTML files name ${urls.size} different release page lists`);
  for (const url of urls.keys()) {
    const file = join(distDir, url.replace(/^\//, ""));
    if (!/^\/assets\/release-pages-[0-9a-f]{16}\.json$/.test(url) || !existsSync(file)) { errors.push(`${url}: missing`); continue; }
    const listed = JSON.parse(readFileSync(file, "utf8")).pages;
    const want = [...paths].sort();
    if (JSON.stringify([...listed].sort()) !== JSON.stringify(want)) errors.push(`${url}: does not list exactly the ${want.length} canonical pages`);
  }
  return errors;
}
