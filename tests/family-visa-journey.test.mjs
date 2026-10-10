// Family & Visa navigator logic: answers, steps, history state, and the
// integrity gate on restated Guide text. Fixtures are synthetic: they reuse
// the journey's evidence keys but contain no Guide wording.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  allPassages,
  buildJourney as buildJourneyWith,
  CHILD_RELATIONS,
  CHILDREN,
  effectiveAnswers,
  HISTORY_KEY,
  isComplete,
  JOURNEY_GUIDES,
  JOURNEY_STAGES,
  LOCATIONS,
  nextStep,
  previousStep,
  QUESTIONS,
  questionSteps,
  readHistoryState,
  RELATIONSHIPS,
  resolvePassage,
  resolveStep,
  validateAnswers,
  writeHistoryState,
} from "../src/guides/familyVisaJourney.ts";
import {
  evidenceFingerprint,
  sourceMap,
} from "../src/guides/evidenceIntegrity.ts";
import { syntheticContent } from "./fixtures/familyVisaContent.mjs";

// Placeholder wording only: real (unpublished) wording is local-only and is
// checked by the gitignored tests/local/ suite when present.
const CONTENT = syntheticContent();

/** The journey with (synthetic) wording supplied, as on the preview server. */
const buildJourney = (answers, guides, stages = JOURNEY_STAGES) =>
  buildJourneyWith(answers, guides, stages, CONTENT);

const GUIDE_IDS = Object.keys(JOURNEY_GUIDES);

/** A synthetic published Guide holding every evidence key the journey cites. */
function fixtureGuide(id, overrides = {}) {
  const keys = [
    ...new Set(
      allPassages()
        .filter((p) => p.guide === id)
        .flatMap((p) => p.evidenceKeys),
    ),
  ];
  const { slug, reviewedUpdatedAt } = JOURNEY_GUIDES[id];
  return {
    slug,
    category: "family-visa",
    title: `Fixture ${id}`,
    summary: `Fixture summary ${id}`,
    publishedAt: reviewedUpdatedAt,
    updatedAt: reviewedUpdatedAt,
    content: "Fixture",
    sources: [
      {
        key: "fixture-source",
        organisation: "Fixture organisation",
        title: "Fixture source",
        url: "https://example.test/source",
        accessedAt: reviewedUpdatedAt,
      },
    ],
    evidence: keys.map((key) => ({
      key,
      statement: `Fixture statement ${key}`,
      supports: [
        {
          sourceKey: "fixture-source",
          locator: "Fixture locator",
          excerpt: null,
          note: "Fixture note",
        },
      ],
    })),
    ...overrides,
  };
}

const ready = (detail) => ({ status: "ready", meta: detail, detail });
const fixtures = () =>
  Object.fromEntries(GUIDE_IDS.map((id) => [id, fixtureGuide(id)]));
const availability = (details) =>
  Object.fromEntries(GUIDE_IDS.map((id) => [id, ready(details[id])]));

/** The journey stages re-stamped against the synthetic fixtures. */
function stampedStages(details) {
  return JOURNEY_STAGES.map((stage) => {
    const stamp = (p) => ({
      ...p,
      fingerprint: evidenceFingerprint(
        p.evidenceKeys.map((key) =>
          details[p.guide].evidence.find((item) => item.key === key),
        ),
        sourceMap(details[p.guide]),
      ),
    });
    return {
      ...stage,
      summary: stage.summary.map(stamp),
      items: stage.items.map((item) => ({
        ...item,
        passages: item.passages.map(stamp),
      })),
    };
  });
}

const every = () =>
  RELATIONSHIPS.flatMap((relationship) =>
    CHILDREN.flatMap((children) =>
      [[], ...CHILD_RELATIONS.map((r) => [r]), [...CHILD_RELATIONS]].flatMap(
        (childRelations) =>
          LOCATIONS.map((location) => ({
            relationship,
            children,
            childRelations: childRelations.length ? childRelations : undefined,
            location,
          })),
      ),
    ),
  );

test("answers keep only known values", () => {
  assert.deepEqual(validateAnswers(null), {});
  assert.deepEqual(
    validateAnswers({
      relationship: "married",
      children: "maybe",
      childRelations: ["parent", "stranger", "parent", "unsure"],
      location: "<script>",
      extra: "x",
    }),
    { relationship: "married", childRelations: ["parent", "unsure"] },
  );
  assert.deepEqual(validateAnswers({ childRelations: "parent" }), {});
});

