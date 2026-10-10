// Family & Visa preparation checklist: the user-facing layer over the
// reviewed Family & Visa Guides.
//
// Each task is a practical preparation step. A task that restates a rule
// names the Guide evidence behind it (`basis`) and is shown as verified only
// while that Guide is the reviewed version and the evidence still matches its
// fingerprint — the same gate as the navigator. Document examples that the
// Guides do not cover are always labelled "常见材料 · 待核对" and never as
// required. A section's practical text shows only when its Guide is verified;
// otherwise every task in it falls back to "待核对" with official links.
//
// This module prepares documents only. It never calculates income or savings
// thresholds and never decides eligibility.

import type { GuideEvidence, GuideSource } from "./api";
import {
  always,
  at,
  both,
  child,
  kids,
  PLACE_LABELS,
  rel,
  resolvePassage,
  reviewedWording,
} from "./familyVisaJourney.ts";
import type { FamilyVisaContent, TaskContent } from "./familyVisaContent.ts";
import type {
  Answers,
  GuideAvailability,
  JourneyGuideId,
  When,
} from "./familyVisaJourney.ts";

export type TaskKind = "required" | "conditional" | "supporting";

/** Rule evidence behind a task, checked like a navigator passage. */
export type TaskBasis = {
  guide: JourneyGuideId;
  evidenceKeys: readonly string[];
  fingerprint: string;
};

export type OfficialLink = { label: string; url: string };

export type ChecklistTask = {
  id: string;
  title: string;
  kind: TaskKind;
  when: When;
  /** The person can mark it "不适用于我" (circumstances we do not ask about). */
  optional?: boolean;
  /** Which circumstances make it applicable, in plain words. */
  condition?: string;
  /** Shown as "如果在英国境外/境内" when the location is unsure. */
  place?: "outside" | "inside";
  basis?: TaskBasis;
  official: readonly OfficialLink[];
  /** Link to the special-circumstances section instead of more tasks. */
  special?: boolean;
};

export type ChecklistSection = {
  id: string;
  title: string;
  /** The Guide whose publication controls this section's practical text. */
  gate: JourneyGuideId;
  when: When;
  tasks: readonly ChecklistTask[];
};

const GOV = {
  family: {
    label: "GOV.UK：家庭签证（伴侣和配偶）",
    url: "https://www.gov.uk/uk-family-visa/partner-spouse",
  },
  documents: {
    label: "GOV.UK：家庭签证需要提供的材料",
    url: "https://www.gov.uk/uk-family-visa/documents-you-must-provide",
  },
  income: {
    label: "GOV.UK：伴侣签证的收入证明",
    url: "https://www.gov.uk/uk-family-visa/proof-income-partner",
  },
  english: {
    label: "GOV.UK：家庭签证的英语要求",
    url: "https://www.gov.uk/uk-family-visa/knowledge-of-english",
  },
  child: {
    label: "GOV.UK：孩子随家庭签证申请",
    url: "https://www.gov.uk/uk-family-visa/your-child",
  },
  tb: {
    label: "GOV.UK：签证申请的肺结核检测",
    url: "https://www.gov.uk/tb-test-visa",
  },
  ihs: {
    label: "GOV.UK：移民医疗附加费",
    url: "https://www.gov.uk/healthcare-immigration-application",
  },
  landRegistry: {
    label: "GOV.UK：查询 HM Land Registry 房产信息",
    url: "https://www.gov.uk/search-property-information-land-registry",
  },
  fmse: {
    label: "移民规则 Appendix FM-SE（规定的证据）",
    url: "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-fm-se-family-members-specified-evidence",
  },
  fm: {
    label: "移民规则 Appendix FM",
    url: "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-fm-family-members",
  },
} as const;

const basis = (
  guide: JourneyGuideId,
  evidenceKeys: readonly string[],
  fingerprint: string,
): TaskBasis => ({ guide, evidenceKeys, fingerprint });

