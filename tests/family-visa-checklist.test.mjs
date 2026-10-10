// Family & Visa checklist: applicability, gating, labels and progress.
// Fixtures are synthetic (evidence keys only, no Guide wording).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  allTaskBases,
  applicableTaskIds,
  applicableTaskIdsFor,
  buildChecklist,
  CHECKLIST_SECTIONS,
  computeProgress,
  OPTIONAL_TASK_IDS,
  pruneProgress,
} from "../src/guides/familyVisaChecklist.ts";
import {
  JOURNEY_GUIDES,
  resolvePassage,
} from "../src/guides/familyVisaJourney.ts";
import {
  evidenceFingerprint,
  sourceMap,
} from "../src/guides/evidenceIntegrity.ts";
import { syntheticContent } from "./fixtures/familyVisaContent.mjs";

// Placeholder wording only; real wording is local-only (tests/local/).
const CONTENT = syntheticContent();

const GUIDE_IDS = Object.keys(JOURNEY_GUIDES);

function fixtureGuide(id, overrides = {}) {
  const keys = [
    ...new Set(
      allTaskBases()
        .filter((t) => t.basis.guide === id)
        .flatMap((t) => t.basis.evidenceKeys),
    ),
  ];
  const { slug, reviewedUpdatedAt } = JOURNEY_GUIDES[id];
  return {
    slug,
    category: "family-visa",
    title: `Fixture ${id}`,
    summary: "Fixture",
    publishedAt: reviewedUpdatedAt,
    updatedAt: reviewedUpdatedAt,
    content: "Fixture",
    sources: [
      {
        key: "s",
        organisation: "Fixture",
        title: "Fixture",
        url: "https://example.test/",
        accessedAt: reviewedUpdatedAt,
      },
    ],
    evidence: keys.map((key) => ({
      key,
      statement: `Fixture ${key}`,
      supports: [{ sourceKey: "s", locator: "L", excerpt: null, note: "N" }],
    })),
    ...overrides,
  };
}
const ready = (detail) => ({ status: "ready", meta: detail, detail });
const details = () =>
  Object.fromEntries(GUIDE_IDS.map((id) => [id, fixtureGuide(id)]));
const availability = (d) =>
  Object.fromEntries(GUIDE_IDS.map((id) => [id, ready(d[id])]));

/** Sections with task fingerprints re-stamped against the fixtures. */
function stamped(d) {
  return CHECKLIST_SECTIONS.map((section) => ({
    ...section,
    tasks: section.tasks.map((task) =>
      task.basis
        ? {
            ...task,
            basis: {
              ...task.basis,
              fingerprint: evidenceFingerprint(
                task.basis.evidenceKeys.map((key) =>
                  d[task.basis.guide].evidence.find((e) => e.key === key),
                ),
                sourceMap(d[task.basis.guide]),
              ),
            },
          }
        : task,
    ),
  }));
}
function checklist(answers, opts = {}) {
  const d = opts.details ?? details();
  return buildChecklist(
    answers,
    opts.availability ?? availability(d),
    JOURNEY_GUIDES,
    stamped(details()),
    opts.content === undefined ? CONTENT : opts.content,
  );
}
const ids = (sections) => applicableTaskIds(sections);
const base = { relationship: "married", children: "none", location: "outside" };

