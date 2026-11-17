// Family & Visa in five languages: every Simplified Chinese string the hub,
// navigator, checklist and topic page can show has a translation, the
// translation layer never touches the data used for integrity checks, and
// localized Family & Visa routes keep their page type when switching.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAMILY_VISA_STRINGS } from "../src/guides/familyVisaStringsLocales.ts";
import { familyVisaText, translateDeep } from "../src/guides/familyVisaI18n.ts";
import {
  JOURNEY_STAGES,
  PLACE_LABELS,
  QUESTIONS,
} from "../src/guides/familyVisaJourney.ts";
import { CHECKLIST_SECTIONS } from "../src/guides/familyVisaChecklist.ts";
import { localeSwitchPath, matchRoute, pageRoute } from "../src/router.ts";

const LOCALES = ["zh-TW", "en", "ur", "hi"];
const HAN = /[一-鿿]/;

/** Han string literals in a source file (templates with `${X}` resolved). */
function literals(file) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const consts = Object.fromEntries(
    [...source.matchAll(/const (\w+)\s*=\s*"([^"\n]*)";/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  return [
    ...source.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g),
  ]
    .map((m) =>
      m[1] !== undefined
        ? m[1]
        : m[2].replace(/\$\{(\w+)\}/g, (_, name) => consts[name] ?? `{${name}}`),
    )
    .filter((text) => HAN.test(text));
}

const SHOWN_FILES = [
  "src/guides/familyVisaJourney.ts",
  "src/guides/familyVisaChecklist.ts",
  "src/components/family-visa/FamilyVisaHub.tsx",
  "src/components/family-visa/navigator/FamilyVisaNavigator.tsx",
  "src/components/family-visa/navigator/JourneyResults.tsx",
  "src/components/family-visa/navigator/NavigatorQuestion.tsx",
  "src/components/family-visa/checklist/ChecklistView.tsx",
  "src/components/family-visa/checklist/SavePrompt.tsx",
  "src/components/family-visa/topics/FamilyVisaTopicPage.tsx",
];

test("every Family & Visa UI string has a translation in each locale", () => {
  const missing = [];
  for (const file of SHOWN_FILES)
    for (const text of literals(file))
      for (const locale of LOCALES)
        if (!(text in FAMILY_VISA_STRINGS[locale]))
          missing.push(`${locale} ${file}: ${text.slice(0, 24)}`);
  assert.deepEqual(missing, []);
});

test("structure shown by the navigator and checklist is fully covered", () => {
  const shown = [
    ...Object.values(QUESTIONS).flatMap((q) => [
      q.title,
      q.hint,
      ...q.options.flatMap((o) => [o.label, o.detail ?? ""]),
    ]),
    ...JOURNEY_STAGES.flatMap((s) => [
      s.title,
      s.intro,
      ...s.items.map((i) => i.title),
      ...(s.pending ?? []).map((n) => n.text),
      ...(s.advice ?? []).map((n) => n.text),
      ...(s.notes ?? []).map((n) => n.text),
      ...(s.summaryNotices ?? []).map((n) => n.text),
    ]),
    ...CHECKLIST_SECTIONS.flatMap((s) => [
      s.title,
      ...s.tasks.flatMap((t) => [
        t.title,
        t.condition ?? "",
        ...t.official.map((link) => link.label),
      ]),
    ]),
    ...Object.values(PLACE_LABELS),
  ].filter((text) => HAN.test(text));
  for (const locale of LOCALES)
    assert.deepEqual(
      shown.filter((text) => !(text in FAMILY_VISA_STRINGS[locale])),
      [],
      locale,
    );
});

test("translations keep placeholders, emphasis and no Chinese in en/ur/hi", () => {
  for (const locale of LOCALES)
    for (const [zh, text] of Object.entries(FAMILY_VISA_STRINGS[locale])) {
      const marks = (s) => (s.match(/\{\w+\}/g) ?? []).sort();
      assert.deepEqual(marks(text), marks(zh), `${locale}: ${zh}`);
      assert.equal(
        (text.match(/\*\*/g) ?? []).length,
        (zh.match(/\*\*/g) ?? []).length,
        `${locale}: ${zh}`,
      );
      if (locale !== "zh-TW") assert.ok(!HAN.test(text), `${locale}: ${text}`);
    }
});

test("the translator fills placeholders and passes unknown text through", () => {
  const en = familyVisaText("en");
  assert.equal(en("第 {n} 步，共 {total} 步", { n: 2, total: 4 }), "Step 2 of 4");
  assert.equal(en("partner-visa-routes-overview"), "partner-visa-routes-overview");
  assert.equal(familyVisaText("zh-CN")("待核对"), "待核对");
  const local = familyVisaText("en", { 本地: "local" });
  assert.equal(local("本地"), "local");
  assert.equal(local("待核对"), "Pending check");
});

test("translateDeep swaps display text only; Maps, ids and functions stay", () => {
  const sources = new Map([["k", { title: "移民规则 Appendix FM" }]]);
  const when = () => true;
  const value = {
    id: "s1",
    title: "收入标准",
    when,
    nested: ["英语要求", { label: "如果在英国境外" }],
    sources,
  };
  const out = translateDeep(value, familyVisaText("en"));
  assert.equal(out.id, "s1");
  assert.equal(out.title, "Income threshold");
  assert.equal(out.when, when);
  assert.equal(out.sources, sources);
  assert.deepEqual(out.nested, [
    "English language requirement",
    { label: "If outside the UK" },
  ]);
  assert.equal(value.title, "收入标准", "input is not mutated");
});

test("Family & Visa hub and topic keep their page type in every locale", () => {
  const topic = "children-from-previous-relationship";
  assert.deepEqual(matchRoute(`/en/family-visa/topics/${topic}`), {
    name: "topic",
    domain: "family-visa",
    topic,
    locale: "en",
  });
  assert.deepEqual(pageRoute(matchRoute(`/zh-CN/family-visa/topics/${topic}`)), {
    name: "topic",
    domain: "family-visa",
    topic,
  });
  assert.equal(matchRoute("/ur/family-visa/topics/unknown").name, "not-found");
  const route = matchRoute(`/family-visa/topics/${topic}`);
  assert.equal(localeSwitchPath(route, "hi"), `/hi/family-visa/topics/${topic}`);
  assert.equal(
    localeSwitchPath(matchRoute(`/ur/family-visa/topics/${topic}`), "zh-CN"),
    `/zh-CN/family-visa/topics/${topic}`,
  );
  assert.deepEqual(matchRoute("/zh-TW/family-visa"), {
    name: "localized-hub",
    locale: "zh-TW",
    domain: "family-visa",
  });
});
