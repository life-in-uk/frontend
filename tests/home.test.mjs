import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchIndex, searchEntries } from "../src/home/search.ts";
import {
  byRecentUpdate,
  formatHolidayDateZh,
  placeGuides,
  selectFeatured,
} from "../src/home/featured.ts";
import {
  FEATURED_GUIDE_SLUGS,
  availableHomeTopics,
  launchedTopics,
} from "../src/home/topics.ts";
import {
  FAMILY_VISA_GUIDE_DOMAIN,
  HEALTH_GUIDE_DOMAIN,
  MONEY_GUIDE_DOMAIN,
} from "../src/guides/domains.ts";
import { MONEY_QUICK_ANSWERS } from "../src/guides/moneyQuickAnswers.ts";
import { GUIDE_UI } from "../src/guides/locales.ts";

const guide = (slug, category, title, summary, updatedAt) => ({
  slug,
  category,
  title,
  summary,
  publishedAt: updatedAt,
  updatedAt,
});
const GUIDES = [
  guide(
    "open-uk-bank-account-new-arrival",
    "money",
    "刚到英国，怎么开第一个银行账户？",
    "开第一个英国银行账户前要准备什么，以及怎么确认 FSCS 存款保障。",
    "2026-10-07T15:53:00Z",
  ),
  guide(
    "urgent-dental-care-england",
    "health-nhs",
    "突然牙疼怎么办？Emergency Dentist、NHS 111 和什么时候去 A&E",
    "在英格兰突然牙疼时先联系牙医还是 NHS 111。",
    "2026-10-05T06:15:00Z",
  ),
  guide(
    "registering-with-a-gp-england",
    "health-nhs",
    "刚到英国怎么注册 GP？没有地址证明、NHS Number 也可以吗？",
    "在英格兰注册 GP 的申请方式、材料要求。",
    "2026-10-04T21:30:00Z",
  ),
  guide(
    "fixture-family-visa",
    "family-visa",
    "配偶签证怎么申请？",
    "家庭签证草稿。",
    "2026-10-09T00:00:00Z",
  ),
];
const DOMAINS = launchedTopics().map((topic) => topic.domain);
const ANSWERS = [{ set: MONEY_QUICK_ANSWERS, domain: MONEY_GUIDE_DOMAIN }];

test("the six existing Guide sections remain linked before university content is online", () => {
  assert.deepEqual(
    launchedTopics(availableHomeTopics(false)).map((topic) => topic.id),
    ["health", "money", "family-visa", "work-visa", "settlement", "renting"],
  );
  assert.equal(availableHomeTopics(false).length, 9);
  assert.ok(DOMAINS.includes(FAMILY_VISA_GUIDE_DOMAIN));
});

test("search index covers launched sections only", () => {
  const index = buildSearchIndex(GUIDES, DOMAINS, ANSWERS);
  assert.deepEqual(
    searchEntries(index, "配偶签证").map((entry) => entry.href),
    ["/zh-CN/family-visa/fixture-family-visa"],
  );
  assert.ok(
    index.every((entry) =>
      ["/zh-CN/money", "/zh-CN/health", "/zh-CN/family-visa"].some((base) =>
        entry.href.startsWith(base),
      ),
    ),
  );
  const guides = index.filter((entry) => entry.kind === "guide");
  assert.deepEqual(
    guides.map((entry) => entry.href),
    [
      "/zh-CN/money/open-uk-bank-account-new-arrival",
      "/zh-CN/health/urgent-dental-care-england",
      "/zh-CN/health/registering-with-a-gp-england",
      "/zh-CN/family-visa/fixture-family-visa",
    ],
  );
});

