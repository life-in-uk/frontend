// Deterministic validation of the prerendered output against the published
// inventory. It reads the generated files from disk (not the generator's own
// list) and reports every problem; a release build fails on any error.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GUIDE_LOCALE_HREFLANG, GUIDE_LOCALE_LANG } from "../../src/guides/locales.ts";
import { aliasFor, expectedPages, HOME_PATHS, ROOT_ALIAS } from "./inventory.mjs";
import { isPrivateHost } from "./origin.mjs";
import { SPA_ROOT } from "./prerender.mjs";
import { REDIRECTS_FILE } from "./redirects.mjs";
import { isSpaRoute, NOT_FOUND_FILE, SPA_ROUTES_FILE } from "./routes.mjs";

/** Minimum visible text of a page's <main> (characters, whitespace collapsed). */
const MIN_TEXT = { guide: 200, hub: 80, home: 200, topic: 200, index: 80, about: 400 };

const decode = (value) => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const textOf = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Every dist/<path>/index.html except the app shell. */
async function generatedPaths(distDir, dir = "", found = []) {
  for (const entry of await readdir(join(distDir, dir), { withFileTypes: true })) {
    if (!entry.isDirectory() || (dir === "" && entry.name === "assets")) continue;
    const sub = `${dir}/${entry.name}`;
    if (existsSync(join(distDir, sub, "index.html"))) found.push(sub);
    await generatedPaths(distDir, sub, found);
  }
  return found;
}

