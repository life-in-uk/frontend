// Production bundle isolation for unpublished Family & Visa wording.
// Mandatory: never skipped, even in a clone without the local-only files.
//
// 1. Canary: copy the app's build inputs to a temporary directory, add a
//    synthetic wording module at the local-only path there, build for
//    production, and require that none of the canary text reaches any asset.
//    The real local file is never read, written or moved by this check.
// 2. Real build: build the project itself and check its assets for dev
//    markers and, when the local wording file is present, every real string.
// 3. A build in the draft preview mode is refused.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localContent } from "./fixtures/familyVisaContent.mjs";
import { CHECKLIST_SECTIONS } from "../src/guides/familyVisaChecklist.ts";
import {
  JOURNEY_GUIDES,
  JOURNEY_STAGES,
  QUESTIONS,
} from "../src/guides/familyVisaJourney.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = path.join(root, "node_modules", ".bin", "vite");

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}
const assets = (dir) =>
  files(dir)
    .filter((f) => /\.(js|css|html|json|txt|map)$/.test(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object")
    for (const [key, v] of Object.entries(value))
      if (key !== "reviewedFor") strings(v, out);
  return out;
}
const build = (cwd, outDir) =>
  execFileSync(
    vite,
    ["build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"],
    { cwd, stdio: "pipe" },
  );

const CANARY = "FV-CANARY-9c4e";
const canaryModule = `export const FAMILY_VISA_DRAFT_CONTENT = {
  reviewedFor: ${JSON.stringify(
    Object.fromEntries(
      Object.entries(JOURNEY_GUIDES).map(([id, g]) => [
        id,
        g.reviewedUpdatedAt,
      ]),
    ),
  )},
  passages: { "s1-married": { text: ["${CANARY} 示例段落 alpha"] } },
  tasks: { "rel-certificate": { summary: "${CANARY} 示例说明 beta" } },
  sections: { identity: { intro: "${CANARY} 示例介绍 gamma" } },
  topics: { "children-from-previous-relationship": { intro: "${CANARY} 示例专题 delta" } },
};
`;

test("canary: wording at the local-only path never reaches a production build", () => {
  const work = mkdtempSync(path.join(tmpdir(), "fv-canary-"));
  try {
    // The app's build inputs only; never the real local wording file.
    for (const entry of [
      "index.html",
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
      "tsconfig.app.json",
      "tsconfig.node.json",
      "src",
      "public",
    ])
      if (existsSync(path.join(root, entry)))
        cpSync(path.join(root, entry), path.join(work, entry), {
          recursive: true,
        });
    mkdirSync(path.join(work, "dev"));
    cpSync(
      path.join(root, "dev", "familyVisaPreview.ts"),
      path.join(work, "dev", "familyVisaPreview.ts"),
    );
    writeFileSync(
      path.join(work, "dev", "familyVisaDraftContent.ts"),
      canaryModule,
    );
    symlinkSync(
      path.join(root, "node_modules"),
      path.join(work, "node_modules"),
    );
    const out = path.join(work, "dist");
    build(work, out);
    const bundle = assets(out);
    assert.ok(bundle.length > 1000, "the canary build produced assets");
    assert.ok(!bundle.includes(CANARY), "canary wording was bundled");
    assert.ok(!bundle.includes("示例段落 alpha"));
    assert.equal(
      files(out).filter((f) => f.endsWith(".js")).length,
      1,
      "no separate chunk for the wording module",
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

const outDir = mkdtempSync(path.join(tmpdir(), "fv-prod-build-"));
let bundle = "";
test.before(() => {
  build(root, outDir);
  bundle = assets(outDir);
});
test.after(() => rmSync(outDir, { recursive: true, force: true }));

test("the real production build has no dev markers or extra chunks", () => {
  for (const marker of [
    "familyVisaDraftContent",
    "FAMILY_VISA_DRAFT_CONTENT",
    "__FAMILY_VISA_DRAFT_CONTENT__",
    "本地预览",
    "readDraftGuides",
    "content/drafts",
  ])
    assert.ok(!bundle.includes(marker), marker);
  const chunks = files(outDir).filter((f) => f.endsWith(".js"));
  assert.equal(chunks.length, 1, chunks.join(", "));
});

test("the real production build contains none of the local wording (when present)", async (t) => {
  const content = await localContent();
  if (!content) {
    t.skip("local wording file not present; the canary check covers isolation");
    return;
  }
  const structural = new Set(
    strings([
      CHECKLIST_SECTIONS.map((s) => [
        s.title,
        s.tasks.map((task) => [task.title, task.condition]),
      ]),
      JOURNEY_STAGES.map((s) => [
        s.title,
        s.intro,
        s.items.map((i) => i.title),
      ]),
      Object.values(QUESTIONS).map((q) => [q.title, q.hint, q.options]),
    ]),
  );
  const wording = [...new Set(strings(content))].filter(
    (s) => s.length >= 6 && !structural.has(s),
  );
  assert.ok(
    wording.length > 150,
    `expected the full wording set, got ${wording.length}`,
  );
  assert.deepEqual(
    wording.filter((s) => bundle.includes(s)),
    [],
  );
});

const draftsDir = path.join(
  root,
  "..",
  "life-in-uk-backend",
  "content",
  "drafts",
  "family-visa",
);
test("no DRAFT Guide text or evidence is bundled (when the drafts are present)", async (t) => {
  if (!existsSync(draftsDir)) {
    t.skip("backend drafts not present; the canary check covers isolation");
    return;
  }
  const leaked = [];
  for (const { slug } of Object.values(JOURNEY_GUIDES)) {
    const file = path.join(draftsDir, `${slug}-zh.json`);
    if (!existsSync(file)) continue;
    const guide = JSON.parse(readFileSync(file, "utf8"));
    const pieces = [
      ...guide.content
        .split("\n")
        .map((l) => l.replace(/[#>*\-\s]+/, "").trim()),
      ...guide.evidence.flatMap((e) => [
        e.statement,
        ...e.supports.flatMap((s) => [s.note, s.excerpt]),
      ]),
    ].filter((s) => typeof s === "string" && s.length >= 16);
    for (const piece of pieces)
      if (bundle.includes(piece)) leaked.push(`${slug}: ${piece.slice(0, 20)}`);
  }
  assert.deepEqual(leaked, []);
});

test("a build in the draft preview mode is refused", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fv-preview-build-"));
  try {
    const result = spawnSync(
      vite,
      ["build", "--mode", "family-visa-preview", "--outDir", dir],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /cannot be used for a build/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