test("history state is validated and other keys are kept", () => {
  assert.equal(readHistoryState(null), null);
  assert.equal(readHistoryState({ other: 1 }), null);
  assert.deepEqual(
    readHistoryState({ [HISTORY_KEY]: { step: "nowhere", answers: {} } }),
    { step: "relationship", answers: {} },
  );
  // Results without every answer go back to the first unanswered question.
  assert.deepEqual(
    readHistoryState({
      [HISTORY_KEY]: {
        step: "results",
        answers: { relationship: "fiance", children: "yes" },
      },
    }),
    {
      step: "childRelations",
      answers: { relationship: "fiance", children: "yes" },
    },
  );
  const written = writeHistoryState(
    { keep: true },
    { step: "children", answers: { relationship: "married" } },
  );
  assert.equal(written.keep, true);
  assert.deepEqual(readHistoryState(written), {
    step: "children",
    answers: { relationship: "married" },
  });
});

test("the child-relationship question appears only with children", () => {
  assert.deepEqual(questionSteps({ children: "none" }), [
    "relationship",
    "children",
    "location",
  ]);
  for (const children of ["yes", "unsure"])
    assert.deepEqual(questionSteps({ children }), [
      "relationship",
      "children",
      "childRelations",
      "location",
    ]);
  assert.equal(nextStep("children", { children: "none" }), "location");
  assert.equal(nextStep("children", { children: "yes" }), "childRelations");
  assert.equal(nextStep("location", {}), "results");
  assert.equal(previousStep("location", { children: "none" }), "children");
  assert.equal(previousStep("relationship", {}), null);
  // A skipped step resolves to the next question.
  assert.equal(resolveStep("childRelations", { children: "none" }), "location");
});

test("changing children to none and back keeps the child answers", () => {
  const answers = {
    relationship: "unmarried",
    children: "none",
    childRelations: ["not-parent"],
    location: "inside",
  };
  assert.equal(isComplete(answers), true);
  assert.equal(effectiveAnswers(answers).childRelations, undefined);
  const back = { ...answers, children: "yes" };
  assert.deepEqual(effectiveAnswers(back).childRelations, ["not-parent"]);
});

test("question copy asks nothing about nationality, citizenship or passports", () => {
  const copy = JSON.stringify(
    Object.values(QUESTIONS).map((q) => [q.title, q.hint, q.options]),
  );
  for (const banned of [
    "国籍",
    "公民身份",
    "入籍",
    "护照",
    "出生",
    "婚前",
    "婚后",
    "亲生",
  ])
    assert.ok(!copy.includes(banned), banned);
});

test("every passage cites evidence, names a known Guide and has a fingerprint", () => {
  const ids = new Set();
  for (const p of allPassages()) {
    assert.ok(!ids.has(p.id), `duplicate ${p.id}`);
    ids.add(p.id);
    assert.ok(GUIDE_IDS.includes(p.guide), p.id);
    assert.ok(p.evidenceKeys.length > 0, p.id);
    assert.match(p.fingerprint, /^[0-9a-f]{8}$/, p.id);
    assert.notEqual(p.fingerprint, "00000000", p.id);
  }
});

test("public journey structure makes no eligibility decisions or out-of-scope claims", () => {
  const text = JSON.stringify(JOURNEY_STAGES);
  for (const banned of [
    "符合资格",
    "不符合资格",
    "不能带孩子",
    "可以带孩子",
    "一定获批",
    "婚前出生",
    "婚后出生",
    "国籍",
    "入籍",
    "护照",
    "eligible",
  ])
    assert.ok(!text.includes(banned), banned);
  // The sole-responsibility topic belongs to the child stage only.
  for (const stage of JOURNEY_STAGES.filter((s) => s.id !== "children"))
    assert.ok(!JSON.stringify(stage).includes("单方负责"), stage.id);
});

test("the integrity gate: reviewed version, resolvable evidence, fingerprint", () => {
  const details = fixtures();
  const [stage] = stampedStages(details);
  const passage = stage.items[1].passages[0];
  const guide = details[passage.guide];
  assert.equal(resolvePassage(passage, ready(guide)).status, "verified");
  // Another version of the Guide.
  assert.equal(
    resolvePassage(
      passage,
      ready({ ...guide, updatedAt: "2026-12-01T00:00:00Z" }),
    ).status,
    "changed",
  );
  // A changed evidence statement.
  const edited = structuredClone(guide);
  edited.evidence.find((e) => e.key === passage.evidenceKeys[0]).statement =
    "Edited";
  assert.equal(resolvePassage(passage, ready(edited)).status, "changed");
  // Missing evidence, or a support whose source is gone.
  const missing = { ...guide, evidence: [] };
  assert.equal(resolvePassage(passage, ready(missing)).status, "changed");
  const orphan = { ...guide, sources: [] };
  assert.equal(resolvePassage(passage, ready(orphan)).status, "changed");
  // Another category.
  assert.equal(
    resolvePassage(passage, ready({ ...guide, category: "money" })).status,
    "changed",
  );
  for (const status of ["unpublished", "loading", "unavailable"])
    assert.equal(resolvePassage(passage, { status }).status, status);
});

