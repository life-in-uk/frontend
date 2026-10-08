import test from "node:test";
import assert from "node:assert/strict";
import {
  belongsToDomain,
  domainGuides,
  FAMILY_VISA_GUIDE_DOMAIN,
  GUIDE_DOMAINS,
  guidePath,
  HEALTH_GUIDE_DOMAIN,
  MONEY_GUIDE_DOMAIN,
  relatedGuidesFor,
} from "../src/guides/domains.ts";
import { sourceTextLang } from "../src/guides/format.ts";
import { GUIDE_TITLE_REFERENCES } from "../src/guides/catalog.ts";
import { matchRoute } from "../src/router.ts";

const meta = (slug, category) => ({
  slug,
  category,
  title: `标题 ${slug}`,
  summary: "摘要",
  publishedAt: "2026-10-06T08:00:00Z",
  updatedAt: "2026-10-06T08:00:00Z",
});

test("each domain owns one route base and one API category", () => {
  assert.equal(HEALTH_GUIDE_DOMAIN.basePath, "/health");
  assert.equal(HEALTH_GUIDE_DOMAIN.category, "health-nhs");
  assert.equal(FAMILY_VISA_GUIDE_DOMAIN.basePath, "/family-visa");
  assert.equal(FAMILY_VISA_GUIDE_DOMAIN.category, "family-visa");
  assert.equal(MONEY_GUIDE_DOMAIN.basePath, "/money");
  assert.equal(MONEY_GUIDE_DOMAIN.category, "money");
  assert.equal(MONEY_GUIDE_DOMAIN.label, "金钱与财务");
  assert.equal(MONEY_GUIDE_DOMAIN.backLabel, "回到金钱与财务");
  assert.deepEqual(Object.keys(GUIDE_DOMAINS), [
    "health",
    "family-visa",
    "money",
  ]);
  // Route bases and categories never overlap between domains.
  const domains = Object.values(GUIDE_DOMAINS);
  assert.equal(new Set(domains.map((d) => d.basePath)).size, domains.length);
  assert.equal(new Set(domains.map((d) => d.category)).size, domains.length);
  for (const [id, domain] of Object.entries(GUIDE_DOMAINS))
    assert.equal(domain.id, id);
});

test("matches hub and Guide routes for both domains", () => {
  assert.deepEqual(matchRoute("/family-visa"), {
    name: "hub",
    domain: "family-visa",
  });
  assert.deepEqual(matchRoute("/family-visa/"), {
    name: "hub",
    domain: "family-visa",
  });
  assert.deepEqual(matchRoute("/family-visa/some-guide"), {
    name: "guide",
    domain: "family-visa",
    slug: "some-guide",
  });
  assert.deepEqual(matchRoute("/health/some-guide"), {
    name: "guide",
    domain: "health",
    slug: "some-guide",
  });
});

test("malformed and unknown paths fail safely", () => {
  for (const path of [
    "/family-visa/a/b",
    "/family-visa/%E0%A4%A",
    "/health/%E0%A4%A",
    "/family",
    "/family-visa-extra",
    "/constructor",
    "/__proto__",
    "/toString/x",
    "/Health",
  ])
    assert.deepEqual(matchRoute(path), { name: "not-found" }, path);
});

test("Guides belong only to the domain matching their category", () => {
  const health = meta("a", "health-nhs");
  const family = meta("b", "family-visa");
  assert.equal(belongsToDomain(health, HEALTH_GUIDE_DOMAIN), true);
  assert.equal(belongsToDomain(health, FAMILY_VISA_GUIDE_DOMAIN), false);
  assert.equal(belongsToDomain(family, FAMILY_VISA_GUIDE_DOMAIN), true);
  assert.equal(belongsToDomain(family, HEALTH_GUIDE_DOMAIN), false);
  assert.equal(belongsToDomain(meta("c", "other"), HEALTH_GUIDE_DOMAIN), false);
  const list = [health, family, meta("d", "family-visa"), meta("e", "x")];
  assert.deepEqual(
    domainGuides(list, FAMILY_VISA_GUIDE_DOMAIN).map((g) => g.slug),
    ["b", "d"],
  );
  assert.deepEqual(
    domainGuides(list, HEALTH_GUIDE_DOMAIN).map((g) => g.slug),
    ["a"],
  );
});

