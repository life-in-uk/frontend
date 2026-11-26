// UI/UX refinements (2026-11 audit): the all-Guides index groups every published section in menu
// order, long Guides list their sections, the app shell sets each locale's language and direction
// before the first paint, and new interface copy exists in all five locales.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { GUIDE_DOMAINS } from "../src/guides/domains.ts";
import { GUIDE_LOCALES, GUIDE_LOCALE_LANG, GUIDE_UI, textDirection } from "../src/guides/locales.ts";
import { groupGuidesByDomain, INDEX_DOMAIN_ORDER } from "../src/guides/indexGroups.ts";
import { guideSections, parseMarkdown, withoutRepeatedUpdatedLine } from "../src/guides/markdown.ts";
import { SITE_UI } from "../src/guides/siteUi.ts";

test("the index lists every Guide section exactly once", () => {
  assert.deepEqual([...INDEX_DOMAIN_ORDER].sort(), Object.keys(GUIDE_DOMAINS).sort());
  assert.equal(new Set(INDEX_DOMAIN_ORDER).size, INDEX_DOMAIN_ORDER.length);
});

test("the index groups Guides by section in menu order and keeps each section's order", () => {
  const guide = (slug, domain) => ({ slug, category: GUIDE_DOMAINS[domain].category });
  const guides = [guide("m1", "money"), guide("f1", "family-visa"), guide("m2", "money"), guide("h1", "health"),
    { slug: "x", category: "not-a-section" }];
  const groups = groupGuidesByDomain(guides);
  assert.deepEqual(groups.map((g) => [g.domain, g.guides.map((x) => x.slug)]),
    [["family-visa", ["f1"]], ["health", ["h1"]], ["money", ["m1", "m2"]]]);
  // Empty sections are left out; a category without a section is not grouped (the page lists it last).
  assert.equal(groups.some((g) => g.guides.some((x) => x.slug === "x")), false);
});

test("Guide sections are the top-level H2 headings, with stable ids", () => {
  const blocks = parseMarkdown([
    "# Title", "Intro.", "## First part", "Text.", "### Detail", "More.", "## Second part", "> ## Quoted", "## Third", "",
  ].join("\n"));
  const sections = guideSections(blocks);
  assert.deepEqual(sections.map((s) => [s.id, s.text]),
    [["guide-section-1", "Title"], ["guide-section-2", "First part"], ["guide-section-3", "Second part"], ["guide-section-4", "Third"]]);
  // Ids are keyed by the block itself, so the renderer and the list always agree.
  assert.ok(sections.every((s) => blocks.includes(s.block)));
});

test("the app shell sets each locale's language and direction before the first paint", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = /<script>\s*([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert.ok(script, "inline head script");
  for (const locale of GUIDE_LOCALES) {
    const root = { lang: "zh-CN", dir: "" };
    runInNewContext(script, { location: { pathname: `/${locale}/travel` }, document: { documentElement: root } });
    assert.deepEqual(root, { lang: GUIDE_LOCALE_LANG[locale], dir: textDirection(locale) }, locale);
  }
  const root = { lang: "zh-CN", dir: "" };
  runInNewContext(script, { location: { pathname: "/health" }, document: { documentElement: root } });
  assert.deepEqual(root, { lang: "zh-CN", dir: "" }, "unprefixed paths keep the shell's Simplified Chinese");
});

test("new interface copy exists in every locale", () => {
  for (const locale of GUIDE_LOCALES) {
    assert.ok(GUIDE_UI[locale].onThisPage.trim(), `onThisPage ${locale}`);
    assert.ok(SITE_UI[locale].search.emptyAll.trim(), `emptyAll ${locale}`);
  }
});

test("a leading line that only repeats the update date is not shown twice; anything else stays", () => {
  const at = "2026-11-26T09:15:00Z";
  const kept = (md, updatedAt = at) => withoutRepeatedUpdatedLine(parseMarkdown(md), updatedAt).length;
  const total = (md) => parseMarkdown(md).length;
  for (const line of ["Last updated: 2026-11-26", "**Last updated:** 2026-11-26", "最后更新: 2026-11-26", "最後更新：2026-11-26",
    "آخری تازہ کاری: 2026-11-26", "अंतिम अपडेट: 2026-11-26"]) {
    const md = `${line}\n\n## Section\n\nText.`;
    assert.equal(kept(md), total(md) - 1, line);
  }
  const keep = [
    "Last updated: 2026-11-20\n\n## Section",            // a different date is information
    "Intro.\n\nLast updated: 2026-11-26",                 // not the first block
    "Last updated: 2026-11-26 (sources checked)\n\nText.", // more than the date
    "最后更新及来源核验：2026年11月26日\n\n正文。",           // a provenance note, not a repeat
  ];
  for (const md of keep) assert.equal(kept(md), total(md), md);
  // The date is compared in UK time: 23:59 UTC in November is still the same day in London, while
  // 23:30 UTC in June (BST) is already the next day there, so that line is not a repeat.
  assert.equal(kept("Last updated: 2026-11-26\n\nText.", "2026-11-26T23:59:00Z"), 1);
  assert.equal(kept("Last updated: 2026-06-30\n\nText.", "2026-06-30T23:30:00Z"), 2, "BST: already 1 July in London");
});
