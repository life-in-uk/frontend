// The published Family & Visa wording (served by every build) covers exactly
// the published Guides, matches their reviewed versions, is translated into
// every locale, and never carries wording for an unpublished Guide.
import test from "node:test";
import assert from "node:assert/strict";
import { FAMILY_VISA_PUBLISHED_WORDING as W } from "../src/guides/familyVisaPublishedWording.ts";
import { FAMILY_VISA_PUBLISHED_STRINGS as S } from "../src/guides/familyVisaPublishedWordingLocales.ts";
import {
  allPassages,
  buildJourney,
  JOURNEY_GUIDES,
} from "../src/guides/familyVisaJourney.ts";
import { CHECKLIST_SECTIONS } from "../src/guides/familyVisaChecklist.ts";
import {
  loadFamilyVisaContent,
  loadFamilyVisaContentStrings,
} from "../src/guides/familyVisaContent.ts";

const PUBLISHED = ["finance", "relationship", "routes"];
const published = new Set(PUBLISHED);
const taskGuide = Object.fromEntries(
  CHECKLIST_SECTIONS.flatMap((s) =>
    s.tasks.map((t) => [t.id, t.basis?.guide ?? s.gate]),
  ),
);
const sectionGuide = Object.fromEntries(
  CHECKLIST_SECTIONS.map((s) => [s.id, s.gate]),
);

test("published wording is reviewed for exactly the published Guides", () => {
  assert.deepEqual(Object.keys(W.reviewedFor).sort(), PUBLISHED);
  for (const id of PUBLISHED)
    assert.equal(W.reviewedFor[id], JOURNEY_GUIDES[id].reviewedUpdatedAt, id);
  assert.equal("children" in W.reviewedFor, false);
  assert.deepEqual(W.topics, {});
});

test("every passage, task and section of a published Guide has wording, and nothing else does", () => {
  for (const p of allPassages())
    assert.equal(p.id in W.passages, published.has(p.guide), p.id);
  for (const [id, guide] of Object.entries(taskGuide))
    assert.equal(id in W.tasks, published.has(guide), id);
  for (const [id, guide] of Object.entries(sectionGuide))
    assert.equal(id in W.sections, published.has(guide), id);
});

function strings(value, out = new Set()) {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value))
      if (k !== "reviewedFor") strings(v, out);
  return out;
}

test("every published string is translated into zh-TW, en, ur and hi", () => {
  const source = strings(W);
  for (const locale of ["zh-TW", "en", "ur", "hi"]) {
    const map = S[locale];
    assert.ok(map, locale);
    const missing = [...source].filter((s) => !map[s]?.trim());
    assert.deepEqual(missing, [], locale);
    const extra = Object.keys(map).filter((k) => !source.has(k));
    assert.deepEqual(extra, [], `${locale} has strings for no published entry`);
  }
});

test("the loader serves the published wording without the preview flag", async () => {
  assert.equal(await loadFamilyVisaContent(), W);
  assert.equal(await loadFamilyVisaContentStrings("zh-CN"), null);
  assert.equal(await loadFamilyVisaContentStrings("en"), S.en);
});

test("with published Guides at their reviewed versions, children stages stay pending", async () => {
  const ready = (id) => ({
    status: "ready",
    meta: { slug: JOURNEY_GUIDES[id].slug },
    detail: {
      slug: JOURNEY_GUIDES[id].slug,
      category: "family-visa",
      updatedAt: JOURNEY_GUIDES[id].reviewedUpdatedAt,
      evidence: [],
      sources: [],
    },
  });
  const guides = {
    routes: ready("routes"),
    finance: ready("finance"),
    relationship: ready("relationship"),
    children: { status: "unpublished" },
  };
  const stages = buildJourney(
    {
      relationship: "married",
      children: "yes",
      childRelations: ["parent"],
      location: "outside",
    },
    guides,
    undefined,
    W,
  );
  const kidsPassages = stages.flatMap((s) =>
    [...(s.summary ?? []), ...s.items.flatMap((i) => i.passages)].filter(
      (p) => p.guide === "children",
    ),
  );
  assert.deepEqual(kidsPassages, []);
  assert.ok(stages.some((s) => s.unpublished));
});
