// Work Visa (Skilled Worker) section: the hub plan covers exactly the eight
// Guides in reading order, every hub string exists in all five locales,
// proposals are labelled as such, and the section is a normal localized
// Guide domain linked from the site navigation.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  WORK_VISA_COPY,
  WORK_VISA_KEY_DATES,
  WORK_VISA_SLUGS,
  WORK_VISA_TOPICS,
} from "../src/guides/workVisaPlan.ts";
import { GUIDE_DOMAINS } from "../src/guides/domains.ts";
import { GUIDE_LOCALES, GUIDE_UI } from "../src/guides/locales.ts";
import { localeSwitchPath, matchRoute, pageRoute } from "../src/router.ts";
import { HOME_TOPICS } from "../src/home/topics.ts";
import { SITE_UI } from "../src/guides/siteUi.ts";

const SLUGS = [
  "skilled-worker-overview",
  "skilled-worker-sponsorship-cos",
  "skilled-worker-occupations-salary",
  "skilled-worker-english-documents",
  "skilled-worker-switch-extend-change-employer",
  "skilled-worker-job-loss-sponsorship-ends",
  "skilled-worker-dependants",
  "skilled-worker-settlement-ilr",
];

test("the plan lists the eight Guides once each, in topic reading order", () => {
  assert.deepEqual([...WORK_VISA_SLUGS], SLUGS);
  assert.equal(new Set(WORK_VISA_TOPICS.map((t) => t.id)).size, WORK_VISA_TOPICS.length);
});

test("every hub string, topic and date exists in all five locales", () => {
  for (const locale of GUIDE_LOCALES) {
    for (const [key, value] of Object.entries(WORK_VISA_COPY[locale]))
      assert.ok(value && value.trim(), `${locale} ${key}`);
    for (const topic of WORK_VISA_TOPICS) {
      assert.ok(topic.title[locale]?.trim(), `${locale} ${topic.id} title`);
      assert.ok(topic.lead[locale]?.trim(), `${locale} ${topic.id} lead`);
    }
    for (const item of WORK_VISA_KEY_DATES) {
      assert.ok(item.label[locale]?.trim() && item.text[locale]?.trim(), `${locale} ${item.date}`);
    }
    assert.ok(GUIDE_UI[locale].domain["work-visa"], `${locale} domain label`);
    assert.ok(SITE_UI[locale].topics["work-visa"]?.title, `${locale} nav topic`);
  }
  for (const locale of ["en", "ur", "hi"])
    assert.doesNotMatch(JSON.stringify([WORK_VISA_COPY[locale], WORK_VISA_TOPICS.map((t) => [t.title[locale], t.lead[locale]]),
      WORK_VISA_KEY_DATES.map((d) => [d.label[locale], d.text[locale]])]), /[一-鿿]/, locale);
});

test("Earned Settlement is shown only as a proposal, with the current 5-year rule stated", () => {
  const proposals = WORK_VISA_KEY_DATES.filter((d) => d.proposed);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].date, "pending");
  assert.match(proposals[0].text["zh-CN"], /尚未写入移民规则/);
  assert.match(proposals[0].text["zh-CN"], /现行规则仍是 5 年/);
  assert.match(proposals[0].text.en, /not yet in the Immigration Rules/);
});

test("work-visa is a normal localized Guide domain", () => {
  const domain = GUIDE_DOMAINS["work-visa"];
  assert.equal(domain.category, "work-visa");
  assert.equal(domain.basePath, "/work-visa");
  assert.deepEqual(matchRoute("/work-visa"), { name: "hub", domain: "work-visa" });
  assert.deepEqual(matchRoute("/work-visa/skilled-worker-overview"), {
    name: "guide", domain: "work-visa", slug: "skilled-worker-overview",
  });
  assert.deepEqual(matchRoute("/ur/work-visa/skilled-worker-dependants"), {
    name: "localized-guide", locale: "ur", domain: "work-visa", slug: "skilled-worker-dependants",
  });
  assert.deepEqual(pageRoute(matchRoute("/zh-CN/work-visa")), { name: "hub", domain: "work-visa" });
  assert.equal(
    localeSwitchPath(matchRoute("/work-visa/skilled-worker-overview"), "hi"),
    "/hi/work-visa/skilled-worker-overview",
  );
});

test("the section is linked from the site navigation", () => {
  const topic = HOME_TOPICS.find((t) => t.id === "work-visa");
  assert.ok(topic?.domain, "work-visa home topic has a domain (linked)");
  assert.equal(topic.domain.id, "work-visa");
});

const draftsDir = fileURLToPath(new URL("../../life-in-uk-backend/content/drafts/work-visa/", import.meta.url));
test(
  "every planned slug has a Simplified Chinese source in the work-visa category",
  { skip: existsSync(draftsDir) ? false : "local work-visa drafts not present" },
  () => {
    for (const slug of SLUGS) {
      const draft = JSON.parse(readFileSync(`${draftsDir}${slug}-zh.json`, "utf8"));
      assert.equal(draft.slug, slug);
      assert.equal(draft.category, "work-visa");
    }
  },
);
