// Header navigation configuration. The header lists sections inside a small,
// fixed set of group menus instead of one bar per section, so adding a
// section can never push items off-screen. These checks keep new sections
// and groups wired in correctly; tests/site-header.browser.mjs checks the
// rendered layout in every locale and width.
import test from "node:test";
import assert from "node:assert/strict";
import { HOME_TOPICS, NAV_GROUPS, navGroupTopics, topicHref, visibleNavGroups } from "../src/home/topics.ts";
import { SITE_UI } from "../src/guides/siteUi.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";

// Owner-approved categories (November 2026), in header order, and where
// each published section belongs. Changing these is an editorial decision.
const APPROVED = {
  visas: ["family-visa", "work-visa", "settlement"],
  housing: ["renting"],
  "health-education": ["health"],
  "work-finance": ["money"],
  transport: ["travel"],
};

test("the header uses the five approved categories in order", () => {
  assert.deepEqual([...NAV_GROUPS], Object.keys(APPROVED));
});

test("published sections sit in their approved category", () => {
  for (const [group, ids] of Object.entries(APPROVED)) {
    const published = navGroupTopics(group).filter((topic) => topic.domain || topic.page).map((topic) => topic.id);
    assert.deepEqual(published, ids, group);
  }
});

test("only categories with a published section are shown", () => {
  for (const locale of GUIDE_LOCALES) assert.deepEqual(visibleNavGroups(locale), [...NAV_GROUPS], locale);
  // A category whose topics are all still in preparation stays out of the header.
  const planned = [...HOME_TOPICS.filter((t) => t.navGroup !== "transport"), { id: "driving", navGroup: "transport", title: "", description: "", tone: "travel", icon: "bus" }];
  assert.ok(!visibleNavGroups("en", planned).includes("transport"));
});

test("each category shows at most one section in preparation", () => {
  for (const group of NAV_GROUPS) {
    const upcoming = navGroupTopics(group).filter((topic) => !topic.domain && !topic.page);
    assert.ok(upcoming.length <= 1, `${group}: ${upcoming.length} coming-soon placeholders`);
  }
});

test("every group has a label in all five locales", () => {
  for (const locale of GUIDE_LOCALES) {
    for (const group of NAV_GROUPS) assert.ok(SITE_UI[locale].navGroups[group]?.trim(), `${locale} ${group}`);
    assert.ok(SITE_UI[locale].menu.trim(), `${locale} menu`);
  }
});

test("launched sections come before sections in preparation in each menu", () => {
  for (const locale of GUIDE_LOCALES) {
    for (const group of NAV_GROUPS) {
      const linked = navGroupTopics(group).map((topic) => topicHref(topic, locale) !== undefined);
      const firstUpcoming = linked.indexOf(false);
      if (firstUpcoming >= 0) assert.ok(linked.slice(firstUpcoming).every((live) => !live), `${locale} ${group}`);
    }
  }
});

test("upcoming sections have no route, so the header can never link them", () => {
  for (const topic of HOME_TOPICS.filter((t) => !t.domain && !t.page))
    for (const locale of GUIDE_LOCALES) assert.equal(topicHref(topic, locale), undefined, `${locale} ${topic.id}`);
});
