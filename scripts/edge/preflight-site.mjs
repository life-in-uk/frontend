// Read-only preflight of a production deploy (docs/ci-cd.md). Run by the
// "Deploy production" workflow with preflight = true, under the deploy role:
//
//   node scripts/edge/preflight-site.mjs --bucket <site bucket> --distribution <id> --function <name>
//
// It never uploads, deletes, updates, publishes or invalidates anything. It:
//   1. checks the release like deploy:site does (validated, committed, right origin);
//   2. shows which role it runs as (sts get-caller-identity);
//   3. compares the LIVE CloudFront function with the one this release generates;
//   4. compares the bucket with the release: identical, changed, new, and what a
//      deploy would delete (with the same guard deploy:site applies);
//   5. probes three calls the role must NOT be allowed (distribution config,
//      IAM, listing all buckets) and fails if any of them succeeds.
// Exits nonzero on any problem; prints a summary (also to $GITHUB_STEP_SUMMARY).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRelease, staleObjects } from "./deploy-site.mjs";
import { uploadObjects } from "./objects.mjs";
import { generateViewerRequest } from "./viewer-request.mjs";

/** The only AWS CLI calls this script makes (tests assert it). */
export const READ_ONLY_CALLS = new Set([
  "sts get-caller-identity",
  "cloudfront describe-function",
  "cloudfront get-function",
  "s3api list-objects-v2",
  // Probes that must be denied:
  "cloudfront get-distribution-config",
  "iam get-account-summary",
  "s3api list-buckets",
]);

