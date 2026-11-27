// Publishes a release's sitemap in two phases around its deploy, so the public
// sitemap never lists a URL that the live edge does not serve (SEO audit F4):
//
//   node scripts/edge/publish-sitemap.mjs --phase transition --dist dist --bucket <b> --distribution <id> [--execute]
//   node scripts/edge/publish-sitemap.mjs --phase full       --dist dist --bucket <b> --distribution <id> [--execute]
//
// transition (before the deploy switches the edge function): if the public
//   sitemap is served from the bucket, replace it with the URLs that both the
//   live release and the new one serve. Pages the new release withdraws leave
//   the sitemap before they stop being served; new pages wait for phase 2.
// full (after the public site has been verified): the release's full sitemap,
//   then a check that the public one is exactly it.
//
// The sitemap is derived from the release's own pages (scripts/seo/sitemap.mjs),
// so it is correct for any release artifact, including an older one restored
// by a rollback. The workflow runs this file from its own commit, not the
// release's, so older releases get the same two phases. Only Node built-ins
// and the sitemap module are imported (no npm install needed).
//
// AWS: s3 PutObject on sitemap.xml and a CloudFront invalidation of it, both
// within the deploy role; the live sitemap is read over HTTPS, not from S3.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSitemap, SITEMAP_FILE, sitemapEntries, sitemapLocs, transitionEntries } from "../seo/sitemap.mjs";

export const RELEASE_ORIGIN = "https://lifeinuk.info";
const CONTENT_TYPE = "application/xml";
const CACHE_CONTROL = "no-cache";

function defaultAws(args, { json = true } = {}) {
  const binary = process.env.AWS_CLI || "aws";
  const result = spawnSync(binary, json ? [...args, "--output", "json"] : args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`aws ${args.slice(0, 3).join(" ")} failed (exit ${result.status}): ${(result.stderr || result.stdout).trim().slice(0, 600)}`);
  return json && result.stdout.trim() ? JSON.parse(result.stdout) : result.stdout;
}

/** The public sitemap if it is served from the bucket (the release's own); null while the backend serves it or none exists. */
export async function readLiveSitemap({ origin = RELEASE_ORIGIN, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${origin}/${SITEMAP_FILE}`, { headers: { "cache-control": "no-cache" } });
  if (!/AmazonS3/i.test(response.headers.get("server") ?? "")) return null;
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`the live sitemap answered ${response.status}`);
  return response.text();
}

export async function publishSitemap({ phase, distDir = "dist", bucket, distribution, execute = false, log = console.log, aws = defaultAws, fetchImpl = fetch, origin = RELEASE_ORIGIN, waitMs = 30_000, attempts = 10 }) {
  if (phase !== "transition" && phase !== "full") throw new Error("--phase must be transition or full");
  for (const [name, value] of Object.entries({ bucket, distribution })) if (!value) throw new Error(`--${name} is required`);
  const entries = sitemapEntries(resolve(distDir), origin);
  if (entries.length === 0) throw new Error("the release has no canonical pages: refusing to publish an empty sitemap");
  const work = mkdtempSync(join(tmpdir(), "lifeinuk-sitemap-"));
  const upload = (xml) => {
    const file = join(work, SITEMAP_FILE);
    writeFileSync(file, xml, "utf8");
    const args = ["s3", "cp", file, `s3://${bucket}/${SITEMAP_FILE}`, "--only-show-errors", "--content-type", CONTENT_TYPE, "--cache-control", CACHE_CONTROL];
    if (execute) aws(args, { json: false });
    else log(`  aws ${args.join(" ")}`);
  };
  const invalidate = () => {
    const args = ["cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", `/${SITEMAP_FILE}`];
    if (execute) log(`  invalidation ${aws(args).Invalidation.Id}`);
    else log(`  aws ${args.join(" ")}`);
  };
  try {
    const live = await readLiveSitemap({ origin, fetchImpl });
    if (phase === "transition") {
      log(`\n▶ Sitemap, phase 1: only URLs that the live release and this one both serve`);
      if (live === null) {
        log("  the public sitemap is not served from the bucket: nothing to narrow");
        return { phase, urls: null };
      }
      const transition = transitionEntries(sitemapLocs(live), entries);
      log(`  ${transition.length} URL(s) served by both (${sitemapLocs(live).size} live, ${entries.length} in this release)`);
      upload(renderSitemap(transition));
      invalidate();
      return { phase, urls: transition.length, xml: renderSitemap(transition) };
    }
    log(`\n▶ Sitemap, phase 2: publish ${entries.length} URLs (${entries.filter((entry) => entry.lastmod).length} with lastmod)`);
    const xml = renderSitemap(entries);
    upload(xml);
    invalidate();
    if (!execute) return { phase, urls: entries.length, xml };
    const want = new Set(entries.map((entry) => entry.loc));
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const now = await readLiveSitemap({ origin, fetchImpl });
      if (now === null) {
        log("  the public sitemap is still served by the backend (CloudFront /sitemap.xml behaviour not switched): not compared");
        return { phase, urls: entries.length, xml, public: "backend" };
      }
      const locs = sitemapLocs(now);
      if (locs.size === want.size && [...want].every((loc) => locs.has(loc))) {
        log(`  ✓ the public sitemap lists exactly the ${want.size} URLs of this release`);
        return { phase, urls: entries.length, xml, public: "bucket" };
      }
      if (attempt < attempts) await new Promise((r) => setTimeout(r, waitMs));
    }
    throw new Error("the public sitemap does not match this release after the invalidation");
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
