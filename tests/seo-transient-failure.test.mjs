// A temporary API failure must never turn a prerendered page into a noindex
// error page (SEO audit 2026-11-27): the startup request reports why it failed,
// a page whose data could not be fetched keeps its prerendered HTML, and only a
// definite 404 counts as a missing Guide. Also: the static Family Visa hub
// links its prerendered topic pages, as the app's hub does.
import test from "node:test";
import assert from "node:assert/strict";
import { clearStartupData, keepPrerenderedPage, primeStartupGuide, primeStartupGuides } from "../src/guides/api.ts";
import { staticHubPage } from "../src/seo/staticPages.ts";
import { familyVisaTopicPath } from "../src/router.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";

const realFetch = globalThis.fetch;
function withFetch(respond, run) {
  globalThis.fetch = async (url, init) => {
    init?.signal?.throwIfAborted();
    return respond(String(url));
  };
  return run().finally(() => { globalThis.fetch = realFetch; clearStartupData(); });
}
const status = (code) => () => new Response(JSON.stringify({ code: "X" }), { status: code, headers: { "content-type": "application/json" } });

test("a Guide's startup request reports rate limiting, server and network errors as failed", async () => {
  for (const respond of [status(429), status(500), status(502), status(503), () => { throw new TypeError("network"); }]) {
    for (const locale of ["zh-CN", "ur"]) {
      await withFetch(respond, async () => {
        assert.equal(await primeStartupGuide("renting-deposits-fees", locale), "failed");
      });
    }
  }
});

test("a Guide's startup request that passes its deadline is failed, not missing", async () => {
  await withFetch(status(200), async () => {
    assert.equal(await primeStartupGuide("renting-deposits-fees", "en", AbortSignal.abort()), "failed");
  });
});

test("only a 404 is a missing Guide", async () => {
  for (const locale of ["zh-CN", "hi"]) {
    await withFetch(status(404), async () => {
      assert.equal(await primeStartupGuide("renting-deposits-fees", locale), "not-found");
    });
  }
});

test("a topic page's startup request fails when its Guide list cannot be fetched", async () => {
  await withFetch(status(429), async () => {
    assert.equal(await primeStartupGuides(["partner-visa-dependent-children"], "en"), "failed");
  });
});

test("the prerendered page is kept only when its startup data failed", () => {
  const settled = (...values) => values.map((value) => ({ status: "fulfilled", value }));
  assert.equal(keepPrerenderedPage(settled(undefined, "failed")), true);
  assert.equal(keepPrerenderedPage(settled(undefined, "ready")), false);
  assert.equal(keepPrerenderedPage(settled(undefined, "not-found")), false, "a 404 shows the app's not-found page");
  assert.equal(keepPrerenderedPage([]), false, "the startup deadline passed: render as before");
  assert.equal(keepPrerenderedPage([{ status: "rejected", reason: new Error("chunk") }]), false);
});

test("the static Family Visa hub links its prerendered topic pages in every locale", () => {
  const published = [{ slug: "partner-visa-routes-overview", category: "family-visa", title: "Routes", summary: "Routes summary", publishedAt: "2026-11-16T14:25:00Z", updatedAt: "2026-11-16T14:25:00Z" }];
  for (const locale of GUIDE_LOCALES) {
    const path = familyVisaTopicPath(locale, "children-from-previous-relationship");
    const hub = (topicPaths) => staticHubPage({ origin: "https://example.test", locale, domainId: "family-visa", published, availableLocales: [locale], topicPaths }).body;
    const linked = hub([path]);
    assert.ok(linked.includes(`href="${path}"`), `${locale}: topic page linked`);
    if (locale !== "zh-CN" && locale !== "zh-TW")
      assert.doesNotMatch(linked.match(/data-topic="special-circumstances">([\s\S]*?)<\/section>/)[1], /[一-鿿]/, `${locale}: localized link text`);
    assert.ok(!hub([]).includes("/topics/"), `${locale}: no link to a topic page that is not prerendered`);
  }
});