test("Quick Answer questions are indexed only when their Guide is published", () => {
  const withGuide = buildSearchIndex(GUIDES, DOMAINS, ANSWERS);
  assert.equal(
    withGuide.filter((entry) => entry.kind === "answer").length,
    MONEY_QUICK_ANSWERS.answers.length,
  );
  assert.ok(
    withGuide
      .filter((entry) => entry.kind === "answer")
      .every((entry) => entry.href === "/zh-CN/money" && entry.text === ""),
  );
  const without = buildSearchIndex(
    GUIDES.filter((g) => g.category !== "money"),
    DOMAINS,
    ANSWERS,
  );
  assert.equal(without.filter((entry) => entry.kind === "answer").length, 0);
});

test("search matches Chinese and Latin queries deterministically", () => {
  const index = buildSearchIndex(GUIDES, DOMAINS, ANSWERS);
  const first = (q) => searchEntries(index, q)[0]?.key;
  assert.equal(first("注册 GP"), "guide:registering-with-a-gp-england");
  assert.equal(first("GP 怎么注册"), "guide:registering-with-a-gp-england");
  assert.equal(first("牙疼"), "guide:urgent-dental-care-england");
  assert.equal(first("银行开户"), "guide:open-uk-bank-account-new-arrival");
  assert.equal(first("ＦＳＣＳ"), "answer:fscs");
  assert.ok(searchEntries(index, "a&e").length > 0);
  assert.deepEqual(searchEntries(index, "火车时刻表"), []);
  assert.deepEqual(searchEntries(index, "   "), []);
  assert.deepEqual(searchEntries(index, "牙疼"), searchEntries(index, "牙疼"));
});

test("Guide search uses locale-specific routes, titles, summaries and section metadata", () => {
  for (const [locale, title, summaryQuery] of [
    ["zh-CN", "全科医生", "地址证明"],
    ["zh-TW", "家庭醫師", "設籍證明"],
    ["en", "GP registration", "temporary address"],
    ["ur", "ڈاکٹر کے ساتھ اندراج", "رَجِسٹریشن"],
    ["hi", "जीपी में पंजीकरण", "दुभाषिया"],
  ]) {
    const published = guide("gp-registration", "health-nhs", title,
      locale === "ur" ? "رجسٹریشن" : summaryQuery, "2026-11-17T14:00:00Z");
    const unknown = { ...published, slug: "unroutable", category: "unknown" };
    const index = buildSearchIndex([published, unknown], DOMAINS, ANSWERS, locale);
    assert.equal(index.length, 1, locale);
    assert.equal(index[0].href, `/${locale}/health/gp-registration`);
    assert.equal(index[0].sectionLabel, GUIDE_UI[locale].domain.health);
    for (const query of [title, summaryQuery, "gp-registration"])
      assert.equal(searchEntries(index, query)[0]?.key, "guide:gp-registration", `${locale} ${query}`);
  }
});

test("featured: preferred slugs first, then most recent; skips missing", () => {
  const placed = placeGuides(
    GUIDES.filter((guide) => guide.category !== "family-visa"),
    DOMAINS,
  );
  assert.equal(placed.length, 3);
  const featured = selectFeatured(
    placed,
    ["missing", "registering-with-a-gp-england"],
    2,
  );
  assert.deepEqual(
    featured.map((item) => item.guide.slug),
    ["registering-with-a-gp-england", "open-uk-bank-account-new-arrival"],
  );
  assert.equal(featured[0].domain, HEALTH_GUIDE_DOMAIN);
  assert.equal(selectFeatured(placed, FEATURED_GUIDE_SLUGS, 4).length, 3);
  assert.deepEqual(
    byRecentUpdate(placed).map((item) => item.guide.slug),
    [
      "open-uk-bank-account-new-arrival",
      "urgent-dental-care-england",
      "registering-with-a-gp-england",
    ],
  );
});

test("holiday date in Chinese with weekday, independent of timezone", () => {
  assert.equal(formatHolidayDateZh("2026-12-25"), "2026年12月25日（周五）");
  assert.equal(formatHolidayDateZh("2028-02-29"), "2028年2月29日（周二）");
  assert.equal(formatHolidayDateZh("2027-01-01"), "2027年1月1日（周五）");
});