test("stages follow the fixed order; children only with children", () => {
  const details = fixtures();
  const stages = stampedStages(details);
  for (const answers of every()) {
    const ids = buildJourney(answers, availability(details), stages).map(
      (s) => s.id,
    );
    const withChildren =
      answers.children === "yes" || answers.children === "unsure";
    assert.deepEqual(
      ids,
      withChildren
        ? [
            "route",
            "money",
            "relationship",
            "children",
            "application",
            "settlement",
          ]
        : ["route", "money", "relationship", "application", "settlement"],
      JSON.stringify(answers),
    );
  }
});

// The child stage, for one set of answers, with stamped fixtures.
function childStage(answers) {
  const details = fixtures();
  return buildJourney(
    {
      relationship: "married",
      children: "yes",
      location: "outside",
      ...answers,
    },
    availability(details),
    stampedStages(details),
  ).find((s) => s.id === "children");
}
const summaryIds = (stage) => stage.summary.map((p) => p.id);
const passageIds = (stage) =>
  stage.items.flatMap((i) => i.passages.map((p) => p.id));

test("the child stage restates only the dependent-children Guide", () => {
  const stage = JOURNEY_STAGES.find((s) => s.id === "children");
  const passages = [
    ...stage.summary,
    ...stage.items.flatMap((i) => i.passages),
  ];
  assert.ok(passages.length > 0);
  for (const p of passages) assert.equal(p.guide, "children", p.id);
  // Verified content and no pending block: the Guide exists now.
  assert.deepEqual(stage.pending ?? [], []);
  assert.equal(childStage({ childRelations: ["parent"] }).status, "verified");
});

test("child summaries follow the child answers and stay conditional", () => {
  assert.deepEqual(summaryIds(childStage({ childRelations: ["parent"] })), [
    "s4-base",
    "s4-parent",
  ]);
  assert.deepEqual(summaryIds(childStage({ childRelations: ["not-parent"] })), [
    "s4-base",
    "s4-not-parent",
  ]);
  assert.deepEqual(
    summaryIds(childStage({ childRelations: ["adopt-guard"] })),
    ["s4-base", "s4-adopt-guard"],
  );
  const unsure = childStage({ childRelations: ["unsure"] });
  assert.deepEqual(summaryIds(unsure), ["s4-base"]);
  assert.deepEqual(
    unsure.summaryNotices.map((n) => n.id),
    ["s4-unsure"],
  );
  // Several children: every chosen branch, in a fixed order.
  assert.deepEqual(
    summaryIds(
      childStage({ childRelations: ["parent", "not-parent", "adopt-guard"] }),
    ),
    ["s4-base", "s4-parent", "s4-not-parent", "s4-adopt-guard"],
  );
  // Fiancé(e): the in-line grant is added, nothing else changes.
  assert.deepEqual(
    summaryIds(
      childStage({ relationship: "fiance", childRelations: ["parent"] }),
    ),
    ["s4-base", "s4-parent", "s4-fiance"],
  );
  // Married and unmarried couples see the same child stage.
  for (const childRelations of [["parent"], ["not-parent"], ["unsure"]])
    assert.deepEqual(
      JSON.stringify(childStage({ relationship: "unmarried", childRelations })),
      JSON.stringify(childStage({ relationship: "married", childRelations })),
    );
});

test("in-country: the extra option appears only for UK-based applications", () => {
  const outside = childStage({
    childRelations: ["not-parent"],
    location: "outside",
  });
  assert.ok(!summaryIds(outside).includes("s4-in-country"));
  assert.ok(passageIds(outside).includes("d4-4-outside"));
  assert.ok(!passageIds(outside).includes("d4-4-inside-lives-with"));
  const inside = childStage({
    childRelations: ["not-parent"],
    location: "inside",
  });
  assert.ok(summaryIds(inside).includes("s4-in-country"));
  assert.ok(passageIds(inside).includes("d4-4-inside-lives-with"));
  assert.ok(passageIds(inside).includes("d4-4-inside-route"));
  assert.ok(!passageIds(inside).includes("d4-4-outside"));
  // Never for a child of both partners.
  const parentInside = childStage({
    childRelations: ["parent"],
    location: "inside",
  });
  assert.ok(!summaryIds(parentInside).includes("s4-in-country"));
  assert.ok(!passageIds(parentInside).includes("d4-4-inside-lives-with"));
  // Location unsure: both, labelled.
  const unsure = childStage({
    childRelations: ["not-parent"],
    location: "unsure",
  });
  const inCountry = unsure.summary.find((p) => p.id === "s4-in-country");
  assert.equal(inCountry.label, "如果在英国境内");
  const labels = unsure.items
    .find((i) => i.id === "d4-4")
    .passages.map((p) => [p.id, p.label]);
  assert.deepEqual(labels, [
    ["d4-4-outside", "如果在英国境外"],
    ["d4-4-inside-route", "如果在英国境内"],
    ["d4-4-inside-lives-with", "如果在英国境内"],
  ]);
});

