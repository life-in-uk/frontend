import test from "node:test";
import assert from "node:assert/strict";
import { matchRoute } from "../src/router.ts";
import { getLocalizedGuide, getLocalizedGuides, GuideNotFoundError } from "../src/guides/api.ts";
import { GUIDE_LOCALES, GUIDE_LOCALE_HREFLANG, localizedGuidePath, textDirection } from "../src/guides/locales.ts";
import { guideAlternates } from "../src/guides/seo.ts";

test("locale routes retain domain conventions for all five locales", () => {
  for (const locale of GUIDE_LOCALES) {
    assert.deepEqual(matchRoute(`/${locale}/health`), { name: "localized-hub", locale, domain: "health" });
    assert.deepEqual(matchRoute(`/${locale}/health/nhs-dentist-england`), {
      name: "localized-guide", locale, domain: "health", slug: "nhs-dentist-england",
    });
    assert.equal(matchRoute(`/${locale}/guides`).name, "localized-index");
    assert.equal(localizedGuidePath(locale, "health", "a guide"), `/${locale}/health/a%20guide`);
  }
  assert.deepEqual(matchRoute("/health/nhs-dentist-england"), { name: "guide", domain: "health", slug: "nhs-dentist-england" });
  assert.deepEqual(matchRoute("/xx/health/nhs-dentist-england"), { name: "not-found" });
});

test("owner editorial interface has a dedicated route outside public Guide routes", () => {
  assert.deepEqual(matchRoute("/owner/editorial"), { name: "owner-editorial" });
  assert.deepEqual(matchRoute("/owner/editorial/batches"), { name: "owner-editorial" });
});

test("Urdu uses RTL while the other supported locales remain LTR", () => {
  assert.equal(textDirection("ur"), "rtl");
  for (const locale of GUIDE_LOCALES.filter((item) => item !== "ur")) assert.equal(textDirection(locale), "ltr");
});

test("hreflang alternates contain only explicitly available published locales", () => {
  assert.deepEqual(guideAlternates("https://life.example", "health", "nhs-dentist", ["zh-CN", "ur"]), [
    { locale: "zh-CN", href: "https://life.example/zh-CN/health/nhs-dentist" },
    { locale: "ur", href: "https://life.example/ur/health/nhs-dentist" },
  ]);
});

test("hreflang uses valid shared locale codes, including British English", () => {
  assert.deepEqual(GUIDE_LOCALE_HREFLANG, {
    "zh-CN": "zh-CN", "zh-TW": "zh-TW", en: "en-GB", ur: "ur", hi: "hi",
  });
});

test("localized Guide API validates the published wrapper and returns 404 for missing locales", async () => {
  const originalFetch = globalThis.fetch;
  const guide = {
    slug: "nhs-dentist", category: "health-nhs", title: "Dentists", summary: "Guide",
    content: "Published text.", publishedAt: "2026-10-05T06:17:00Z", updatedAt: "2026-10-05T06:17:00Z",
    sources: [], evidence: [],
  };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ locale: "en", guide, sourceRevisionId: "rev-1", contentHash: "a".repeat(64) }), { status: 200 });
    assert.equal((await getLocalizedGuide("nhs-dentist", "en")).guide.title, "Dentists");
    globalThis.fetch = async () => new Response(JSON.stringify([]), { status: 200 });
    assert.deepEqual(await getLocalizedGuides("ur"), []);
    globalThis.fetch = async () => new Response("{}", { status: 404 });
    await assert.rejects(getLocalizedGuide("nhs-dentist", "hi"), GuideNotFoundError);
  } finally { globalThis.fetch = originalFetch; }
});
