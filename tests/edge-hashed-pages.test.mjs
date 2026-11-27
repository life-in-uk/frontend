// The edge function's hashed page set (SEO F10, option A): routing is the same
// as the build's manifests say for every page, redirect, app route and a corpus
// of awkward URLs in all five locales; hash collisions are detected, resolved by
// another seed, or fail the build; the function stays ES5 and within the quota.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as acorn from "acorn";
import { prerender } from "../scripts/seo/prerender.mjs";
import { expectedPages } from "../scripts/seo/inventory.mjs";
import { writeRedirects } from "../scripts/seo/redirects.mjs";
import { generateViewerRequest, hashedPageTable, loadViewerRequest, MAX_FUNCTION_BYTES, pageHash, viewerEvent } from "../scripts/edge/viewer-request.mjs";

const LOCALES = ["zh-CN", "zh-TW", "en", "ur", "hi"];
const SHELL = '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <title>Life in UK</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" crossorigin src="/assets/index-abc123.js"></script>\n  </body>\n</html>\n';
const LONG = "This paragraph explains the rule in plain words, with the details a tenant needs before acting. ".repeat(4);

async function build() {
  const spec = {
    "zh-CN": [["renting-alpha", "renting"], ["renting-beta", "renting"], ["registering-with-a-gp", "health-nhs"]],
    "zh-TW": [["renting-alpha", "renting"]],
    en: [["renting-alpha", "renting"], ["registering-with-a-gp", "health-nhs"]],
    ur: [["renting-alpha", "renting"]],
    hi: [["registering-with-a-gp", "health-nhs"]],
  };
  const lists = {};
  const details = {};
  for (const locale of LOCALES) {
    const rows = (spec[locale] ?? []).map(([slug, category]) => {
      const meta = { slug, category, title: `${slug} (${locale})`, summary: `${slug} summary.`, publishedAt: "2026-11-16T14:25:00Z", updatedAt: "2026-11-16T14:25:00Z" };
      return { meta, detail: { ...meta, content: `# ${meta.title}\n\n## What to do\n\n${LONG}\n`, sources: [], evidence: [] } };
    });
    lists[locale] = rows.map((row) => row.meta);
    details[locale] = new Map(rows.map((row) => [row.meta.slug, row.detail]));
  }
  const inventory = { lists, details };
  const dir = mkdtempSync(join(tmpdir(), "edge-hash-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), SHELL);
  writeFileSync(join(dir, "assets", "index-abc123.js"), "1");
  await prerender({ distDir: dir, origin: "https://lifeinuk.info", inventory });
  await writeRedirects(dir, expectedPages(inventory));
  return dir;
}

/** What the hosting contract says for a path, from the build's own files (the reference the function must match). */
function expected(dir, path) {
  const bare = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  const redirects = JSON.parse(readFileSync(join(dir, "seo-redirects.json"), "utf8")).redirects;
  const spa = JSON.parse(readFileSync(join(dir, "seo-spa-routes.json"), "utf8"));
  const [first] = bare.slice(1).split("/");
  // A page is an exact directory path: no empty segments (join() would normalise "//" away).
  if (LOCALES.includes(first) && !bare.includes("//") && existsSync(join(dir, bare, "index.html"))) return { uri: `${bare}/index.html` };
  const redirect = redirects.find((row) => row.from === bare);
  if (redirect && !LOCALES.includes(first)) return { statusCode: 301, location: redirect.to };
  if (spa.paths.includes(bare) || spa.prefixes.some((prefix) => bare.startsWith(prefix))) return { uri: "/index.html" };
  return { statusCode: 404 };
}

function pagePaths(dir, base = "") {
  return readdirSync(join(dir, base), { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== "assets")
    .flatMap((e) => [...(existsSync(join(dir, base, e.name, "index.html")) ? [`${base}/${e.name}`] : []), ...pagePaths(dir, `${base}/${e.name}`)]);
}

test("the hashed function routes every page, redirect, app route and awkward URL as the manifests say", async () => {
  const dir = await build();
  const { code, bytes, stats } = generateViewerRequest({ distDir: dir });
  assert.doesNotThrow(() => acorn.parse(code, { ecmaVersion: 5 }), "ES5 for the CloudFront Functions runtime");
  assert.ok(bytes < MAX_FUNCTION_BYTES);
  assert.doesNotMatch(code, /Math\.imul|=>|\blet\b|\bconst\b/, "no ES2015 features in the function");
  const handle = loadViewerRequest(code);
  const pages = pagePaths(dir);
  const redirects = JSON.parse(readFileSync(join(dir, "seo-redirects.json"), "utf8")).redirects.map((row) => row.from);
  const corpus = new Set([
    ...pages, ...pages.map((p) => `${p}/`), ...redirects,
    ...LOCALES.flatMap((l) => [`/${l}`, `/${l}/`, `/${l}/guides`, `/${l}/travel`, `/${l}/renting/renting-gamma`, `/${l}/renting/renting-alpha/extra`]),
    "/EN/renting/renting-alpha", "/zh-cn/renting", "/en/Renting/renting-alpha", "/en/renting/renting%2Dalpha", "/en//renting/renting-alpha",
    "/en/renting/renting-alpha.", "/en/renting/%E4%B8%AD", "/renting/renting-gamma", "/no-such", "/", "/owner/editorial", "/travel",
    "/en/renting/renting-alph", "/en/renting/renting-alphaa", "/ur/health/registering-with-a-gp", "/hi/renting/renting-alpha",
  ]);
  let checked = 0;
  for (const path of corpus) {
    if (path.slice(path.lastIndexOf("/")).includes(".")) continue; // files go to S3 unchanged
    const result = handle(viewerEvent(path, { query: "a=1" }));
    const want = expected(dir, path);
    const got = result.statusCode ? { statusCode: result.statusCode, ...(result.statusCode === 301 ? { location: result.headers.location.value.replace(/\?a=1$/, "") } : {}) } : { uri: result.uri };
    if (path === "/owner/editorial") assert.equal(got.statusCode, 404, "owner tools blocked");
    else assert.deepEqual(got, want, path);
    checked++;
  }
  assert.ok(checked > pages.length * 2, `${checked} paths checked`);
  assert.equal(stats.seed, 0);
  rmSync(dir, { recursive: true });
});

test("hash collisions are detected: another seed is used, or the build fails", () => {
  // Two distinct page keys whose FNV-1a hashes collide under seed 0 (found by a birthday search).
  const pair = ["renting/3jp8-1pn0vc", "renting/41ba-udg1sy"];
  assert.equal(pageHash(pair[0], 0), pageHash(pair[1], 0), "a real seed-0 collision");
  const pages = { [pair[0]]: 1, [pair[1]]: 4, "renting/renting-alpha": 31 };
  const { seed, table } = hashedPageTable(pages);
  assert.ok(seed > 0, "seed 0 rejected because two pages share a hash");
  assert.equal(table.length, 3 * 8);
  assert.notEqual(pageHash(pair[0], seed), pageHash(pair[1], seed));
  assert.throws(() => hashedPageTable(pages, { seeds: 1 }), /collide/);
});
