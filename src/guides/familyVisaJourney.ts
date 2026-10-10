// Family & Visa navigator: an information journey, not an eligibility check.
//
// The user answers up to four questions; the answers only choose which
// reviewed passages appear, and in which order. Every passage that states a
// rule restates wording from a published Family & Visa Guide and names the
// evidence keys behind it. A passage shows only while its Guide is the version
// it was reviewed against and the cited evidence still matches its
// fingerprint; otherwise the stage falls back to "pending" or "updated" and
// links to the full Guide. Stages without a verified Guide stay pending.
//
// Answers live only in browser history state (see FamilyVisaNavigator); they
// are never sent to the backend, analytics or storage.

import type {
  GuideDetail,
  GuideEvidence,
  GuideMetadata,
  GuideSource,
} from "./api";
import {
  citedEvidence,
  evidenceFingerprint,
  sourceMap,
} from "./evidenceIntegrity.ts";
import type { FamilyVisaContent } from "./familyVisaContent.ts";

// ---------------------------------------------------------------------------
// Answers and steps
// ---------------------------------------------------------------------------

export const RELATIONSHIPS = ["married", "unmarried", "fiance"] as const;
export const CHILDREN = ["none", "yes", "unsure"] as const;
export const CHILD_RELATIONS = [
  "parent",
  "not-parent",
  "adopt-guard",
  "unsure",
] as const;
export const LOCATIONS = ["outside", "inside", "unsure"] as const;
/** Accommodation path, chosen inside the checklist (not a question step). */
export const ACCOMMODATIONS = ["owned", "rented", "other"] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];
export type Children = (typeof CHILDREN)[number];
export type ChildRelation = (typeof CHILD_RELATIONS)[number];
export type Location = (typeof LOCATIONS)[number];
export type Accommodation = (typeof ACCOMMODATIONS)[number];

export type Answers = {
  relationship?: Relationship;
  children?: Children;
  /** Kept when children changes to "none", so switching back restores it. */
  childRelations?: ChildRelation[];
  location?: Location;
  accommodation?: Accommodation;
};

export type QuestionStep =
  "relationship" | "children" | "childRelations" | "location";
export type Step = QuestionStep | "results";

export const STEPS: readonly Step[] = [
  "relationship",
  "children",
  "childRelations",
  "location",
  "results",
];

const oneOf = <T extends string>(list: readonly T[], value: unknown) =>
  typeof value === "string" && (list as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

/** Only known values survive; anything else is dropped and asked again. */
export function validateAnswers(value: unknown): Answers {
  if (typeof value !== "object" || value === null) return {};
  const raw = value as Record<string, unknown>;
  const answers: Answers = {};
  const relationship = oneOf(RELATIONSHIPS, raw.relationship);
  const children = oneOf(CHILDREN, raw.children);
  const location = oneOf(LOCATIONS, raw.location);
  if (relationship) answers.relationship = relationship;
  if (children) answers.children = children;
  if (location) answers.location = location;
  const accommodation = oneOf(ACCOMMODATIONS, raw.accommodation);
  if (accommodation) answers.accommodation = accommodation;
  if (Array.isArray(raw.childRelations)) {
    const relations = CHILD_RELATIONS.filter((relation) =>
      (raw.childRelations as unknown[]).includes(relation),
    );
    if (relations.length > 0) answers.childRelations = relations;
  }
  return answers;
}

export const hasChildren = (answers: Answers) =>
  answers.children === "yes" || answers.children === "unsure";

/** The questions this person is asked, in order. */
export function questionSteps(answers: Answers): QuestionStep[] {
  return hasChildren(answers)
    ? ["relationship", "children", "childRelations", "location"]
    : ["relationship", "children", "location"];
}

export function isAnswered(answers: Answers, step: QuestionStep): boolean {
  if (step === "childRelations")
    return (answers.childRelations?.length ?? 0) > 0;
  return answers[step] !== undefined;
}

export const isComplete = (answers: Answers) =>
  questionSteps(answers).every((step) => isAnswered(answers, step));

/**
 * A step that can be shown for these answers: a skipped question becomes the
 * next one, and results need every answer (else the first unanswered step).
 */
export function resolveStep(step: Step, answers: Answers): Step {
  const questions = questionSteps(answers);
  if (step === "results")
    return questions.find((q) => !isAnswered(answers, q)) ?? "results";
  if (questions.includes(step)) return step;
  return "location";
}

export function nextStep(step: QuestionStep, answers: Answers): Step {
  const questions = questionSteps(answers);
  return questions[questions.indexOf(step) + 1] ?? "results";
}

export function previousStep(
  step: QuestionStep,
  answers: Answers,
): QuestionStep | null {
  const questions = questionSteps(answers);
  return questions[questions.indexOf(step) - 1] ?? null;
}

/** The answers that results use: no child relations without children. */
export function effectiveAnswers(answers: Answers): Answers {
  return hasChildren(answers)
    ? answers
    : { ...answers, childRelations: undefined };
}

// ---------------------------------------------------------------------------
// History state
// ---------------------------------------------------------------------------

export const HISTORY_KEY = "familyVisaNavigator";

export type NavigatorState = { step: Step; answers: Answers };

/** The navigator's entry in a history.state value, validated; else null. */
export function readHistoryState(state: unknown): NavigatorState | null {
  if (typeof state !== "object" || state === null) return null;
  const entry = (state as Record<string, unknown>)[HISTORY_KEY];
  if (typeof entry !== "object" || entry === null) return null;
  const raw = entry as Record<string, unknown>;
  const answers = validateAnswers(raw.answers);
  const step = oneOf(STEPS, raw.step) ?? "relationship";
  return { step: resolveStep(step, answers), answers };
}

/** history.state with the navigator's entry replaced; other keys kept. */
export function writeHistoryState(
  state: unknown,
  entry: NavigatorState,
): Record<string, unknown> {
  const base =
    typeof state === "object" && state !== null
      ? (state as Record<string, unknown>)
      : {};
  return { ...base, [HISTORY_KEY]: entry };
}

// ---------------------------------------------------------------------------
// Questions (navigation copy only: no rules are stated here)
// ---------------------------------------------------------------------------

export type Question = {
  step: QuestionStep;
  title: string;
  hint: string;
  multiple: boolean;
  options: readonly { value: string; label: string; detail?: string }[];
  /** Short label for the answer summary. */
  summary: (answers: Answers) => string | null;
};

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  married: "已婚或民事伴侣",
  unmarried: "未婚伴侣",
  fiance: "未婚夫/妻或准备登记民事伴侣",
};
const CHILDREN_LABELS: Record<Children, string> = {
  none: "没有孩子一起申请",
  yes: "有孩子一起申请",
  unsure: "孩子是否一起申请：还不确定",
};
const CHILD_RELATION_LABELS: Record<ChildRelation, string> = {
  parent: "英国伴侣是孩子的父母",
  "not-parent": "英国伴侣不是孩子的父母",
  "adopt-guard": "涉及收养或监护",
  unsure: "孩子和英国伴侣的关系：不确定",
};
const LOCATION_LABELS: Record<Location, string> = {
  outside: "申请人在英国境外",
  inside: "申请人在英国境内",
  unsure: "申请人在哪里：不确定",
};

