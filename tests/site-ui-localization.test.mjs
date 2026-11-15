// Shared UI localization: every locale has complete interface copy, the
// translated interfaces contain no stray Chinese controls, language
// switching keeps the page, and untranslated Guides are labelled fallbacks.
import test from "node:test";
import assert from "node:assert/strict";
import { SITE_UI } from "../src/guides/siteUi.ts";
import { GUIDE_LOCALES, GUIDE_UI, textDirection } from "../src/guides/locales.ts";
import { localeSwitchPath, matchRoute, pageRoute, routeLocale } from "../src/router.ts";
import { localizeHomeGuides } from "../src/home/featured.ts";
import { HEALTH_GUIDE_DOMAIN, MONEY_GUIDE_DOMAIN } from "../src/guides/domains.ts";
import { HOME_TOPICS } from "../src/home/topics.ts";
import { normalize, searchEntries } from "../src/home/search.ts";

const HAN = /[㐀-鿿]/;
// Fallback copy only (zh-CN has none): the rest must be non-empty everywhere.
const OPTIONAL_EMPTY = new Set(["fallbackBadge", "translationNotice"]);

/** Every string reachable in a copy object, functions called with sample values. */
function strings(value, path = "") {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") return [[path, String(value("Q", 3, 2))]];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
}

test("every locale defines the same complete interface copy", () => {
  // Suggested queries differ per locale (they must match that locale's content).
  const shape = (rows) => rows.map(([path]) => path).filter((path) => !path.startsWith("search.suggestions["));
  const keys = shape(strings(SITE_UI["zh-CN"]));
  for (const locale of GUIDE_LOCALES) {
    const rows = strings(SITE_UI[locale]);
    assert.deepEqual(shape(rows), keys, locale);
    assert.ok(SITE_UI[locale].search.suggestions.length > 0, locale);
    for (const [path, text] of rows) {
      if (locale === "zh-CN" && OPTIONAL_EMPTY.has(path)) continue;
      assert.ok(text.trim().length > 0, `${locale} ${path} is empty`);
    }
    for (const topic of HOME_TOPICS) assert.ok(SITE_UI[locale].topics[topic.id]?.title, `${locale} topic ${topic.id}`);
  }
});

test("English, Urdu and Hindi interfaces contain no Chinese text", () => {
  for (const locale of ["en", "ur", "hi"]) {
    for (const [path, text] of [...strings(SITE_UI[locale]), ...strings(GUIDE_UI[locale])])
      assert.doesNotMatch(text, HAN, `${locale} ${path}: ${text}`);
  }
});

test("Traditional Chinese interface uses no Simplified-only characters", () => {
  const simplified = /[这们说时来对会过还没让给写诊证护册么从实际资国问题书种务机构关处间应该现为经发医专转换线须规则请联系认头记带门难开后点学办号码两见录边别样费额统针决复长签张离满项选验读诉济获仅载]/;
  for (const [path, text] of [...strings(SITE_UI["zh-TW"]), ...strings(GUIDE_UI["zh-TW"])])
    assert.doesNotMatch(text, simplified, `zh-TW ${path}: ${text}`);
});

test("translated pages say plainly that untranslated Guides open the Chinese original", () => {
  for (const locale of GUIDE_LOCALES.filter((item) => item !== "zh-CN")) {
    assert.ok(SITE_UI[locale].fallbackBadge.length > 0, locale);
    assert.ok(SITE_UI[locale].translationNotice.length > 0, locale);
  }
});

test("each locale has a home page, and only Urdu is right-to-left", () => {
  assert.deepEqual(pageRoute(matchRoute("/")), { name: "home" });
  assert.deepEqual(pageRoute(matchRoute("/zh-CN")), { name: "home" });
  for (const locale of GUIDE_LOCALES.filter((item) => item !== "zh-CN")) {
    assert.deepEqual(matchRoute(`/${locale}`), { name: "localized-home", locale });
    assert.equal(routeLocale(matchRoute(`/${locale}`)), locale);
  }
  assert.deepEqual(GUIDE_LOCALES.filter((locale) => textDirection(locale) === "rtl"), ["ur"]);
});

test("unknown localized paths keep their language for the not-found page", () => {
  assert.deepEqual(matchRoute("/ur/no-such-section"), { name: "not-found", locale: "ur" });
  assert.equal(routeLocale(matchRoute("/ur/no-such-section")), "ur");
  assert.deepEqual(matchRoute("/no-such-page"), { name: "not-found" });
  assert.equal(routeLocale(matchRoute("/no-such-page")), "zh-CN");
});

