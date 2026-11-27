// The frontend-owned sitemap (SEO audit F4/F9): derived from a release's own
// pages, with lastmod from each Guide's dateModified, and published in two
// phases so the public sitemap never lists a URL the live edge does not serve.
// Scenarios: publication, withdrawal, a failed deploy, a rollback to an older
// release, and the period before CloudFront serves the sitemap from the bucket.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expectedPages } from "../scripts/seo/inventory.mjs";
import { prerender } from "../scripts/seo/prerender.mjs";
import { releasePageLocs, renderReleasePages, renderSitemap, sitemapEntries, sitemapLocs, transitionEntries } from "../scripts/seo/sitemap.mjs";
import { publishSitemap } from "../scripts/edge/publish-sitemap.mjs";
import { cacheControlFor, uploadObjects } from "../scripts/edge/objects.mjs";
import { uploadGroups } from "../scripts/edge/deploy-site.mjs";

const ORIGIN = "https://lifeinuk.info";
const SHELL = '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <title>Life in UK</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" crossorigin src="/assets/index-abc123.js"></script>\n  </body>\n</html>\n';
const LONG = "This paragraph explains the rule in plain words, with the details a tenant needs before acting. ".repeat(4);

function guide(slug, locale, updatedAt) {
  const title = `${slug} title (${locale})`;
  const meta = { slug, category: "renting", title, summary: `${slug} summary in ${locale}.`, publishedAt: "2026-11-16T14:25:00Z", updatedAt };
  return { meta, detail: { ...meta, content: `# ${title}\n\n## What to do\n\n${LONG}\n`, sources: [], evidence: [] } };
}

