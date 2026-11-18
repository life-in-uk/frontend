// CI/CD release checks (docs/ci-cd.md): the production API's rate limit is
// retried instead of failing a build, and the release-output check catches
// local URLs, stray noindex, a wrong build origin or Guide API, and a
// robots.txt that blocks crawling.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withRetryOn429 } from "../scripts/seo/retry.mjs";
import { checkMarker, checkRobots, scanDist } from "../scripts/ci/check-release-output.mjs";

test("a 429 is retried with Retry-After or backoff, other statuses are returned at once", async () => {
  const waits = [];
  const wait = async (ms) => waits.push(ms);
  const replies = [
    { status: 429, headers: { "retry-after": "2" } },
    { status: 429, headers: new Headers() },
    { status: 200, headers: {} },
  ];
  const response = await withRetryOn429(async () => replies.shift(), { wait });
  assert.equal(response.status, 200);
  assert.deepEqual(waits, [2000, 2000]);

  let calls = 0;
  const notFound = await withRetryOn429(async () => (calls++, { status: 404, headers: {} }), { wait });
  assert.equal(notFound.status, 404);
  assert.equal(calls, 1);

  calls = 0;
  const limited = await withRetryOn429(async () => (calls++, { status: 429, headers: {} }), { wait, attempts: 3 });
  assert.equal(limited.status, 429, "after the last attempt the 429 is returned, not hidden");
  assert.equal(calls, 3);
});

test("the release scan finds local URLs in any uploaded file and noindex outside 404.html", () => {
  const dist = mkdtempSync(join(tmpdir(), "ci-release-"));
  try {
    mkdirSync(join(dist, "assets"));
    mkdirSync(join(dist, "en", "renting"), { recursive: true });
    writeFileSync(join(dist, "404.html"), '<meta name="robots" content="noindex">');
    writeFileSync(join(dist, "index.html"), '<div id="root"></div>');
    writeFileSync(join(dist, "assets", "app.js"), 'const ok="https://lifeinuk.info/api";const robots="noindex";');
    const clean = scanDist(dist);
    assert.deepEqual(clean.errors, []);
    assert.equal(clean.scanned, 3);

    writeFileSync(join(dist, "assets", "chunk.js"), 'fetch("http://127.0.0.1:8188/api/guides")');
    writeFileSync(join(dist, "assets", "dev.css"), "a{background:url(//localhost:5173/x.png)}");
    writeFileSync(join(dist, "en", "renting", "index.html"), '<meta content="noindex,follow" name="robots"><meta name="robots" content="noindex">');
    writeFileSync(join(dist, "seo-redirects.json"), '{"from":"http://localhost:1/"}'); // build manifest: never uploaded, never scanned
    const { errors } = scanDist(dist);
    assert.equal(errors.length, 3, errors.join("\n"));
    assert.match(errors.join("\n"), /assets\/chunk\.js: local or private URL http:\/\/127\.0\.0\.1/);
    assert.match(errors.join("\n"), /assets\/dev\.css: local or private URL \/\/localhost/);
    assert.match(errors.join("\n"), /en\/renting\/index\.html: robots noindex/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test("the release marker must describe this dist/, an https origin, a clean tree and, when required, the production API", () => {
  const good = { origin: "https://lifeinuk.info", distDir: "/w/dist", dirty: false, apiBase: "https://lifeinuk.info" };
  assert.deepEqual(checkMarker(good, { distDir: "/w/dist", expectApi: "https://lifeinuk.info" }), []);
  assert.match(checkMarker(null, { distDir: "/w/dist" })[0], /missing/);
  const bad = checkMarker({ ...good, origin: "http://127.0.0.1:4174", dirty: true, apiBase: "http://127.0.0.1:8188" }, { distDir: "/w/other", expectApi: "https://lifeinuk.info" });
  assert.equal(bad.length, 4, bad.join("\n"));
  assert.deepEqual(checkMarker({ ...good, apiBase: "http://127.0.0.1:18080" }, { distDir: "/w/dist" }), [], "a local tunnel build is fine without --expect-api");
});

test("robots.txt must allow crawling and name the public sitemap", () => {
  const origin = "https://lifeinuk.info";
  assert.deepEqual(checkRobots("User-agent: *\nAllow: /\nSitemap: https://lifeinuk.info/sitemap.xml\n", origin), []);
  assert.deepEqual(checkRobots("User-agent: *\nDisallow: /owner/\nSitemap: https://lifeinuk.info/sitemap.xml", origin), []);
  const errors = checkRobots("User-agent: *\nDisallow: /\nSitemap: http://127.0.0.1:8188/sitemap.xml", origin);
  assert.equal(errors.length, 2);
});