test("the header language switch keeps the page type", () => {
  const at = (path, next) => localeSwitchPath(pageRoute(matchRoute(path)), next);
  assert.equal(at("/", "zh-TW"), "/zh-TW");
  assert.equal(at("/zh-TW", "zh-CN"), "/");
  assert.equal(at("/ur", "hi"), "/hi");
  assert.equal(at("/health", "ur"), "/ur/health");
  assert.equal(at("/ur/health", "zh-CN"), "/health");
  assert.equal(at("/hi/health/registering-with-a-gp-england", "zh-CN"), "/health/registering-with-a-gp-england");
  assert.equal(at("/en/guides", "zh-TW"), "/zh-TW/guides");
  assert.equal(at("/en/nope", "ur"), "/ur");
  assert.equal(at("/owner/editorial", "en"), undefined);
});

const stamp = "2026-11-13T18:38:14Z";
const meta = (slug, title, category) => ({ slug, category, title, summary: `${title} summary`, publishedAt: stamp, updatedAt: stamp });
const gp = "registering-with-a-gp-england";
const source = [meta(gp, "刚到英国怎么注册 GP？", "health-nhs"), meta("nhs-dentist-england", "英国牙医到底怎么看？", "health-nhs"), meta("open-uk-bank-account-new-arrival", "刚到英国，怎么开户？", "money")];
const domains = [HEALTH_GUIDE_DOMAIN, MONEY_GUIDE_DOMAIN];

test("home Guides: translations where published, labelled Chinese fallbacks elsewhere", () => {
  const items = localizeHomeGuides(source, [meta(gp, "Just arrived in the UK: how do I register with a GP?", "health-nhs")], domains, "en");
  assert.deepEqual(items.map((item) => [item.guide.slug, item.locale, item.fallback, item.href]), [
    [gp, "en", false, `/en/health/${gp}`],
    ["nhs-dentist-england", "zh-CN", true, "/health/nhs-dentist-england"],
    ["open-uk-bank-account-new-arrival", "zh-CN", true, "/money/open-uk-bank-account-new-arrival"],
  ]);
  assert.equal(items[1].guide.title, "英国牙医到底怎么看？");
});

test("the Simplified Chinese home page has no fallbacks", () => {
  const items = localizeHomeGuides(source, [], domains, "zh-CN");
  assert.ok(items.every((item) => !item.fallback && item.locale === "zh-CN" && !item.href.startsWith("/zh-CN")));
});

test("a translation in the wrong section never counts as translated", () => {
  const items = localizeHomeGuides(source, [meta(gp, "Wrong section", "money")], domains, "hi");
  assert.equal(items.find((item) => item.guide.slug === gp).fallback, true);
});

test("search keeps Devanagari and Urdu words whole and each locale's suggestions find the GP Guide", () => {
  assert.equal(normalize("रजिस्ट्रेशन"), "रजिस्ट्रेशन");
  assert.equal(normalize("رجسٹریشن"), "رجسٹریشن");
  const titles = {
    "zh-CN": "刚到英国怎么注册 GP？没有地址证明、NHS Number 也可以吗？",
    "zh-TW": "剛到英國怎麼註冊 GP？沒有地址證明、NHS Number 也可以嗎？",
    en: "Just arrived in the UK: how do I register with a GP? Can I do it without proof of address or an NHS number?",
    ur: "برطانیہ نئے آئے ہیں تو GP کے ساتھ رجسٹریشن کیسے کریں؟ کیا پتے کے ثبوت یا NHS نمبر کے بغیر بھی ہو سکتی ہے؟",
    hi: "ब्रिटेन नए-नए आए हैं तो GP के साथ रजिस्ट्रेशन कैसे करें? क्या पते के प्रमाण या NHS नंबर के बिना भी हो सकता है?",
  };
  const summaries = { "zh-TW": "口譯服務", en: "", ur: "", hi: "" };
  for (const locale of ["zh-TW", "en", "ur", "hi"]) {
    const index = [{ kind: "guide", key: gp, title: titles[locale], text: summaries[locale], href: "/", sectionLabel: "x" }];
    for (const query of SITE_UI[locale].search.suggestions)
      assert.equal(searchEntries(index, query).length, 1, `${locale} "${query}"`);
  }
});
