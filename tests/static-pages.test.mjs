// Static SEO pages are built from the published Guide data with the app's own
// parser, path and title-reference helpers: complete article HTML, escaped
// content, evidence anchors, in-section Guide links, correct head tags and
// language direction, and a Journey entry point.
import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, fillTemplate, JOURNEY_LINKS, staticGuidePage, staticHubPage } from "../src/seo/staticPages.ts";
import { RENTING_STEPS } from "../src/guides/rentingJourney.ts";

const ORIGIN = "https://example.test";
const TEMPLATE = '<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <title>Life in UK</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/assets/index.js"></script>\n  </body>\n</html>';
const meta = (slug, title, category = "renting") => ({ slug, category, title, summary: `${title} summary`, publishedAt: "2026-11-16T14:25:00Z", updatedAt: "2026-11-16T14:25:00Z" });
const PUBLISHED = [
  meta("renting-council-tax", "Council Tax after moving in"),
  meta("renting-moving-in-inventory", "Moving in: keys, the inventory and recording the property's condition"),
  meta("renting-energy", "Electricity and gas"),
  meta("nhs-ihs-costs-england", "IHS", "health-nhs"),
];
const GUIDE = {
  ...PUBLISHED[0],
  content: [
    "# Council Tax after moving in",
    "",
    "> **Checked on: 16 November 2026.** See \"Moving in: keys, the inventory and recording the property's condition\".",
    "",
    "## 1. Find the right council",
    "",
    "- Use GOV.UK. [See the official source](#guide-evidence-find-council)",
    "- Watch out for <script>alert(1)</script> & other text.",
    "",
    "Read [GOV.UK](https://www.gov.uk/council-tax) and [a bad link](javascript:alert(1)).",
  ].join("\n"),
  sources: [{ key: "gov-ctax", organisation: "GOV.UK", title: "Council Tax", url: "https://www.gov.uk/council-tax", accessedAt: "2026-11-16T14:14:24Z" }],
  evidence: [{ key: "find-council", statement: "GOV.UK provides a service to find your local authority.", supports: [{ sourceKey: "gov-ctax", locator: "x", excerpt: null, note: null }] }],
};

test("a Guide page carries the whole article, escaped, with evidence anchors and safe links", () => {
  const page = staticGuidePage({ origin: ORIGIN, locale: "en", domainId: "renting", guide: GUIDE, published: PUBLISHED, availableLocales: ["zh-CN", "en", "ur"] });
  const html = page.body;
  assert.equal((html.match(/<h1>/g) ?? []).length, 1, "the article H1 is the page title only");
  assert.match(html, /<h1>Council Tax after moving in<\/h1>/);
  assert.match(html, /<h2>1\. Find the right council<\/h2>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; other text/);
  assert.doesNotMatch(html, /<script|javascript:/);
  assert.match(html, /<a class="evidence-ref" href="#guide-evidence-find-council">See the official source<\/a>/);
  assert.match(html, /<li id="guide-evidence-find-council"><p>GOV\.UK provides a service/);
  assert.match(html, /<a href="https:\/\/www\.gov\.uk\/council-tax" rel="noopener noreferrer">GOV\.UK<\/a>/);
  // In-text title references link to the published Guide in the same locale.
  assert.match(html, /<a href="\/en\/renting\/renting-moving-in-inventory">Moving in: keys/);
  // Journey entry point, and the curated related Guides (not every Guide in the section).
  assert.match(html, /href="\/en\/renting#renting-journey-title"/);
  const related = html.split('class="static-related"')[1];
  assert.match(related, /<a href="\/en\/renting\/renting-energy">Electricity and gas<\/a>/);
  assert.doesNotMatch(related, /nhs-ihs-costs-england|renting-moving-in-inventory/);
  assert.doesNotMatch(html, /class="static-guides"/);
});

test("head tags: canonical, hreflang for published locales only, x-default, and replaceable by the app", () => {
  const { head } = staticGuidePage({ origin: ORIGIN, locale: "ur", domainId: "renting", guide: GUIDE, published: PUBLISHED, availableLocales: ["zh-CN", "en", "ur"] });
  assert.equal(head.canonical, "https://example.test/ur/renting/renting-council-tax");
  assert.deepEqual(head.alternates.map((row) => row.locale), ["zh-CN", "en", "ur"]);
  const html = fillTemplate(TEMPLATE, staticGuidePage({ origin: ORIGIN, locale: "ur", domainId: "renting", guide: GUIDE, published: PUBLISHED, availableLocales: ["zh-CN", "en", "ur"] }));
  assert.match(html, /<html lang="ur" dir="rtl">/);
  assert.match(html, /<title>Council Tax after moving in · Life in UK<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.test\/ur\/renting\/renting-council-tax" data-guide-seo="true" data-prerendered="true">/);
  assert.match(html, /hreflang="en-GB" href="https:\/\/example\.test\/en\/renting\/renting-council-tax"/);
  assert.match(html, /hreflang="x-default" href="https:\/\/example\.test\/zh-CN\/renting\/renting-council-tax"/);
  assert.doesNotMatch(html, /hreflang="hi"/);
  assert.match(html, /<div id="root"><header class="static-header">/);
  assert.match(html, /<script type="module" src="\/assets\/index\.js"><\/script>/, "the app still loads");
  assert.throws(() => fillTemplate("<html><body></body></html>", staticGuidePage({ origin: ORIGIN, locale: "en", domainId: "renting", guide: GUIDE, published: PUBLISHED, availableLocales: ["en"] })));
});

test("the Renting hub lists the Journey steps, each linked to its published Guide", () => {
  const page = staticHubPage({ origin: ORIGIN, locale: "en", domainId: "renting", published: PUBLISHED, availableLocales: ["en"] });
  assert.ok(page);
  assert.equal(page.head.canonical, "https://example.test/en/renting");
  assert.equal((page.body.match(/<h1>/g) ?? []).length, 1);
  assert.match(page.body, /<section id="renting-journey-title"/);
  for (const step of RENTING_STEPS) assert.ok(page.body.includes(`<h3>${escapeHtml(step.title.en)}</h3>`), step.id);
  // Only published Guides are linked.
  assert.match(page.body, /href="\/en\/renting\/renting-council-tax"/);
  assert.doesNotMatch(page.body, /href="\/en\/renting\/renting-guarantors"/);
});

test("hubs with no published Guide in a locale are not generated (no thin pages)", () => {
  assert.equal(staticHubPage({ origin: ORIGIN, locale: "en", domainId: "work-visa", published: PUBLISHED, availableLocales: [] }), null);
  const health = staticHubPage({ origin: ORIGIN, locale: "zh-CN", domainId: "health", published: PUBLISHED, availableLocales: ["zh-CN"] });
  assert.equal(health.head.canonical, "https://example.test/zh-CN/health");
  assert.doesNotMatch(health.body, /static-journey"/, "no Journey link where the section has no Journey");
});

test("Journey entry points exist only for sections with an interactive tool", () => {
  assert.deepEqual(Object.keys(JOURNEY_LINKS).sort(), ["family-visa", "renting", "settlement", "work-visa"]);
});
