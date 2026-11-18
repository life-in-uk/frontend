// Deploys a validated release build to the S3 bucket behind CloudFront and
// publishes the matching viewer-request function (docs/deploy-cloudfront.md).
//
//   npm run deploy:site -- --bucket <site bucket> --distribution <id> --function <name>            (prints the plan)
//   npm run deploy:site -- --bucket <site bucket> --distribution <id> --function <name> --execute  (runs it)
//
// Without --execute nothing is sent to AWS. The AWS CLI uses the usual
// credential chain (AWS_PROFILE); AWS_CLI overrides the binary (used by tests).
//
// Order (every step must succeed before the next):
//   1. Preconditions: release/build.json says dist/ is a validated release of
//      the current commit for https://lifeinuk.info, and the tree is clean.
//   2. Generate the function from dist/ (size and manifest self-checks).
//   3. Upload every object with its Content-Type and Cache-Control: assets
//      first, then other files, then HTML, so no page can reference an asset
//      that is not there yet. Build manifests are never uploaded.
//   4. Update the function (DEVELOPMENT stage), run test-function on sample
//      events in the real runtime and compare with the local result, publish.
//   5. Delete objects that are not in this release (withdrawn pages). Hashed
//      assets of earlier releases are kept for ASSET_GRACE_DAYS, so pages
//      already open in a browser can still load their route chunks. More than
//      a handful of other deletions stops the deploy unless --allow-large-delete
//      (a wrong bucket or an unexpected object set is never wiped).
//   6. Invalidate /* (HTML revalidates anyway; this clears the 404s and
//      redirects CloudFront may hold for a few seconds).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { INTERNAL_FILES, uploadObjects } from "./objects.mjs";
import { generateViewerRequest, loadViewerRequest, viewerEvent } from "./viewer-request.mjs";

export const RELEASE_ORIGIN = "https://lifeinuk.info";
export const ASSET_GRACE_DAYS = 7;

/**
 * Which listed bucket objects ({ Key, LastModified }) a release removes.
 * Throws when more non-asset objects would go than a normal release removes
 * (withdrawn Guides): at most max(20, 10 % of the release), unless allowLarge.
 */
export function staleObjects(listed, releaseKeys, { now = Date.now(), allowLarge = false } = {}) {
  const keep = new Set(releaseKeys);
  const graceMs = ASSET_GRACE_DAYS * 24 * 3600 * 1000;
  const remove = [];
  let keptAssets = 0;
  for (const { Key: key, LastModified: modified } of listed ?? []) {
    if (keep.has(key)) continue;
    if (key.startsWith("assets/") && !(now - Date.parse(modified) > graceMs)) keptAssets++;
    else remove.push(key);
  }
  const pages = remove.filter((key) => !key.startsWith("assets/"));
  const limit = Math.max(20, Math.ceil(keep.size * 0.1));
  if (pages.length > limit && !allowLarge)
    throw new Error(`refusing to delete ${pages.length} objects that are not assets (limit ${limit}), e.g. ${pages.slice(0, 5).join(", ")}; check the bucket and the release, then rerun with --allow-large-delete if this is intended`);
  return { remove, keptAssets };
}

/** Upload groups: one `aws s3 cp --recursive` per (prefix, extension), each with explicit headers. */
export function uploadGroups(objects) {
  const groups = new Map();
  for (const object of objects) {
    const asset = object.key.startsWith("assets/");
    const ext = extname(object.key).toLowerCase() || "(none)";
    const id = `${asset ? "assets" : "site"}|${ext}`;
    const group = groups.get(id) ?? { asset, ext, contentType: object.contentType, cacheControl: object.cacheControl, keys: [] };
    if (group.contentType !== object.contentType || group.cacheControl !== object.cacheControl)
      throw new Error(`inconsistent headers inside upload group ${id}`);
    group.keys.push(object.key);
    groups.set(id, group);
  }
  const rank = (group) => (group.asset ? 0 : group.ext === ".html" ? 2 : 1);
  return [...groups.values()].sort((a, b) => rank(a) - rank(b) || (a.ext < b.ext ? -1 : 1));
}

function s3CopyArgs(distDir, bucket, group) {
  const include = group.asset ? `assets/*${group.ext}` : `*${group.ext}`;
  const args = ["s3", "cp", distDir, `s3://${bucket}/`, "--recursive", "--only-show-errors", "--exclude", "*", "--include", include];
  if (!group.asset) args.push("--exclude", "assets/*");
  for (const internal of INTERNAL_FILES) args.push("--exclude", internal);
  args.push("--content-type", group.contentType, "--cache-control", group.cacheControl);
  return args;
}

