import test from "node:test";
import assert from "node:assert/strict";
import {
  displayableOffer,
  MONEY_AFFILIATE_DRAFT,
  MONEY_AFFILIATE_OFFER,
} from "../src/components/money/affiliate.ts";

test("the affiliate slot is disabled by default", () => {
  assert.equal(MONEY_AFFILIATE_OFFER, null);
  assert.equal(displayableOffer(MONEY_AFFILIATE_OFFER), null);
});

test("the draft uses the approved copy and has no destination", () => {
  assert.deepEqual(MONEY_AFFILIATE_DRAFT, {
    disclosure: "商业合作 · 含推广链接",
    title: "英国热门个人银行账户精选",
    description:
      "了解不同账户的申请条件、主要功能和适用人群，找到值得进一步比较的选择。",
    ctaLabel: "查看账户选择",
    href: null,
  });
  const copy = Object.values(MONEY_AFFILIATE_DRAFT).join(" ");
  // Superseded wording and unsupported claims are absent.
  for (const banned of [
    "银行账户服务",
    "了解合作机构的账户申请条件及服务",
    "查看账户服务",
    "十大",
    "Revolut",
    "Monzo",
    "FCA",
    "FSCS",
    "推荐",
  ])
    assert.ok(!copy.includes(banned), banned);
});

test("an offer is shown only with a disclosure and complete copy", () => {
  assert.equal(displayableOffer(MONEY_AFFILIATE_DRAFT), MONEY_AFFILIATE_DRAFT);
  for (const field of ["disclosure", "title", "description", "ctaLabel"])
    for (const value of ["", "   ", undefined])
      assert.equal(
        displayableOffer({ ...MONEY_AFFILIATE_DRAFT, [field]: value }),
        null,
        `${field}=${JSON.stringify(value)}`,
      );
  assert.equal(displayableOffer(undefined), null);
});

test("a CTA can link only to an https destination", () => {
  const offer = (href) => ({ ...MONEY_AFFILIATE_DRAFT, href });
  assert.equal(displayableOffer(offer(null)).href, null);
  assert.equal(
    displayableOffer(offer("https://example.test/compare")).href,
    "https://example.test/compare",
  );
  for (const href of [
    "http://example.test/compare",
    "javascript:alert(1)",
    "/money",
    "not a url",
    "",
  ])
    assert.equal(displayableOffer(offer(href)), null, href);
});
