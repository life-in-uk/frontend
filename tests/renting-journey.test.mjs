// Renting & Moving In (Phases 1 and 2): the journey follows the fixed renting
// sequence from listings to keys and on to the household bills after moving
// in, every step links to one of the twelve Renting Guides, branches only
// filter (never add rules), out-of-scope answers end in a scope notice with a
// way on, all copy exists in five locales, and no rule is restated as journey
// copy. The section is a normal localized Guide domain in the navigation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  applicableTaskIds,
  factStatement,
  fill,
  guidesFor,
  journeyOutcome,
  progressFor,
  RENTING_BRANCHES,
  RENTING_COPY,
  RENTING_FACT_KINDS,
  RENTING_GUIDE_SLUGS,
  RENTING_SCOPES,
  RENTING_STEP_ORDER,
  RENTING_STEPS,
  stepFacts,
  stepTasks,
  validateAnswers,
} from "../src/guides/rentingJourney.ts";
import { GUIDE_DOMAINS, RENTING_GUIDE_DOMAIN } from "../src/guides/domains.ts";
import { GUIDE_LOCALES, GUIDE_UI } from "../src/guides/locales.ts";
import { localeSwitchPath, matchRoute, pageRoute } from "../src/router.ts";
import { HOME_TOPICS, topicHref } from "../src/home/topics.ts";
import { SITE_UI } from "../src/guides/siteUi.ts";

const BRANCHES = RENTING_BRANCHES.map((branch) => branch.id);

test("the journey runs listing → … → sign → keys, then inventory → Council Tax → energy → water → broadband → TV Licence", () => {
  assert.deepEqual(RENTING_STEP_ORDER, [
    "listing", "contact", "viewing", "apply", "referencing",
    "guarantor", "agreement", "payments", "sign", "keys",
    "inventory", "council-tax", "energy", "water", "broadband", "tv-licence",
  ]);
});

test("there are exactly twelve Renting Guides, each owned by the renting domain and used by a step", () => {
  assert.deepEqual([...RENTING_GUIDE_SLUGS], [
    "renting-letting-agent-overview",
    "renting-finding-viewing",
    "renting-referencing-checks",
    "renting-guarantors",
    "renting-deposits-fees",
    "renting-tenancy-agreement",
    "renting-moving-in-inventory",
    "renting-council-tax",
    "renting-energy",
    "renting-water",
    "renting-broadband",
    "renting-tv-licence",
  ]);
  assert.deepEqual(new Set(Object.values(RENTING_GUIDE_DOMAIN.titleReferences)), new Set(RENTING_GUIDE_SLUGS));
  assert.deepEqual(guidesFor(RENTING_STEPS), [...RENTING_GUIDE_SLUGS]);
  for (const step of RENTING_STEPS) {
    assert.ok(RENTING_GUIDE_SLUGS.includes(step.guide), step.id);
    for (const fact of step.facts) assert.ok(RENTING_GUIDE_SLUGS.includes(fact.guide), `${step.id}:${fact.key}`);
  }
});

test("scope and branch answers: out-of-scope ends in a notice; unknown values are dropped", () => {
  assert.deepEqual(journeyOutcome({}), { status: "ask-scope" });
  assert.deepEqual(journeyOutcome({ scope: "england-agent" }), { status: "ask-branch" });
  for (const scope of RENTING_SCOPES.filter((item) => !item.inScope))
    assert.deepEqual(journeyOutcome({ scope: scope.id, branch: "employed-family" }), { status: "out-of-scope", scope: scope.id });
  assert.deepEqual(RENTING_SCOPES.filter((item) => item.inScope).map((item) => item.id), ["england-agent"]);
  for (const branch of BRANCHES)
    assert.deepEqual(journeyOutcome({ scope: "england-agent", branch }), { status: "steps", branch });
  assert.deepEqual(validateAnswers({ scope: "scotland", branch: "student-newcomer", passport: "x" }), { branch: "student-newcomer" });
  assert.deepEqual(validateAnswers(null), {});
  assert.deepEqual(BRANCHES, ["student-newcomer", "employed-family", "other"]);
});

test("every branch sees all sixteen steps, each with at least one task and one key point", () => {
  for (const branch of BRANCHES) {
    for (const step of RENTING_STEPS) {
      assert.ok(stepTasks(step, branch).length > 0, `${branch}:${step.id} tasks`);
      assert.ok(stepFacts(step, branch).length > 0, `${branch}:${step.id} facts`);
    }
  }
  const ids = RENTING_STEPS.flatMap((step) => step.tasks.map((task) => task.id));
  assert.equal(new Set(ids).size, ids.length, "task ids are unique");
});