/** Sample events checked in the real CloudFront runtime before the function is published. */
export function functionTestEvents(code, distDir) {
  const handle = loadViewerRequest(code);
  const redirects = JSON.parse(readFileSync(join(distDir, "seo-redirects.json"), "utf8")).redirects;
  const shortUrl = redirects.find((row) => row.from !== "/") ?? redirects[0];
  const page = uploadObjects(distDir).find((object) => /^en\/[^/]+\/[^/]+\/index\.html$/.test(object.key));
  const events = [
    ["page", viewerEvent(page ? `/${page.key.replace(/\/index\.html$/, "")}/` : "/en")],
    ["short URL with query", viewerEvent(shortUrl.from, { query: "a=1&b=%E4%B8%AD" })],
    ["unknown path", viewerEvent("/en/no-such-section")],
    ["API passthrough", viewerEvent("/api/guides/no-such-guide")],
    ["owner API blocked", viewerEvent("/api/owner/editorial/session")],
    ["other host", viewerEvent("/en", { host: "www.lifeinuk.info", query: "x=1" })],
  ];
  return events.map(([name, event]) => {
    const result = handle(event);
    return { name, event, expected: result.statusCode ? { statusCode: result.statusCode, location: result.headers.location?.value } : { uri: result.uri } };
  });
}

/** What CloudFront's test-function returned, reduced to what the local handler is compared on. */
export function summarizeTestResult(output) {
  const result = JSON.parse(output.TestResult.FunctionOutput);
  if (result.response?.statusCode) return { statusCode: result.response.statusCode, location: result.response.headers?.location?.value };
  return { uri: result.request.uri };
}

function aws(args, { json = true } = {}) {
  const binary = process.env.AWS_CLI || "aws";
  const result = spawnSync(binary, json ? [...args, "--output", "json"] : args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`aws ${args.slice(0, 3).join(" ")} failed (exit ${result.status}): ${(result.stderr || result.stdout).trim().slice(0, 600)}`);
  return json && result.stdout.trim() ? JSON.parse(result.stdout) : result.stdout;
}

export function checkRelease({ distDir, markerFile = resolve("release", "build.json"), git = (...args) => spawnSync("git", args, { encoding: "utf8" }).stdout.trim() }) {
  const errors = [];
  if (!existsSync(markerFile)) return [`${markerFile} not found: run PUBLIC_ORIGIN=${RELEASE_ORIGIN} npm run build:release first`];
  const marker = JSON.parse(readFileSync(markerFile, "utf8"));
  if (marker.origin !== RELEASE_ORIGIN) errors.push(`the release was built for ${marker.origin}, not ${RELEASE_ORIGIN}`);
  if (resolve(marker.distDir) !== resolve(distDir)) errors.push(`the release marker describes ${marker.distDir}, not ${resolve(distDir)}`);
  if (marker.dirty) errors.push("the release was built from uncommitted changes");
  const head = git("rev-parse", "HEAD");
  if (marker.commit !== head) errors.push(`the release was built from ${marker.commit?.slice(0, 7)}, but HEAD is ${head.slice(0, 7)}: rebuild`);
  if (git("status", "--porcelain") !== "") errors.push("the working tree has uncommitted changes");
  return errors;
}