export const QUESTIONS: Readonly<Record<QuestionStep, Question>> = {
  relationship: {
    step: "relationship",
    title: "你们是什么关系？",
    hint: "选最接近你们现在情况的一项。",
    multiple: false,
    options: [
      { value: "married", label: "已婚，或已登记民事伴侣" },
      {
        value: "unmarried",
        label: "未婚伴侣",
        detail: "没有结婚，也没有登记民事伴侣",
      },
      {
        value: "fiance",
        label: "未婚夫/妻，或准备登记民事伴侣",
        detail: "打算在英国结婚或登记",
      },
    ],
    summary: (a) =>
      a.relationship ? RELATIONSHIP_LABELS[a.relationship] : null,
  },
  children: {
    step: "children",
    title: "有孩子会和申请人一起申请吗？",
    hint: "这里只问有没有孩子一起申请，不需要填写孩子的个人信息。",
    multiple: false,
    options: [
      { value: "none", label: "没有" },
      { value: "yes", label: "有" },
      { value: "unsure", label: "还不确定" },
    ],
    summary: (a) => (a.children ? CHILDREN_LABELS[a.children] : null),
  },
  childRelations: {
    step: "childRelations",
    title: "英国这边的伴侣是不是孩子的父母？",
    hint: "有几个孩子、情况不一样的，可以多选。",
    multiple: true,
    options: [
      { value: "parent", label: "是" },
      {
        value: "not-parent",
        label: "不是",
        detail: "例如申请人以前关系中的孩子",
      },
      { value: "adopt-guard", label: "涉及收养或监护" },
      { value: "unsure", label: "不确定" },
    ],
    summary: (a) =>
      a.childRelations?.length
        ? a.childRelations.map((r) => CHILD_RELATION_LABELS[r]).join("、")
        : null,
  },
  location: {
    step: "location",
    title: "申请人现在在哪里？",
    hint: "申请人是要来英国、或要在英国留下来的那一方。",
    multiple: false,
    options: [
      { value: "outside", label: "英国境外" },
      { value: "inside", label: "英国境内" },
      { value: "unsure", label: "不确定" },
    ],
    summary: (a) => (a.location ? LOCATION_LABELS[a.location] : null),
  },
};

// ---------------------------------------------------------------------------
// Reviewed journey content
// ---------------------------------------------------------------------------

/** The Guides the journey restates, and the versions it was reviewed against. */
export const JOURNEY_GUIDES = {
  routes: {
    slug: "partner-visa-routes-overview",
    reviewedUpdatedAt: "2026-10-08T21:40:00Z",
  },
  finance: {
    slug: "partner-visa-financial-requirement",
    reviewedUpdatedAt: "2026-10-08T21:30:00Z",
  },
  relationship: {
    slug: "partner-visa-relationship-evidence",
    reviewedUpdatedAt: "2026-10-08T18:30:00Z",
  },
  children: {
    slug: "partner-visa-dependent-children",
    reviewedUpdatedAt: "2026-10-09T19:50:00Z",
  },
} as const;
export type JourneyGuideId = keyof typeof JOURNEY_GUIDES;
export const JOURNEY_GUIDE_SLUGS = Object.values(JOURNEY_GUIDES).map(
  (guide) => guide.slug,
);