function awsCall(args) {
  const name = args.slice(0, 2).join(" ");
  if (!READ_ONLY_CALLS.has(name)) throw new Error(`preflight refuses to run aws ${name}`);
  const result = spawnSync(process.env.AWS_CLI || "aws", [...args, "--output", "json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const stdout = result.stdout?.trim() ?? "";
  return { ok: result.status === 0, json: result.status === 0 && stdout ? JSON.parse(stdout) : null, error: (result.stderr || stdout).trim() };
}

/** How the bucket differs from the release. ETags with "-" (multipart) cannot be compared and count as changed. */
export function compareBucket(listed, objects, { md5 = (file) => createHash("md5").update(readFileSync(file)).digest("hex"), now } = {}) {
  const remote = new Map((listed ?? []).map((object) => [object.Key, String(object.ETag ?? "").replaceAll('"', "")]));
  const plan = { identical: 0, changed: [], added: [] };
  for (const object of objects) {
    if (!remote.has(object.key)) plan.added.push(object.key);
    else if (remote.get(object.key) === md5(object.file)) plan.identical++;
    else plan.changed.push(object.key);
  }
  try {
    const { remove, keptAssets } = staleObjects(listed, objects.map((object) => object.key), now ? { now } : {});
    Object.assign(plan, { remove, keptAssets, guard: "" });
  } catch (error) {
    Object.assign(plan, { remove: [], keptAssets: 0, guard: error.message });
  }
  return plan;
}

export async function preflightSite({ distDir = "dist", bucket, distribution, functionName, log = console.log, git, markerFile, aws = awsCall }) {
  const dist = resolve(distDir);
  for (const [name, value] of Object.entries({ bucket, distribution, function: functionName }))
    if (!value) throw new Error(`--${name} is required`);
  const problems = [...checkRelease({ distDir: dist, git, ...(markerFile ? { markerFile } : {}) }).map((e) => `release: ${e}`)];
  const lines = [];
  const note = (line) => { lines.push(line); log(line); };

  const identity = aws(["sts", "get-caller-identity"]);
  if (!identity.ok) problems.push(`AWS identity: ${identity.error.slice(0, 300)}`);
  note(`Role: ${identity.json?.Arn ?? "unknown"}`);

  const { code, bytes } = generateViewerRequest({ distDir: dist });
  const described = aws(["cloudfront", "describe-function", "--name", functionName, "--stage", "LIVE"]);
  const work = mkdtempSync(join(tmpdir(), "lifeinuk-preflight-"));
  try {
    const liveFile = join(work, "live.js");
    const fetched = aws(["cloudfront", "get-function", "--name", functionName, "--stage", "LIVE", liveFile]);
    if (!described.ok || !fetched.ok) problems.push(`function ${functionName}: ${(described.error || fetched.error).slice(0, 300)}`);
    else {
      const status = described.json.FunctionSummary?.Status;
      if (status !== "DEPLOYED") problems.push(`function ${functionName} is ${status}, not DEPLOYED`);
      const same = readFileSync(liveFile, "utf8") === code;
      note(`Function ${functionName}: LIVE ${status}; this release's code (${bytes} bytes) is ${same ? "identical" : "DIFFERENT (a deploy would update and publish it)"}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  const listed = aws(["s3api", "list-objects-v2", "--bucket", bucket, "--query", "Contents[].{Key: Key, ETag: ETag, LastModified: LastModified}"]);
  if (!listed.ok) problems.push(`list s3://${bucket}: ${listed.error.slice(0, 300)}`);
  else {
    const plan = compareBucket(listed.json, uploadObjects(dist));
    note(`Bucket s3://${bucket}: ${listed.json?.length ?? 0} objects; release ${plan.identical + plan.changed.length + plan.added.length}: ` +
      `${plan.identical} identical, ${plan.changed.length} changed, ${plan.added.length} new; a deploy would delete ${plan.remove.length}` +
      `${plan.keptAssets ? ` (and keep ${plan.keptAssets} recent assets of earlier releases)` : ""}`);
    for (const [label, keys] of [["changed", plan.changed], ["new", plan.added], ["would delete", plan.remove]])
      if (keys.length) note(`  ${label}: ${keys.slice(0, 15).join(", ")}${keys.length > 15 ? ", …" : ""}`);
    if (plan.guard) problems.push(`a deploy would stop: ${plan.guard}`);
  }
  note(`Invalidation: a deploy would invalidate /* on ${distribution} (not done by the preflight)`);

  for (const probe of [
    ["cloudfront", "get-distribution-config", "--id", distribution],
    ["iam", "get-account-summary"],
    ["s3api", "list-buckets"],
  ]) {
    const result = aws(probe);
    const denied = !result.ok && /AccessDenied|not authorized|UnauthorizedOperation/i.test(result.error);
    if (result.ok) problems.push(`the role is allowed aws ${probe.slice(0, 2).join(" ")}, which it must not be`);
    else if (!denied) problems.push(`probe aws ${probe.slice(0, 2).join(" ")} failed for another reason: ${result.error.slice(0, 200)}`);
    note(`Probe aws ${probe.slice(0, 2).join(" ")}: ${result.ok ? "ALLOWED (too broad)" : denied ? "denied, as required" : "error"}`);
  }

  const summary = [`### Frontend deploy preflight ${problems.length ? "FAILED" : "OK"} (read-only, nothing changed)`, "", ...lines.map((line) => `- ${line.trim()}`),
    ...(problems.length ? ["", "**Problems**", ...problems.map((p) => `- ${p}`)] : [])].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  for (const problem of problems) log(`✗ ${problem}`);
  log(problems.length ? `\nPreflight FAILED (${problems.length} problem(s)); nothing was changed.` : "\nPreflight OK; nothing was changed.");
  return { problems };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = {};
  const argv = process.argv.slice(2);
  try {
    for (let i = 0; i < argv.length; i++) {
      const name = argv[i];
      if (name === "--bucket") args.bucket = argv[++i];
      else if (name === "--distribution") args.distribution = argv[++i];
      else if (name === "--function") args.functionName = argv[++i];
      else if (name === "--dist") args.distDir = argv[++i];
      else throw new Error(`unknown option ${name}`);
    }
    const { problems } = await preflightSite(args);
    if (problems.length) process.exitCode = 1;
  } catch (error) {
    console.error(`preflight FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