test("Guide paths use the domain base", () => {
  assert.equal(guidePath(HEALTH_GUIDE_DOMAIN, "x"), "/health/x");
  assert.equal(guidePath(FAMILY_VISA_GUIDE_DOMAIN, "x"), "/family-visa/x");
});

test("related Guides exist in the list and never cross domains", () => {
  const from = "where-to-go-when-ill-england";
  const configured = HEALTH_GUIDE_DOMAIN.relatedGuides[from];
  assert.ok(configured.length >= 2);
  const list = [
    meta(configured[0], "family-visa"), // miscategorised: must be dropped
    meta(configured[1], "health-nhs"),
  ];
  assert.deepEqual(
    relatedGuidesFor(HEALTH_GUIDE_DOMAIN, from, list).map((g) => g.slug),
    [configured[1]],
  );
  assert.deepEqual(relatedGuidesFor(FAMILY_VISA_GUIDE_DOMAIN, from, list), []);
});

test("title references are per domain; Family & Visa has none yet", () => {
  assert.equal(HEALTH_GUIDE_DOMAIN.titleReferences, GUIDE_TITLE_REFERENCES);
  assert.deepEqual(FAMILY_VISA_GUIDE_DOMAIN.titleReferences, {});
  assert.deepEqual(FAMILY_VISA_GUIDE_DOMAIN.relatedGuides, {});
});

test("example-price labelling stays a Health-only rule", () => {
  const source = {
    key: "example-x",
    organisation: "o",
    title: "t",
    url: "https://example.test",
    accessedAt: "2026-10-06T08:00:00Z",
  };
  assert.equal(HEALTH_GUIDE_DOMAIN.isExampleSource(source), true);
  assert.equal(FAMILY_VISA_GUIDE_DOMAIN.isExampleSource, undefined);
});

test("source language hints follow the text, not an English assumption", () => {
  assert.equal(sourceTextLang("Immigration Rules Appendix FM"), "en");
  assert.equal(sourceTextLang("Band 1；Band 2（FAQ KA-02003）"), "en");
  assert.equal(
    sourceTextLang("You and your general practice（中文版）"),
    undefined,
  );
  assert.equal(sourceTextLang("第 1 节"), undefined);
  assert.equal(sourceTextLang("2026"), undefined);
});

test("matches Money hub and Guide routes; malformed Money paths fail safely", () => {
  assert.deepEqual(matchRoute("/money"), { name: "hub", domain: "money" });
  assert.deepEqual(matchRoute("/money/"), { name: "hub", domain: "money" });
  assert.deepEqual(matchRoute("/money/open-uk-bank-account-new-arrival"), {
    name: "guide",
    domain: "money",
    slug: "open-uk-bank-account-new-arrival",
  });
  for (const path of [
    "/money/a/b",
    "/money/%E0%A4%A",
    "/moneys",
    "/Money",
    "/money-finance",
  ])
    assert.deepEqual(matchRoute(path), { name: "not-found" }, path);
});

test("Money Guides belong only to the Money domain", () => {
  const money = meta("m", "money");
  assert.equal(belongsToDomain(money, MONEY_GUIDE_DOMAIN), true);
  assert.equal(belongsToDomain(money, HEALTH_GUIDE_DOMAIN), false);
  assert.equal(belongsToDomain(money, FAMILY_VISA_GUIDE_DOMAIN), false);
  assert.equal(
    belongsToDomain(meta("h", "health-nhs"), MONEY_GUIDE_DOMAIN),
    false,
  );
  assert.equal(
    belongsToDomain(meta("f", "family-visa"), MONEY_GUIDE_DOMAIN),
    false,
  );
  const list = [
    meta("h", "health-nhs"),
    money,
    meta("m2", "money"),
    meta("f", "family-visa"),
  ];
  assert.deepEqual(
    domainGuides(list, MONEY_GUIDE_DOMAIN).map((g) => g.slug),
    ["m", "m2"],
  );
  assert.deepEqual(MONEY_GUIDE_DOMAIN.titleReferences, {});
  assert.deepEqual(MONEY_GUIDE_DOMAIN.relatedGuides, {});
  // No source classification: Money has no example-source rule.
  assert.equal(MONEY_GUIDE_DOMAIN.isExampleSource, undefined);
  assert.deepEqual(relatedGuidesFor(MONEY_GUIDE_DOMAIN, "m", list), []);
  assert.equal(guidePath(MONEY_GUIDE_DOMAIN, "m"), "/money/m");
});