/** A paragraph, or a list when it is an array. "**x**" marks emphasis. */
export type TextBlock = string | readonly string[];

export type When = (answers: Answers) => boolean;
export const always: When = () => true;
export const rel =
  (...values: Relationship[]): When =>
  (a) =>
    a.relationship !== undefined && values.includes(a.relationship);
/** "unsure" location shows both the outside and the inside passages. */
export const at =
  (place: "outside" | "inside"): When =>
  (a) =>
    a.location === place || a.location === "unsure";
export const locationIs =
  (place: Location): When =>
  (a) =>
    a.location === place;
export const kids: When = hasChildren;
/** Any of these child-relationship answers was chosen. */
export const child =
  (...values: ChildRelation[]): When =>
  (a) =>
    values.some((value) => a.childRelations?.includes(value) ?? false);
export const both =
  (...conditions: When[]): When =>
  (a) =>
    conditions.every((condition) => condition(a));

/** A passage restating one Guide, gated by integrity. */
export type Passage = {
  id: string;
  guide: JourneyGuideId;
  when: When;
  /** Shown as "如果在英国境外/境内：" when the location is unsure. */
  place?: "outside" | "inside";
  evidenceKeys: readonly string[];
  /** Fingerprint of the cited evidence at review (see evidenceIntegrity). */
  fingerprint: string;
};

export type DetailItem = {
  id: string;
  title: string;
  passages: readonly Passage[];
};

/** Fixed copy with no legal content, e.g. "being prepared" notices. */
export type Notice = { id: string; when: When; text: string };

export type Stage = {
  id: string;
  number: number;
  title: string;
  intro: string;
  when: When;
  summary: readonly Passage[];
  /** Neutral summary sentences shown regardless of integrity. */
  summaryNotices?: readonly Notice[];
  items: readonly DetailItem[];
  /** Pending content (no verified Guide yet), shown in the details. */
  pending?: readonly Notice[];
  /** Advice notices that depend on answers, not on a passage. */
  advice?: readonly Notice[];
  /** Neutral cross-references shown in the details. */
  notes?: readonly Notice[];
  /** Subheading before the items, e.g. for fiancé(e)s in stage 6. */
  itemsHeading?: Notice;
};

const ADVISER = "在 Immigration Advice Authority（IAA）注册的移民顾问或律师";