/** A release built from { locale: [slug, …] }; Guide dates differ per slug so lastmod can be checked. */
async function release(spec) {
  const lists = {};
  const details = {};
  for (const locale of ["zh-CN", "zh-TW", "en", "ur", "hi"]) {
    const rows = (spec[locale] ?? []).map((slug, index) => guide(slug, locale, `2026-11-2${index}T10:00:00Z`));
    lists[locale] = rows.map((row) => row.meta);
    details[locale] = new Map(rows.map((row) => [row.meta.slug, row.detail]));
  }
  const inventory = { lists, details };
  const dir = mkdtempSync(join(tmpdir(), "sitemap-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), SHELL);
  writeFileSync(join(dir, "assets", "index-abc123.js"), "console.log(1)");
  await prerender({ distDir: dir, origin: ORIGIN, inventory });
  return { dir, inventory };
}

const OLD = { "zh-CN": ["renting-alpha", "renting-beta"], en: ["renting-alpha", "renting-beta"] };
const NEW = { "zh-CN": ["renting-alpha", "renting-gamma"], en: ["renting-alpha", "renting-gamma"] }; // beta withdrawn, gamma published

/**
 * A public site: /sitemap.xml from S3 (state.xml) or the backend (state.server), and
 * /release-pages.json from S3 (state.pages, or 404 when absent).
 */
function site(state) {
  return async (url) => {
    const pages = String(url).endsWith("/release-pages.json");
    const body = pages ? state.pages : state.xml;
    const status = pages && body === undefined ? 404 : state.status ?? 200;
    return { status, ok: status < 400, headers: new Headers({ server: pages ? "AmazonS3" : state.server }), text: async () => body };
  };
}

/** A fake AWS CLI that records uploads and invalidations. */
function fakeAws(state) {
  const calls = [];
  const aws = (args) => {
    calls.push(args.slice(0, 2).join(" "));
    if (args[0] === "s3" && args[1] === "cp") return "";
    if (args[0] === "cloudfront" && args[1] === "create-invalidation") return { Invalidation: { Id: "I1" } };
    if (args[0] === "cloudfront" && args[1] === "wait") return "";
    throw new Error(`unexpected ${args.join(" ")}`);
  };
  return { aws, calls };
}

/** What the public serves once a phase's files are live. */
const goLive = (state, result) => { if (state.server === "AmazonS3") state.xml = result.xml; state.pages = result.pages; };

test("the sitemap lists each canonical page once, with its own alternates and lastmod only for Guides", async () => {
  const { dir, inventory } = await release(OLD);
  const entries = sitemapEntries(dir, ORIGIN);
  assert.deepEqual(entries.map((e) => e.loc), expectedPages(inventory).map((p) => `${ORIGIN}${p.path}`).sort());
  const beta = entries.find((e) => e.loc === `${ORIGIN}/en/renting/renting-beta`);
  assert.equal(beta.lastmod, "2026-11-21T10:00:00Z", "the Guide's own dateModified");
  assert.deepEqual(beta.alternates.map((a) => a.hreflang).sort(), ["en-GB", "x-default", "zh-CN"]);
  assert.equal(entries.find((e) => e.loc === `${ORIGIN}/en/renting`).lastmod, undefined, "hubs carry no lastmod");
  assert.ok(!entries.some((e) => e.loc === `${ORIGIN}/renting/renting-alpha`), "zh-CN short-URL copies are not listed");
  const xml = renderSitemap(entries);
  assert.match(xml, /<lastmod>2026-11-21T10:00:00Z<\/lastmod>/);
  assert.equal(sitemapLocs(xml).size, entries.length);
  rmSync(dir, { recursive: true });
});

test("transition: a published page waits for the switch, a withdrawn page leaves before it", async () => {
  const before = await release(OLD);
  const after = await release(NEW);
  const live = sitemapLocs(renderSitemap(sitemapEntries(before.dir, ORIGIN)));
  const transition = transitionEntries(live, sitemapEntries(after.dir, ORIGIN));
  const locs = transition.map((e) => e.loc);
  assert.ok(locs.includes(`${ORIGIN}/en/renting/renting-alpha`));
  assert.ok(!locs.some((loc) => loc.includes("renting-gamma")), "new pages only after the switch");
  assert.ok(!locs.some((loc) => loc.includes("renting-beta")), "withdrawn pages leave before the switch");
  for (const entry of transition) for (const alt of entry.alternates) assert.ok(locs.includes(alt.href), `${entry.loc}: alternate ${alt.href} is served by both`);
  rmSync(before.dir, { recursive: true });
  rmSync(after.dir, { recursive: true });
});

test("publish: phases 1 and 2, a failed deploy in between, and the public check", async () => {
  const before = await release(OLD);
  const after = await release(NEW);
  const liveEntries = sitemapEntries(before.dir, ORIGIN);
  const state = { server: "AmazonS3", xml: renderSitemap(liveEntries), pages: renderReleasePages(liveEntries) };
  const { aws, calls } = fakeAws(state);
  const run = (phase) => publishSitemap({ phase, distDir: after.dir, bucket: "b", distribution: "E1", execute: true, log() {}, aws, fetchImpl: site(state), waitMs: 0, attempts: 2 });

  const phase1 = await run("transition");
  assert.deepEqual(calls, ["s3 cp", "s3 cp", "cloudfront create-invalidation", "cloudfront wait"], "sitemap and page list, one invalidation, completed before the switch");
  goLive(state, phase1);
  // A deploy that fails here leaves these: every page is served by the old and the new release.
  const oldLocs = new Set(liveEntries.map((e) => e.loc));
  const newLocs = new Set(sitemapEntries(after.dir, ORIGIN).map((e) => e.loc));
  for (const loc of [...sitemapLocs(phase1.xml), ...releasePageLocs(phase1.pages, ORIGIN)]) assert.ok(oldLocs.has(loc) && newLocs.has(loc), loc);

  // Phase 2: the public files do not change (a stale edge) → it fails; once they match → passes.
  await assert.rejects(run("full"), /does not match this release/);
  const full = sitemapEntries(after.dir, ORIGIN);
  goLive(state, { xml: renderSitemap(full), pages: renderReleasePages(full) });
  const done = await run("full");
  assert.equal(done.public, "bucket");
  assert.equal(sitemapLocs(done.xml).size, newLocs.size);
  assert.deepEqual(releasePageLocs(done.pages, ORIGIN), newLocs);
  rmSync(before.dir, { recursive: true });
  rmSync(after.dir, { recursive: true });
});

test("before the CloudFront switch: phase 1 narrows the page list (served by the bucket) and the sitemap file", async () => {
  const before = await release(OLD);
  const after = await release(NEW);
  const state = { server: "nginx", xml: "<urlset/>", pages: renderReleasePages(sitemapEntries(before.dir, ORIGIN)) };
  const { aws } = fakeAws(state);
  const phase1 = await publishSitemap({ phase: "transition", distDir: after.dir, bucket: "b", distribution: "E1", execute: true, log() {}, aws, fetchImpl: site(state), waitMs: 0, attempts: 1 });
  const pages = [...releasePageLocs(phase1.pages, ORIGIN)];
  assert.ok(!pages.some((loc) => /renting-(beta|gamma)/.test(loc)), "withdrawn and new Guides are not in the page list during the switch");
  assert.ok(pages.includes(`${ORIGIN}/en/renting/renting-alpha`));
  rmSync(before.dir, { recursive: true });
  rmSync(after.dir, { recursive: true });
});

test("rollback to an older release: its own pages only, also when it is older than the sitemap steps", async () => {
  const newer = await release(NEW);
  const older = await release(OLD);
  const newerEntries = sitemapEntries(newer.dir, ORIGIN);
  const state = { server: "AmazonS3", xml: renderSitemap(newerEntries), pages: renderReleasePages(newerEntries) };
  const { aws } = fakeAws(state);
  const run = (phase) => publishSitemap({ phase, distDir: older.dir, bucket: "b", distribution: "E1", execute: true, log() {}, aws, fetchImpl: site(state), waitMs: 0, attempts: 1 });
  const phase1 = await run("transition");
  assert.ok(!phase1.xml.includes("renting-gamma"), "the newer release's page leaves before the switch back");
  assert.ok(!phase1.xml.includes("renting-beta"), "the older release's page waits for the switch back");
  goLive(state, { xml: renderSitemap(sitemapEntries(older.dir, ORIGIN)), pages: renderReleasePages(sitemapEntries(older.dir, ORIGIN)) });
  const done = await run("full");
  assert.ok(done.xml.includes("renting-beta") && !done.xml.includes("renting-gamma"));
  assert.ok(done.pages.includes("renting-beta") && !done.pages.includes("renting-gamma"), "the app's page list is the restored release's");
  rmSync(newer.dir, { recursive: true });
  rmSync(older.dir, { recursive: true });
});

test("first deploy with neither file live: phase 1 changes nothing, phase 2 uploads both and checks the page list", async () => {
  const { dir } = await release(NEW);
  const state = { server: "nginx", xml: "<urlset/>" };
  const { aws, calls } = fakeAws(state);
  const run = (phase) => publishSitemap({ phase, distDir: dir, bucket: "b", distribution: "E1", execute: true, log() {}, aws, fetchImpl: site(state), waitMs: 0, attempts: 1 });
  assert.equal((await run("transition")).urls, null);
  assert.deepEqual(calls, []);
  await assert.rejects(run("full"), /does not match/, "the page list must be public after phase 2");
  state.pages = renderReleasePages(sitemapEntries(dir, ORIGIN));
  assert.equal((await run("full")).public, "backend");
  await assert.rejects(publishSitemap({ phase: "full", distDir: mkdtempSync(join(tmpdir(), "empty-")), bucket: "b", distribution: "E1", aws, fetchImpl: site(state), log() {} }), /empty sitemap/);
  rmSync(dir, { recursive: true });
});

test("the sitemap revalidates, is never part of the bulk upload, and is never deleted as stale", async () => {
  const { dir } = await release(NEW);
  writeFileSync(join(dir, "sitemap.xml"), renderSitemap(sitemapEntries(dir, ORIGIN)));
  assert.equal(cacheControlFor("sitemap.xml"), "no-cache");
  assert.equal(cacheControlFor("release-pages.json"), "no-cache");
  const objects = uploadObjects(dir);
  assert.ok(objects.some((o) => o.key === "sitemap.xml"), "part of the release (not deleted as stale)");
  const groups = uploadGroups(objects.filter((o) => o.key !== "sitemap.xml"));
  assert.ok(!groups.some((g) => g.keys.includes("sitemap.xml")));
  rmSync(dir, { recursive: true });
});

test("propagation: whatever mix of file and function versions an edge serves at each step, no listed page is a 404", async () => {
  const r0 = await release(OLD);
  const r1 = await release(NEW);
  const pagesOf = (dir) => new Set(sitemapEntries(dir, ORIGIN).map((e) => e.loc));
  const served = { R0: pagesOf(r0.dir), R1: pagesOf(r1.dir) };
  const transition = new Set(transitionEntries(served.R0, sitemapEntries(r1.dir, ORIGIN)).map((e) => e.loc));
  const files = { R0: served.R0, T: transition, R1: served.R1 };
  // What an edge may serve at each step of a deploy (each file and the function propagate on their own).
  const steps = [
    { step: "phase 1 uploaded, invalidation in progress", files: ["R0", "T"], functions: ["R0"] },
    { step: "invalidation completed (phase 1 waits for it), function switching", files: ["T"], functions: ["R0", "R1"] },
    { step: "verified, phase 2 uploaded, invalidation in progress", files: ["T", "R1"], functions: ["R1"] },
    { step: "deploy fails after phase 1", files: ["T"], functions: ["R0", "R1"] },
  ];
  for (const { step, files: versions, functions } of steps)
    for (const sitemapVersion of versions) for (const listVersion of versions) for (const fn of functions) {
      for (const loc of files[sitemapVersion]) assert.ok(served[fn].has(loc), `${step}: sitemap ${sitemapVersion} lists ${loc}, function ${fn} does not serve it`);
      // The app links only embedded ∩ live; a page loaded from either release's edge.
      for (const embedded of ["R0", "R1"]) for (const loc of files[listVersion])
        if (files[embedded].has(loc)) assert.ok(served[fn].has(loc), `${step}: app (embedded ${embedded}, live ${listVersion}) links ${loc}, function ${fn} does not serve it`);
    }
  // Without the wait, an edge could still serve R0's files with R1's function: a withdrawn page would be listed.
  assert.ok([...files.R0].some((loc) => !served.R1.has(loc)), "without the wait, R0's sitemap under R1's function lists a 404");
  rmSync(r0.dir, { recursive: true });
  rmSync(r1.dir, { recursive: true });
});