export async function deploySite({ distDir = "dist", bucket, distribution, functionName, execute = false, allowLargeDelete = false, log = console.log, git, markerFile }) {
  const dist = resolve(distDir);
  for (const [name, value] of Object.entries({ bucket, distribution, function: functionName }))
    if (!value) throw new Error(`--${name} is required`);
  const releaseErrors = checkRelease({ distDir: dist, git, ...(markerFile ? { markerFile } : {}) });
  if (releaseErrors.length) throw new Error(`not a deployable release:\n  ${releaseErrors.join("\n  ")}`);

  const { code, bytes, warnings } = generateViewerRequest({ distDir: dist });
  for (const warning of warnings) log(`! ${warning}`);
  const objects = uploadObjects(dist);
  const groups = uploadGroups(objects);
  const tests = functionTestEvents(code, dist);
  const work = mkdtempSync(join(tmpdir(), "lifeinuk-deploy-"));
  const functionFile = join(work, "viewer-request.js");
  writeFileSync(functionFile, code, "utf8");
  const step = (title) => log(`\n▶ ${title}`);
  const show = (args) => log(`  aws ${args.map((arg) => (/[\s*;&|]/.test(arg) ? `'${arg}'` : arg)).join(" ")}`);

  try {
    step(`Upload ${objects.length} objects to s3://${bucket} (assets → other files → HTML)`);
    for (const group of groups) {
      const args = s3CopyArgs(dist, bucket, group);
      log(`  ${group.keys.length} × ${group.asset ? "assets/" : ""}*${group.ext}  [${group.contentType}; ${group.cacheControl}]`);
      if (execute) aws(args, { json: false });
      else show(args);
    }

    step(`Update and publish CloudFront function ${functionName} (${bytes} bytes)`);
    const describe = ["cloudfront", "describe-function", "--name", functionName, "--stage", "DEVELOPMENT"];
    if (!execute) {
      show(describe);
      show(["cloudfront", "update-function", "--name", functionName, "--if-match", "<ETag>", "--function-config",
        "Comment=Life in UK viewer-request,Runtime=cloudfront-js-2.0", "--function-code", `fileb://${functionFile}`]);
      for (const test of tests) log(`  test-function: ${test.name} → ${JSON.stringify(test.expected)}`);
      show(["cloudfront", "publish-function", "--name", functionName, "--if-match", "<ETag>"]);
    } else {
      let etag = aws(describe).ETag;
      etag = aws(["cloudfront", "update-function", "--name", functionName, "--if-match", etag, "--function-config",
        "Comment=Life in UK viewer-request,Runtime=cloudfront-js-2.0", "--function-code", `fileb://${functionFile}`]).ETag;
      for (const [index, test] of tests.entries()) {
        const eventFile = join(work, `event-${index}.json`);
        writeFileSync(eventFile, JSON.stringify(test.event));
        const output = aws(["cloudfront", "test-function", "--name", functionName, "--if-match", etag, "--stage", "DEVELOPMENT", "--event-object", `fileb://${eventFile}`]);
        const actual = summarizeTestResult(output);
        if (JSON.stringify(actual) !== JSON.stringify(test.expected))
          throw new Error(`test-function "${test.name}": CloudFront gave ${JSON.stringify(actual)}, expected ${JSON.stringify(test.expected)}; nothing was published`);
        log(`  ✓ test-function ${test.name}`);
      }
      aws(["cloudfront", "publish-function", "--name", functionName, "--if-match", etag]);
      log("  published (LIVE)");
    }

    step("Delete objects that are not part of this release");
    const list = ["s3api", "list-objects-v2", "--bucket", bucket, "--query", "Contents[].{Key: Key, LastModified: LastModified}"];
    if (!execute) {
      show(list);
      log(`  then: aws s3api delete-objects --bucket … for every listed key not in this release (earlier assets kept ${ASSET_GRACE_DAYS} days)`);
    } else {
      const { remove: stale, keptAssets } = staleObjects(aws(list), objects.map((object) => object.key), { allowLarge: allowLargeDelete });
      if (keptAssets) log(`  ${keptAssets} asset(s) of earlier releases kept for up to ${ASSET_GRACE_DAYS} days`);
      for (let i = 0; i < stale.length; i += 1000) {
        const batch = join(work, `delete-${i}.json`);
        writeFileSync(batch, JSON.stringify({ Objects: stale.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true }));
        aws(["s3api", "delete-objects", "--bucket", bucket, "--delete", `file://${batch}`]);
      }
      log(`  ${stale.length} stale object(s) deleted${stale.length ? `: ${stale.slice(0, 10).join(", ")}${stale.length > 10 ? ", …" : ""}` : ""}`);
    }

    step("Invalidate the CloudFront cache");
    const invalidate = ["cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", "/*"];
    if (execute) log(`  invalidation ${aws(invalidate).Invalidation.Id}`);
    else show(invalidate);

    log(`\n${execute ? "Deployed." : "Dry run only: nothing was sent to AWS. Add --execute to deploy."}`);
    log("Then verify: npm run verify:site -- --base https://lifeinuk.info --production");
    return { objects: objects.length, groups, tests, bytes };
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
      else if (name === "--bucket") args.bucket = argv[++i];
      else if (name === "--distribution") args.distribution = argv[++i];
      else if (name === "--function") args.functionName = argv[++i];
      else if (name === "--dist") args.distDir = argv[++i];
      else if (name === "--allow-large-delete") args.allowLargeDelete = true;
      else throw new Error(`unknown option ${name}`);
    }
    await deploySite(args);
  } catch (error) {
    console.error(`deploy:site FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
