// The production deploy workflow's fail-fast safeguards, run as GitHub runs them
// (`bash -e`, the default shell of a `run:` step without `shell:`):
// - the sitemap tooling checkout is excluded from git status, so checkRelease
//   (deploy-site, preflight-site) accepts the release, also on a rollback;
// - the early release re-check fails the job, before any AWS access, when a
//   check fails (its output is piped to tail, so it needs pipefail).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workflow = readFileSync(new URL("../.github/workflows/deploy-production.yml", import.meta.url), "utf8");
const lines = workflow.split("\n");

/** The line index of a step, by its `- name:` or `- uses:` text. */
function stepIndex(match) {
  const index = lines.findIndex((line) => /^\s*- (name|uses): /.test(line) && line.includes(match));
  assert.ok(index >= 0, `the workflow has a step matching ${match}`);
  return index;
}

/** The script of a step's `run: |` block. */
function runScript(name) {
  const start = stepIndex(name);
  const run = lines.findIndex((line, index) => index > start && /^\s*run: \|\s*$/.test(line));
  assert.ok(run > start && !lines.slice(start + 1, run).some((line) => /^\s*- (name|uses): /.test(line)), `${name} has a run: | block`);
  const indent = lines[run].search(/\S/);
  const body = [];
  for (const line of lines.slice(run + 1)) {
    if (line.trim() && line.search(/\S/) <= indent) break;
    body.push(line);
  }
  const strip = Math.min(...body.filter((line) => line.trim()).map((line) => line.search(/\S/)));
  return body.map((line) => line.slice(strip)).join("\n");
}

function bash(script, { cwd, env = {} } = {}) {
  return spawnSync("bash", ["-e", "-c", script], { cwd, env: { ...process.env, ...env }, encoding: "utf8" });
}

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

const EXCLUDE = "Keep the tooling checkout out of the release's git status";
const RECHECK = "Re-check the release before any AWS access";

test("step order: tooling checkout, its exclusion, the early re-check, then AWS access and every release check", () => {
  const tooling = lines.findIndex((line) => line.includes("path: tooling"));
  const exclude = stepIndex(EXCLUDE);
  const recheck = stepIndex(RECHECK);
  const firstAws = Math.min(stepIndex("OIDC claims"), stepIndex("aws-actions/configure-aws-credentials"));
  assert.ok(tooling > 0 && tooling < exclude, "the exclusion follows the tooling checkout");
  assert.ok(exclude < recheck && recheck < firstAws, "the early re-check runs before any AWS access");
  for (const command of ["node scripts/edge/preflight-site.mjs", "node scripts/edge/deploy-site.mjs", "node tooling/scripts/edge/publish-sitemap.mjs"]) {
    const use = lines.findIndex((line) => line.includes(command));
    assert.ok(use > exclude, `${command} runs after the exclusion`);
  }
});

test("the exclusion step cleans the tooling checkout (also on an older commit) and fails on any other change", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "deploy-tooling-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, "init", "-q");
  writeFileSync(join(dir, ".gitignore"), "dist\n"); // an older release: no tooling entry
  git(dir, "add", ".");
  git(dir, "-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-qm", "release");
  mkdirSync(join(dir, "tooling", "scripts"), { recursive: true });
  writeFileSync(join(dir, "tooling", "scripts", "x.mjs"), "");
  assert.match(git(dir, "status", "--porcelain"), /tooling/, "the tooling checkout makes the tree dirty");

  const script = runScript(EXCLUDE);
  const clean = bash(script, { cwd: dir });
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.equal(git(dir, "status", "--porcelain"), "", "the tree is clean for checkRelease");

  writeFileSync(join(dir, "stray.txt"), "");
  const dirty = bash(script, { cwd: dir });
  assert.notEqual(dirty.status, 0, "any other untracked change stops the job");
});

test("the early re-check fails the job when either release check fails, and passes when both do", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "deploy-recheck-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // A stand-in `node`: each script exits with the status the test sets, printing a line like the real ones.
  writeFileSync(join(dir, "node"), '#!/usr/bin/env bash\ncase "$1" in\n  *check-release-output.mjs) echo "release output"; exit "${OUTPUT_STATUS:-0}" ;;\n  *deploy-site.mjs) echo "not a deployable release"; exit "${DEPLOY_STATUS:-0}" ;;\nesac\nexit 99\n');
  chmodSync(join(dir, "node"), 0o755);
  const script = runScript(RECHECK);
  const run = (env) => bash(script, { cwd: dir, env: { PATH: `${dir}:${process.env.PATH}`, API_BASE: "https://lifeinuk.info", SITE_BUCKET: "b", DISTRIBUTION: "d", FUNCTION: "f", ...env } });

  assert.equal(run({}).status, 0, "both checks pass");
  assert.notEqual(run({ DEPLOY_STATUS: "1" }).status, 0, "deploy-site's release check fails the step through the tail pipe");
  assert.notEqual(run({ OUTPUT_STATUS: "1" }).status, 0, "the release output check fails the step");
});
