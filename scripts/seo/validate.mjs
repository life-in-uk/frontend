// Deterministic validation of the prerendered output against the published
// inventory. It reads the generated files from disk (not the generator's own
// list) and reports every problem; a release build fails on any error.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GUIDE_LOCALE_HREFLANG, GUIDE_LOCALE_LANG } from "../../src/guides/locales.ts";
import { aliasFor, expectedPages, HOME_PATHS } from "./inventory.mjs";
import { isPrivateHost } from "./origin.mjs";
import { SPA_ROOT } from "./prerender.mjs";
import { REDIRECTS_FILE } from "./redirects.mjs";

/** Minimum visible text of a page's <main> (characters, whitespace collapsed). */
const MIN_TEXT = { guide: 200, hub: 80 };

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

  const canonicalOwners = new Map();
  const counts = { guide: 0, hub: 0, alias: 0 };
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
    // Internal links resolve to a page, a home page, an alias or a built file.
    for (const href of parsed.links) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const target = href.split(/[?#]/)[0].replace(/(.)\/$/, "$1") || "/";
      if (!(expected.has(target) || aliases.has(target) || HOME_PATHS.has(target) || existsSync(join(distDir, target))))
        fail(`${where}: internal link ${href} does not resolve`);
    }
    // zh-CN short URL: same page, canonical on /zh-CN/….
    const alias = aliasFor(page);
    if (alias) {
      const aliasFile = join(distDir, alias, "index.html");
      if (!existsSync(aliasFile)) fail(`${alias}: missing zh-CN short URL page`);
      else {
        const aliasCanonicals = parsePage(await readFile(aliasFile, "utf8")).canonicals;
        if (aliasCanonicals.length !== 1 || aliasCanonicals[0] !== canonical) fail(`${alias}: canonical must point to ${canonical}`);
        else counts.alias++;
      }
    }
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
    expected: { guides: pages.filter((p) => p.kind === "guide").length, hubs: pages.filter((p) => p.kind === "hub").length, aliases: aliases.size },
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
        `Canonical URLs: ${report.expected.guides + report.expected.hubs}   zh-CN short URLs: ${report.valid.alias}/${report.expected.aliases}` +
        (report.release ? `   Redirects: ${report.redirects}` : "") + `   HTML files: ${report.generatedFiles}`,
    );
  for (const error of errors.slice(0, 50)) lines.push(`  ✗ ${error}`);
  if (errors.length > 50) lines.push(`  … and ${errors.length - 50} more`);
  return lines.join("\n");
}