test("sole responsibility is explained only for children of a previous relationship", () => {
  const notParent = childStage({ childRelations: ["not-parent"] });
  assert.ok(passageIds(notParent).includes("d4-3-meaning"));
  assert.ok(passageIds(notParent).includes("d4-3-sources"));
  const meaning = allPassages().find((p) => p.id === "d4-3-meaning");
  assert.deepEqual([...meaning.evidenceKeys].sort(), [
    "both-parents-involved",
    "custody-order-not-sufficient",
    "sole-responsibility-factors",
    "sole-responsibility-factual-test",
  ]);
  assert.ok(
    !passageIds(childStage({ childRelations: ["parent"] })).includes(
      "d4-3-meaning",
    ),
  );
});

test("child advice is contextual, and never replaces the child stage", () => {
  const details = fixtures();
  const stages = stampedStages(details);
  const advice = (childRelations) =>
    buildJourney(
      {
        relationship: "unmarried",
        children: "yes",
        childRelations,
        location: "outside",
      },
      availability(details),
      stages,
    )
      .find((s) => s.id === "children")
      .advice.map((n) => n.id);
  assert.deepEqual(advice(["parent"]), []);
  assert.deepEqual(advice(["unsure"]), []);
  assert.deepEqual(advice(["not-parent"]), ["a4-not-parent"]);
  assert.deepEqual(advice(["adopt-guard"]), ["a4-adopt-guard"]);
  assert.deepEqual(advice(["not-parent", "adopt-guard"]), [
    "a4-not-parent",
    "a4-adopt-guard",
  ]);
});

test("the application stage stays pending, with no claims", () => {
  const details = fixtures();
  for (const answers of every()) {
    const stage = buildJourney(
      answers,
      availability(details),
      stampedStages(details),
    ).find((s) => s.id === "application");
    assert.equal(stage.status, "pending");
    assert.equal(stage.items.length, 0);
    assert.equal(stage.summary, null);
  }
});

test("money: no threshold is chosen; variants follow the location", () => {
  const details = fixtures();
  const stages = stampedStages(details);
  const money = (location) =>
    buildJourney(
      { relationship: "married", children: "none", location },
      availability(details),
      stages,
    ).find((s) => s.id === "money");
  const inside = money("inside");
  assert.deepEqual(
    inside.summary.map((p) => p.id),
    ["s2-inside"],
  );
  // The in-country summary cites the transitional and benefit rules.
  const summary = allPassages().find((p) => p.id === "s2-inside");
  assert.ok(summary.evidenceKeys.includes("transitional-conditions"));
  assert.ok(summary.evidenceKeys.includes("disability-carer-benefits"));
  assert.deepEqual(
    inside.items.find((i) => i.id === "d2-1").passages.map((p) => p.id),
    ["d2-1-inside"],
  );
  const outside = money("outside");
  assert.deepEqual(
    outside.items.find((i) => i.id === "d2-1").passages.map((p) => p.id),
    ["d2-1-outside"],
  );
  // Unsure: both variants, labelled; no single summary is chosen.
  const unsure = money("unsure");
  assert.equal(unsure.summary, null);
  assert.deepEqual(
    unsure.items
      .find((i) => i.id === "d2-1")
      .passages.map((p) => [p.id, p.label]),
    [
      ["d2-1-outside", "如果在英国境外"],
      ["d2-1-inside", "如果在英国境内"],
    ],
  );
});

test("money: the savings passage cites the rules that limit the formula", () => {
  const savings = allPassages().find((p) => p.id === "d2-5-savings");
  for (const key of [
    "savings-formula",
    "self-employment",
    "category-b-twelve-months-no-savings",
    "disability-carer-benefits",
  ])
    assert.ok(savings.evidenceKeys.includes(key), key);
});

