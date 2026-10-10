// Local Family & Visa draft preview: what it serves, and that it cannot run
// outside the dev server's preview mode.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  familyVisaDraftPreview,
  familyVisaPreviewBuildGuard,
  mergeGuideList,
  PREVIEW_MODE,
  previewMiddleware,
  readDraftGuides,
} from "../dev/familyVisaPreview.ts";

const stamp = "2026-10-08T21:40:00Z";
const draft = (slug, extra = {}) => ({
  slug,
  category: "family-visa",
  title: `Fixture ${slug}`,
  summary: "Fixture summary",
  content: "Fixture content",
  status: "DRAFT",
  publishedAt: null,
  updatedAt: stamp,
  sources: [],
  evidence: [],
  ...extra,
});

function fixtureDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "fv-preview-"));
  const write = (name, body) =>
    writeFileSync(
      path.join(dir, name),
      typeof body === "string" ? body : JSON.stringify(body),
    );
  write("good-one-zh.json", draft("good-one"));
  write("good-two-zh.json", draft("good-two"));
  write(
    "published-zh.json",
    draft("published", { status: "PUBLISHED", publishedAt: stamp }),
  );
  write("money-zh.json", draft("money", { category: "money" }));
  write("mismatch-zh.json", draft("other-slug"));
  write("broken-zh.json", "{ not json");
  write("notes.json", draft("notes"));
  return dir;
}

test("only family-visa DRAFTs matching their file name are served", () => {
  const warnings = [];
  const drafts = readDraftGuides(fixtureDir(), (w) => warnings.push(w));
  assert.deepEqual(
    drafts.map((d) => d.slug),
    ["good-one", "good-two"],
  );
  assert.equal(warnings.length, 4);
  for (const d of drafts) {
    assert.equal("status" in d, false);
    assert.equal(d.publishedAt, d.updatedAt);
    // Everything else is served unchanged.
    assert.equal(d.content, "Fixture content");
    assert.deepEqual(d.evidence, []);
  }
  assert.deepEqual(readDraftGuides("/nonexistent/dir"), []);
});

test("the backend list gains the drafts; a draft replaces a same slug", () => {
  const drafts = readDraftGuides(fixtureDir());
  const upstream = [
    { slug: "health-one", category: "health-nhs" },
    { slug: "good-one", category: "family-visa", title: "Old" },
  ];
  const list = mergeGuideList(upstream, drafts);
  assert.deepEqual(
    list.map((g) => g.slug),
    ["health-one", "good-one", "good-two"],
  );
  // List entries carry metadata only, never article bodies.
  assert.deepEqual(Object.keys(list[1]).sort(), [
    "category",
    "publishedAt",
    "slug",
    "summary",
    "title",
    "updatedAt",
  ]);
  assert.deepEqual(
    mergeGuideList({ error: true }, drafts).map((g) => g.slug),
    ["good-one", "good-two"],
  );
});

function call(middleware, method, url) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 0,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(body) {
        resolve({
          next: false,
          status: this.statusCode,
          headers: this.headers,
          body: JSON.parse(body),
        });
      },
    };
    middleware({ method, url }, res, () => resolve({ next: true }));
  });
}

test("the middleware answers only the Guide API, for draft slugs", async () => {
  const middleware = previewMiddleware({
    draftsDir: fixtureDir(),
    // Unreachable: the list falls back to drafts only.
    backendTarget: "http://127.0.0.1:9",
  });
  const list = await call(middleware, "GET", "/api/guides");
  assert.equal(list.status, 200);
  assert.equal(list.headers["Cache-Control"], "no-store");
  assert.deepEqual(
    list.body.map((g) => g.slug),
    ["good-one", "good-two"],
  );
  const detail = await call(middleware, "GET", "/api/guides/good-two?x=1");
  assert.equal(detail.body.slug, "good-two");
  assert.equal(detail.body.content, "Fixture content");
  for (const [method, url] of [
    ["GET", "/api/guides/published"],
    ["GET", "/api/guides/money"],
    ["GET", "/api/guides/..%2Fsecret"],
    ["GET", "/api/guides/good-one/extra"],
    ["GET", "/api/bank-holidays"],
    ["POST", "/api/guides"],
    ["GET", "/family-visa"],
  ])
    assert.deepEqual(await call(middleware, method, url), { next: true }, url);
});

test("the preview runs only on the dev server, in its own mode", () => {
  const plugin = familyVisaDraftPreview({
    draftsDir: "/x",
    backendTarget: "http://127.0.0.1:9",
  });
  const apply = (command, mode, isPreview = false) =>
    plugin.apply({}, { command, mode, isPreview });
  assert.equal(apply("serve", PREVIEW_MODE), true);
  assert.equal(apply("serve", "development"), false);
  assert.equal(apply("serve", "production"), false);
  assert.equal(apply("build", PREVIEW_MODE), false);
  assert.equal(apply("build", "production"), false);
  // `vite preview` serves a built bundle: never with drafts.
  assert.equal(apply("serve", PREVIEW_MODE, true), false);
});

test("a build in preview mode fails", () => {
  const guard = familyVisaPreviewBuildGuard();
  assert.equal(guard.apply, "build");
  assert.throws(
    () => guard.config({}, { command: "build", mode: PREVIEW_MODE }),
    /cannot be used for a build/,
  );
  assert.doesNotThrow(() =>
    guard.config({}, { command: "build", mode: "production" }),
  );
});

const reviewedDir = fileURLToPath(
  new URL(
    "../../life-in-uk-backend/content/drafts/family-visa/",
    import.meta.url,
  ),
);
test(
  "the reviewed drafts are served as exactly the four journey Guides",
  { skip: existsSync(reviewedDir) ? false : "backend drafts not present" },
  () => {
    assert.deepEqual(
      readDraftGuides(reviewedDir)
        .map((d) => d.slug)
        .sort(),
      [
        "partner-visa-dependent-children",
        "partner-visa-financial-requirement",
        "partner-visa-relationship-evidence",
        "partner-visa-routes-overview",
      ],
    );
  },
);