test("student/newcomer branch adds no-UK-credit-history help; others do not", () => {
  const referencing = RENTING_STEPS.find((step) => step.id === "referencing");
  const keys = (branch) => stepFacts(referencing, branch).map((fact) => fact.key);
  assert.ok(keys("student-newcomer").includes("no-uk-history"));
  assert.ok(keys("student-newcomer").includes("ask-what-proof"));
  assert.ok(!keys("employed-family").includes("no-uk-history"));
  // Right to Rent is a legal check for everyone, separate from referencing.
  for (const branch of BRANCHES) {
    const rtr = stepFacts(referencing, branch).find((fact) => fact.key === "right-to-rent");
    assert.equal(rtr?.kind, "legal");
    assert.equal(stepFacts(referencing, branch).find((fact) => fact.key === "no-minimum-credit")?.kind, "agent");
  }
});

test("a guarantor is never presented as a legal requirement", () => {
  const guarantor = RENTING_STEPS.find((step) => step.id === "guarantor");
  for (const branch of BRANCHES) {
    const fact = stepFacts(guarantor, branch).find((item) => item.key === "guarantor-is-condition");
    assert.equal(fact?.kind, "agent", branch);
  }
  for (const locale of GUIDE_LOCALES) {
    assert.doesNotMatch(guarantor.title[locale], /必须|必須|must|لازمی|ज़रूरी/u);
  }
  assert.match(guarantor.action["zh-CN"], /不是对每个人的法律要求/);
  assert.match(guarantor.action.en, /not a legal requirement for everyone/);
  const student = RENTING_BRANCHES.find((branch) => branch.id === "student-newcomer");
  assert.match(student.note.en, /not every student has to have one/);
});

test("using an agent is never presented as removing the landlord's duties", () => {
  const contact = RENTING_STEPS.find((step) => step.id === "contact");
  assert.ok(stepFacts(contact, "other").some((fact) => fact.key === "landlord-or-agent" && fact.kind === "legal"));
});

test("the four kinds are legal, agent practice, optional services and help — each used", () => {
  assert.deepEqual(Object.keys(RENTING_FACT_KINDS), ["legal", "agent", "optional", "help"]);
  const used = new Set(RENTING_STEPS.flatMap((step) => step.facts.map((fact) => fact.kind)));
  assert.deepEqual([...used].sort(), ["agent", "help", "legal", "optional"]);
});

test("progress counts only tasks that apply to the current branch", () => {
  const all = applicableTaskIds("student-newcomer");
  const employed = applicableTaskIds("employed-family");
  assert.ok(all.includes("guarantor-options"));
  assert.ok(!employed.includes("guarantor-options"));
  assert.deepEqual(progressFor("employed-family", new Set(["guarantor-options", "listing-rent-stated"])), { done: 1, total: employed.length });
  assert.equal(fill(RENTING_COPY.progress.en, { done: 2, total: 5 }), "2 of 5 done");
});

test("key points come only from the published Guide's own evidence", () => {
  const guide = {
    slug: "renting-guarantors", category: "renting", title: "t", summary: "s", publishedAt: "", updatedAt: "", content: "",
    sources: [{ key: "a", organisation: "o", title: "t", url: "https://www.gov.uk/x", accessedAt: "" }],
    evidence: [
      { key: "guarantor-is-condition", statement: "From the Guide.", supports: [{ sourceKey: "a", locator: null, excerpt: null, note: null }] },
      { key: "unsupported", statement: "No support.", supports: [] },
    ],
  };
  assert.equal(factStatement(guide, "guarantor-is-condition")?.statement, "From the Guide.");
  assert.equal(factStatement(guide, "unsupported"), null);
  assert.equal(factStatement(guide, "missing"), null);
  assert.equal(factStatement(undefined, "guarantor-is-condition"), null);
});

test("journey copy restates no amounts, caps or time limits (those come from the Guides)", () => {
  const texts = [
    ...RENTING_STEPS.flatMap((step) => [step.title, step.action, ...step.tasks.map((task) => task.label)]),
    ...RENTING_BRANCHES.flatMap((branch) => [branch.label, branch.hint, branch.note]),
  ];
  for (const text of texts)
    for (const locale of GUIDE_LOCALES)
      assert.doesNotMatch(text[locale], /£|%/u, `${locale}: ${text[locale]}`);
});

