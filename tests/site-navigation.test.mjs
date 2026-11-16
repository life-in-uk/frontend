// Header navigation configuration. The header lists sections inside a small,
// fixed set of group menus instead of one bar per section, so adding a
// section can never push items off-screen. These checks keep new sections
// and groups wired in correctly; tests/site-header.browser.mjs checks the
// rendered layout in every locale and width.
import test from "node:test";
import assert from "node:assert/strict";
import { HOME_TOPICS, NAV_GROUPS, navGroupTopics, topicHref } from "../src/home/topics.ts";
import { SITE_UI } from "../src/guides/siteUi.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";

// The wide header bar holds Home plus one button per group. More than this
// and long translations would no longer fit beside search and About.
const MAX_GROUPS = 3;

test("every section belongs to exactly one existing header group", () => {
  for (const topic of HOME_TOPICS) assert.ok(NAV_GROUPS.includes(topic.navGroup), `${topic.id}: unknown group ${topic.navGroup}`);
  const listed = NAV_GROUPS.flatMap((group) => navGroupTopics(group).map((topic) => topic.id));
  assert.deepEqual([...listed].sort(), HOME_TOPICS.map((topic) => topic.id).sort());
  assert.equal(new Set(listed).size, listed.length, "a section appears in two groups");
});

test("the header bar stays small as sections are added", () => {
  assert.ok(NAV_GROUPS.length <= MAX_GROUPS, `${NAV_GROUPS.length} groups: regroup sections instead of widening the bar`);
  for (const group of NAV_GROUPS) assert.ok(navGroupTopics(group).length > 0, `${group} is empty`);
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
