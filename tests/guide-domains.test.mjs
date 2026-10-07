import test from "node:test";
import assert from "node:assert/strict";
import {
  belongsToDomain,
  domainGuides,
  FAMILY_VISA_GUIDE_DOMAIN,
  GUIDE_DOMAINS,
  guidePath,
  HEALTH_GUIDE_DOMAIN,
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
  assert.deepEqual(Object.keys(GUIDE_DOMAINS), ["health", "family-visa"]);
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