export const JOURNEY_STAGES: readonly Stage[] = [
  {
    id: "route",
    number: 1,
    title: "伴侣签证路线和基本要求",
    intro: "先确认你们属于哪一类伴侣、英国这边伴侣的身份，以及从哪里申请。",
    when: always,
    summary: [
      {
        id: "s1-married",
        guide: "routes",
        when: rel("married"),
        evidenceKeys: ["partner-definition"],
        fingerprint: "65155b0e",
      },
      {
        id: "s1-unmarried",
        guide: "routes",
        when: rel("unmarried"),
        evidenceKeys: ["partner-definition"],
        fingerprint: "65155b0e",
      },
      {
        id: "s1-fiance",
        guide: "routes",
        when: rel("fiance"),
        evidenceKeys: ["fiance-grant"],
        fingerprint: "9ad6c787",
      },
      {
        id: "s1-outside",
        guide: "routes",
        when: locationIs("outside"),
        evidenceKeys: ["entry-clearance-outside", "sponsor-status"],
        fingerprint: "1dd4e4a2",
      },
      {
        id: "s1-inside",
        guide: "routes",
        when: locationIs("inside"),
        evidenceKeys: [
          "leave-to-remain-inside",
          "no-switch-visitor",
          "immigration-bail-breach",
        ],
        fingerprint: "c982393d",
      },
    ],
    summaryNotices: [
      {
        id: "s1-unsure",
        when: locationIs("unsure"),
        text: "从英国境外还是境内申请，要求不同，展开查看两种情况。",
      },
    ],
    items: [
      {
        id: "d1-1",
        title: "谁算伴侣、每次批多久",
        passages: [
          {
            id: "d1-1-partner",
            guide: "routes",
            when: rel("married", "unmarried"),
            evidenceKeys: ["partner-definition", "grant-periods"],
            fingerprint: "58ac2f4d",
          },
          {
            id: "d1-1-fiance",
            guide: "routes",
            when: rel("fiance"),
            evidenceKeys: ["partner-definition", "fiance-grant"],
            fingerprint: "e9a88286",
          },
        ],
      },
      {
        id: "d1-2",
        title: "英国伴侣的身份",
        passages: [
          {
            id: "d1-2-sponsor",
            guide: "routes",
            when: always,
            evidenceKeys: ["sponsor-status", "ilr-sponsor-status"],
            fingerprint: "361e4458",
          },
        ],
      },
      {
        id: "d1-3",
        title: "从哪里申请",
        passages: [
          {
            id: "d1-3-outside",
            guide: "routes",
            when: at("outside"),
            place: "outside",
            evidenceKeys: ["entry-clearance-outside"],
            fingerprint: "c20f2306",
          },
          {
            id: "d1-3-inside",
            guide: "routes",
            when: at("inside"),
            place: "inside",
            evidenceKeys: [
              "leave-to-remain-inside",
              "no-switch-visitor",
              "immigration-bail-breach",
            ],
            fingerprint: "c982393d",
          },
        ],
      },
      {
        id: "d1-4",
        title: "英语要求",
        passages: [
          {
            id: "d1-4-outside",
            guide: "routes",
            when: at("outside"),
            place: "outside",
            evidenceKeys: ["english-first-application"],
            fingerprint: "7721ede7",
          },
          {
            id: "d1-4-inside",
            guide: "routes",
            when: at("inside"),
            place: "inside",
            evidenceKeys: [
              "english-first-application",
              "english-extension-a2",
              "english-in-country-exemptions",
            ],
            fingerprint: "d99641ed",
          },
        ],
      },
      {
        id: "d1-5",
        title: "不保证获批 · 新的拒签理由",
        passages: [
          {
            id: "d1-5-suitability",
            guide: "routes",
            when: always,
            evidenceKeys: ["all-requirements-apply", "hc584-suitability"],
            fingerprint: "18f1664f",
          },
        ],
      },
    ],
  },
  {
    id: "money",
    number: 2,
    title: "收入和住宿要求",
    intro: "这一步说明收入要求怎么确定、谁的收入可以计算，以及存款和住宿。",
    when: always,
    summary: [
      {
        id: "s2-outside",
        guide: "finance",
        when: locationIs("outside"),
        evidenceKeys: [
          "threshold-29000",
          "entry-clearance-income-sources",
          "disability-carer-benefits",
          "exceptions-ten-year",
        ],
        fingerprint: "21e17e5d",
      },
      {
        id: "s2-inside",
        guide: "finance",
        when: locationIs("inside"),
        evidenceKeys: [
          "threshold-29000",
          "transitional-conditions",
          "disability-carer-benefits",
          "leave-to-remain-income-sources",
        ],
        fingerprint: "c537ba55",
      },
    ],
    summaryNotices: [
      {
        id: "s2-unsure",
        when: locationIs("unsure"),
        text: "收入标准和能计算谁的收入，要看你从境外还是境内申请，展开查看两种情况。",
      },
    ],
    items: [
      {
        id: "d2-1",
        title: "收入标准",
        passages: [
          {
            id: "d2-1-outside",
            guide: "finance",
            when: at("outside"),
            place: "outside",
            evidenceKeys: [
              "threshold-29000",
              "transitional-conditions",
              "disability-carer-benefits",
              "exceptions-ten-year",
            ],
            fingerprint: "7452cdca",
          },
          {
            id: "d2-1-inside",
            guide: "finance",
            when: at("inside"),
            place: "inside",
            evidenceKeys: [
              "threshold-29000",
              "transitional-conditions",
              "disability-carer-benefits",
              "exceptions-ten-year",
            ],
            fingerprint: "7452cdca",
          },
        ],
      },
      {
        id: "d2-2",
        title: "孩子和收入标准",
        passages: [
          {
            id: "d2-2-general",
            guide: "finance",
            when: kids,
            evidenceKeys: ["general-threshold-children"],
            fingerprint: "3658a41c",
          },
          {
            id: "d2-2-transitional",
            guide: "finance",
            when: both(kids, at("inside")),
            place: "inside",
            evidenceKeys: ["transitional-amounts"],
            fingerprint: "5c392a07",
          },
        ],
      },
      {
        id: "d2-3",
        title: "谁的收入能算",
        passages: [
          {
            id: "d2-3-outside",
            guide: "finance",
            when: at("outside"),
            place: "outside",
            evidenceKeys: [
              "entry-clearance-income-sources",
              "govuk-combined-income-wording",
              "returning-partner-overseas-income",
            ],
            fingerprint: "d5f04e2c",
          },
          {
            id: "d2-3-inside",
            guide: "finance",
            when: at("inside"),
            place: "inside",
            evidenceKeys: ["leave-to-remain-income-sources"],
            fingerprint: "916b1c6e",
          },
        ],
      },
      {
        id: "d2-4",
        title: "工作满不满 6 个月",
        passages: [
          {
            id: "d2-4-employment",
            guide: "finance",
            when: always,
            evidenceKeys: [
              "category-a-six-months",
              "category-b-twelve-months-no-savings",
            ],
            fingerprint: "8a1ef4ca",
          },
        ],
      },
      {
        id: "d2-5",
        title: "存款怎么用",
        passages: [
          {
            id: "d2-5-savings",
            guide: "finance",
            when: always,
            evidenceKeys: [
              "savings-formula",
              "self-employment",
              "category-b-twelve-months-no-savings",
              "disability-carer-benefits",
              "savings-six-months",
              "savings-six-month-exceptions",
              "gifted-savings",
              "third-party-promises",
            ],
            fingerprint: "0d2498d9",
          },
        ],
      },
      {
        id: "d2-6",
        title: "自雇收入",
        passages: [
          {
            id: "d2-6-self-employment",
            guide: "finance",
            when: always,
            evidenceKeys: ["self-employment"],
            fingerprint: "b83db12d",
          },
        ],
      },
      {
        id: "d2-7",
        title: "住宿和规定证据",
        passages: [
          {
            id: "d2-7-accommodation",
            guide: "finance",
            when: always,
            evidenceKeys: ["accommodation", "specified-evidence"],
            fingerprint: "fe92cc1a",
          },
        ],
      },
    ],
  },
  {
    id: "relationship",
    number: 3,
    title: "关系要求和证据",
    intro: "这一步说明规则对关系的硬性要求，以及 Home Office 怎样看关系证据。",
    when: always,
    summary: [
      {
        id: "s3-married",
        guide: "relationship",
        when: rel("married"),
        evidenceKeys: [
          "valid-marriage",
          "genuine-and-subsisting",
          "intend-to-live-together",
          "not-a-checklist",
        ],
        fingerprint: "b1311511",
      },
      {
        id: "s3-unmarried",
        guide: "relationship",
        when: rel("unmarried"),
        evidenceKeys: [
          "unmarried-two-years",
          "genuine-and-subsisting",
          "not-a-checklist",
        ],
        fingerprint: "dab5e1a7",
      },
      {
        id: "s3-fiance",
        guide: "relationship",
        when: rel("fiance"),
        evidenceKeys: [
          "fiance-purpose",
          "previous-relationships-ended",
          "genuine-and-subsisting",
        ],
        fingerprint: "ac34e44d",
      },
    ],
    items: [
      {
        id: "d3-1",
        title: "基本要求和“见过面”",
        passages: [
          {
            id: "d3-1-core",
            guide: "relationship",
            when: always,
            evidenceKeys: [
              "both-aged-18",
              "prohibited-degree",
              "met-in-person",
              "genuine-and-subsisting",
              "intend-to-live-together",
              "met-in-person-meaning",
            ],
            fingerprint: "32af261d",
          },
        ],
      },
      {
        id: "d3-2",
        title: "按你们的关系类型",
        passages: [
          {
            id: "d3-2-married",
            guide: "relationship",
            when: rel("married"),
            evidenceKeys: ["valid-marriage", "previous-relationships-ended"],
            fingerprint: "796c9c1e",
          },
          {
            id: "d3-2-unmarried",
            guide: "relationship",
            when: rel("unmarried"),
            evidenceKeys: ["unmarried-two-years", "undissolved-marriage"],
            fingerprint: "6f33a71c",
          },
          {
            id: "d3-2-fiance",
            guide: "relationship",
            when: rel("fiance"),
            evidenceKeys: ["fiance-purpose", "previous-relationships-ended"],
            fingerprint: "092bf196",
          },
        ],
      },
      {
        id: "d3-3",
        title: "Home Office 怎样看证据",
        passages: [
          {
            id: "d3-3-assessment",
            guide: "relationship",
            when: always,
            evidenceKeys: [
              "not-a-checklist",
              "cohabitation-not-prerequisite",
              "never-visited-uk",
              "third-party-opinion",
            ],
            fingerprint: "160ad571",
          },
        ],
      },
      {
        id: "d3-4",
        title: "续签时同住",
        passages: [
          {
            id: "d3-4-living-together",
            guide: "relationship",
            when: at("inside"),
            place: "inside",
            evidenceKeys: ["living-together-extension"],
            fingerprint: "536eb55e",
          },
        ],
      },
    ],
  },
  {
    id: "children",
    number: 4,
    title: "孩子随行申请",
    intro: "这一步整理孩子一起申请时需要了解的信息。",
    when: kids,
    summary: [
      {
        id: "s4-base",
        guide: "children",
        when: always,
        evidenceKeys: ["basic-requirements", "three-limbs"],
        fingerprint: "6f729c69",
      },
      {
        id: "s4-parent",
        guide: "children",
        when: child("parent"),
        evidenceKeys: ["parent-definition", "three-limbs"],
        fingerprint: "7a63eabe",
      },
      {
        id: "s4-not-parent",
        guide: "children",
        when: child("not-parent"),
        evidenceKeys: [
          "three-limbs",
          "sole-responsibility-factual-test",
          "custody-order-not-sufficient",
        ],
        fingerprint: "60b563eb",
      },
      {
        id: "s4-in-country",
        guide: "children",
        when: both(child("not-parent", "unsure"), at("inside")),
        place: "inside",
        evidenceKeys: ["in-country-normally-lives-with"],
        fingerprint: "5a3fafce",
      },
      {
        id: "s4-adopt-guard",
        guide: "children",
        when: child("adopt-guard"),
        evidenceKeys: ["adoption-definition", "guardian-not-parent"],
        fingerprint: "b10e3500",
      },
      {
        id: "s4-fiance",
        guide: "children",
        when: rel("fiance"),
        evidenceKeys: ["fiance-child"],
        fingerprint: "db0edb24",
      },
    ],
    summaryNotices: [
      {
        id: "s4-unsure",
        when: child("unsure"),
        text: "不确定属于哪种情形时，可以展开查看三种情形分别要求什么。",
      },
    ],
    items: [
      {
        id: "d4-1",
        title: "所有孩子都要满足的基本条件",
        passages: [
          {
            id: "d4-1-basic",
            guide: "children",
            when: always,
            evidenceKeys: [
              "basic-requirements",
              "care-arrangements",
              "safeguarding-refusal",
            ],
            fingerprint: "0cf02465",
          },
        ],
      },
      {
        id: "d4-2",
        title: "三种情形",
        passages: [
          {
            id: "d4-2-limbs",
            guide: "children",
            when: always,
            evidenceKeys: [
              "three-limbs",
              "parent-definition",
              "no-birth-status-distinction",
            ],
            fingerprint: "25eb4c78",
          },
        ],
      },
      {
        id: "d4-3",
        title: "“单方负责”是什么意思",
        passages: [
          {
            id: "d4-3-meaning",
            guide: "children",
            when: child("not-parent", "unsure"),
            evidenceKeys: [
              "sole-responsibility-factual-test",
              "custody-order-not-sufficient",
              "sole-responsibility-factors",
              "both-parents-involved",
            ],
            fingerprint: "bac4ac36",
          },
          {
            id: "d4-3-sources",
            guide: "children",
            when: child("not-parent", "unsure"),
            evidenceKeys: [
              "three-limbs",
              "children-guidance-pointer",
              "custody-order-not-sufficient",
              "sole-responsibility-factual-test",
              "serious-compelling-welfare",
            ],
            fingerprint: "8a0d5b00",
          },
        ],
      },
      {
        id: "d4-4",
        title: "境内和境外申请的区别",
        passages: [
          {
            id: "d4-4-outside",
            guide: "children",
            when: both(child("not-parent", "unsure"), at("outside")),
            place: "outside",
            evidenceKeys: ["in-country-normally-lives-with"],
            fingerprint: "5a3fafce",
          },
          {
            id: "d4-4-inside-route",
            guide: "children",
            when: at("inside"),
            place: "inside",
            evidenceKeys: ["in-country-route"],
            fingerprint: "f13ccc6a",
          },
          {
            id: "d4-4-inside-lives-with",
            guide: "children",
            when: both(child("not-parent", "unsure"), at("inside")),
            place: "inside",
            evidenceKeys: ["in-country-normally-lives-with"],
            fingerprint: "5a3fafce",
          },
        ],
      },
      {
        id: "d4-5",
        title: "“严重且令人信服的考虑”",
        passages: [
          {
            id: "d4-5-serious",
            guide: "children",
            when: child("not-parent", "adopt-guard", "unsure"),
            evidenceKeys: [
              "serious-compelling-welfare",
              "serious-compelling-child-focus",
            ],
            fingerprint: "a5d69eb1",
          },
        ],
      },
      {
        id: "d4-6",
        title: "收养和监护",
        passages: [
          {
            id: "d4-6-adoption",
            guide: "children",
            when: child("adopt-guard", "unsure"),
            evidenceKeys: ["adoption-definition", "guardian-not-parent"],
            fingerprint: "b10e3500",
          },
        ],
      },
      {
        id: "d4-7",
        title: "随未婚夫/妻签证",
        passages: [
          {
            id: "d4-7-fiance",
            guide: "children",
            when: rel("fiance"),
            evidenceKeys: ["fiance-child"],
            fingerprint: "db0edb24",
          },
        ],
      },
      {
        id: "d4-8",
        title: "收入、住宿和批准期限",
        passages: [
          {
            id: "d4-8-money",
            guide: "children",
            when: always,
            evidenceKeys: [
              "child-financial",
              "child-income-sources",
              "child-accommodation",
              "grant-in-line",
            ],
            fingerprint: "137a66d1",
          },
        ],
      },
      {
        id: "d4-9",
        title: "达不到要求时",
        passages: [
          {
            id: "d4-9-exceptional",
            guide: "children",
            when: always,
            evidenceKeys: [
              "all-requirements-apply",
              "exceptional-best-interests",
            ],
            fingerprint: "aba96218",
          },
          {
            id: "d4-9-turning-18",
            guide: "children",
            when: at("outside"),
            place: "outside",
            evidenceKeys: ["turning-18-entry"],
            fingerprint: "9ef86573",
          },
        ],
      },
    ],
    advice: [
      {
        id: "a4-not-parent",
        when: child("not-parent"),
        text: `这种情况因人而异，建议先咨询${ADVISER}。`,
      },
      {
        id: "a4-adopt-guard",
        when: child("adopt-guard"),
        text: `涉及收养或监护时，建议先咨询${ADVISER}。`,
      },
    ],
    notes: [
      {
        id: "n4-money",
        when: always,
        text: "收入要求中与孩子有关的部分，也可以看第 2 步。",
      },
    ],
  },
  {
    id: "application",
    number: 5,
    title: "申请流程和材料清单",
    intro: "这一步将整理申请步骤和需要准备的材料。",
    when: always,
    summary: [],
    summaryNotices: [
      {
        id: "s5-pending",
        when: always,
        text: "申请步骤和材料清单的内容正在编写和核对。",
      },
    ],
    items: [],
    pending: [
      {
        id: "p5-application-guide",
        when: always,
        text: "《申请流程和材料清单》指南编写中，发布后会显示在这里。",
      },
    ],
  },
  {
    id: "settlement",
    number: 6,
    title: "以后：续签和定居",
    intro: "签证获批之后的事情，先了解，不用现在准备。",
    when: always,
    summary: [
      {
        id: "s6-fiance",
        guide: "routes",
        when: rel("fiance"),
        evidenceKeys: ["five-year-settlement"],
        fingerprint: "c8bb30d1",
      },
      {
        id: "s6-routes",
        guide: "routes",
        when: rel("married", "unmarried"),
        evidenceKeys: ["five-year-settlement", "ten-year-route"],
        fingerprint: "e12fe028",
      },
      {
        id: "s6-retest",
        guide: "finance",
        when: rel("married", "unmarried"),
        evidenceKeys: ["requirement-retested"],
        fingerprint: "fa128286",
      },
    ],
    summaryNotices: [
      {
        id: "s6-fiance-pending",
        when: rel("fiance"),
        text: "结婚或登记民事伴侣之后，怎样在英国转为伴侣居留，相关内容正在核对。下面的续签和定居信息，适用于之后获批的伴侣签证或居留。",
      },
    ],
    pending: [
      {
        id: "p6-fiance-switch",
        when: rel("fiance"),
        text: "结婚或登记后转为伴侣居留 · 待核对",
      },
    ],
    itemsHeading: {
      id: "h6-fiance",
      when: rel("fiance"),
      text: "转为伴侣居留之后",
    },
    items: [
      {
        id: "d6-1",
        title: "续签时要再证明的事",
        passages: [
          {
            id: "d6-1-income",
            guide: "finance",
            when: always,
            evidenceKeys: ["requirement-retested", "ilr-savings-one-times"],
            fingerprint: "570fca3c",
          },
          {
            id: "d6-1-english",
            guide: "routes",
            when: locationIs("outside"),
            evidenceKeys: ["english-extension-a2"],
            fingerprint: "17e67cd6",
          },
          {
            id: "d6-1-living-together",
            guide: "relationship",
            when: locationIs("outside"),
            evidenceKeys: ["living-together-extension"],
            fingerprint: "536eb55e",
          },
        ],
      },
      {
        id: "d6-2",
        title: "5 年路线定居",
        passages: [
          {
            id: "d6-2-five-year",
            guide: "routes",
            when: always,
            evidenceKeys: [
              "five-year-settlement",
              "five-year-koll",
              "koll-exceptions",
            ],
            fingerprint: "40580292",
          },
        ],
      },
      {
        id: "d6-3",
        title: "10 年路线定居",
        passages: [
          {
            id: "d6-3-ten-year",
            guide: "routes",
            when: always,
            evidenceKeys: [
              "ten-year-route",
              "ten-year-qualifying-permission",
              "ten-year-partner-conditions",
              "setf-english",
              "setf-life-in-uk",
            ],
            fingerprint: "2af556b6",
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Building the journey for a set of answers
// ---------------------------------------------------------------------------

/** What is known about one Guide when results are built. */
export type GuideAvailability =
  | { status: "unpublished" }
  | { status: "loading"; meta?: GuideMetadata }
  | { status: "unavailable"; meta?: GuideMetadata }
  | { status: "ready"; meta: GuideMetadata; detail: GuideDetail };

export type PassageState =
  | {
      status: "verified";
      evidence: GuideEvidence[];
      sources: Map<string, GuideSource>;
    }
  | {
      status:
        | "unpublished"
        | "loading"
        | "unavailable"
        | "changed"
        /** Evidence verified, but no reviewed wording is available here. */
        | "no-content";
    };

export type ResolvedPassage = Passage & {
  state: PassageState;
  /** The restated wording: present only when the state is "verified". */
  text: readonly TextBlock[];
  advice?: string;
  /** "outside"/"inside" when the location is unsure and the passage is placed. */
  label: string | null;
};

export type ResolvedItem = {
  id: string;
  title: string;
  passages: ResolvedPassage[];
};

export type StageStatus = "loading" | "verified" | "partial" | "pending";

export type ResolvedStage = {
  id: string;
  number: number;
  title: string;
  intro: string;
  status: StageStatus;
  /** Verified summary passages, or null when any applicable one is not. */
  summary: ResolvedPassage[] | null;
  /** Why the summary is missing: content not yet published, or changed. */
  summaryFallback: "unpublished" | "changed" | "loading" | null;
  summaryNotices: Notice[];
  /** Items with at least one verified passage (only verified passages kept). */
  items: ResolvedItem[];
  itemsHeading: Notice | null;
  /** Some applicable passage is hidden because its Guide changed. */
  changed: boolean;
  /** Some applicable passage is hidden because its Guide is unpublished. */
  unpublished: boolean;
  pending: Notice[];
  advice: Notice[];
  notes: Notice[];
  /** Published Guides this stage restates, for "read the full Guide" links. */
  guides: GuideMetadata[];
};

export const PLACE_LABELS = {
  outside: "如果在英国境外",
  inside: "如果在英国境内",
};

export function resolvePassage(
  passage: Pick<Passage, "guide" | "evidenceKeys" | "fingerprint">,
  availability: GuideAvailability,
): PassageState {
  if (availability.status !== "ready") return { status: availability.status };
  const reviewed = JOURNEY_GUIDES[passage.guide];
  const guide = availability.detail;
  if (
    guide.slug !== reviewed.slug ||
    guide.category !== "family-visa" ||
    guide.updatedAt !== reviewed.reviewedUpdatedAt
  )
    return { status: "changed" };
  const evidence = citedEvidence(guide, passage.evidenceKeys);
  if (!evidence) return { status: "changed" };
  const sources = sourceMap(guide);
  if (evidenceFingerprint(evidence, sources) !== passage.fingerprint)
    return { status: "changed" };
  return { status: "verified", evidence, sources };
}

/**
 * The reviewed wording for a passage or task, or null unless the content
 * exists and was reviewed against the same Guide version the journey expects.
 */
export function reviewedWording<T>(
  content: FamilyVisaContent | null,
  guide: JourneyGuideId,
  entries: (content: FamilyVisaContent) => Readonly<Record<string, T>>,
  id: string,
): T | null {
  if (!content) return null;
  if (content.reviewedFor[guide] !== JOURNEY_GUIDES[guide].reviewedUpdatedAt)
    return null;
  return entries(content)[id] ?? null;
}

export function buildJourney(
  input: Answers,
  guides: Readonly<Record<JourneyGuideId, GuideAvailability>>,
  stages: readonly Stage[] = JOURNEY_STAGES,
  content: FamilyVisaContent | null = null,
): ResolvedStage[] {
  const answers = effectiveAnswers(input);
  const resolve = (passage: Passage): ResolvedPassage => {
    const label =
      answers.location === "unsure" && passage.place
        ? PLACE_LABELS[passage.place]
        : null;
    const state = resolvePassage(passage, guides[passage.guide]);
    if (state.status !== "verified")
      return { ...passage, state, label, text: [] };
    const wording = reviewedWording(
      content,
      passage.guide,
      (c) => c.passages,
      passage.id,
    );
    if (!wording)
      return { ...passage, state: { status: "no-content" }, label, text: [] };
    return {
      ...passage,
      state,
      label,
      text: wording.text,
      advice: wording.advice,
    };
  };
  const applies = <T extends { when: When }>(list: readonly T[] | undefined) =>
    (list ?? []).filter((entry) => entry.when(answers));

  return stages
    .filter((stage) => stage.when(answers))
    .map((stage) => {
      const summary = applies(stage.summary).map(resolve);
      const items = stage.items
        .map((item) => ({
          id: item.id,
          title: item.title,
          passages: applies(item.passages).map(resolve),
        }))
        .filter((item) => item.passages.length > 0);
      const all = [...summary, ...items.flatMap((item) => item.passages)];
      const states = new Set(all.map((passage) => passage.state.status));
      const pending = applies(stage.pending);

      const verifiedItems = items
        .map((item) => ({
          ...item,
          passages: item.passages.filter((p) => p.state.status === "verified"),
        }))
        .filter((item) => item.passages.length > 0);
      const anyVerified = states.has("verified");
      const allVerified =
        all.length > 0 && all.every((p) => p.state.status === "verified");

      let status: StageStatus;
      if (states.has("loading")) status = "loading";
      else if (allVerified && pending.length === 0) status = "verified";
      else if (anyVerified) status = "partial";
      else status = "pending";

      const summaryVerified =
        summary.length > 0 &&
        summary.every((p) => p.state.status === "verified");
      const summaryFallback =
        summary.length === 0 || summaryVerified
          ? null
          : summary.some((p) => p.state.status === "loading")
            ? "loading"
            : summary.some(
                  (p) =>
                    p.state.status === "changed" ||
                    p.state.status === "unavailable",
                )
              ? "changed"
              : "unpublished";

      const guideIds = [
        ...new Set(
          [...stage.summary, ...stage.items.flatMap((i) => i.passages)]
            .filter((p) => p.when(answers))
            .map((p) => p.guide),
        ),
      ];
      const linked = guideIds
        .map((id) => guides[id])
        .flatMap((g) => (g.status !== "unpublished" && g.meta ? [g.meta] : []));

      return {
        id: stage.id,
        number: stage.number,
        title: stage.title,
        intro: stage.intro,
        status,
        summary: summaryVerified ? summary : null,
        summaryFallback,
        summaryNotices: applies(stage.summaryNotices),
        items: verifiedItems,
        itemsHeading:
          stage.itemsHeading && stage.itemsHeading.when(answers)
            ? stage.itemsHeading
            : null,
        changed: all.some(
          (p) =>
            p.state.status === "changed" || p.state.status === "unavailable",
        ),
        unpublished: all.some((p) => p.state.status === "unpublished"),
        pending,
        advice: applies(stage.advice),
        notes: applies(stage.notes),
        guides: linked,
      };
    });
}

/** Every passage in the journey, for review tooling and tests. */
export function allPassages(): Passage[] {
  return JOURNEY_STAGES.flatMap((stage) => [
    ...stage.summary,
    ...stage.items.flatMap((item) => item.passages),
  ]);
}
