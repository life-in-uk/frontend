// Catalogue consistency: Guide lists from the API are narrowed to the Guides
// that the release which served the page has pages for (its embedded,
// content-hashed page list) and that the live release still serves
// (/release-pages.json). There is never an unfiltered fallback in a release
// build: a missing, malformed, stale or unreachable live list leaves the
// embedded list; a missing or malformed embedded list fails the lists like an
// API error (and is asked again). Without the meta (dev server) nothing is
// narrowed. Scenarios: publication, withdrawal, rollback.
import test from "node:test";
import assert from "node:assert/strict";
import { clearReleaseGuides, clearSessionCache, getGuides, getLocalizedGuides, ReleaseInventoryError } from "../src/guides/api.ts";

const EMBEDDED = "/assets/release-pages-0123456789abcdef.json";
const meta = (slug, category = "money") => ({ slug, category, title: slug, summary: "s", publishedAt: "2026-11-27T10:00:00Z", updatedAt: "2026-11-27T10:00:00Z" });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
// The API lists an existing Guide, a Guide published after this release, and one this release had but a later one withdrew.
const LIST = [meta("uk-paye-tax-codes-national-insurance"), meta("uk-first-credit-card"), meta("withdrawn-guide")];
const page = (slug, locale = "en") => `/${locale}/money/${slug}`;
const R1 = ["/en", "/en/money", page("uk-paye-tax-codes-national-insurance"), page("withdrawn-guide"), page("uk-paye-tax-codes-national-insurance", "zh-CN"), page("withdrawn-guide", "zh-CN")];

/** A release page: its embedded list and the live list answer as given (a value, a status, "malformed" or "network"). */
function release(t, { embedded = { pages: R1 }, live = { pages: R1 }, withMeta = true } = {}) {
  globalThis.document = { querySelector: (selector) => (withMeta && selector === 'meta[name="release-pages"]' ? { content: EMBEDDED } : null) };
  clearReleaseGuides();
  clearSessionCache();
  const state = { embedded, live, calls: [] };
  const answer = (value) => {
    if (value === "network") throw new TypeError("network");
    if (value === "malformed") return new Response("{not json", { status: 200 });
    if (typeof value === "number") return json({}, value);
    return json(value);
  };
  t.mock.method(globalThis, "fetch", async (url) => {
    state.calls.push(String(url));
    if (String(url) === EMBEDDED) return answer(state.embedded);
    if (String(url) === "/release-pages.json") return answer(state.live);
    return json(LIST);
  });
  t.after(() => { delete globalThis.document; clearReleaseGuides(); clearSessionCache(); });
  return state;
}
const slugs = async (locale = "en") => (await getLocalizedGuides(locale)).map((g) => g.slug);

test("publication: a Guide published after this release is never linked, whatever the live list says", async (t) => {
  // Mid-deploy, the live list may already be the next release's (it lists the new Guide).
  release(t, { live: { pages: [...R1, page("uk-first-credit-card")] } });
  assert.deepEqual(await slugs(), ["uk-paye-tax-codes-national-insurance", "withdrawn-guide"]);
  assert.deepEqual((await getGuides()).map((g) => g.slug), ["uk-paye-tax-codes-national-insurance", "withdrawn-guide"], "zh-CN too");
});

test("withdrawal and rollback: a Guide the live release no longer serves is hidden in an open tab of the older release", async (t) => {
  release(t, { live: { pages: R1.filter((p) => !p.includes("withdrawn-guide")) } });
  assert.deepEqual(await slugs(), ["uk-paye-tax-codes-national-insurance"]);
});

test("live list missing, malformed, stale or unreachable: the embedded list alone, never the unfiltered catalogue", async (t) => {
  for (const live of [404, 503, "malformed", "network", { pages: "x" }, { pages: [] }, { pages: [42] }]) {
    const state = release(t, { live });
    assert.deepEqual(await slugs(), ["uk-paye-tax-codes-national-insurance", "withdrawn-guide"], JSON.stringify(live));
    assert.ok(!(await slugs()).includes("uk-first-credit-card"));
    assert.ok(state.calls.includes(EMBEDDED));
  }
});

test("embedded list missing, malformed or unreachable: the lists fail (error state, never unfiltered), and it is asked again", async (t) => {
  for (const embedded of [404, "malformed", "network", { nope: 1 }, { pages: [] }]) {
    const state = release(t, { embedded });
    await assert.rejects(getLocalizedGuides("en"), ReleaseInventoryError, JSON.stringify(embedded));
    state.embedded = { pages: R1 };
    clearSessionCache();
    assert.deepEqual(await slugs(), ["uk-paye-tax-codes-national-insurance", "withdrawn-guide"], "recovers once the list loads");
  }
});

test("a later live list applies: the live list is asked again after a minute, the embedded one is kept", async (t) => {
  const state = release(t);
  assert.equal((await slugs()).length, 2);
  state.live = { pages: R1.filter((p) => !p.includes("withdrawn-guide")) };
  clearSessionCache();
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() + 61_000 });
  assert.deepEqual(await slugs(), ["uk-paye-tax-codes-national-insurance"]);
  assert.equal(state.calls.filter((c) => c === EMBEDDED).length, 1, "the embedded list is immutable and fetched once");
});

test("not a release build (no meta, e.g. the dev server): nothing to narrow", async (t) => {
  const state = release(t, { withMeta: false });
  assert.deepEqual(await slugs(), ["uk-paye-tax-codes-national-insurance", "uk-first-credit-card", "withdrawn-guide"]);
  assert.ok(!state.calls.some((c) => c.includes("release-pages")));
});