test("all journey copy exists in all five locales", () => {
  const all = [
    ...Object.values(RENTING_COPY), ...Object.values(RENTING_FACT_KINDS),
    ...RENTING_SCOPES.map((scope) => scope.label),
    ...RENTING_BRANCHES.flatMap((branch) => [branch.label, branch.hint, branch.note]),
    ...RENTING_STEPS.flatMap((step) => [step.title, step.action, ...step.tasks.map((task) => task.label)]),
  ];
  for (const text of all) {
    for (const locale of GUIDE_LOCALES) assert.ok(text[locale]?.trim(), `${locale} missing in ${text["zh-CN"]}`);
    for (const locale of ["en", "ur", "hi"]) assert.doesNotMatch(text[locale], /[一-鿿]/u, `${locale}: ${text[locale]}`);
    assert.doesNotMatch(text["zh-TW"], /[们这说时问应应该后发证书别类认]/u, `zh-TW simplified: ${text["zh-TW"]}`);
  }
});

test("Phase 2 steps: students see Council Tax and TV Licence points; newcomers see the no-credit-history point", () => {
  const step = (id) => RENTING_STEPS.find((item) => item.id === id);
  const keys = (id, branch) => stepFacts(step(id), branch).map((fact) => fact.key);
  for (const key of ["students-exempt", "student-certificate", "mixed-household"]) {
    assert.ok(keys("council-tax", "student-newcomer").includes(key), key);
    assert.ok(!keys("council-tax", "employed-family").includes(key), key);
  }
  assert.ok(stepTasks(step("council-tax"), "student-newcomer").some((task) => task.id === "council-tax-student-proof"));
  assert.ok(!stepTasks(step("council-tax"), "other").some((task) => task.id === "council-tax-student-proof"));
  assert.ok(keys("energy", "student-newcomer").includes("credit-check"));
  assert.ok(keys("tv-licence", "student-newcomer").includes("home-address"));
  // Council Tax liability and the HMO exception apply to everyone.
  for (const branch of BRANCHES) assert.ok(["liable-person", "hmo"].every((key) => keys("council-tax", branch).includes(key)));
});

test("Phase 2 wording: switching energy supplier is optional, students are not promised an exemption", () => {
  const energy = RENTING_STEPS.find((item) => item.id === "energy");
  assert.equal(energy.facts.find((fact) => fact.key === "tenant-can-switch")?.kind, "optional");
  assert.match(energy.action.en, /Changing supplier is optional, not required/);
  const student = RENTING_BRANCHES.find((branch) => branch.id === "student-newcomer");
  assert.match(student.note.en, /the council decides/);
  for (const step of RENTING_STEPS)
    for (const locale of GUIDE_LOCALES) assert.doesNotMatch(step.action[locale], /自动免除|automatically exempt/u, `${step.id} ${locale}`);
  assert.ok(RENTING_COPY.completeTitle.en && RENTING_COPY.completeText.en);
});

test("the renting section is a localized Guide domain linked from the navigation", () => {
  assert.equal(GUIDE_DOMAINS.renting, RENTING_GUIDE_DOMAIN);
  assert.equal(RENTING_GUIDE_DOMAIN.basePath, "/renting");
  assert.equal(RENTING_GUIDE_DOMAIN.category, "renting");
  assert.deepEqual(matchRoute("/renting"), { name: "hub", domain: "renting" });
  assert.deepEqual(matchRoute("/renting/renting-guarantors"), { name: "guide", domain: "renting", slug: "renting-guarantors" });
  assert.deepEqual(matchRoute("/ur/renting"), { name: "localized-hub", locale: "ur", domain: "renting" });
  assert.deepEqual(pageRoute(matchRoute("/zh-CN/renting")), { name: "hub", domain: "renting" });
  assert.equal(localeSwitchPath({ name: "hub", domain: "renting" }, "hi"), "/hi/renting");
  const topic = HOME_TOPICS.find((item) => item.id === "renting");
  assert.ok(topic?.domain);
  for (const locale of GUIDE_LOCALES) {
    assert.ok(GUIDE_UI[locale].domain.renting);
    assert.ok(SITE_UI[locale].topics.renting?.title);
    assert.equal(topicHref(topic, locale), locale === "zh-CN" ? "/renting" : `/${locale}/renting`);
    assert.doesNotMatch(SITE_UI[locale].topics["daily-life"].description, /租房|租屋|renting|کرائے|किराये/u);
  }
});
