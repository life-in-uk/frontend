// Publishes a release's sitemap and page list in two phases around its deploy,
// so neither the public sitemap nor the app (which shows only Guides in the page
// list) ever points at a URL that the live edge does not serve (SEO audit F4,
// catalogue consistency):
//
//   node scripts/edge/publish-sitemap.mjs --phase transition --dist dist --bucket <b> --distribution <id> [--execute]
//   node scripts/edge/publish-sitemap.mjs --phase full       --dist dist --bucket <b> --distribution <id> [--execute]
//
// transition (before the deploy switches the edge function): replace both with
//   the pages that both the live release and the new one serve. Pages the new
//   release withdraws leave before they stop being served; new pages wait for
//   phase 2. The live set is read from the public sitemap when the bucket serves
//   it, otherwise from the public page list; with neither, nothing is narrowed.
// full (after the public site has been verified): the release's full sitemap
//   and page list, then a check that the public ones are exactly these.
//
// Both are derived from the release's own pages (scripts/seo/sitemap.mjs), so
// they are correct for any release artifact, including an older one restored
// by a rollback. The workflow runs this file from its own commit, not the
// release's, so older releases get the same phases. Only Node built-ins and the
// sitemap module are imported (no npm install needed).
//
// AWS: s3 PutObject on the two keys and a CloudFront invalidation of them,
// both within the deploy role; the live files are read over HTTPS, not from S3.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RELEASE_PAGES_FILE, releasePageLocs, renderReleasePages, renderSitemap, SITEMAP_FILE, sitemapEntries, sitemapLocs, transitionEntries,
} from "../seo/sitemap.mjs";

export const RELEASE_ORIGIN = "https://lifeinuk.info";
const FILES = {
  [SITEMAP_FILE]: { contentType: "application/xml", render: renderSitemap },
  [RELEASE_PAGES_FILE]: { contentType: "application/json", render: renderReleasePages },
};

function defaultAws(args, { json = true } = {}) {
  const binary = process.env.AWS_CLI || "aws";
  const result = spawnSync(binary, json ? [...args, "--output", "json"] : args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`aws ${args.slice(0, 3).join(" ")} failed (exit ${result.status}): ${(result.stderr || result.stdout).trim().slice(0, 600)}`);
  return json && result.stdout.trim() ? JSON.parse(result.stdout) : result.stdout;
}

/** A public file if the bucket serves it (the release's own); null while the backend serves it, or it does not exist. */
async function readLive(file, { origin, fetchImpl }) {
  const response = await fetchImpl(`${origin}/${file}`, { headers: { "cache-control": "no-cache" } });
  if (!/AmazonS3/i.test(response.headers.get("server") ?? "")) return null;
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`the live ${file} answered ${response.status}`);
  return response.text();
}

/** The page URLs the live release serves, if they can be known: from the bucket's sitemap, else its page list. */
export async function liveLocs({ origin = RELEASE_ORIGIN, fetchImpl = fetch } = {}) {
  const sitemap = await readLive(SITEMAP_FILE, { origin, fetchImpl });
  if (sitemap !== null) return { locs: sitemapLocs(sitemap), from: SITEMAP_FILE, sitemapPublic: true };
  const pages = await readLive(RELEASE_PAGES_FILE, { origin, fetchImpl });
  if (pages !== null) return { locs: releasePageLocs(pages, origin), from: RELEASE_PAGES_FILE, sitemapPublic: false };
  return { locs: null, from: null, sitemapPublic: false };
}

export async function publishSitemap({ phase, distDir = "dist", bucket, distribution, execute = false, log = console.log, aws = defaultAws, fetchImpl = fetch, origin = RELEASE_ORIGIN, waitMs = 30_000, attempts = 10 }) {
  if (phase !== "transition" && phase !== "full") throw new Error("--phase must be transition or full");
  for (const [name, value] of Object.entries({ bucket, distribution })) if (!value) throw new Error(`--${name} is required`);
  const entries = sitemapEntries(resolve(distDir), origin);
  if (entries.length === 0) throw new Error("the release has no canonical pages: refusing to publish an empty sitemap");
  const work = mkdtempSync(join(tmpdir(), "lifeinuk-sitemap-"));
  const upload = (rows) => {
    const bodies = {};
    for (const [file, { contentType, render }] of Object.entries(FILES)) {
      const path = join(work, file);
      bodies[file] = render(rows);
      writeFileSync(path, bodies[file], "utf8");
      const args = ["s3", "cp", path, `s3://${bucket}/${file}`, "--only-show-errors", "--content-type", contentType, "--cache-control", "no-cache"];
      if (execute) aws(args, { json: false });
      else log(`  aws ${args.join(" ")}`);
    }
    const invalidate = ["cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", ...Object.keys(FILES).map((file) => `/${file}`)];
    if (execute) log(`  invalidation ${aws(invalidate).Invalidation.Id}`);
    else log(`  aws ${invalidate.join(" ")}`);
    return bodies;
  };
  try {
    if (phase === "transition") {
      log("\n▶ Sitemap and page list, phase 1: only pages that the live release and this one both serve");
      const live = await liveLocs({ origin, fetchImpl });
      if (live.locs === null) {
        log("  no live sitemap or page list in the bucket: nothing to narrow");
        return { phase, urls: null };
      }
      const transition = transitionEntries(live.locs, entries);
      log(`  ${transition.length} page(s) served by both (${live.locs.size} live from ${live.from}, ${entries.length} in this release)`);
      const bodies = upload(transition);
      return { phase, urls: transition.length, xml: bodies[SITEMAP_FILE], pages: bodies[RELEASE_PAGES_FILE] };
    }
    log(`\n▶ Sitemap and page list, phase 2: publish ${entries.length} pages (${entries.filter((entry) => entry.lastmod).length} with lastmod)`);
    const bodies = upload(entries);
    const result = { phase, urls: entries.length, xml: bodies[SITEMAP_FILE], pages: bodies[RELEASE_PAGES_FILE] };
    if (!execute) return result;
    const want = new Set(entries.map((entry) => entry.loc));
    const same = (locs) => locs.size === want.size && [...want].every((loc) => locs.has(loc));
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const pages = await readLive(RELEASE_PAGES_FILE, { origin, fetchImpl });
      const sitemap = await readLive(SITEMAP_FILE, { origin, fetchImpl });
      const pagesOk = pages !== null && same(releasePageLocs(pages, origin));
      const sitemapOk = sitemap === null || same(sitemapLocs(sitemap));
      if (pagesOk && sitemapOk) {
        log(`  ✓ the public page list lists exactly the ${want.size} pages of this release`);
        log(sitemap === null
          ? "  the public sitemap is still served by the backend (CloudFront /sitemap.xml behaviour not switched): not compared"
          : `  ✓ the public sitemap lists exactly the ${want.size} URLs of this release`);
        return { ...result, public: sitemap === null ? "backend" : "bucket" };
      }
      if (attempt < attempts) await new Promise((r) => setTimeout(r, waitMs));
    }
    throw new Error("the public sitemap or page list does not match this release after the invalidation");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = { execute: false };
  const argv = process.argv.slice(2);
  try {
    for (let i = 0; i < argv.length; i++) {
      const name = argv[i];
      if (name === "--execute") args.execute = true;
      else if (name === "--phase") args.phase = argv[++i];
      else if (name === "--dist") args.distDir = argv[++i];
      else if (name === "--bucket") args.bucket = argv[++i];
      else if (name === "--distribution") args.distribution = argv[++i];
      else throw new Error(`unknown option ${name}`);
    }
    await publishSitemap(args);
  } catch (error) {
    console.error(`publish-sitemap FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