test("tasks are well formed and every basis is stamped", () => {
  const seen = new Set();
  for (const section of CHECKLIST_SECTIONS)
    for (const task of section.tasks) {
      assert.ok(!seen.has(task.id), task.id);
      seen.add(task.id);
      assert.match(task.id, /^[a-z0-9-]+$/);
      assert.ok(task.official.length > 0, `${task.id}: official link`);
      for (const link of task.official)
        assert.match(link.url, /^https:\/\/www\.gov\.uk\//, task.id);
      if (task.optional) assert.ok(task.condition || task.when, task.id);
      if (task.basis) {
        assert.ok(GUIDE_IDS.includes(task.basis.guide), task.id);
        assert.ok(task.basis.evidenceKeys.length > 0, task.id);
        assert.match(task.basis.fingerprint, /^[0-9a-f]{8}$/, task.id);
        assert.notEqual(task.basis.fingerprint, "00000000", task.id);
      }
    }
});

test("unverified suggestions are never marked as required", () => {
  for (const section of CHECKLIST_SECTIONS)
    for (const task of section.tasks)
      if (!task.basis) assert.notEqual(task.kind, "required", task.id);
});

test("required tasks can never be marked not applicable", () => {
  for (const section of CHECKLIST_SECTIONS)
    for (const task of section.tasks)
      if (task.kind === "required")
        assert.ok(!task.optional, `${task.id} is required but optional`);
  // Even if stored progress claims otherwise, pruning drops the exclusion.
  const all = CHECKLIST_SECTIONS.flatMap((s) => s.tasks);
  const required = all.filter((t) => t.kind === "required").map((t) => t.id);
  const pruned = pruneProgress(
    { checked: [], notApplicable: required },
    required,
    OPTIONAL_TASK_IDS,
  );
  assert.deepEqual(pruned.notApplicable, []);
});

test("relationship tasks follow the relationship type", () => {
  const married = ids(checklist({ ...base, relationship: "married" }));
  assert.ok(married.includes("rel-certificate"));
  assert.ok(!married.includes("rel-two-years"));
  assert.ok(!married.includes("rel-fiance-plan"));
  const unmarried = ids(checklist({ ...base, relationship: "unmarried" }));
  assert.ok(unmarried.includes("rel-two-years"));
  assert.ok(unmarried.includes("rel-undissolved"));
  assert.ok(!unmarried.includes("rel-certificate"));
  const fiance = ids(checklist({ ...base, relationship: "fiance" }));
  assert.ok(fiance.includes("rel-fiance-plan"));
  assert.ok(!fiance.includes("rel-certificate"));
});

test("children appear only when relevant, by relationship to the sponsor", () => {
  const none = checklist(base);
  assert.ok(!none.some((s) => s.id === "children"));
  assert.ok(!ids(none).includes("fin-children"));
  const parent = ids(
    checklist({ ...base, children: "yes", childRelations: ["parent"] }),
  );
  assert.ok(parent.includes("kid-sponsor-parent"));
  assert.ok(!parent.includes("kid-sole-responsibility"));
  assert.ok(parent.includes("fin-children"));
  const notParentOut = ids(
    checklist({ ...base, children: "yes", childRelations: ["not-parent"] }),
  );
  assert.ok(notParentOut.includes("kid-sole-responsibility"));
  assert.ok(!notParentOut.includes("kid-lives-with"));
  assert.ok(!notParentOut.includes("kid-sponsor-parent"));
  const notParentIn = ids(
    checklist({
      ...base,
      children: "yes",
      childRelations: ["not-parent"],
      location: "inside",
    }),
  );
  assert.ok(notParentIn.includes("kid-lives-with"));
  const adopt = ids(
    checklist({ ...base, children: "yes", childRelations: ["adopt-guard"] }),
  );
  assert.ok(adopt.includes("kid-adoption"));
});

test("sole responsibility: cited rules, and no relinquishment requirement", () => {
  const task = CHECKLIST_SECTIONS.flatMap((s) => s.tasks).find(
    (t) => t.id === "kid-sole-responsibility",
  );
  assert.equal(task.kind, "conditional");
  assert.equal(task.optional, true);
  assert.deepEqual([...task.basis.evidenceKeys].sort(), [
    "both-parents-involved",
    "custody-order-not-sufficient",
    "sole-responsibility-factors",
    "sole-responsibility-factual-test",
  ]);
  const all = JSON.stringify(CHECKLIST_SECTIONS);
  for (const banned of ["必须放弃", "放弃抚养权是必须", "必须先放弃"])
    assert.ok(!all.includes(banned), banned);
});

test("accommodation tasks follow the chosen path", () => {
  const none = ids(checklist(base));
  assert.ok(none.includes("acc-adequate"));
  assert.ok(!none.includes("acc-title-register"));
  const owned = ids(checklist({ ...base, accommodation: "owned" }));
  assert.ok(owned.includes("acc-title-register"));
  assert.ok(!owned.includes("acc-tenancy"));
  const rented = ids(checklist({ ...base, accommodation: "rented" }));
  assert.ok(rented.includes("acc-tenancy"));
  assert.ok(!rented.includes("acc-title-register"));
  const other = ids(checklist({ ...base, accommodation: "other" }));
  assert.deepEqual(
    other.filter((id) => id.startsWith("acc-")),
    ["acc-adequate"],
  );
});

test("location decides which variants appear; unsure shows both, labelled", () => {
  const outside = ids(checklist(base));
  assert.ok(outside.includes("fin-whose-income-outside"));
  assert.ok(!outside.includes("fin-whose-income-inside"));
  assert.ok(!outside.includes("rel-living-together"));
  const unsure = checklist({ ...base, location: "unsure" });
  const finance = unsure.find((s) => s.id === "finance").tasks;
  assert.deepEqual(
    finance
      .filter((t) => t.id.startsWith("fin-whose-income"))
      .map((t) => [t.id, t.label]),
    [
      ["fin-whose-income-outside", "如果在英国境外"],
      ["fin-whose-income-inside", "如果在英国境内"],
    ],
  );
});

test("gating: unpublished Guides leave every task pending", () => {
  const unpublished = Object.fromEntries(
    GUIDE_IDS.map((id) => [id, { status: "unpublished" }]),
  );
  const sections = checklist(
    { ...base, children: "yes", childRelations: ["not-parent"] },
    { availability: unpublished },
  );
  for (const section of sections) {
    assert.equal(section.open, false, section.id);
    for (const task of section.tasks) {
      assert.equal(task.status, "pending", task.id);
      assert.deepEqual(task.evidence, []);
    }
  }
});

test("gating: verified Guides show kinds; suggestions stay labelled", () => {
  const sections = checklist({ ...base, accommodation: "owned" });
  const tasks = sections.flatMap((s) => s.tasks);
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  assert.equal(byId["rel-certificate"].status, "verified");
  assert.ok(byId["rel-certificate"].evidence.length > 0);
  assert.equal(byId["id-passport"].status, "suggestion");
  assert.equal(byId["acc-title-register"].status, "suggestion");
  // A changed Guide closes only its own sections.
  const d = details();
  d.finance = { ...d.finance, updatedAt: "2026-12-01T00:00:00Z" };
  const changed = checklist(
    { ...base, accommodation: "owned" },
    {
      availability: availability(d),
    },
  );
  for (const id of ["finance", "accommodation"]) {
    const s = changed.find((x) => x.id === id);
    assert.equal(s.open, false, id);
    assert.ok(
      s.tasks.every((t) => t.status === "pending"),
      id,
    );
  }
  assert.equal(changed.find((x) => x.id === "relationship").open, true);
});

test("no financial calculator, threshold arithmetic or eligibility verdicts", () => {
  const text = JSON.stringify(CHECKLIST_SECTIONS);
  for (const banned of [
    "× 2.5",
    "£16,000 +",
    "£88,500",
    "符合资格",
    "不符合资格",
    "一定获批",
    "你可以申请",
    "eligible",
  ])
    assert.ok(!text.includes(banned), banned);
});

test("progress: exclusions, section completion and overall completion", () => {
  const sections = checklist(base);
  const all = ids(sections);
  const identity = sections
    .find((s) => s.id === "identity")
    .tasks.map((t) => t.id);
  let p = computeProgress(sections, { checked: identity, notApplicable: [] });
  assert.equal(p.sections.find((s) => s.id === "identity").complete, true);
  assert.equal(p.complete, false);
  // Optional tasks marked not applicable do not count against progress.
  const optional = all.filter((id) => OPTIONAL_TASK_IDS.has(id));
  const required = all.filter((id) => !OPTIONAL_TASK_IDS.has(id));
  p = computeProgress(sections, { checked: required, notApplicable: optional });
  assert.equal(p.total, required.length);
  assert.equal(p.done, required.length);
  assert.equal(p.complete, true);
  // Nothing applicable: never "complete".
  assert.equal(
    computeProgress([], { checked: [], notApplicable: [] }).complete,
    false,
  );
});

test("changing answers keeps only still-relevant progress", () => {
  const before = applicableTaskIdsFor({ ...base, relationship: "married" });
  const after = applicableTaskIdsFor({ ...base, relationship: "unmarried" });
  const pruned = pruneProgress(
    {
      checked: ["rel-certificate", "rel-met", "id-passport"],
      notApplicable: ["rel-previous-ended", "rel-met"],
    },
    after,
    OPTIONAL_TASK_IDS,
  );
  assert.ok(before.includes("rel-certificate"));
  assert.ok(!after.includes("rel-certificate"));
  // Dropped: the married-only task. Kept: ticks that still apply.
  assert.deepEqual(pruned.checked, ["rel-met", "id-passport"]);
  // Only optional tasks can be "not applicable"; "rel-met" is required.
  assert.deepEqual(pruned.notApplicable, ["rel-previous-ended"]);
});

// Publication workflow: every task basis must match the reviewed Guide files.
const guidesDir = process.env.FAMILY_VISA_GUIDES_DIR;
test(
  "every task basis matches the reviewed Guide files",
  {
    skip:
      !guidesDir || !existsSync(guidesDir)
        ? "FAMILY_VISA_GUIDES_DIR not set"
        : false,
  },
  () => {
    const files = Object.fromEntries(
      GUIDE_IDS.map((id) => [
        id,
        JSON.parse(
          readFileSync(
            `${guidesDir}/${JOURNEY_GUIDES[id].slug}-zh.json`,
            "utf8",
          ),
        ),
      ]),
    );
    const mismatches = allTaskBases()
      .map(({ id, basis }) => [
        id,
        resolvePassage(basis, ready(files[basis.guide])),
      ])
      .filter(([, state]) => state.status !== "verified")
      .map(([id, state]) => `${id}: ${state.status}`);
    assert.deepEqual(mismatches, []);
  },
);

test("checklist structure carries no restated wording", () => {
  for (const t of CHECKLIST_SECTIONS.flatMap((s) => s.tasks))
    for (const field of ["summary", "steps", "examples", "advice"])
      assert.equal(field in t, false, `${t.id}.${field}`);
  for (const s of CHECKLIST_SECTIONS) assert.equal("intro" in s, false, s.id);
});

test("without reviewed wording, verified Guides still show every task as pending", () => {
  const stale = {
    ...CONTENT,
    reviewedFor: {
      ...CONTENT.reviewedFor,
      relationship: "2020-01-01T00:00:00Z",
    },
  };
  for (const content of [null, stale]) {
    const sections = checklist(base, { content });
    const relationship = sections.find((s) => s.id === "relationship");
    assert.equal(relationship.open, true);
    assert.equal(relationship.intro, null);
    for (const task of relationship.tasks) {
      assert.equal(task.status, "pending", task.id);
      assert.equal(task.wording, null, task.id);
      assert.deepEqual(task.evidence, []);
    }
  }
  const verified = checklist(base).find((s) => s.id === "relationship");
  assert.ok(verified.intro);
  assert.ok(verified.tasks.some((t) => t.status === "verified" && t.wording));
});
