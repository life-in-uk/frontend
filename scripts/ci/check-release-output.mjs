// Release checks that complement the SEO validator (scripts/seo/validate.mjs),
// run by CI and by the production deploy workflow after `npm run build:release`:
//
//   node scripts/ci/check-release-output.mjs [--dist dist] [--expect-api https://lifeinuk.info]
//
//   1. No loopback or private-network URL anywhere in the uploaded files
//      (HTML, JavaScript, CSS, JSON, …), not only in page links.
//   2. No robots "noindex" in any HTML file except 404.html. (The app bundle
//      may contain the string: it marks not-found pages noindex at runtime.)
//   3. release/build.json describes this dist/, for an https public origin;
//      with --expect-api, it was also built from that Guide API (the deploy
//      workflow requires production's own public API).
//   4. The backend robots.txt allows crawling and names <origin>/sitemap.xml.
//
// Prints a summary (also to $GITHUB_STEP_SUMMARY when set) and exits 1 on any failure.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { uploadObjects } from "../edge/objects.mjs";
import { withRetryOn429 } from "../seo/retry.mjs";

const TEXT = /\.(html|js|mjs|css|json|xml|txt|svg|webmanifest)$/i;
// A URL authority on a loopback, unspecified or RFC 1918 address, or "localhost" with a port.
const PRIVATE_URL =
  /(?:\bhttps?:)?\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1?\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?=[:/"'`\s)]|$)|\blocalhost:\d{2,5}\b/g;
const NOINDEX = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i;

/** Problems in dist/ (checks 1 and 2). */
export function scanDist(distDir) {
  const errors = [];
  let scanned = 0;
  for (const object of uploadObjects(distDir)) {
    if (!TEXT.test(object.key)) continue;
    scanned++;
    const text = readFileSync(object.file, "utf8");
    const hits = [...new Set(text.match(PRIVATE_URL) ?? [])];
    if (hits.length) errors.push(`${object.key}: local or private URL ${hits.slice(0, 3).join(", ")}`);
    if (object.key.endsWith(".html") && object.key !== "404.html" && NOINDEX.test(text)) errors.push(`${object.key}: robots noindex on a served page`);
  }
  return { errors, scanned };
}

/** Problems with release/build.json (check 3). */
export function checkMarker(marker, { distDir, expectApi }) {
  const errors = [];
  if (!marker) return ["release/build.json is missing: run npm run build:release"];
  if (!/^https:\/\/[^/]+$/.test(marker.origin ?? "")) errors.push(`release origin ${marker.origin} is not an https origin`);
  if (resolve(marker.distDir ?? "") !== resolve(distDir)) errors.push(`release/build.json describes ${marker.distDir}, not ${resolve(distDir)}`);
  if (marker.dirty) errors.push("the release was built from uncommitted changes");
  if (expectApi && marker.apiBase !== expectApi) errors.push(`the release was built from the Guide API ${marker.apiBase}, expected ${expectApi}`);
  return errors;
}

/** Problems with the backend robots.txt (check 4). */
export function checkRobots(text, origin) {
  const errors = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  if (lines.some((line) => /^disallow:\s*\/\s*$/i.test(line))) errors.push("robots.txt disallows the whole site");
  if (!lines.includes(`Sitemap: ${origin}/sitemap.xml`)) errors.push(`robots.txt does not name ${origin}/sitemap.xml`);
  return errors;
}

async function main(argv) {
  const args = { dist: "dist" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dist") args.dist = argv[++i];
    else if (argv[i] === "--expect-api") args.expectApi = argv[++i];
    else throw new Error(`unknown option ${argv[i]}`);
  }
  const markerFile = resolve("release", "build.json");
  const marker = existsSync(markerFile) ? JSON.parse(readFileSync(markerFile, "utf8")) : null;
  const errors = checkMarker(marker, { distDir: args.dist, expectApi: args.expectApi });
  const dist = scanDist(args.dist);
  errors.push(...dist.errors);
  if (marker?.apiBase) {
    const response = await withRetryOn429(() => fetch(`${marker.apiBase.replace(/\/$/, "")}/robots.txt`));
    if (!response.ok) errors.push(`robots.txt: HTTP ${response.status}`);
    else errors.push(...checkRobots(await response.text(), marker.origin));
  }

  const summary = [
    `### Release output ${errors.length ? "FAILED" : "OK"}`,
    "",
    "| | |",
    "|---|---|",
    `| Commit | \`${marker?.commit ?? "?"}\` |`,
    `| Origin / Guide API | ${marker?.origin ?? "?"} / ${marker?.apiBase ?? "?"} |`,
    `| Canonical pages / redirects | ${marker?.pages ?? "?"} / ${marker?.redirects ?? "?"} |`,
    `| Files scanned for local URLs and noindex | ${dist.scanned} |`,
    ...(errors.length ? ["", ...errors.slice(0, 50).map((error) => `- ${error}`)] : []),
  ].join("\n");
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`check-release-output FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