test("English: location alone never triggers A2; exemptions are cited", () => {
  const outside = allPassages().find((p) => p.id === "d1-4-outside");
  const inside = allPassages().find((p) => p.id === "d1-4-inside");
  assert.deepEqual([...outside.evidenceKeys], ["english-first-application"]);
  assert.deepEqual([...inside.evidenceKeys].sort(), [
    "english-extension-a2",
    "english-first-application",
    "english-in-country-exemptions",
  ]);
});

test("fiancé(e) settlement: no 5-year credit and the switch stays pending", () => {
  const details = fixtures();
  const stage = buildJourney(
    { relationship: "fiance", children: "none", location: "outside" },
    availability(details),
    stampedStages(details),
  ).find((s) => s.id === "settlement");
  assert.deepEqual(
    stage.summary.map((p) => p.id),
    ["s6-fiance"],
  );
  assert.deepEqual(
    stage.pending.map((n) => n.id),
    ["p6-fiance-switch"],
  );
  assert.equal(stage.itemsHeading?.text, "转为伴侣居留之后");
  assert.equal(stage.status, "partial");
});

test("unpublished Guides never show restated text", () => {
  const unpublished = Object.fromEntries(
    GUIDE_IDS.map((id) => [id, { status: "unpublished" }]),
  );
  for (const answers of every()) {
    const stages = buildJourney(answers, unpublished);
    for (const stage of stages) {
      assert.equal(stage.summary, null, stage.id);
      assert.equal(stage.items.length, 0, stage.id);
      assert.equal(stage.status, "pending", stage.id);
      assert.deepEqual(stage.guides, [], stage.id);
    }
  }
});

test("a changed Guide hides its passages and links to the full Guide", () => {
  const details = fixtures();
  const changed = {
    ...details,
    finance: { ...details.finance, updatedAt: "2026-12-01T00:00:00Z" },
  };
  const stages = buildJourney(
    { relationship: "married", children: "none", location: "outside" },
    availability(changed),
    stampedStages(details),
  );
  const money = stages.find((s) => s.id === "money");
  assert.equal(money.summary, null);
  assert.equal(money.summaryFallback, "changed");
  assert.equal(money.items.length, 0);
  assert.equal(money.changed, true);
  assert.equal(money.status, "pending");
  assert.deepEqual(
    money.guides.map((g) => g.slug),
    [JOURNEY_GUIDES.finance.slug],
  );
  // Other Guides are unaffected.
  assert.equal(stages.find((s) => s.id === "route").status, "verified");
});

// Publication workflow: point FAMILY_VISA_GUIDES_DIR at the reviewed Guide
// JSON files to confirm every passage still matches (or to find what to
// re-stamp). Skipped when the directory is not available.
const draftsDir = process.env.FAMILY_VISA_GUIDES_DIR;
test(
  "every passage matches the reviewed Guide files",
  {
    skip:
      !draftsDir || !existsSync(draftsDir)
        ? "FAMILY_VISA_GUIDES_DIR not set"
        : false,
  },
  () => {
    const details = Object.fromEntries(
      GUIDE_IDS.map((id) => [
        id,
        JSON.parse(
          readFileSync(
            `${draftsDir}/${JOURNEY_GUIDES[id].slug}-zh.json`,
            "utf8",
          ),
        ),
      ]),
    );
    const mismatches = allPassages()
      .map((p) => [p, resolvePassage(p, ready(details[p.guide]))])
      .filter(([, state]) => state.status !== "verified")
      .map(([p, state]) => `${p.id}: ${state.status}`);
    assert.deepEqual(mismatches, []);
  },
);

test("journey structure carries no restated wording", () => {
  for (const p of allPassages()) {
    assert.equal("text" in p, false, p.id);
    assert.equal("advice" in p, false, p.id);
  }
});

test("without reviewed wording, verified evidence still shows nothing", () => {
  const details = fixtures();
  const stages = stampedStages(details);
  const answers = {
    relationship: "married",
    children: "none",
    location: "outside",
  };
  const check = (content) =>
    buildJourneyWith(answers, availability(details), stages, content);
  const stale = {
    ...CONTENT,
    reviewedFor: { ...CONTENT.reviewedFor, routes: "2020-01-01T00:00:00Z" },
  };
  for (const content of [null, stale]) {
    const route = check(content).find((s) => s.id === "route");
    assert.equal(route.summary, null);
    assert.equal(route.items.length, 0);
    assert.equal(route.status, "pending");
    assert.ok(route.unpublished === false);
  }
  // With reviewed wording, the same stage is verified and carries the text.
  const route = check(CONTENT).find((s) => s.id === "route");
  assert.equal(route.status, "verified");
  assert.ok(route.summary.every((p) => p.text.length > 0));
});
