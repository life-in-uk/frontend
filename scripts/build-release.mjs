// `npm run build:release`: the only build that produces a deployable site.
//
//   PUBLIC_ORIGIN=https://lifeinuk.info API_BASE=http://127.0.0.1:8188 npm run build:release
//
// 1. Requires an explicit public https origin (never localhost).
// 2. Type-checks and builds the app (same as `npm run build`).
// 3. Loads the published inventory from the Guide API (fails if unreachable).
// 4. Prerenders every published Guide and topic hub (scripts/seo/prerender.mjs,
//    the same pipeline as `build:static`) and writes the redirect manifest.
// 5. Writes dist/sitemap.xml from the prerendered pages (scripts/seo/sitemap.mjs).
// 6. Validates the output against the inventory, its own sitemap and the backend sitemap.
// Any failure exits nonzero; it never falls back to an SPA-only build.
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { aliasFor, expectedPages, loadInventory } from "./seo/inventory.mjs";
import { resolveReleaseOrigin } from "./seo/origin.mjs";
import { prerender } from "./seo/prerender.mjs";
import { withRetryOn429 } from "./seo/retry.mjs";
import { writeRedirects } from "./seo/redirects.mjs";
import { renderSitemap, SITEMAP_FILE, sitemapEntries } from "./seo/sitemap.mjs";
import { formatReport, validateSeoOutput } from "./seo/validate.mjs";

const API = (process.env.API_BASE || "http://127.0.0.1:8188").replace(/\/$/, "");
const DIST = resolve(process.env.DIST_DIR || "dist");

/**
 * release/build.json: what was validated, for the deploy script (scripts/edge/deploy-site.mjs),
 * which refuses a dist/ that is not a validated release of the current, committed source.
 */
function writeReleaseMarker(details) {
  const git = (...args) => spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
  const marker = { ...details, distDir: DIST, apiBase: API, commit: git("rev-parse", "HEAD"), dirty: git("status", "--porcelain") !== "", builtAt: new Date().toISOString() };
  mkdirSync(resolve("release"), { recursive: true });
  writeFileSync(resolve("release", "build.json"), JSON.stringify(marker, null, 1) + "\n", "utf8");
}

function run(step, command, args) {
  console.log(`\n▶ ${step}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${step} failed (exit ${result.status})`);
}

/** The backend sitemap must list exactly the canonical pages (no short URLs). */
async function checkSitemap(pages, origin) {
  const errors = [];
  const notes = [];
  const response = await withRetryOn429(() => fetch(`${API}/sitemap.xml`));
  if (!response.ok) return { errors: [`backend sitemap unavailable (HTTP ${response.status})`], notes };
  const locs = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]));
  const paths = new Set(locs.map((url) => url.pathname));
  const want = new Set(pages.map((page) => page.path));
  for (const path of want) if (!paths.has(path)) errors.push(`sitemap is missing ${path}`);
  for (const path of paths) if (!want.has(path)) errors.push(`sitemap lists ${path}, which is not a published canonical page`);
  for (const page of pages) if (aliasFor(page) && paths.has(aliasFor(page))) errors.push(`sitemap lists short URL ${aliasFor(page)}`);
  const origins = new Set(locs.map((url) => url.origin));
  if (origins.size && !(origins.size === 1 && origins.has(origin)))
    notes.push(`backend sitemap uses ${[...origins].join(", ")}; set life-in-uk.public-base-url=${origin} on the deployed backend so the sitemap matches these canonicals`);
  return { errors, notes, count: paths.size };
}

try {
  const origin = resolveReleaseOrigin(process.env.PUBLIC_ORIGIN);
  console.log(`Release build for ${origin} (Guide API ${API})`);
  // A failed build must never leave the previous build's marker next to a new, unvalidated dist/.
  rmSync(resolve("release", "build.json"), { force: true });
  run("Type-check", "npx", ["tsc", "-b"]);
  run("App build", "npx", ["vite", "build"]);
  console.log("\n▶ Load published inventory");
  const inventory = await loadInventory(API);
  console.log("▶ Prerender");
  const { written } = await prerender({ distDir: DIST, origin, inventory });
  const redirects = await writeRedirects(DIST, expectedPages(inventory));
  const entries = sitemapEntries(DIST, origin);
  writeFileSync(resolve(DIST, SITEMAP_FILE), renderSitemap(entries), "utf8");
  console.log(`  ${written.length} HTML files, ${redirects.length} redirects, sitemap of ${entries.length} URLs (${entries.filter((entry) => entry.lastmod).length} with lastmod)`);
  console.log("▶ Validate");
  const { errors, report } = await validateSeoOutput({ distDir: DIST, inventory, origin, release: true });
  // The backend sitemap lists published Guides, hubs, homes and topic pages; the Guides index is frontend-only.
  const sitemap = await checkSitemap(expectedPages(inventory).filter((page) => page.kind !== "index"), origin);
  errors.push(...sitemap.errors);
  // The release's own sitemap lists exactly its canonical pages.
  const listed = new Set(entries.map((entry) => entry.loc));
  for (const page of expectedPages(inventory))
    if (!listed.has(`${origin}${page.path}`)) errors.push(`${SITEMAP_FILE} is missing ${page.path}`);
  if (listed.size !== expectedPages(inventory).length) errors.push(`${SITEMAP_FILE} lists ${listed.size} URLs for ${expectedPages(inventory).length} canonical pages`);
  report.errors = errors.length;
  console.log(formatReport(report, errors));
  if (sitemap.count !== undefined) console.log(`  Backend sitemap URLs: ${sitemap.count}`);
  for (const note of sitemap.notes) console.log(`  ! Deployment prerequisite: ${note}`);
  if (errors.length) {
    console.error("\nbuild:release FAILED: the output in dist/ is not deployable.");
    process.exitCode = 1;
  } else {
    writeReleaseMarker({ origin, pages: expectedPages(inventory).length, redirects: redirects.length, sitemapNotes: sitemap.notes });
    console.log("\nbuild:release OK: dist/ is a validated release artifact.");
  }
} catch (error) {
  console.error(`\nbuild:release FAILED: ${error.message}`);
  process.exitCode = 1;
}
