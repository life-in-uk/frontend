import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  evidenceFingerprint,
  MONEY_QUICK_ANSWERS,
  resolveQuickAnswers,
} from "../src/guides/moneyQuickAnswers.ts";

const set = MONEY_QUICK_ANSWERS;
// Test-only snapshot of the reviewed Guide's evidence and sources (the
// article body is omitted). REAL_BACKEND browser runs check the live Guide.
const reviewed = JSON.parse(
  readFileSync(
    new URL("./fixtures/money-guide-evidence.json", import.meta.url),
  ),
);
const guide = (overrides = {}) => ({
  ...structuredClone(reviewed),
  ...overrides,
});
const verifiedIds = (g, category = "money") =>
  resolveQuickAnswers(set, g, category)
    .filter((answer) => answer.evidence)
    .map((answer) => answer.id);
const citing = (key) =>
  set.answers.filter((a) => a.evidenceKeys.includes(key)).map((a) => a.id);

test("configuration: 12 concise questions, each citing reviewed evidence", () => {
  assert.equal(set.guideSlug, "open-uk-bank-account-new-arrival");
  assert.equal(set.guideSlug, reviewed.slug);
  assert.equal(set.reviewedUpdatedAt, reviewed.updatedAt);
  assert.equal(set.answers.length, 12);
  const ids = set.answers.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  const questions = set.answers.map((a) => a.question);
  assert.equal(new Set(questions).size, questions.length);
  const keys = new Set(reviewed.evidence.map((item) => item.key));
  for (const answer of set.answers) {
    assert.match(answer.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, answer.id);
    assert.match(answer.question, /？$/, answer.id);
    const length = [...answer.answer.replace(/\s/g, "")].length;
    assert.ok(length >= 30 && length <= 110, `${answer.id}: ${length}`);
    assert.ok(answer.evidenceKeys.length > 0, answer.id);
    assert.equal(
      new Set(answer.evidenceKeys).size,
      answer.evidenceKeys.length,
      answer.id,
    );
    for (const key of answer.evidenceKeys)
      assert.ok(keys.has(key), `${answer.id}: ${key}`);
    assert.match(answer.evidenceFingerprint, /^[0-9a-f]{8}$/, answer.id);
    // Bank-specific practices keep the date they were observed.
    if (/(?<![所没])有(?:几家|的)?银行|部分银行/.test(answer.answer))
      assert.match(answer.answer, /截至 2026 年 10 月 7 日/, answer.id);
  }
});

test("all 12 answers verify against the reviewed Guide evidence", () => {
  const resolved = resolveQuickAnswers(set, guide(), "money");
  assert.equal(resolved.length, 12);
  for (const answer of resolved) {
    assert.ok(answer.evidence, answer.id);
    assert.deepEqual(
      answer.evidence.map((item) => item.key),
      answer.evidenceKeys,
    );
  }
});

test("a missing evidence item withholds only the answers citing it", () => {
  const missing = set.answers[0].evidenceKeys[0];
  const g = guide();
  g.evidence = g.evidence.filter((item) => item.key !== missing);
  const verified = verifiedIds(g);
  for (const answer of set.answers)
    assert.equal(
      verified.includes(answer.id),
      !answer.evidenceKeys.includes(missing),
      answer.id,
    );
});

test("unresolvable sources or empty supports do not count as evidence", () => {
  const key = set.answers[0].evidenceKeys[0];
  const noSource = guide();
  const item = noSource.evidence.find((e) => e.key === key);
  item.supports = [{ ...item.supports[0], sourceKey: "gone" }];
  assert.ok(!verifiedIds(noSource).includes(set.answers[0].id));
  const empty = guide();
  empty.evidence.find((e) => e.key === key).supports = [];
  assert.ok(!verifiedIds(empty).includes(set.answers[0].id));
});

test("a different Guide, category or version withholds every answer", () => {
  for (const [g, category] of [
    [guide({ updatedAt: "2026-11-01T00:00:00Z" }), "money"],
    [guide({ slug: "another-guide" }), "money"],
    [guide({ category: "health-nhs" }), "money"],
    [guide(), "health-nhs"],
  ])
    assert.deepEqual(verifiedIds(g, category), []);
});

// Regression: a valid key is not enough. Evidence edited without a new Guide
// version must not keep an answer that was reviewed against older evidence.
test("changed evidence withholds the citing answers even at the same version", () => {
  const usingSource = (g, sourceKey) =>
    set.answers
      .filter((a) =>
        a.evidenceKeys.some((k) =>
          g.evidence
            .find((e) => e.key === k)
            .supports.some((s) => s.sourceKey === sourceKey),
        ),
      )
      .map((a) => a.id);
  const edits = {
    statement: (g) => {
      g.evidence.find((e) => e.key === "fscs-120k-limit").statement += "（改）";
      return citing("fscs-120k-limit");
    },
    locator: (g) => {
      const key = "student-accounts-three-year-residence";
      g.evidence.find((e) => e.key === key).supports[0].locator = "elsewhere";
      return citing(key);
    },
    "source URL": (g) => {
      const sourceKey = g.evidence.find(
        (e) => e.key === "basic-account-features",
      ).supports[0].sourceKey;
      g.sources.find((s) => s.key === sourceKey).url =
        "https://example.test/changed";
      return usingSource(g, sourceKey);
    },
    "supports reordered": (g) => {
      const key = "providers-ask-for-address";
      g.evidence.find((e) => e.key === key).supports.reverse();
      return citing(key);
    },
  };
  for (const [name, edit] of Object.entries(edits)) {
    const g = guide();
    const affected = edit(g);
    assert.ok(affected.length > 0, name);
    const verified = verifiedIds(g);
    for (const answer of set.answers)
      assert.equal(
        verified.includes(answer.id),
        !affected.includes(answer.id),
        `${name}: ${answer.id}`,
      );
  }
});

test("an answer citing different evidence than reviewed is withheld", () => {
  const swapped = {
    ...set,
    answers: set.answers.map((a, i) =>
      i === 0 ? { ...a, evidenceKeys: ["money-mule-warning"] } : a,
    ),
  };
  const resolved = resolveQuickAnswers(swapped, guide(), "money");
  assert.equal(resolved[0].evidence, null);
  assert.ok(resolved.slice(1).every((answer) => answer.evidence));
});

test("fingerprints depend on content and order, not object identity", () => {
  const g = guide();
  const sources = new Map(g.sources.map((s) => [s.key, s]));
  const items = g.evidence.slice(0, 2);
  assert.equal(
    evidenceFingerprint(items, sources),
    evidenceFingerprint(structuredClone(items), new Map(sources)),
  );
  assert.notEqual(
    evidenceFingerprint(items, sources),
    evidenceFingerprint([...items].reverse(), sources),
  );
});
