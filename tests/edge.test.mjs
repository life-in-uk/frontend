// The production edge (docs/deploy-cloudfront.md): the generated CloudFront
// viewer-request function must route exactly like the reference static host,
// keep the backend's JSON error bodies, stay within the CloudFront Functions
// quota, and the deploy and verification tools must refuse unsafe releases
// and catch a broken site. Everything runs locally against fixture builds.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import * as acorn from "acorn";
import { expectedPages } from "../scripts/seo/inventory.mjs";
import { prerender } from "../scripts/seo/prerender.mjs";
import { writeRedirects } from "../scripts/seo/redirects.mjs";
import { createStaticHost } from "../scripts/seo/static-host.mjs";
import { createEdgeEmulator } from "../scripts/edge/emulator.mjs";
import { exchange, verifySite } from "../scripts/edge/verify-site.mjs";
import { deploySite, staleObjects, uploadGroups } from "../scripts/edge/deploy-site.mjs";
import { compareBucket, preflightSite, READ_ONLY_CALLS } from "../scripts/edge/preflight-site.mjs";
import { createHash } from "node:crypto";
import { uploadObjects } from "../scripts/edge/objects.mjs";
import { renderSitemap, sitemapEntries } from "../scripts/seo/sitemap.mjs";
import { generateViewerRequest, loadViewerRequest, MAX_FUNCTION_BYTES, viewerEvent } from "../scripts/edge/viewer-request.mjs";

const ORIGIN = "https://lifeinuk.info";
const HOST = "lifeinuk.info";
const LOCALES = ["zh-CN", "zh-TW", "en", "ur", "hi"];
const SHELL = '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <title>Life in UK</title>\n    <script type="module" crossorigin src="/assets/index-abc123.js"></script>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n';
const LONG = "This paragraph explains the rule in plain words, with the details a tenant needs before acting. ".repeat(4);

function guide(slug, locale, category = "renting") {
  const title = `${slug} title (${locale})`;
  const meta = { slug, category, title, summary: `${slug} summary in ${locale}.`, publishedAt: "2026-11-16T14:25:00Z", updatedAt: "2026-11-16T14:25:00Z" };
  return {
    meta,
    detail: {
      ...meta,
      content: `# ${title}\n\n## What to do\n\n${LONG}\n\n- First step. [See the official source](#guide-evidence-key-one)\n`,
      sources: [{ key: "gov", organisation: "GOV.UK", title: "Source", url: "https://www.gov.uk/example", accessedAt: "2026-11-16T14:14:24Z" }],
      evidence: [{ key: "key-one", statement: "A statement from the source.", supports: [{ sourceKey: "gov", locator: "x", excerpt: null, note: null }] }],
    },
  };
}

// renting-beta is zh-CN only; the GP Guide is missing in ur and hi: partial locale sets must be routed exactly.
const SPEC = {
  "zh-CN": [["renting-alpha"], ["renting-beta"], ["registering-with-a-gp", "health-nhs"]],
  "zh-TW": [["renting-alpha"], ["registering-with-a-gp", "health-nhs"]],
  en: [["renting-alpha"], ["registering-with-a-gp", "health-nhs"]],
  ur: [["renting-alpha"]],
  hi: [["renting-alpha"]],
};

function inventory(spec = SPEC) {
  const lists = {};
  const details = {};
  for (const locale of LOCALES) {
    const rows = (spec[locale] ?? []).map(([slug, category]) => guide(slug, locale, category));
    lists[locale] = rows.map((row) => row.meta);
    details[locale] = new Map(rows.map((row) => [row.meta.slug, row.detail]));
  }
  return { lists, details };
}

