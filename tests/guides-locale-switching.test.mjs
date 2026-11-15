// Language switching must keep the page type: an editorial hub stays the
// editorial hub, a Guide stays the same Guide, and returning to Simplified
// Chinese restores the original unprefixed pages.
import test from "node:test";
import assert from "node:assert/strict";
import { matchRoute, pageRoute } from "../src/router.ts";
import { GUIDE_LOCALES, guideHomePath, guideRoutePath, localizedGuidePath } from "../src/guides/locales.ts";
import { HEALTH_HUB_GROUPS, localizedHealthSections } from "../src/guides/catalog.ts";
import { shortLocalizedTitle } from "../src/guides/format.ts";

const page = (path) => pageRoute(matchRoute(path));

test("switching to Simplified Chinese targets the original editorial routes", () => {
  assert.equal(guideRoutePath("zh-CN", "health"), "/health");
  assert.equal(guideRoutePath("zh-CN", "health", "registering-with-a-gp-england"), "/health/registering-with-a-gp-england");
  assert.equal(guideRoutePath("zh-CN", "money"), "/money");
  assert.equal(guideHomePath("zh-CN"), "/");
  for (const locale of GUIDE_LOCALES.filter((item) => item !== "zh-CN")) {
    assert.equal(guideRoutePath(locale, "health"), `/${locale}/health`);
    assert.equal(guideRoutePath(locale, "health", "a guide"), localizedGuidePath(locale, "health", "a guide"));
    assert.equal(guideHomePath(locale), `/${locale}`);
  }
});

test("zh-CN → zh-TW → zh-CN keeps the Health hub and Guide page types", () => {
  assert.deepEqual(page(guideRoutePath("zh-CN", "health")), { name: "hub", domain: "health" });
  assert.deepEqual(page(guideRoutePath("zh-TW", "health")), { name: "localized-hub", locale: "zh-TW", domain: "health" });
  assert.deepEqual(page(guideRoutePath("zh-CN", "health")), { name: "hub", domain: "health" });
  const slug = "registering-with-a-gp-england";
  assert.deepEqual(page(guideRoutePath("zh-CN", "health", slug)), { name: "guide", domain: "health", slug });
  assert.deepEqual(page(guideRoutePath("zh-TW", "health", slug)), { name: "localized-guide", locale: "zh-TW", domain: "health", slug });
});

test("prefixed /zh-CN pages render the same editorial pages as the unprefixed routes", () => {
  // Direct loads of canonical/hreflang URLs (e.g. from the sitemap).
  assert.deepEqual(page("/zh-CN/health"), page("/health"));
  assert.deepEqual(page("/zh-CN/health/nhs-dentist-england"), page("/health/nhs-dentist-england"));
  assert.deepEqual(page("/zh-CN/money"), page("/money"));
  // Other locales and the generic index are unchanged.
  assert.equal(page("/ur/health").name, "localized-hub");
  assert.equal(page("/zh-CN/guides").name, "localized-index");
});

const stamp = "2026-11-13T18:38:14Z";
const meta = (slug, title, category = "health-nhs") => ({ slug, category, title, summary: `${title} summary`, publishedAt: stamp, updatedAt: stamp });
const source = HEALTH_HUB_GROUPS.flatMap((group) => group.slugs).map((slug) => meta(slug, `简体 ${slug}？说明`));
const gp = "registering-with-a-gp-england";

test("a partially translated hub keeps every section and labels Simplified Chinese fallbacks", () => {
  const sections = localizedHealthSections(source, [meta(gp, "剛到英國怎麼註冊 GP？沒有地址證明")], "zh-TW");
  assert.deepEqual(sections.map((section) => section.group.id), HEALTH_HUB_GROUPS.map((group) => group.id));
  const entries = sections.flatMap((section) => section.entries);
  assert.equal(entries.length, source.length);
  const translated = entries.filter((entry) => !entry.fallback);
  assert.deepEqual(translated.map((entry) => entry.slug), [gp]);
  assert.deepEqual(translated[0], {
    slug: gp, title: "剛到英國怎麼註冊 GP？沒有地址證明", summary: "剛到英國怎麼註冊 GP？沒有地址證明 summary",
    locale: "zh-TW", fallback: false, path: `/zh-TW/health/${gp}`,
  });
  for (const entry of entries.filter((item) => item.fallback)) {
    // Never claims a translation: Chinese text, Chinese page.
    assert.equal(entry.locale, "zh-CN");
    assert.equal(entry.path, `/health/${entry.slug}`);
    assert.equal(entry.title, `简体 ${entry.slug}？说明`);
  }
});

test("the Simplified Chinese hub has no fallbacks and links to the original routes", () => {
  const entries = localizedHealthSections(source, [], "zh-CN").flatMap((section) => section.entries);
  assert.equal(entries.length, source.length);
  assert.ok(entries.every((entry) => !entry.fallback && entry.locale === "zh-CN" && entry.path === `/health/${entry.slug}`));
});

test("an untranslated locale shows the whole hub as labelled fallbacks", () => {
  const entries = localizedHealthSections(source, [], "hi").flatMap((section) => section.entries);
  assert.ok(entries.every((entry) => entry.fallback && entry.locale === "zh-CN"));
});

test("translations from another category never appear on the Health hub", () => {
  const entries = localizedHealthSections(source, [meta(gp, "Wrong", "money")], "en").flatMap((section) => section.entries);
  assert.equal(entries.find((entry) => entry.slug === gp).fallback, true);
});

test("compact titles end at the first question mark in every script", () => {
  assert.equal(shortLocalizedTitle("Just arrived in the UK: how do I register with a GP? Can I do it without proof?"), "Just arrived in the UK: how do I register with a GP?");
  assert.equal(shortLocalizedTitle("GP کے ساتھ رجسٹریشن کیسے کریں؟ کیا پتے کے ثبوت"), "GP کے ساتھ رجسٹریشن کیسے کریں؟");
  assert.equal(shortLocalizedTitle("剛到英國怎麼註冊 GP？沒有地址證明"), "剛到英國怎麼註冊 GP？");
  assert.equal(shortLocalizedTitle("No question"), "No question");
});
