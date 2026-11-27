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
import { renderSitemap, sitemapEntries, sitemapLocs, transitionEntries } from "../scripts/seo/sitemap.mjs";
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

/** A public site whose /sitemap.xml is served by S3 (the given XML) or by the backend. */
function site(state) {
  return async () => ({
    status: state.status ?? 200,
    ok: (state.status ?? 200) < 400,
    headers: new Headers({ server: state.server }),
    text: async () => state.xml,
  });
}

/** A fake AWS CLI that records uploads to the bucket and makes them the public sitemap. */
function fakeAws(state) {
  const calls = [];
  const aws = (args) => {
    calls.push(args.slice(0, 2).join(" "));
    if (args[0] === "s3" && args[1] === "cp") {
      state.uploaded = (state.uploaded ?? 0) + 1;
      state.pendingXml = args[2];
      return "";
    }
    if (args[0] === "cloudfront" && args[1] === "create-invalidation") return { Invalidation: { Id: "I1" } };
    throw new Error(`unexpected ${args.join(" ")}`);
  };
  return { aws, calls };
}

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
  const liveXml = renderSitemap(sitemapEntries(before.dir, ORIGIN));
  const state = { server: "AmazonS3", xml: liveXml };
  const { aws, calls } = fakeAws(state);
  const run = (phase, extra = {}) => publishSitemap({ phase, distDir: after.dir, bucket: "b", distribution: "E1", execute: true, log() {}, aws, fetchImpl: site(state), waitMs: 0, attempts: 2, ...extra });

  const phase1 = await run("transition");
  assert.deepEqual(calls, ["s3 cp", "cloudfront create-invalidation"]);
  state.xml = phase1.xml; // what the public now serves
  // A deploy that fails here leaves this sitemap: every URL is served by the old and the new release.
  const oldLocs = sitemapLocs(liveXml);
  const newLocs = new Set(sitemapEntries(after.dir, ORIGIN).map((e) => e.loc));
  for (const loc of sitemapLocs(phase1.xml)) assert.ok(oldLocs.has(loc) && newLocs.has(loc), loc);

  // Phase 2: the public sitemap does not change (a stale edge) → it fails; once it matches → passes.
  await assert.rejects(run("full"), /does not match this release/);
  const full = renderSitemap(sitemapEntries(after.dir, ORIGIN));
  state.xml = full;
  const done = await run("full");
  assert.equal(done.public, "bucket");
  assert.equal(sitemapLocs(done.xml).size, newLocs.size);
  rmSync(before.dir, { recursive: true });
  rmSync(after.dir, { recursive: true });
});

test("rollback to an older release: its own pages only, also when it is older than the sitemap steps", async () => {
  const newer = await release(NEW);
  const older = await release(OLD);
  const state = { server: "AmazonS3", xml: renderSitemap(sitemapEntries(newer.dir, ORIGIN)) };
  const { aws } = fakeAws(state);
  const run = (phase) => publishSitemap({ phase, distDir: older.dir, bucket: "b", distribution: "E1", execute: true, log() {}, aws, fetchImpl: site(state), waitMs: 0, attempts: 1 });
  const phase1 = await run("transition");
  assert.ok(!phase1.xml.includes("renting-gamma"), "the newer release's page leaves before the switch back");
  assert.ok(!phase1.xml.includes("renting-beta"), "the older release's page waits for the switch back");
  state.xml = renderSitemap(sitemapEntries(older.dir, ORIGIN));
  const done = await run("full");
  assert.ok(done.xml.includes("renting-beta") && !done.xml.includes("renting-gamma"));
  rmSync(newer.dir, { recursive: true });
  rmSync(older.dir, { recursive: true });
});

test("before CloudFront serves the sitemap from the bucket: phase 1 changes nothing, phase 2 uploads without comparing", async () => {
  const { dir } = await release(NEW);
  const state = { server: "nginx", xml: "<urlset/>" };
  const { aws, calls } = fakeAws(state);
  const run = (phase) => publishSitemap({ phase, distDir: dir, bucket: "b", distribution: "E1", execute: true, log() {}, aws, fetchImpl: site(state), waitMs: 0, attempts: 1 });
  assert.equal((await run("transition")).urls, null);
  assert.deepEqual(calls, []);
  assert.equal((await run("full")).public, "backend");
  assert.deepEqual(calls, ["s3 cp", "cloudfront create-invalidation"]);
  await assert.rejects(publishSitemap({ phase: "full", distDir: mkdtempSync(join(tmpdir(), "empty-")), bucket: "b", distribution: "E1", aws, fetchImpl: site(state), log() {} }), /empty sitemap/);
  rmSync(dir, { recursive: true });
});

test("the sitemap revalidates, is never part of the bulk upload, and is never deleted as stale", async () => {
  const { dir } = await release(NEW);
  writeFileSync(join(dir, "sitemap.xml"), renderSitemap(sitemapEntries(dir, ORIGIN)));
  assert.equal(cacheControlFor("sitemap.xml"), "no-cache");
  const objects = uploadObjects(dir);
  assert.ok(objects.some((o) => o.key === "sitemap.xml"), "part of the release (not deleted as stale)");
  const groups = uploadGroups(objects.filter((o) => o.key !== "sitemap.xml"));
  assert.ok(!groups.some((g) => g.keys.includes("sitemap.xml")));
  rmSync(dir, { recursive: true });
});
