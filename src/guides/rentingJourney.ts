// Renting Journey (England, letting-agency lets): the user-facing layer over
// the six Phase 1 Renting Guides, built on the same ideas as the Family &
// Visa journey and checklist — a typed, pure model; answers are categories
// only; every step links to the Guide it summarises; and no rule is restated
// here. A step's "key points" are evidence statements read from the
// published Guide in the reader's locale, so they can never drift from the
// reviewed text, and a step whose Guide is not published shows no points.
//
// Ticks live in page memory only. Nothing is stored or sent, and the page
// never asks for personal details or documents.
//
// Phase 2 extension points: RENTING_LATER_STEPS lists the move-in topics
// (inventory, Council Tax, energy, water, broadband, TV Licence) that will
// continue the journey after "keys". They are shown as "in preparation" and
// never linked until their Guides exist.

import type { GuideDetail, GuideEvidence } from "./api.ts";
import type { GuideLocale } from "./locales.ts";
import {
  RENTING_BRANCHES,
  RENTING_FACT_KINDS,
  RENTING_GUIDE_SLUGS,
  RENTING_LATER_STEPS,
  RENTING_SCOPES,
  RENTING_STEPS,
} from "./rentingJourneyData.ts";

export {
  RENTING_BRANCHES,
  RENTING_COPY,
  RENTING_FACT_KINDS,
  RENTING_GUIDE_SLUGS,
  RENTING_LATER_STEPS,
  RENTING_SCOPES,
  RENTING_STEPS,
} from "./rentingJourneyData.ts";

export type RentingGuideSlug = (typeof RENTING_GUIDE_SLUGS)[number];
export type RentingBranchId = (typeof RENTING_BRANCHES)[number]["id"];
export type RentingScopeId = (typeof RENTING_SCOPES)[number]["id"];
export type RentingStep = (typeof RENTING_STEPS)[number];
export type RentingStepId = RentingStep["id"];
export type FactKind = keyof typeof RENTING_FACT_KINDS;
export type Localized = Readonly<Record<GuideLocale, string>>;

export type RentingFact = {
  guide: RentingGuideSlug;
  key: string;
  kind: FactKind;
  branches?: readonly RentingBranchId[];
};

export type RentingTask = {
  id: string;
  label: Localized;
  branches?: readonly RentingBranchId[];
};

export type RentingAnswers = {
  scope?: RentingScopeId;
  branch?: RentingBranchId;
};

/** The fixed order: listing → contact → viewing → apply → referencing → guarantor → agreement → payments → sign → keys. */
export const RENTING_STEP_ORDER: readonly RentingStepId[] = RENTING_STEPS.map((step) => step.id);

const SCOPE_IDS = new Set<string>(RENTING_SCOPES.map((scope) => scope.id));
const BRANCH_IDS = new Set<string>(RENTING_BRANCHES.map((branch) => branch.id));

/** Answers from untrusted input (e.g. a URL): unknown values are dropped. */
export function validateAnswers(value: unknown): RentingAnswers {
  if (typeof value !== "object" || value === null) return {};
  const raw = value as Record<string, unknown>;
  const answers: RentingAnswers = {};
  if (typeof raw.scope === "string" && SCOPE_IDS.has(raw.scope)) answers.scope = raw.scope as RentingScopeId;
  if (typeof raw.branch === "string" && BRANCH_IDS.has(raw.branch)) answers.branch = raw.branch as RentingBranchId;
  return answers;
}

export type JourneyOutcome =
  | { status: "ask-scope" }
  | { status: "out-of-scope"; scope: RentingScopeId }
  | { status: "ask-branch" }
  | { status: "steps"; branch: RentingBranchId };

/** What the journey shows for the answers so far. */
export function journeyOutcome(answers: RentingAnswers): JourneyOutcome {
  if (!answers.scope) return { status: "ask-scope" };
  const scope = RENTING_SCOPES.find((item) => item.id === answers.scope);
  if (!scope?.inScope) return { status: "out-of-scope", scope: answers.scope };
  if (!answers.branch) return { status: "ask-branch" };
  return { status: "steps", branch: answers.branch };
}

const forBranch = <T extends { branches?: readonly RentingBranchId[] }>(items: readonly T[], branch: RentingBranchId) =>
  items.filter((item) => !item.branches || item.branches.includes(branch));

/** Facts a step shows for a branch, in order. */
export function stepFacts(step: RentingStep, branch: RentingBranchId): RentingFact[] {
  return forBranch(step.facts as readonly RentingFact[], branch);
}

/** Checklist tasks a step shows for a branch, in order. */
export function stepTasks(step: RentingStep, branch: RentingBranchId): RentingTask[] {
  return forBranch(step.tasks as readonly RentingTask[], branch);
}

/** Every task id that applies to a branch, in journey order. */
export function applicableTaskIds(branch: RentingBranchId): string[] {
  return RENTING_STEPS.flatMap((step) => stepTasks(step, branch).map((task) => task.id));
}

/** Ticked tasks that still apply (a branch change never counts stale ticks). */
export function progressFor(branch: RentingBranchId, checked: ReadonlySet<string>): { done: number; total: number } {
  const ids = applicableTaskIds(branch);
  return { done: ids.filter((id) => checked.has(id)).length, total: ids.length };
}

/** Fills {name} placeholders in journey copy. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/**
 * A fact's statement from the published Guide, or null when the Guide is not
 * loaded or no longer carries that evidence with at least one support.
 */
export function factStatement(guide: GuideDetail | undefined, key: string): GuideEvidence | null {
  if (!guide) return null;
  const item = guide.evidence.find((evidence) => evidence.key === key);
  return item && item.supports.length > 0 && item.statement.trim() ? item : null;
}

/** Guides a set of steps needs, without duplicates, in Guide order. */
export function guidesFor(steps: readonly RentingStep[]): RentingGuideSlug[] {
  const wanted = new Set<string>();
  for (const step of steps) {
    wanted.add(step.guide);
    for (const fact of step.facts as readonly RentingFact[]) wanted.add(fact.guide);
  }
  return RENTING_GUIDE_SLUGS.filter((slug) => wanted.has(slug));
}

export const RENTING_LATER_IDS: readonly string[] = RENTING_LATER_STEPS.map((step) => step.id);
