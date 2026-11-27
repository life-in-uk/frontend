// The production deploy workflow: the release's working tree stays clean after the
// sitemap tooling checkout, so checkRelease (deploy-site, preflight-site) accepts it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/deploy-production.yml", import.meta.url), "utf8");

test("the tooling checkout is excluded from git status before any step checks the release", () => {
  const tooling = workflow.indexOf("path: tooling");
  const exclude = workflow.indexOf('echo "/tooling/" >> "$(git rev-parse --git-path info/exclude)"');
  assert.ok(tooling > 0, "the workflow checks out the sitemap tooling");
  assert.ok(exclude > tooling, "the tooling checkout is excluded after it is made");
  for (const script of ["node scripts/edge/preflight-site.mjs", "node scripts/edge/deploy-site.mjs", "node tooling/scripts/edge/publish-sitemap.mjs"]) {
    const use = workflow.indexOf(script);
    assert.ok(use > exclude, `${script} runs after the exclusion`);
  }
});
