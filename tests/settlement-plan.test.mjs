// Settlement / ILR section: the hub plan covers the twelve Settlement Guides
// plus the Work Visa Skilled Worker ILR Guide (linked in its own domain),
// every hub string exists in all five locales, proposals are labelled, and
// the section is a normal localized Guide domain linked from the navigation.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  SETTLEMENT_COPY,
  SETTLEMENT_GUIDES,
  SETTLEMENT_KEY_DATES,
  SETTLEMENT_TOPICS,
} from "../src/guides/settlementPlan.ts";
import { GUIDE_DOMAINS } from "../src/guides/domains.ts";
import { GUIDE_LOCALES, GUIDE_UI } from "../src/guides/locales.ts";
import { localeSwitchPath, matchRoute, pageRoute } from "../src/router.ts";
import { HOME_TOPICS, topicHref } from "../src/home/topics.ts";
import { SITE_UI } from "../src/guides/siteUi.ts";

const SETTLEMENT_SLUGS = [
  "settlement-ilr-overview",
  "settlement-partner-ilr",
  "settlement-long-residence",
  "settlement-other-routes",
  "settlement-continuous-residence-absences",
  "settlement-english-life-in-uk-test",
  "settlement-children-dependants",
  "settlement-documents-evidence",
  "settlement-application-process",
  "settlement-after-ilr",
  "settlement-british-citizenship",
  "settlement-earned-settlement-tracker",
];

test("the plan lists the twelve Settlement Guides once each, plus Skilled Worker ILR in the work-visa domain", () => {
  const own = SETTLEMENT_GUIDES.filter((g) => g.domain === "settlement").map((g) => g.slug);
  assert.deepEqual(own, SETTLEMENT_SLUGS);
  assert.deepEqual(SETTLEMENT_GUIDES.filter((g) => g.domain !== "settlement"),
    [{ slug: "skilled-worker-settlement-ilr", domain: "work-visa" }]);
  assert.equal(new Set(SETTLEMENT_GUIDES.map((g) => g.slug)).size, SETTLEMENT_GUIDES.length);
  assert.equal(SETTLEMENT_GUIDES[0].slug, "settlement-ilr-overview");
});

test("every hub string, topic and date exists in all five locales", () => {
  for (const locale of GUIDE_LOCALES) {
    for (const [key, value] of Object.entries(SETTLEMENT_COPY[locale])) assert.ok(value && value.trim(), `${locale} ${key}`);
    for (const topic of SETTLEMENT_TOPICS) {
      assert.ok(topic.title[locale]?.trim(), `${locale} ${topic.id} title`);
      assert.ok(topic.lead[locale]?.trim(), `${locale} ${topic.id} lead`);
    }
    for (const item of SETTLEMENT_KEY_DATES) assert.ok(item.label[locale]?.trim() && item.text[locale]?.trim(), `${locale} ${item.date}`);
    assert.ok(GUIDE_UI[locale].domain.settlement, `${locale} domain label`);
    assert.ok(SITE_UI[locale].topics.settlement?.title, `${locale} nav topic`);
  }
  for (const locale of ["en", "ur", "hi"])
    assert.doesNotMatch(JSON.stringify([SETTLEMENT_COPY[locale], SETTLEMENT_TOPICS.map((t) => [t.title[locale], t.lead[locale]]),
      SETTLEMENT_KEY_DATES.map((d) => [d.label[locale], d.text[locale]]), SITE_UI[locale].topics.settlement]), /[一-鿿]/, locale);
});

test("Earned Settlement appears only as a proposal, and the hub says it is not current law", () => {
  const proposals = SETTLEMENT_KEY_DATES.filter((d) => d.proposed);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].date, "pending");
  assert.match(proposals[0].text["zh-CN"], /尚未写入移民规则/);
  assert.match(proposals[0].text.en, /not yet in the Immigration Rules/);
  for (const locale of GUIDE_LOCALES) assert.ok(SETTLEMENT_COPY[locale].proposed.trim());
  assert.match(SETTLEMENT_COPY.en.notice, /not current law/);
});

test("settlement is a normal localized Guide domain", () => {
  const domain = GUIDE_DOMAINS.settlement;
  assert.equal(domain.category, "settlement");
  assert.equal(domain.basePath, "/settlement");
  assert.deepEqual(matchRoute("/settlement"), { name: "hub", domain: "settlement" });
  assert.deepEqual(matchRoute("/settlement/settlement-after-ilr"), { name: "guide", domain: "settlement", slug: "settlement-after-ilr" });
  assert.deepEqual(matchRoute("/ur/settlement/settlement-partner-ilr"), {
    name: "localized-guide", locale: "ur", domain: "settlement", slug: "settlement-partner-ilr",
  });
  assert.deepEqual(pageRoute(matchRoute("/zh-CN/settlement")), { name: "hub", domain: "settlement" });
  assert.equal(localeSwitchPath(matchRoute("/settlement/settlement-ilr-overview"), "hi"), "/hi/settlement/settlement-ilr-overview");
  // In-text 《title》 references point only at planned Settlement slugs.
  for (const slug of Object.values(domain.titleReferences)) assert.ok(SETTLEMENT_SLUGS.includes(slug), slug);
  assert.equal(Object.keys(domain.titleReferences).length, SETTLEMENT_SLUGS.length);
});

test("the section is linked from the site navigation in every locale", () => {
  const topic = HOME_TOPICS.find((t) => t.id === "settlement");
  assert.equal(topic?.domain?.id, "settlement");
  assert.equal(topicHref(topic, "zh-CN"), "/zh-CN/settlement");
  assert.equal(topicHref(topic, "ur"), "/ur/settlement");
  // Travel and Work Visa stay in the navigation.
  assert.ok(HOME_TOPICS.find((t) => t.id === "travel")?.page);
  assert.ok(HOME_TOPICS.find((t) => t.id === "work-visa")?.domain);
});

const draftsDir = fileURLToPath(new URL("../../life-in-uk-backend/content/drafts/settlement/", import.meta.url));
test(
  "every planned slug has a Simplified Chinese source whose title matches the in-text reference map",
  { skip: existsSync(draftsDir) ? false : "local settlement drafts not present" },
  () => {
    const titles = Object.fromEntries(Object.entries(GUIDE_DOMAINS.settlement.titleReferences).map(([t, s]) => [s, t]));
    for (const slug of SETTLEMENT_SLUGS) {
      const draft = JSON.parse(readFileSync(`${draftsDir}${slug}-zh.json`, "utf8"));
      assert.equal(draft.slug, slug);
      assert.equal(draft.category, "settlement");
      assert.equal(draft.title, titles[slug]);
    }
  },
);
