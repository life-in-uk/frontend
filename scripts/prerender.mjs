// Writes crawlable static HTML for every published Guide and topic hub into
// the built site (dist/), using the published Guide API as the only content
// source. Run after `vite build` (see `npm run build:static`); needs the local
// backend. Each page is the built index.html with the article inside #root,
// so the React app still starts and replaces it.
//
//   API_BASE=http://127.0.0.1:8188 npm run build:static
//
// The public origin for canonical URLs is read from the backend's robots.txt
// (the same configured origin the sitemap uses), unless PUBLIC_ORIGIN is set.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { GUIDE_DOMAINS } from "../src/guides/domains.ts";
import { GUIDE_LOCALES, localizedGuidePath } from "../src/guides/locales.ts";
import { fillTemplate, STATIC_HUB_DOMAINS, staticGuidePage, staticHubPage } from "../src/seo/staticPages.ts";

const API = (process.env.API_BASE || "http://127.0.0.1:8188").replace(/\/$/, "");
const DIST = resolve(process.env.DIST_DIR || "dist");

async function getJson(path) {
  const response = await fetch(API + path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function publicOrigin() {
  if (process.env.PUBLIC_ORIGIN) return new URL(process.env.PUBLIC_ORIGIN).origin;
  const response = await fetch(`${API}/robots.txt`);
  const match = response.ok && /Sitemap:\s*(\S+)\/sitemap\.xml/.exec(await response.text());
  if (!match) throw new Error("No public origin: set life-in-uk.public-base-url on the backend or PUBLIC_ORIGIN");
  return new URL(match[1]).origin;
}

const domainByCategory = new Map(Object.values(GUIDE_DOMAINS).map((domain) => [domain.category, domain.id]));

async function write(path, html, written) {
  const file = join(DIST, path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
  written.push(path);
}

const template = await readFile(join(DIST, "index.html"), "utf8");
if (!template.includes('<div id="root"></div>')) throw new Error("dist/index.html is not a fresh build; run vite build first");
const origin = await publicOrigin();

// Published lists per locale (missing translations are omitted by the API).
const lists = {};
for (const locale of GUIDE_LOCALES) lists[locale] = await getJson(locale === "zh-CN" ? "/api/guides" : `/api/guides/locales/${locale}`);
const availability = new Map();
for (const locale of GUIDE_LOCALES)
  for (const guide of lists[locale]) availability.set(guide.slug, [...(availability.get(guide.slug) ?? []), locale]);

const written = [];
const details = new Map(GUIDE_LOCALES.map((locale) => [locale, []]));
let guides = 0;
for (const locale of GUIDE_LOCALES) {
  for (const meta of lists[locale]) {
    const domainId = domainByCategory.get(meta.category);
    if (!domainId) continue;
    const detail = locale === "zh-CN"
      ? await getJson(`/api/guides/${encodeURIComponent(meta.slug)}`)
      : (await getJson(`/api/guides/${encodeURIComponent(meta.slug)}/locales/${locale}`)).guide;
    details.get(locale).push(detail);
    const page = staticGuidePage({ origin, locale, domainId, guide: detail, published: lists[locale], availableLocales: availability.get(meta.slug) });
    const html = fillTemplate(template, page);
    await write(localizedGuidePath(locale, domainId, meta.slug), html, written);
    // zh-CN keeps its original in-app routes (/renting/…); same page, same canonical.
    if (locale === "zh-CN") await write(`/${domainId}/${meta.slug}`, html, written);
    guides++;
  }
}

let hubs = 0;
for (const domainId of STATIC_HUB_DOMAINS) {
  const category = GUIDE_DOMAINS[domainId].category;
  const available = GUIDE_LOCALES.filter((locale) => lists[locale].some((guide) => guide.category === category));
  for (const locale of available) {
    const sectionDetails = details.get(locale).filter((guide) => guide.category === category);
    const page = staticHubPage({ origin, locale, domainId, published: lists[locale], availableLocales: available, details: sectionDetails });
    if (!page) continue;
    const html = fillTemplate(template, page);
    await write(localizedGuidePath(locale, domainId), html, written);
    if (locale === "zh-CN") await write(`/${domainId}`, html, written);
    hubs++;
  }
}

await writeFile(join(DIST, "prerender-manifest.json"), JSON.stringify({ origin, guides, hubs, paths: written.sort() }, null, 1));
console.log(`prerendered ${guides} Guide pages and ${hubs} hub pages (${written.length} files) for ${origin}`);
