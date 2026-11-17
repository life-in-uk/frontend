import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HEALTH_GUIDE_DOMAIN,
  MONEY_GUIDE_DOMAIN,
  SETTLEMENT_GUIDE_DOMAIN,
} from "../src/guides/domains.ts";
import { guideRoutePath } from "../src/guides/locales.ts";
import { splitTitleReferences, titleReferencesFor } from "../src/guides/titleReferences.ts";

const meta = (slug, category, title) => ({ slug, category, title, summary: "", updatedAt: "2026-11-15T00:00:00Z" });
const CITIZENSHIP_ZH = "拿到永居以后怎么申请入籍";
const EN_LIST = [
  meta("settlement-british-citizenship", "settlement", "Applying for British citizenship after ILR"),
  meta("settlement-ilr-overview", "settlement", "ILR basics"),
  // Same title in another section: never a Settlement link target.
  meta("other-guide", "work-visa", "Skilled Worker overview"),
];
const links = (parts) => parts.filter((part) => typeof part !== "string");

test("zh-CN links the editorial table at once, then only published Guides", () => {
  const before = titleReferencesFor(SETTLEMENT_GUIDE_DOMAIN, "zh-CN");
  assert.equal(before.titles[CITIZENSHIP_ZH], "settlement-british-citizenship");
  const after = titleReferencesFor(SETTLEMENT_GUIDE_DOMAIN, "zh-CN", [
    meta("settlement-ilr-overview", "settlement", "x"),
  ]);
  assert.equal(after.titles[CITIZENSHIP_ZH], undefined, "an unpublished Guide is not linked");
  assert.equal(Object.keys(after.titles).length, 1);
});

test("other locales link published localized titles of the same section only", () => {
  assert.deepEqual(titleReferencesFor(SETTLEMENT_GUIDE_DOMAIN, "en").titles, {}, "nothing before the list arrives");
  const refs = titleReferencesFor(SETTLEMENT_GUIDE_DOMAIN, "en", EN_LIST);
  assert.deepEqual(refs.titles, {
    "Applying for British citizenship after ILR": "settlement-british-citizenship",
    "ILR basics": "settlement-ilr-overview",
  });
  assert.deepEqual(titleReferencesFor(MONEY_GUIDE_DOMAIN, "en", EN_LIST).titles, {}, "no editorial table, no links");
});

test("quotes stay outside the link and the visible label is the localized title", () => {
  const refs = titleReferencesFor(SETTLEMENT_GUIDE_DOMAIN, "en", EN_LIST);
  const parts = splitTitleReferences('See "Applying for British citizenship after ILR" and "settlement".', refs);
  assert.deepEqual(parts, [
    'See "',
    { text: "Applying for British citizenship after ILR", slug: "settlement-british-citizenship" },
    '" and "settlement".',
  ]);
  const zh = splitTitleReferences(`详见《${CITIZENSHIP_ZH}》。`, titleReferencesFor(SETTLEMENT_GUIDE_DOMAIN, "zh-CN"));
  assert.deepEqual(zh, ["详见《", { text: CITIZENSHIP_ZH, slug: "settlement-british-citizenship" }, "》。"]);
  assert.deepEqual(splitTitleReferences("plain text", refs), ["plain text"]);
});

test("Health translations link their descriptive phrases, never to the Guide itself", () => {
  const list = ["registering-with-a-gp-england", "urgent-dental-care-england"].map((slug) =>
    meta(slug, "health-nhs", slug));
  const ur = titleReferencesFor(HEALTH_GUIDE_DOMAIN, "ur", list, "where-to-go-when-ill-england");
  const parts = splitTitleReferences("تو ہماری GP رجسٹریشن والی الگ رہنمائی دیکھیں۔", ur);
  assert.deepEqual(links(parts), [{ text: "GP رجسٹریشن والی الگ رہنمائی", slug: "registering-with-a-gp-england" }]);
  const self = titleReferencesFor(HEALTH_GUIDE_DOMAIN, "zh-TW", list, "urgent-dental-care-england");
  assert.deepEqual(links(splitTitleReferences("# 突然牙疼怎麼辦？", self)), []);
  const tw = titleReferencesFor(HEALTH_GUIDE_DOMAIN, "zh-TW", list, "where-to-go-when-ill-england");
  assert.deepEqual(splitTitleReferences("看我們另一篇《剛到英國怎麼註冊 GP》。", tw), [
    "看我們另一篇《", { text: "剛到英國怎麼註冊 GP", slug: "registering-with-a-gp-england" }, "》。",
  ]);
  const unpublished = titleReferencesFor(HEALTH_GUIDE_DOMAIN, "en", list, "x");
  assert.deepEqual(links(splitTitleReferences("see our separate guide on how NHS dentists work.", unpublished)), []);
});

test("reference paths are locale-correct", () => {
  assert.equal(guideRoutePath("zh-CN", "settlement", "settlement-after-ilr"), "/zh-CN/settlement/settlement-after-ilr");
  assert.equal(guideRoutePath("ur", "settlement", "settlement-after-ilr"), "/ur/settlement/settlement-after-ilr");
  assert.equal(guideRoutePath("zh-TW", "health", "nhs-dentist-england"), "/zh-TW/health/nhs-dentist-england");
});