async function build(inv = inventory()) {
  const dir = mkdtempSync(join(tmpdir(), "edge-release-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), SHELL);
  writeFileSync(join(dir, "assets", "index-abc123.js"), "console.log(1)");
  writeFileSync(join(dir, "favicon.svg"), "<svg/>");
  await prerender({ distDir: dir, origin: ORIGIN, inventory: inv });
  await writeRedirects(dir, expectedPages(inv));
  // As build:release does: the release's own sitemap (served from the bucket).
  writeFileSync(join(dir, "sitemap.xml"), renderSitemap(sitemapEntries(dir, ORIGIN)));
  return dir;
}

/** A stand-in Guide API for the fixture inventory (gzip when asked, JSON errors). */
function stubApi(inv, { htmlErrors = false } = {}) {
  const pages = expectedPages(inv);
  return createServer((req, res) => {
    const url = new URL(req.url, "http://api");
    const send = (status, body, type = "application/json") => {
      let data = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
      const headers = { "content-type": type, "cache-control": "no-store" };
      if (/gzip/.test(req.headers["accept-encoding"] ?? "")) {
        data = gzipSync(data);
        headers["content-encoding"] = "gzip";
      }
      res.writeHead(status, headers).end(data);
    };
    const notFound = () => (htmlErrors ? send(404, "<html>error page</html>", "text/html") : send(404, { code: "GUIDE_NOT_FOUND" }));
    let m;
    if (url.pathname === "/api/guides") return send(200, inv.lists["zh-CN"]);
    if ((m = url.pathname.match(/^\/api\/guides\/locales\/([^/]+)$/))) return send(200, inv.lists[m[1]] ?? []);
    if ((m = url.pathname.match(/^\/api\/guides\/([^/]+)\/locales\/([^/]+)$/))) {
      const detail = inv.details[m[2]]?.get(m[1]);
      return detail ? send(200, { locale: m[2], guide: detail, contentHash: "a".repeat(64) }) : notFound();
    }
    if (url.pathname === "/api/boom") return send(500, { code: "INTERNAL" });
    if (url.pathname.startsWith("/api/")) return notFound();
    if (url.pathname === "/sitemap.xml")
      return send(200, `<urlset>${pages.map((page) => `<url><loc>${ORIGIN}${page.path}</loc></url>`).join("")}</urlset>`, "application/xml");
    if (url.pathname === "/robots.txt") return send(200, `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`, "text/plain");
    send(404, "not found", "text/plain");
  });
}

const listen = (server) => new Promise((done) => server.listen(0, "127.0.0.1", () => done(`http://127.0.0.1:${server.address().port}`)));
const close = (...servers) => Promise.all(servers.map((server) => new Promise((done) => server.close(done))));

async function site(dir, inv, apiOptions) {
  const api = stubApi(inv, apiOptions);
  const apiBase = await listen(api);
  const { code } = generateViewerRequest({ distDir: dir });
  const edge = createEdgeEmulator({ distDir: dir, code, apiBase });
  const base = await listen(edge);
  return { base, api, edge, code };
}

test("the generated function is ES5, fits the quota and serves every page, redirect and app route of the build", async () => {
  const dir = await build();
  const { code, bytes, stats } = generateViewerRequest({ distDir: dir });
  assert.doesNotThrow(() => acorn.parse(code, { ecmaVersion: 5 }), "CloudFront function source must parse as ES5");
  assert.ok(bytes < MAX_FUNCTION_BYTES);
  // Guides: alpha ×5, beta ×1, GP ×3; hubs: renting ×5, health ×3; homes ×5; Guide indexes ×5.
  assert.equal(stats.localizedPages, 27);
  // zh-CN short URLs: the root, two hubs, the Guide index and three Guides.
  assert.equal(stats.redirects, 7);
  const handle = loadViewerRequest(code);
  const unordered = viewerEvent("/renting", { query: "b=%E4%B8%AD&a=2&a=1&flag" });
  assert.equal(handle(unordered).headers.location.value,
    "/zh-CN/renting?a=2&a=1&b=%E4%B8%AD&flag", "normalize key order while preserving repeated values and flags");
  assert.equal(handle(viewerEvent("/ur/health/registering-with-a-gp")).statusCode, 404, "a Guide not published in ur is a real 404");
  assert.equal(handle(viewerEvent("/zh-TW/health/registering-with-a-gp/")).uri, "/zh-TW/health/registering-with-a-gp/index.html");
  rmSync(dir, { recursive: true });
});

test("routing matches the reference static host, except that owner tools are never public", async () => {
  const inv = inventory();
  const dir = await build(inv);
  const { base, api, edge } = await site(dir, inv);
  const reference = createStaticHost(dir);
  const referenceBase = await listen(reference);
  const pages = expectedPages(inv).map((page) => page.path);
  const redirects = JSON.parse(readFileSync(join(dir, "seo-redirects.json"), "utf8")).redirects.map((row) => row.from);
  const spa = JSON.parse(readFileSync(join(dir, "seo-spa-routes.json"), "utf8")).paths;
  const probes = [
    ...pages, ...pages.map((path) => `${path}/`),
    ...redirects.map((path) => `${path}?a=1&b=%E4%B8%AD`), ...redirects.filter((p) => p !== "/").map((path) => `${path}/`),
    ...spa,
    "/en/no-such-section", "/en/renting/no-such-guide", "/renting/no-such-guide", "/en/renting/renting-alpha/extra",
    "/ur/health/registering-with-a-gp", "/en/renting/renting-beta", "/EN", "/no-such-page",
    "/assets/index-abc123.js", "/assets/missing.js", "/favicon.svg", "/missing.png",
  ];
  const ownerPaths = (path) => path === "/owner/editorial" || path.startsWith("/owner/");
  let compared = 0;
  for (const path of probes) {
    const viaEdge = await exchange(new URL(path, base), { host: HOST });
    const viaReference = await exchange(new URL(path, referenceBase));
    if (ownerPaths(path)) {
      assert.equal(viaEdge.status, 404, `${path}: owner tools must be 404 at the edge`);
      continue;
    }
    assert.equal(viaEdge.status, viaReference.status, `${path}: status`);
    if (viaEdge.status === 301) assert.equal(viaEdge.headers.location, viaReference.headers.location, `${path}: Location`);
    else if (viaEdge.status === 200 || String(viaReference.headers["content-type"]).startsWith("text/html"))
      assert.ok(viaEdge.body.equals(viaReference.body), `${path}: body`);
    compared++;
  }
  assert.ok(compared > pages.length * 2);
  await close(api, edge, reference);
  rmSync(dir, { recursive: true });
});

test("API responses pass through unchanged, so JSON error bodies are never replaced by the HTML 404 page", async () => {
  const inv = inventory();
  const dir = await build(inv);
  const { base, api, edge } = await site(dir, inv);
  for (const [path, status, code] of [["/api/guides/no-such-guide", 404, "GUIDE_NOT_FOUND"], ["/api/boom", 500, "INTERNAL"]]) {
    const response = await exchange(new URL(path, base), { host: HOST });
    assert.equal(response.status, status, path);
    assert.equal(response.headers["content-type"], "application/json", path);
    assert.deepEqual(JSON.parse(response.body), { code }, path);
  }
  const gzipped = await exchange(new URL("/api/guides", base), { host: HOST, headers: { "accept-encoding": "gzip" } });
  assert.equal(gzipped.headers["content-encoding"], "gzip", "compression from the origin is kept");
  for (const path of ["/api/owner/editorial/session", "/api/editorial/guide-batches"])
    assert.equal((await exchange(new URL(path, base), { host: HOST })).status, 404, `${path} is blocked at the edge`);
  const www = await exchange(new URL("/en/renting?x=1", base), { host: `www.${HOST}` });
  assert.equal(www.status, 301);
  assert.equal(www.headers.location, `${ORIGIN}/en/renting?x=1`);
  await close(api, edge);
  rmSync(dir, { recursive: true });
});

test("verifySite passes on a correct site and reports a missing page and an API error page", async () => {
  const inv = inventory();
  const dir = await build(inv);
  let { base, api, edge } = await site(dir, inv);
  const ok = await verifySite({ base, distDir: dir, host: HOST });
  assert.deepEqual(ok.failures, []);
  assert.deepEqual(ok.warnings, []);
  assert.equal(ok.results["canonical pages"].passed, expectedPages(inv).length * 2);
  assert.equal(ok.results["locale home pages"].passed, 5);
  await close(api, edge);

  // Same release, but the deployed bucket lacks a page and the API errors come back as HTML.
  const deployed = mkdtempSync(join(tmpdir(), "edge-deployed-"));
  for (const object of uploadObjects(dir)) {
    mkdirSync(join(deployed, object.key, ".."), { recursive: true });
    writeFileSync(join(deployed, object.key), readFileSync(object.file));
  }
  for (const file of ["seo-redirects.json", "seo-spa-routes.json"]) writeFileSync(join(deployed, file), readFileSync(join(dir, file)));
  rmSync(join(deployed, "en", "renting", "renting-alpha"), { recursive: true });
  const apiBroken = stubApi(inv, { htmlErrors: true });
  const { code } = generateViewerRequest({ distDir: dir });
  const edgeBroken = createEdgeEmulator({ distDir: deployed, code, apiBase: await listen(apiBroken) });
  const bad = await verifySite({ base: await listen(edgeBroken), distDir: dir, host: HOST });
  assert.ok(bad.failures.some((f) => f.startsWith("[canonical pages] /en/renting/renting-alpha: status 404")), bad.failures.join("\n"));
  assert.ok(bad.failures.some((f) => f.startsWith("[api errors keep JSON]")), bad.failures.join("\n"));
  await close(apiBroken, edgeBroken);
  rmSync(deployed, { recursive: true });
  rmSync(dir, { recursive: true });
});

test("the generator refuses builds whose redirects disagree with their pages, and functions over the quota", async () => {
  const dir = await build();
  const file = join(dir, "seo-redirects.json");
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  writeFileSync(file, JSON.stringify({ ...manifest, redirects: manifest.redirects.filter((row) => row.from !== "/renting") }));
  assert.throws(() => generateViewerRequest({ distDir: dir }), /\/renting: the function would redirect it/);
  writeFileSync(file, JSON.stringify({ ...manifest, redirects: [...manifest.redirects, { from: "/money", to: "/zh-CN/money", status: 301 }] }));
  assert.throws(() => generateViewerRequest({ distDir: dir }), /\/money: expected 301 to \/zh-CN\/money/);
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(() => generateViewerRequest({ distDir: dir, maxBytes: 2000 }), /KeyValueStore/);
  rmSync(dir, { recursive: true });
});

function release(dir, overrides = {}) {
  const marker = join(dir, "..", `${dir.split("/").pop()}-build.json`);
  writeFileSync(marker, JSON.stringify({ origin: ORIGIN, distDir: dir, commit: "c0ffee", dirty: false, ...overrides }));
  return marker;
}
const cleanGit = (...args) => (args[0] === "rev-parse" ? "c0ffee" : "");

test("deploy: the plan uploads assets before HTML with the right headers, never manifests, and needs a validated, committed release", async () => {
  const dir = await build();
  const lines = [];
  const plan = await deploySite({ distDir: dir, bucket: "site-bucket", distribution: "E123", functionName: "lifeinuk-viewer-request", markerFile: release(dir), git: cleanGit, log: (line) => lines.push(line) });
  const groups = uploadGroups(uploadObjects(dir));
  assert.ok(groups[0].asset && groups.at(-1).ext === ".html", "assets first, HTML last");
  assert.equal(groups.find((g) => g.asset).cacheControl, "public, max-age=31536000, immutable");
  assert.equal(groups.at(-1).cacheControl, "no-cache");
  const out = lines.join("\n");
  assert.ok(!/seo-(redirects|spa-routes)\.json[^ ]*\s*\[/.test(out));
  for (const line of lines.filter((l) => l.includes("aws s3 cp")))
    assert.ok(line.includes("--exclude seo-redirects.json") && line.includes("--exclude seo-spa-routes.json"), line);
  assert.ok(out.includes("Dry run only"));
  assert.equal(plan.objects, uploadObjects(dir).length);
  assert.ok(!uploadObjects(dir).some((o) => o.key.startsWith("seo-")));

  const refuse = (overrides, git, pattern) =>
    assert.rejects(deploySite({ distDir: dir, bucket: "b", distribution: "E", functionName: "f", markerFile: release(dir, overrides), git, log() {} }), pattern);
  await refuse({ origin: "http://127.0.0.1:5198" }, cleanGit, /built for http:\/\/127\.0\.0\.1:5198/);
  await refuse({ dirty: true }, cleanGit, /uncommitted changes/);
  await refuse({ commit: "0ld" }, cleanGit, /rebuild/);
  await refuse({}, (...args) => (args[0] === "rev-parse" ? "c0ffee" : " M src/App.tsx"), /working tree/);
  rmSync(dir, { recursive: true });
});

test("deploy --execute: CloudFront test-function results gate publishing (fake AWS CLI)", async () => {
  const dir = await build();
  const work = mkdtempSync(join(tmpdir(), "edge-fake-aws-"));
  const state = join(work, "calls.jsonl");
  const fake = join(work, "aws");
  // Answers like the AWS CLI; test-function runs the uploaded code locally unless FAKE_WRONG is set.
  writeFileSync(fake, `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(state)}, JSON.stringify(args) + "\\n");
const opt = (name) => args[args.indexOf(name) + 1];
const out = (value) => process.stdout.write(JSON.stringify(value));
const cmd = args[1];
if (cmd === "describe-function") out({ ETag: "E1" });
else if (cmd === "update-function") { fs.writeFileSync(${JSON.stringify(join(work, "code.js"))}, fs.readFileSync(opt("--function-code").slice(8))); out({ ETag: "E2" }); }
else if (cmd === "test-function") {
  const vm = require("vm"); const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(${JSON.stringify(join(work, "code.js"))}, "utf8") + "\\nthis.h = handler;", ctx);
  let result = ctx.h(JSON.parse(fs.readFileSync(opt("--event-object").slice(8), "utf8")));
  if (process.env.FAKE_WRONG) result = { uri: "/wrong" };
  out({ TestResult: { FunctionOutput: JSON.stringify(result.statusCode ? { response: result } : { request: result }) } });
}
else if (cmd === "publish-function") out({ FunctionSummary: { Name: "f" } });
else if (cmd === "list-objects-v2") out([
  { Key: "index.html", LastModified: new Date().toISOString() },
  { Key: "old/removed/index.html", LastModified: new Date().toISOString() },
  { Key: "assets/previous-release.js", LastModified: new Date().toISOString() },
  { Key: "assets/long-gone.js", LastModified: "2020-01-01T00:00:00.000Z" },
]);
else if (cmd === "delete-objects") { fs.copyFileSync(opt("--delete").slice(7), ${JSON.stringify(join(work, "deleted.json"))}); out({}); }
else if (cmd === "create-invalidation") out({ Invalidation: { Id: "I1" } });
`);
  chmodSync(fake, 0o755);
  const calls = () => readFileSync(state, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  const run = () => deploySite({ distDir: dir, bucket: "b", distribution: "E123", functionName: "f", execute: true, markerFile: release(dir), git: cleanGit, log() {} });
  process.env.AWS_CLI = fake;
  await run();
  const commands = calls().map((args) => args.slice(0, 2).join(" "));
  const order = ["s3 cp", "cloudfront update-function", "cloudfront test-function", "cloudfront publish-function", "s3api delete-objects", "cloudfront create-invalidation"]
    .map((name) => commands.indexOf(name));
  assert.ok(!order.includes(-1), `missing step: ${commands.join(", ")}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, `deploy order: ${commands.join(", ")}`);
  assert.equal(commands.filter((c) => c === "cloudfront test-function").length, 6, "every sample event is tested in the runtime");
  // Only objects that are not part of this release are deleted; a recent earlier asset stays for open pages.
  assert.deepEqual(JSON.parse(readFileSync(join(work, "deleted.json"), "utf8")).Objects, [{ Key: "old/removed/index.html" }, { Key: "assets/long-gone.js" }]);
  writeFileSync(state, "");
  process.env.FAKE_WRONG = "1";
  await assert.rejects(run(), /test-function "page": CloudFront gave \{"uri":"\/wrong"\}.*nothing was published/);
  assert.ok(!calls().some((args) => args[1] === "publish-function"), "nothing is published after a failed runtime test");
  delete process.env.FAKE_WRONG;
  delete process.env.AWS_CLI;
  rmSync(work, { recursive: true });
  rmSync(dir, { recursive: true });
});

test("deploy: stale objects are bounded, and recent assets of earlier releases are kept", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  const release = Array.from({ length: 300 }, (_, i) => `en/page-${i}/index.html`);
  const day = (n) => new Date(now - n * 24 * 3600 * 1000).toISOString();
  const listed = [
    ...release.map((Key) => ({ Key, LastModified: day(1) })),
    { Key: "en/withdrawn/index.html", LastModified: day(30) },
    { Key: "assets/old-a.js", LastModified: day(2) },
    { Key: "assets/old-b.js", LastModified: day(8) },
  ];
  assert.deepEqual(staleObjects(listed, release, { now }), { remove: ["en/withdrawn/index.html", "assets/old-b.js"], keptAssets: 1 });
  assert.deepEqual(staleObjects(null, release, { now }), { remove: [], keptAssets: 0 }, "an empty bucket lists nothing");
  // A wrong bucket or a broken release would remove far more than withdrawn Guides do.
  const foreign = Array.from({ length: 31 }, (_, i) => ({ Key: `other-project/${i}.html`, LastModified: day(1) }));
  assert.throws(() => staleObjects([...listed, ...foreign], release, { now }), /refusing to delete 32 objects .*limit 30/);
  assert.equal(staleObjects([...listed, ...foreign], release, { now, allowLarge: true }).remove.length, 33);
});

test("preflight: read-only calls only; reports identical, changed, new and stale objects; fails if the role is too broad", async () => {
  const dir = await build();
  const objects = uploadObjects(dir);
  const md5 = (file) => createHash("md5").update(readFileSync(file)).digest("hex");
  const { code } = generateViewerRequest({ distDir: dir });
  const calls = [];
  // A fake AWS: the bucket holds the release with one changed page, one page missing and one stale page.
  const fakeAws = ({ liveCode = code, allow = [] } = {}) => (args) => {
    const name = args.slice(0, 2).join(" ");
    calls.push(name);
    assert.ok(READ_ONLY_CALLS.has(name), `unexpected call ${name}`);
    const ok = (json) => ({ ok: true, json, error: "" });
    const denied = { ok: false, json: null, error: `An error occurred (AccessDenied) when calling ${name}` };
    if (name === "sts get-caller-identity") return ok({ Arn: "arn:aws:sts::1:assumed-role/LifeInUK-GitHub-FrontendDeploy/x" });
    if (name === "cloudfront describe-function") return ok({ FunctionSummary: { Status: "DEPLOYED" } });
    if (name === "cloudfront get-function") { writeFileSync(args.at(-1), liveCode); return ok({}); }
    if (name === "s3api list-objects-v2") return ok([
      ...objects.slice(2).map((o, i) => ({ Key: o.key, ETag: `"${i === 0 ? "0".repeat(32) : md5(o.file)}"`, LastModified: new Date().toISOString() })),
      { Key: "en/withdrawn/index.html", ETag: '"x"', LastModified: new Date().toISOString() },
    ]);
    return allow.includes(name) ? ok({}) : denied;
  };
  const lines = [];
  const run = (aws) => preflightSite({ distDir: dir, bucket: "b", distribution: "E123", functionName: "f", markerFile: release(dir), git: cleanGit, aws, log: (l) => lines.push(l) });

  let result = await run(fakeAws());
  assert.deepEqual(result.problems, []);
  const out = lines.join("\n");
  assert.match(out, /identical/);
  assert.match(out, new RegExp(`${objects.length - 3} identical, 1 changed, 2 new; a deploy would delete 1`));
  assert.match(out, /would delete: en\/withdrawn\/index\.html/);
  assert.match(out, /Function f: LIVE DEPLOYED; this release's code \(\d+ bytes\) is identical/);
  assert.ok(calls.every((c) => READ_ONLY_CALLS.has(c)), calls.join(", "));
  for (const write of ["s3 cp", "s3api delete-objects", "cloudfront update-function", "cloudfront publish-function", "cloudfront create-invalidation"])
    assert.ok(!READ_ONLY_CALLS.has(write) && !calls.includes(write), `${write} must never be called`);

  lines.length = 0;
  result = await run(fakeAws({ liveCode: "function handler(e){return e.request}", allow: ["s3api list-buckets"] }));
  assert.match(lines.join("\n"), /DIFFERENT \(a deploy would update and publish it\)/);
  assert.deepEqual(result.problems, ["the role is allowed aws s3api list-buckets, which it must not be"]);

  result = await run((args) => (args[0] === "sts" ? { ok: false, json: null, error: "Not authorized to perform sts:AssumeRoleWithWebIdentity" } : fakeAws()(args)));
  assert.match(result.problems[0], /AWS identity: Not authorized/);
  await assert.rejects(Promise.resolve().then(() => preflightSite({ distDir: dir, bucket: "b", distribution: "E", functionName: "f", markerFile: release(dir), git: cleanGit,
    aws: (args) => { if (args[1] === "list-objects-v2") throw new Error("boom"); return fakeAws()(args); }, log() {} })), /boom/);
  rmSync(dir, { recursive: true });
});

test("preflight: multipart ETags count as changed and the deploy guard is reported, not thrown", () => {
  const objects = [{ key: "a.html", file: "a" }, { key: "assets/x.js", file: "x" }];
  const listed = [{ Key: "a.html", ETag: '"abc-2"', LastModified: "2026-11-18T00:00:00Z" }, ...Array.from({ length: 25 }, (_, i) => ({ Key: `other/${i}.html`, ETag: '"1"', LastModified: "2026-11-18T00:00:00Z" }))];
  const plan = compareBucket(listed, objects, { md5: () => "abc" });
  assert.deepEqual(plan.changed, ["a.html"]);
  assert.deepEqual(plan.added, ["assets/x.js"]);
  assert.match(plan.guard, /refusing to delete 25 objects/);
});
