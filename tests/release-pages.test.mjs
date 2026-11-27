// Catalogue consistency: API lists are narrowed to the Guides the deployed
// release has pages for (/release-pages.json), so the app never links a Guide
// published after the release or removed by a rollback; without the list the
// app is unchanged (fail open), and a failed fetch is retried later.
import test from "node:test";
import assert from "node:assert/strict";
import { clearReleaseGuides, clearSessionCache, getGuides, getLocalizedGuides } from "../src/guides/api.ts";

const meta = (slug, category = "money") => ({ slug, category, title: slug, summary: "s", publishedAt: "2026-11-27T10:00:00Z", updatedAt: "2026-11-27T10:00:00Z" });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const LIST = [meta("uk-paye-tax-codes-national-insurance"), meta("new-money-guide")];

function withBrowser(t, pages) {
  globalThis.window = globalThis.window ?? {};
  clearReleaseGuides();
  clearSessionCache();
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(String(url));
    if (String(url) === "/release-pages.json") return typeof pages === "function" ? pages() : pages === null ? json({}, 404) : json({ pages });
    return json(LIST);
  });
  t.after(() => { delete globalThis.window; clearReleaseGuides(); clearSessionCache(); });
  return calls;
}

test("publication: a Guide published after the release is not listed until a release has its page", async (t) => {
  withBrowser(t, ["/en", "/en/money", "/en/money/uk-paye-tax-codes-national-insurance", "/zh-CN/money/uk-paye-tax-codes-national-insurance", "/en/family-visa/topics/x"]);
  assert.deepEqual((await getLocalizedGuides("en")).map((g) => g.slug), ["uk-paye-tax-codes-national-insurance"]);
  assert.deepEqual((await getGuides()).map((g) => g.slug), ["uk-paye-tax-codes-national-insurance"], "zh-CN too");
  assert.deepEqual((await getLocalizedGuides("ur")).map((g) => g.slug), [], "not in this locale's release");
});

test("rollback: a release without the page hides the Guide; a later release with it shows it", async (t) => {
  let pages = ["/en/money/uk-paye-tax-codes-national-insurance"];
  withBrowser(t, () => json({ pages }));
  assert.equal((await getLocalizedGuides("en")).length, 1);
  pages = ["/en/money/uk-paye-tax-codes-national-insurance", "/en/money/new-money-guide"];
  clearReleaseGuides();
  clearSessionCache();
  assert.equal((await getLocalizedGuides("en")).length, 2);
});

test("fail open: without a page list (dev server, older release, error) every listed Guide shows, and it is asked again", async (t) => {
  let answer = () => json({}, 404);
  const calls = withBrowser(t, () => answer());
  assert.equal((await getLocalizedGuides("en")).length, 2);
  clearSessionCache();
  answer = () => { throw new TypeError("network"); };
  assert.equal((await getLocalizedGuides("en")).length, 2);
  clearSessionCache();
  answer = () => json({ pages: ["/en/money/new-money-guide"] });
  assert.deepEqual((await getLocalizedGuides("en")).map((g) => g.slug), ["new-money-guide"], "a later successful list applies");
  assert.equal(calls.filter((c) => c === "/release-pages.json").length, 3);
});
