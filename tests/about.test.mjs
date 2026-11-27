// About and editorial policy (F12): the app and prerendered page use exactly
// the editorial copy in docs/editorial/about-page (no drift), it is a canonical
// page in all five languages with reciprocal hreflang, the AboutPage and
// Organization markup claim nothing beyond the site's name and URL, no contact
// address is published, and the About links lead to the page.
import test from "node:test";
import assert from "node:assert/strict";
import { ABOUT_SECTION_IDS, readAboutCopy } from "../scripts/seo/about-content.mjs";
import { ABOUT_CONTENT } from "../src/about/aboutContent.ts";
import { staticAboutPage } from "../src/seo/staticPages.ts";
import { aboutStructuredData } from "../src/seo/structuredData.ts";
import { localeSwitchPath, matchRoute } from "../src/router.ts";
import { GUIDE_LOCALES, GUIDE_LOCALE_HREFLANG } from "../src/guides/locales.ts";

const ORIGIN = "https://lifeinuk.info";

test("the About copy in the app is exactly the editorial source (rerun scripts/seo/about-content.mjs after editing it)", () => {
  assert.deepEqual(ABOUT_CONTENT, readAboutCopy());
  for (const locale of GUIDE_LOCALES) {
    assert.deepEqual(ABOUT_CONTENT[locale].sections.map((s) => s.id), ABOUT_SECTION_IDS);
    const text = JSON.stringify(ABOUT_CONTENT[locale]);
    assert.doesNotMatch(text, /@[a-z0-9-]+\.[a-z]{2,}|mailto:/i, `${locale}: no contact address is published`);
  }
});

test("About is /{locale}/about in every language; switching keeps the page", () => {
  for (const locale of GUIDE_LOCALES) {
    const route = matchRoute(`/${locale}/about`);
    assert.deepEqual(route, { name: "about", locale });
    for (const next of GUIDE_LOCALES) assert.equal(localeSwitchPath(route, next), `/${next}/about`);
    assert.equal(matchRoute(`/${locale}/about/x`).name, "not-found");
  }
});

test("the static About page: the copy, canonical, five hreflang alternates and AboutPage markup", () => {
  for (const locale of GUIDE_LOCALES) {
    const copy = ABOUT_CONTENT[locale];
    const page = staticAboutPage({ origin: ORIGIN, locale, published: [] });
    assert.equal(page.head.canonical, `${ORIGIN}/${locale}/about`);
    assert.equal(page.head.description, copy.description);
    assert.deepEqual(page.head.alternates.map((a) => a.href), GUIDE_LOCALES.map((l) => `${ORIGIN}/${l}/about`));
    assert.ok(page.body.includes(`<h1>${copy.title.replace(/&/g, "&amp;")}</h1>`));
    for (const section of copy.sections) assert.ok(page.body.includes(`<section id="${section.id}">`));
    assert.deepEqual(page.head.structuredData, aboutStructuredData({ origin: ORIGIN, locale, title: copy.title, description: copy.description }));
    assert.ok(GUIDE_LOCALE_HREFLANG[locale]);
  }
  const graph = aboutStructuredData({ origin: ORIGIN, locale: "en", title: "t", description: "d" })["@graph"];
  const org = graph.find((n) => n["@type"] === "Organization");
  assert.deepEqual(Object.keys(org).sort(), ["@id", "@type", "name", "url"], "no logo, contact, address or profiles");
  const about = graph.find((n) => n["@type"] === "AboutPage");
  assert.deepEqual([about.about, about.publisher], [{ "@id": org["@id"] }, { "@id": org["@id"] }]);
  for (const claim of ["author", "reviewedBy", "contactPoint", "email"]) assert.equal(about[claim], undefined);
});