export const CHECKLIST_SECTIONS: readonly ChecklistSection[] = [
  {
    id: "identity",
    title: "身份和申请材料",
    gate: "routes",
    when: always,
    tasks: [
      {
        id: "id-application-type",
        title: "确认你要提交哪一种申请",
        kind: "required",
        when: always,
        basis: basis(
          "routes",
          [
            "entry-clearance-outside",
            "leave-to-remain-inside",
            "no-switch-visitor",
            "immigration-bail-breach",
          ],
          "38612ff8",
        ),
        official: [GOV.family],
      },
      {
        id: "id-passport",
        title: "申请人的有效护照或旅行证件",
        kind: "supporting",
        when: always,
        official: [GOV.documents],
      },
      {
        id: "id-sponsor-status",
        title: "英国伴侣的身份证明",
        kind: "required",
        when: always,
        basis: basis("routes", ["sponsor-status"], "98b54d01"),
        official: [GOV.documents],
      },
      {
        id: "id-immigration-history",
        title: "整理以前的签证和移民记录",
        kind: "supporting",
        when: always,
        basis: basis(
          "routes",
          ["all-requirements-apply", "hc584-suitability"],
          "18f1664f",
        ),
        official: [GOV.family],
      },
    ],
  },
  {
    id: "relationship",
    title: "婚姻 / 伴侣关系和真实关系证据",
    gate: "relationship",
    when: always,
    tasks: [
      {
        id: "rel-certificate",
        title: "结婚证或民事伴侣登记证明",
        kind: "required",
        when: rel("married"),
        basis: basis("relationship", ["valid-marriage"], "c8b25402"),
        official: [GOV.documents],
      },
      {
        id: "rel-two-years",
        title: "在一起至少 2 年的证据",
        kind: "required",
        when: rel("unmarried"),
        basis: basis("relationship", ["unmarried-two-years"], "436cacb3"),
        official: [GOV.family],
      },
      {
        id: "rel-fiance-plan",
        title: "在英国结婚或登记的安排",
        kind: "required",
        when: rel("fiance"),
        basis: basis("relationship", ["fiance-purpose"], "7460612a"),
        official: [GOV.family],
      },
      {
        id: "rel-previous-ended",
        title: "以前的婚姻或关系已经结束的证明",
        kind: "conditional",
        when: always,
        optional: true,
        condition: "如果你们任何一方以前结过婚，或有过民事伴侣关系",
        basis: basis(
          "relationship",
          ["previous-relationships-ended"],
          "c62f5f15",
        ),
        official: [GOV.documents],
      },
      {
        id: "rel-undissolved",
        title: "前一段婚姻还没解除时的说明",
        kind: "conditional",
        when: rel("unmarried"),
        optional: true,
        condition: "如果以前的婚姻在法律上还没有解除",
        basis: basis("relationship", ["undissolved-marriage"], "9a9480c6"),
        official: [GOV.family],
      },
      {
        id: "rel-met",
        title: "你们见过面的证明",
        kind: "required",
        when: always,
        basis: basis(
          "relationship",
          ["met-in-person", "met-in-person-meaning"],
          "4d7602c6",
        ),
        official: [GOV.family],
      },
      {
        id: "rel-genuine",
        title: "关系真实、持续的证据",
        kind: "supporting",
        when: always,
        basis: basis(
          "relationship",
          [
            "genuine-and-subsisting",
            "not-a-checklist",
            "cohabitation-not-prerequisite",
            "never-visited-uk",
            "third-party-opinion",
          ],
          "11502e2a",
        ),
        official: [GOV.family],
      },
      {
        id: "rel-intend",
        title: "以后在英国一起生活的打算",
        kind: "required",
        when: always,
        basis: basis("relationship", ["intend-to-live-together"], "4efaf486"),
        official: [GOV.family],
      },
      {
        id: "rel-living-together",
        title: "续签时：上次获批以来一起住的证明",
        kind: "conditional",
        when: at("inside"),
        place: "inside",
        optional: true,
        condition: "如果你这次是续签（不是第一次申请伴侣居留）",
        basis: basis("relationship", ["living-together-extension"], "536eb55e"),
        official: [GOV.family],
      },
    ],
  },
  {
    id: "finance",
    title: "财务材料",
    gate: "finance",
    when: always,
    tasks: [
      {
        id: "fin-standard",
        title: "先确认适用哪一种收入要求",
        kind: "required",
        when: always,
        basis: basis(
          "finance",
          [
            "threshold-29000",
            "transitional-conditions",
            "disability-carer-benefits",
          ],
          "f9546134",
        ),
        official: [GOV.income],
      },
      {
        id: "fin-whose-income-outside",
        title: "确认谁的收入可以计算",
        kind: "required",
        when: at("outside"),
        place: "outside",
        basis: basis("finance", ["entry-clearance-income-sources"], "d9602f80"),
        official: [GOV.income],
      },
      {
        id: "fin-whose-income-inside",
        title: "确认谁的收入可以计算",
        kind: "required",
        when: at("inside"),
        place: "inside",
        basis: basis("finance", ["leave-to-remain-income-sources"], "916b1c6e"),
        official: [GOV.income],
      },
      {
        id: "fin-employment",
        title: "工资收入的证明",
        kind: "conditional",
        when: always,
        optional: true,
        condition: "如果要用工资收入申请",
        basis: basis(
          "finance",
          [
            "category-a-six-months",
            "category-b-twelve-months-no-savings",
            "specified-evidence",
          ],
          "34bc9c29",
        ),
        official: [GOV.income, GOV.fmse],
      },
      {
        id: "fin-returning",
        title: "英国伴侣在国外工作、准备一起回英国",
        kind: "conditional",
        when: at("outside"),
        place: "outside",
        optional: true,
        condition: "如果英国伴侣现在在国外工作，并要用工资收入申请",
        basis: basis(
          "finance",
          ["returning-partner-overseas-income"],
          "066c2304",
        ),
        official: [GOV.income, GOV.fmse],
      },
      {
        id: "fin-self-employment",
        title: "自雇收入的证明",
        kind: "conditional",
        when: always,
        optional: true,
        condition: "如果收入来自自雇",
        basis: basis("finance", ["self-employment"], "b83db12d"),
        official: [GOV.income, GOV.fmse],
      },
      {
        id: "fin-savings",
        title: "现金存款的证明",
        kind: "conditional",
        when: always,
        optional: true,
        condition: "如果要用存款",
        basis: basis(
          "finance",
          [
            "savings-six-months",
            "savings-six-month-exceptions",
            "gifted-savings",
            "third-party-promises",
          ],
          "afe089f3",
        ),
        official: [GOV.income, GOV.fmse],
      },
      {
        id: "fin-combinations",
        title: "了解收入和存款能怎样一起用",
        kind: "supporting",
        when: always,
        optional: true,
        condition: "如果打算把存款和收入一起用",
        basis: basis(
          "finance",
          [
            "savings-formula",
            "self-employment",
            "category-b-twelve-months-no-savings",
          ],
          "93f1e0cf",
        ),
        official: [GOV.income],
      },
      {
        id: "fin-benefits",
        title: "英国伴侣领取的残疾或照护类福利证明",
        kind: "conditional",
        when: always,
        optional: true,
        condition: "如果英国伴侣领取规则列明的残疾或照护类福利",
        basis: basis("finance", ["disability-carer-benefits"], "d84a5fe9"),
        official: [GOV.income],
      },
      {
        id: "fin-children",
        title: "有孩子一起申请时的收入要求",
        kind: "required",
        when: kids,
        basis: basis(
          "finance",
          ["general-threshold-children", "transitional-amounts"],
          "d033671e",
        ),
        official: [GOV.income],
      },
    ],
  },
  {
    id: "accommodation",
    title: "英国住处",
    gate: "finance",
    when: always,
    tasks: [
      {
        id: "acc-adequate",
        title: "了解住处要符合什么条件",
        kind: "required",
        when: always,
        basis: basis("finance", ["accommodation"], "1f602c1d"),
        official: [GOV.documents],
      },
      {
        id: "acc-title-register",
        title: "房产登记信息（Title Register）",
        kind: "supporting",
        when: (a) => a.accommodation === "owned",
        official: [GOV.landRegistry, GOV.documents],
      },
      {
        id: "acc-ownership-other",
        title: "其他能说明房产情况的文件",
        kind: "supporting",
        when: (a) => a.accommodation === "owned",
        optional: true,
        official: [GOV.documents],
      },
      {
        id: "acc-tenancy",
        title: "租房合同",
        kind: "supporting",
        when: (a) => a.accommodation === "rented",
        official: [GOV.documents],
      },
      {
        id: "acc-landlord",
        title: "房东或中介的书面同意",
        kind: "supporting",
        when: (a) => a.accommodation === "rented",
        optional: true,
        condition: "如果合同对入住人数或家人同住有限制",
        official: [GOV.documents],
      },
    ],
  },
  {
    id: "english",
    title: "英语和其他要求",
    gate: "routes",
    when: always,
    tasks: [
      {
        id: "eng-english-outside",
        title: "英语能力证明",
        kind: "required",
        when: at("outside"),
        place: "outside",
        basis: basis("routes", ["english-first-application"], "7721ede7"),
        official: [GOV.english],
      },
      {
        id: "eng-english-inside",
        title: "英语能力证明",
        kind: "required",
        when: at("inside"),
        place: "inside",
        basis: basis(
          "routes",
          [
            "english-first-application",
            "english-extension-a2",
            "english-in-country-exemptions",
          ],
          "d99641ed",
        ),
        official: [GOV.english],
      },
      {
        id: "eng-tb",
        title: "肺结核（TB）检测证明",
        kind: "conditional",
        when: always,
        optional: true,
        condition: "如果申请人来自需要检测的国家或地区",
        official: [GOV.tb],
      },
      {
        id: "eng-fees",
        title: "申请费和移民医疗附加费",
        kind: "supporting",
        when: always,
        official: [GOV.ihs, GOV.family],
      },
    ],
  },
  {
    id: "children",
    title: "随行孩子",
    gate: "children",
    when: kids,
    tasks: [
      {
        id: "kid-passport",
        title: "孩子的护照或身份证件，以及基本条件",
        kind: "required",
        when: always,
        basis: basis("children", ["basic-requirements"], "f4a32fe0"),
        official: [GOV.child],
      },
      {
        id: "kid-relationship",
        title: "证明孩子和你们的关系",
        kind: "required",
        when: always,
        basis: basis(
          "children",
          ["three-limbs", "parent-definition"],
          "40da943a",
        ),
        official: [GOV.child],
      },
      {
        id: "kid-sponsor-parent",
        title: "英国伴侣也是孩子父母的证明",
        kind: "required",
        when: child("parent"),
        condition: "孩子是你们两人的孩子",
        basis: basis("children", ["parent-definition"], "eb10eec9"),
        official: [GOV.child],
      },
      {
        id: "kid-sole-responsibility",
        title: "单方负责的证据",
        kind: "conditional",
        when: child("not-parent", "unsure"),
        optional: true,
        condition: "孩子来自以前的关系，英国伴侣不是孩子的父母",
        basis: basis(
          "children",
          [
            "sole-responsibility-factual-test",
            "custody-order-not-sufficient",
            "sole-responsibility-factors",
            "both-parents-involved",
          ],
          "bac4ac36",
        ),
        official: [GOV.child],
      },
      {
        id: "kid-lives-with",
        title: "境内申请：孩子通常和你一起生活的证明",
        kind: "conditional",
        when: both(child("not-parent", "unsure"), at("inside")),
        place: "inside",
        optional: true,
        condition: "孩子已在英国、申请居留",
        basis: basis(
          "children",
          ["in-country-normally-lives-with"],
          "5a3fafce",
        ),
        official: [GOV.child],
      },
      {
        id: "kid-serious-compelling",
        title: "严重且令人信服的情况说明",
        kind: "conditional",
        when: child("not-parent", "adopt-guard", "unsure"),
        optional: true,
        condition: "如果要按第三种情形申请",
        basis: basis("children", ["serious-compelling-welfare"], "e2072a53"),
        official: [GOV.child],
      },
      {
        id: "kid-adoption",
        title: "收养或监护的文件",
        kind: "conditional",
        when: child("adopt-guard", "unsure"),
        optional: true,
        condition: "如果涉及收养或监护",
        basis: basis(
          "children",
          ["adoption-definition", "guardian-not-parent"],
          "b10e3500",
        ),
        official: [GOV.child],
        special: true,
      },
      {
        id: "kid-care",
        title: "孩子在英国的照护和住宿安排",
        kind: "required",
        when: always,
        basis: basis("children", ["care-arrangements"], "64cbc84a"),
        official: [GOV.child],
      },
      {
        id: "kid-finance",
        title: "孩子申请的收入和住宿",
        kind: "required",
        when: always,
        basis: basis(
          "children",
          ["child-financial", "child-accommodation", "child-income-sources"],
          "d85188b1",
        ),
        official: [GOV.child, GOV.income],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Building the checklist for a set of answers
// ---------------------------------------------------------------------------

export type TaskStatus =
  /** Rule evidence verified: the task's kind is shown. */
  | "verified"
  /** Practical suggestion with no Guide basis: "常见材料 · 待核对". */
  | "suggestion"
  /** Guide not published, changed, or still loading: "待核对". */
  | "pending";

export type ResolvedTask = ChecklistTask & {
  status: TaskStatus;
  evidence: GuideEvidence[];
  sources: Map<string, GuideSource> | null;
  label: string | null;
  /** Reviewed wording: present only for "verified" and "suggestion". */
  wording: TaskContent | null;
};

export type ResolvedSection = Omit<ChecklistSection, "tasks"> & {
  tasks: ResolvedTask[];
  /** The section's practical text may be shown (its Guide is verified). */
  open: boolean;
  /** Reviewed section introduction, when available. */
  intro: string | null;
};

function guideVerified(
  id: JourneyGuideId,
  guides: Readonly<Record<JourneyGuideId, GuideAvailability>>,
  reviewedUpdatedAt: string,
): boolean {
  const guide = guides[id];
  return (
    guide.status === "ready" &&
    guide.detail.category === "family-visa" &&
    guide.detail.updatedAt === reviewedUpdatedAt
  );
}

export function buildChecklist(
  answers: Answers,
  guides: Readonly<Record<JourneyGuideId, GuideAvailability>>,
  reviewed: Readonly<Record<JourneyGuideId, { reviewedUpdatedAt: string }>>,
  sections: readonly ChecklistSection[] = CHECKLIST_SECTIONS,
  content: FamilyVisaContent | null = null,
): ResolvedSection[] {
  const effective = kids(answers)
    ? answers
    : { ...answers, childRelations: undefined };
  return sections
    .filter((section) => section.when(effective))
    .map((section) => {
      const open = guideVerified(
        section.gate,
        guides,
        reviewed[section.gate].reviewedUpdatedAt,
      );
      const intro = open
        ? (reviewedWording(content, section.gate, (c) => c.sections, section.id)
            ?.intro ?? null)
        : null;
      const tasks = section.tasks
        .filter((task) => task.when(effective))
        .map((task): ResolvedTask => {
          const label =
            effective.location === "unsure" && task.place
              ? PLACE_LABELS[task.place]
              : null;
          const pending: ResolvedTask = {
            ...task,
            status: "pending",
            evidence: [],
            sources: null,
            label,
            wording: null,
          };
          if (!open) return pending;
          const wording = reviewedWording(
            content,
            task.basis?.guide ?? section.gate,
            (c) => c.tasks,
            task.id,
          );
          // No reviewed wording here: show the task, but as pending.
          if (!wording) return pending;
          if (!task.basis) return { ...pending, status: "suggestion", wording };
          const state = resolvePassage(task.basis, guides[task.basis.guide]);
          return state.status === "verified"
            ? {
                ...pending,
                status: "verified",
                evidence: state.evidence,
                sources: state.sources,
                wording,
              }
            : pending;
        });
      return { ...section, tasks, open, intro };
    });
}

/** Every task id that applies to these answers, in display order. */
export function applicableTaskIds(
  sections: readonly ResolvedSection[],
): string[] {
  return sections.flatMap((section) => section.tasks.map((task) => task.id));
}

export type Progress = {
  checked: readonly string[];
  notApplicable: readonly string[];
};

/** Progress limited to tasks that still apply; others are dropped. */
export function pruneProgress(
  progress: Progress,
  applicable: readonly string[],
  optional: ReadonlySet<string>,
): Progress {
  const keep = new Set(applicable);
  const notApplicable = progress.notApplicable.filter(
    (id) => keep.has(id) && optional.has(id),
  );
  const excluded = new Set(notApplicable);
  return {
    checked: progress.checked.filter((id) => keep.has(id) && !excluded.has(id)),
    notApplicable,
  };
}

export type SectionProgress = {
  id: string;
  done: number;
  total: number;
  complete: boolean;
};

export function computeProgress(
  sections: readonly ResolvedSection[],
  progress: Progress,
): {
  sections: SectionProgress[];
  done: number;
  total: number;
  complete: boolean;
} {
  const checked = new Set(progress.checked);
  const excluded = new Set(progress.notApplicable);
  const perSection = sections.map((section) => {
    const counted = section.tasks.filter((task) => !excluded.has(task.id));
    const done = counted.filter((task) => checked.has(task.id)).length;
    return {
      id: section.id,
      done,
      total: counted.length,
      complete: counted.length > 0 && done === counted.length,
    };
  });
  const done = perSection.reduce((sum, s) => sum + s.done, 0);
  const total = perSection.reduce((sum, s) => sum + s.total, 0);
  return {
    sections: perSection,
    done,
    total,
    complete: total > 0 && done === total,
  };
}

/** Every task basis, for fingerprint stamping and tests. */
export function allTaskBases(): { id: string; basis: TaskBasis }[] {
  return CHECKLIST_SECTIONS.flatMap((section) =>
    section.tasks.flatMap((task) =>
      task.basis ? [{ id: task.id, basis: task.basis }] : [],
    ),
  );
}

export const OPTIONAL_TASK_IDS: ReadonlySet<string> = new Set(
  CHECKLIST_SECTIONS.flatMap((s) =>
    s.tasks.filter((t) => t.optional).map((t) => t.id),
  ),
);

/** Applicable task ids for answers alone (applicability never depends on Guides). */
export function applicableTaskIdsFor(answers: Answers): string[] {
  const effective = kids(answers)
    ? answers
    : { ...answers, childRelations: undefined };
  return CHECKLIST_SECTIONS.filter((section) =>
    section.when(effective),
  ).flatMap((section) =>
    section.tasks.filter((task) => task.when(effective)).map((task) => task.id),
  );
}