function parsePage(html) {
  const root = html.split('<div id="root">')[1] ?? "";
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(root)?.[1] ?? "";
  return {
    root,
    main,
    lang: /<html lang="([^"]*)"/.exec(html)?.[1],
    dir: /<html lang="[^"]*" dir="([^"]*)"/.exec(html)?.[1],
    title: decode(/<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? ""),
    description: decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? ""),
    canonicals: [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => decode(m[1])),
    alternates: [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${decode(m[2])}`).sort(),
    h1: [...root.matchAll(/<h1>([\s\S]*?)<\/h1>/g)].map((m) => textOf(m[1])),
    links: [...root.matchAll(/href="([^"]*)"/g)].map((m) => decode(m[1])),
    loadsApp: /<script type="module"[^>]*src="\/assets\//.test(html),
  };
}

/**
 * Validates dist against the inventory. Options: origin (expected canonical
 * origin), release (forbid local/private origins; require the redirect
 * manifest). Returns { errors, report }.
 */
/** The graph's Organization is exactly the site's name and home URL: no logo, contact, address or profiles. */
function organizationOnly(graph, origin) {
  const orgs = (graph ?? []).filter((node) => node["@type"] === "Organization");
  return orgs.length === 1 && JSON.stringify(Object.keys(orgs[0]).sort()) === JSON.stringify(["@id", "@type", "name", "url"])
    && orgs[0]["@id"] === `${origin}/#organization` && orgs[0].name === "Life in UK" && orgs[0].url === `${origin}/`;
}

export async function validateSeoOutput({ distDir, inventory, origin, release = false }) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const pages = expectedPages(inventory);
  const expected = new Map(pages.map((page) => [page.path, page]));
  const aliases = new Map(pages.map((page) => [aliasFor(page), page]).filter(([alias]) => alias));

  // The app shell must be a real build, and must not be the only output.
  const shellPath = join(distDir, "index.html");
  if (!existsSync(shellPath)) return { errors: ["dist/index.html is missing (no app build)"], report: null };
  const shell = await readFile(shellPath, "utf8");
  if (!shell.includes(SPA_ROOT)) fail("dist/index.html is not the app shell (no empty #root)");
  const generated = await generatedPaths(distDir);
  if (pages.length > 0 && generated.length === 0) fail("SPA-only output: no prerendered pages were generated");

  if (release) {
    const url = new URL(origin);
    if (url.protocol !== "https:" || isPrivateHost(url.hostname)) fail(`release origin must be public https, got ${origin}`);
  }

  // Nothing generated that the inventory does not require (catches fallback or stale pages).
  for (const path of generated)
    if (!expected.has(path) && !aliases.has(path)) fail(`${path}: unexpected page (not a published Guide or hub in this locale)`);

  const routesFile = join(distDir, SPA_ROUTES_FILE);
  const routes = existsSync(routesFile) ? JSON.parse(await readFile(routesFile, "utf8")) : null;
  const canonicalOwners = new Map();
  const counts = { guide: 0, hub: 0, home: 0, topic: 0, index: 0, about: 0, alias: 0 };
  // Pages that link to each page (server HTML, not counting itself): every page needs one.
  const inbound = new Map(pages.map((page) => [page.path, new Set()]));
  for (const page of pages) {
    const file = join(distDir, page.path, "index.html");
    if (!existsSync(file)) {
      fail(`${page.path}: missing ${page.kind} page`);
      continue;
    }
    const html = await readFile(file, "utf8");
    const parsed = parsePage(html);
    const where = page.path;
    if (!parsed.root.startsWith('<header class="static-header">')) {
      fail(`${where}: no prerendered content (SPA shell only)`);
      continue;
    }
    counts[page.kind]++;
    if (parsed.lang !== GUIDE_LOCALE_LANG[page.locale]) fail(`${where}: html lang ${parsed.lang}, expected ${GUIDE_LOCALE_LANG[page.locale]}`);
    if (parsed.dir !== (page.locale === "ur" ? "rtl" : "ltr")) fail(`${where}: html dir ${parsed.dir}`);
    if (parsed.h1.length !== 1 || !parsed.h1[0]) fail(`${where}: expected exactly one non-empty H1, found ${parsed.h1.length}`);
    if (page.kind === "guide" && parsed.h1[0] !== page.title) fail(`${where}: H1 is not the published ${page.locale} title`);
    if (page.kind === "guide" && !parsed.title.startsWith(page.title)) fail(`${where}: <title> is not the published ${page.locale} title`);
    if (!parsed.description.trim()) fail(`${where}: empty meta description`);
    const text = textOf(parsed.main);
    if (text.length < MIN_TEXT[page.kind]) fail(`${where}: too little content (${text.length} characters)`);
    if (page.kind === "guide" && !text.includes(textOf(page.summary))) fail(`${where}: published summary missing`);
    if (!parsed.loadsApp) fail(`${where}: the app script is missing`);
    // Canonical: exactly one, on the expected origin and path, unique across pages.
    const canonical = `${origin}${page.path}`;
    if (parsed.canonicals.length !== 1 || parsed.canonicals[0] !== canonical) fail(`${where}: canonical ${parsed.canonicals.join(", ") || "missing"}, expected ${canonical}`);
    if (canonicalOwners.has(parsed.canonicals[0])) fail(`${where}: duplicate canonical shared with ${canonicalOwners.get(parsed.canonicals[0])}`);
    else canonicalOwners.set(parsed.canonicals[0], where);
    // hreflang: exactly the locales where this page is published, plus x-default → zh-CN when it exists.
    const want = page.alternates.map((alt) => `${GUIDE_LOCALE_HREFLANG[alt.locale]} ${origin}${alt.path}`);
    const zh = page.alternates.find((alt) => alt.locale === "zh-CN");
    if (zh) want.push(`x-default ${origin}${zh.path}`);
    if (JSON.stringify(parsed.alternates) !== JSON.stringify(want.sort())) fail(`${where}: hreflang alternates do not match the published locales`);
    // Absolute URLs in head and page: never a local or private host in a release.
    if (release)
      for (const href of [...parsed.canonicals, ...parsed.alternates.map((row) => row.split(" ")[1]), ...parsed.links.filter((link) => /^https?:/.test(link))]) {
        try {
          if (isPrivateHost(new URL(href).hostname)) fail(`${where}: local or private URL ${href}`);
        } catch {
          fail(`${where}: invalid URL ${href}`);
        }
      }
    // Internal links resolve to a page or a built file, and never to a zh-CN short URL (a 301 on the public host).
    for (const href of parsed.links) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const target = href.split(/[?#]/)[0].replace(/(.)\/$/, "$1") || "/";
      if (aliases.has(target)) fail(`${where}: internal link ${href} is a redirecting short URL; link ${aliases.get(target).path}`);
      else if (!(expected.has(target) || HOME_PATHS.has(target) || (routes && isSpaRoute(target, routes)) || existsSync(join(distDir, target))))
        fail(`${where}: internal link ${href} does not resolve`);
    }
    for (const href of parsed.links) {
      const target = href.split(/[?#]/)[0].replace(/(.)\/$/, "$1");
      if (target !== page.path) inbound.get(target)?.add(page.path);
    }
    // Every other language version of the page is a plain link (not only an hreflang annotation).
    for (const alt of page.alternates)
      if (alt.locale !== page.locale && !parsed.links.includes(alt.path)) fail(`${where}: no link to its ${alt.locale} version ${alt.path}`);
    // zh-CN short URL: same page, canonical on /zh-CN/…. The root has no alias page (it is the app shell; hosts redirect it).
    const alias = aliasFor(page);
    if (alias && alias !== ROOT_ALIAS) {
      const aliasFile = join(distDir, alias, "index.html");
      if (!existsSync(aliasFile)) fail(`${alias}: missing zh-CN short URL page`);
      else {
        const aliasCanonicals = parsePage(await readFile(aliasFile, "utf8")).canonicals;
        if (aliasCanonicals.length !== 1 || aliasCanonicals[0] !== canonical) fail(`${alias}: canonical must point to ${canonical}`);
        else counts.alias++;
      }
    }
  }

  // Unknown paths: a noindex 404 page with no canonical, and an app-only route list that never shadows a published page.
  const notFoundFile = join(distDir, NOT_FOUND_FILE);
  if (!existsSync(notFoundFile)) fail(`${NOT_FOUND_FILE} missing`);
  else {
    const html = await readFile(notFoundFile, "utf8");
    if (!/<meta name="robots" content="noindex"/.test(html)) fail(`${NOT_FOUND_FILE}: no noindex`);
    if (/rel="canonical"|hreflang=|application\/ld\+json/.test(html)) fail(`${NOT_FOUND_FILE}: must not carry a canonical, hreflang or structured data`);
    if (!parsePage(html).loadsApp) fail(`${NOT_FOUND_FILE}: the app script is missing`);
  }
  for (const [path, from] of inbound)
    if (from.size === 0 && existsSync(join(distDir, path, "index.html"))) fail(`${path}: orphan page (no other prerendered page links to it)`);
  if (!routes) fail(`${SPA_ROUTES_FILE} missing`);
  else {
    for (const home of HOME_PATHS)
      if (!routes.paths?.includes(home) && !expected.has(home)) fail(`${SPA_ROUTES_FILE}: home page ${home} is neither prerendered nor an app route`);
    for (const path of routes.paths ?? [])
      if (expected.has(path) || (aliases.has(path) && path !== ROOT_ALIAS)) fail(`${SPA_ROUTES_FILE}: ${path} is a prerendered page`);
  }

  // Guide structured data: one JSON-LD graph that matches the page (structuredData.ts).
  for (const page of pages.filter((row) => row.kind === "guide")) {
    const file = join(distDir, page.path, "index.html");
    if (!existsSync(file)) continue;
    const html = await readFile(file, "utf8");
    const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (scripts.length !== 1) {
      fail(`${page.path}: expected one JSON-LD script, found ${scripts.length}`);
      continue;
    }
    let graph;
    try {
      graph = JSON.parse(scripts[0])["@graph"];
    } catch {
      fail(`${page.path}: JSON-LD is not valid JSON`);
      continue;
    }
    const article = graph?.find((node) => node["@type"] === "Article");
    const crumbs = graph?.find((node) => node["@type"] === "BreadcrumbList")?.itemListElement ?? [];
    const canonical = `${origin}${page.path}`;
    const parsed = parsePage(html);
    if (!article || article.headline !== page.title || article.url !== canonical || article.mainEntityOfPage !== canonical
      || article.inLanguage !== GUIDE_LOCALE_LANG[page.locale] || article.description !== parsed.description
      || !article.datePublished || !article.dateModified || article.author || article.reviewedBy
      || article.publisher?.["@id"] !== `${origin}/#organization`)
      fail(`${page.path}: Article JSON-LD does not match the page`);
    if (!organizationOnly(graph, origin)) fail(`${page.path}: the Organization must be the site's name and URL only`);
    if (crumbs.length !== 3 || crumbs[2].item !== canonical || crumbs[2].name !== page.title || crumbs.some((row, index) => row.position !== index + 1 || !row.item?.startsWith(origin)))
      fail(`${page.path}: BreadcrumbList JSON-LD does not match the visible breadcrumb`);
    if (!html.includes(`datetime="${article?.dateModified}"`)) fail(`${page.path}: dateModified is not the date the page shows`);
  }
  // About pages: an AboutPage about (and published by) the site's Organization.
  for (const page of pages.filter((row) => row.kind === "about")) {
    const file = join(distDir, page.path, "index.html");
    if (!existsSync(file)) continue;
    const html = await readFile(file, "utf8");
    const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    let graph;
    try { graph = scripts.length === 1 ? JSON.parse(scripts[0])["@graph"] : undefined; } catch { graph = undefined; }
    const about = graph?.find((node) => node["@type"] === "AboutPage");
    const parsed = parsePage(html);
    const org = `${origin}/#organization`;
    if (!about || about.url !== `${origin}${page.path}` || about.name !== parsed.h1[0] || about.description !== parsed.description
      || about.inLanguage !== GUIDE_LOCALE_LANG[page.locale] || about.about?.["@id"] !== org || about.publisher?.["@id"] !== org || !organizationOnly(graph, origin))
      fail(`${page.path}: AboutPage JSON-LD does not match the page`);
  }
  for (const page of pages.filter((row) => row.kind !== "guide" && row.kind !== "about")) {
    const file = join(distDir, page.path, "index.html");
    if (existsSync(file) && /application\/ld\+json/.test(await readFile(file, "utf8"))) fail(`${page.path}: only Guide and About pages carry structured data`);
  }

  let redirects = 0;
  if (release) {
    const manifest = join(distDir, REDIRECTS_FILE);
    if (!existsSync(manifest)) fail(`${REDIRECTS_FILE} missing`);
    else {
      const rows = JSON.parse(await readFile(manifest, "utf8")).redirects ?? [];
      redirects = rows.length;
      const byFrom = new Map(rows.map((row) => [row.from, row]));
      for (const [alias, page] of aliases) {
        const row = byFrom.get(alias);
        if (!row || row.to !== page.path || row.status !== 301) fail(`${REDIRECTS_FILE}: ${alias} must 301 to ${page.path}`);
      }
      if (rows.length !== aliases.size) fail(`${REDIRECTS_FILE}: ${rows.length} redirects for ${aliases.size} short URLs`);
    }
  }

  const report = {
    origin,
    release,
    expected: {
      guides: pages.filter((p) => p.kind === "guide").length, hubs: pages.filter((p) => p.kind === "hub").length,
      homes: pages.filter((p) => p.kind === "home").length, topics: pages.filter((p) => p.kind === "topic").length,
      indexes: pages.filter((p) => p.kind === "index").length, abouts: pages.filter((p) => p.kind === "about").length, aliases: aliases.size,
    },
    valid: counts,
    generatedFiles: generated.length,
    redirects,
    errors: errors.length,
  };
  return { errors, report };
}

export function formatReport(report, errors) {
  const lines = [
    `SEO output ${errors.length === 0 ? "VALID" : "INVALID"} (${report?.release ? "release" : "local"} mode, origin ${report?.origin})`,
  ];
  if (report)
    lines.push(
      `  Guide pages: ${report.valid.guide}/${report.expected.guides}   Topic hubs: ${report.valid.hub}/${report.expected.hubs}   ` +
        `Home pages: ${report.valid.home}/${report.expected.homes}   Family Visa topic pages: ${report.valid.topic}/${report.expected.topics}   ` +
        `Guide indexes: ${report.valid.index}/${report.expected.indexes ?? 0}   About pages: ${report.valid.about ?? 0}/${report.expected.abouts ?? 0}   ` +
        `Canonical URLs: ${report.expected.guides + report.expected.hubs + report.expected.homes + report.expected.topics + (report.expected.indexes ?? 0) + (report.expected.abouts ?? 0)}   ` +
        `zh-CN short URLs: ${report.valid.alias}/${report.expected.aliases - 1} pages + root redirect` +
        (report.release ? `   Redirects: ${report.redirects}` : "") + `   HTML files: ${report.generatedFiles}`,
    );
  for (const error of errors.slice(0, 50)) lines.push(`  ✗ ${error}`);
  if (errors.length > 50) lines.push(`  … and ${errors.length - 50} more`);
  return lines.join("\n");
}
