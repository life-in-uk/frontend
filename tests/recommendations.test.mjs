// Affiliate-ready recommendation slots stay inactive: no slot is enabled, no
// partner is configured, and a slot can only ever show partners with an https
// link and a disclosure in all five locales. Guides and checklists never
// depend on these slots.
import test from "node:test";
import assert from "node:assert/strict";
import {
  activeRecommendations,
  RECOMMENDATION_LABEL,
  RECOMMENDATION_SLOTS,
  RENTING_STEP_RECOMMENDATIONS,
} from "../src/guides/recommendations.ts";
import { RENTING_STEPS } from "../src/guides/rentingJourney.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";

const all = (text) => Object.fromEntries(GUIDE_LOCALES.map((locale) => [locale, text]));
const partner = (overrides = {}) => ({
  id: "example", name: "Example", url: "https://example.com/compare",
  description: all("A comparison service."), disclosure: all("We may earn a commission."), ...overrides,
});

test("every slot is disabled and empty, so nothing commercial is shown", () => {
  assert.deepEqual(Object.keys(RECOMMENDATION_SLOTS).sort(), ["broadband-comparison", "energy-comparison"]);
  for (const [context, slot] of Object.entries(RECOMMENDATION_SLOTS)) {
    assert.equal(slot.enabled, false, context);
    assert.deepEqual(slot.partners, [], context);
    assert.deepEqual(activeRecommendations(context), [], context);
  }
});

test("slots attach only to the broadband and energy steps", () => {
  assert.deepEqual(RENTING_STEP_RECOMMENDATIONS, { broadband: "broadband-comparison", energy: "energy-comparison" });
  const steps = new Set(RENTING_STEPS.map((step) => step.id));
  for (const id of Object.keys(RENTING_STEP_RECOMMENDATIONS)) assert.ok(steps.has(id), id);
});

test("an enabled slot shows only partners with https links and complete disclosures", () => {
  const slots = (partners, enabled = true) => ({
    "broadband-comparison": { enabled, partners },
    "energy-comparison": { enabled: false, partners: [] },
  });
  assert.deepEqual(activeRecommendations("broadband-comparison", slots([partner()], false)), []);
  assert.equal(activeRecommendations("broadband-comparison", slots([partner()])).length, 1);
  assert.deepEqual(activeRecommendations("broadband-comparison", slots([partner({ url: "http://example.com" })])), []);
  assert.deepEqual(activeRecommendations("broadband-comparison", slots([partner({ url: "javascript:alert(1)" })])), []);
  assert.deepEqual(activeRecommendations("broadband-comparison", slots([partner({ disclosure: { ...all("x"), ur: "" } })])), []);
  assert.deepEqual(activeRecommendations("broadband-comparison", slots([partner({ name: " " })])), []);
});

test("the slot label exists in all five locales", () => {
  for (const locale of GUIDE_LOCALES) assert.ok(RECOMMENDATION_LABEL[locale].trim(), locale);
});
