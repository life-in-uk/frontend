import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CircleCheck, RotateCcw } from "lucide-react";
import { getGuide, getLocalizedGuide } from "../../guides/api";
import type { GuideDetail, GuideMetadata } from "../../guides/api";
import { guideRoutePath } from "../../guides/locales";
import type { GuideLocale } from "../../guides/locales";
import {
  factStatement,
  fill,
  guidesFor,
  journeyOutcome,
  progressFor,
  RENTING_BRANCHES,
  RENTING_COPY,
  RENTING_FACT_KINDS,
  RENTING_MOVE_OUT_STEPS,
  RENTING_SCOPES,
  RENTING_STEPS,
  stepFacts,
  stepTasks,
} from "../../guides/rentingJourney";
import type { RentingAnswers, RentingBranchId, RentingScopeId, RentingStep } from "../../guides/rentingJourney";
import { Link } from "../Link";
import { RENTING_STEP_RECOMMENDATIONS } from "../../guides/recommendations";
import { RecommendationSlot } from "./RecommendationSlot";

type DetailState = "loading" | "error" | GuideDetail;

/**
 * The Renting Journey: two category questions, then the steps from listings
 * to the household bills after moving in, with their Guide links, key points
 * read from the published Guides, and a checklist held in page memory only.
 * When every task that applies is ticked, the move-in checklist is complete.
 * A separate later stage follows for moving out, with its own progress.
 */
const ALL_STEPS: readonly RentingStep[] = [...RENTING_STEPS, ...RENTING_MOVE_OUT_STEPS];

export function RentingJourney({
  locale,
  published,
}: {
  locale: GuideLocale;
  /** The published Renting Guides for this locale, or null while unknown. */
  published: ReadonlyMap<string, GuideMetadata> | null;
}) {
  const copy = RENTING_COPY;
  const [answers, setAnswers] = useState<RentingAnswers>({});
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const requested = useRef(new Set<string>());
  const outcome = journeyOutcome(answers);
  const showSteps = outcome.status === "steps";

  useEffect(() => {
    if (!showSteps || !published) return;
    const wanted = guidesFor(ALL_STEPS).filter((slug) => published.has(slug) && !requested.current.has(slug));
    if (wanted.length === 0) return;
    const controller = new AbortController();
    for (const slug of wanted) {
      requested.current.add(slug);
      setDetails((current) => ({ ...current, [slug]: "loading" }));
      const load =
        locale === "zh-CN"
          ? getGuide(slug, controller.signal)
          : getLocalizedGuide(slug, locale, controller.signal).then((localized) => localized.guide);
      load
        .then((detail) => setDetails((current) => ({ ...current, [slug]: detail })))
        .catch(() => {
          if (controller.signal.aborted) requested.current.delete(slug);
          else setDetails((current) => ({ ...current, [slug]: "error" }));
        });
    }
    return () => controller.abort();
  }, [showSteps, published, locale]);

  const progress = useMemo(
    () => (outcome.status === "steps" ? progressFor(outcome.branch, checked) : null),
    [outcome, checked],
  );
  const moveOutProgress = useMemo(
    () => (outcome.status === "steps" ? progressFor(outcome.branch, checked, RENTING_MOVE_OUT_STEPS) : null),
    [outcome, checked],
  );

  const toggle = (id: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderStep = (step: RentingStep, number: number, branch: RentingBranchId) => {
    const meta = published?.get(step.guide);
    const facts = stepFacts(step, branch);
    const tasks = stepTasks(step, branch);
    return (
      <li key={step.id} className="renting-step" data-step={step.id}>
        <header className="renting-step-head">
          <span className="renting-step-number">{fill(copy.step[locale], { n: number })}</span>
          <h3>{step.title[locale]}</h3>
        </header>
        <p className="renting-step-action">{step.action[locale]}</p>

        {meta && facts.length > 0 && (
          <div className="renting-facts">
            <h4>{copy.factsLabel[locale]}</h4>
            <FactList facts={facts} details={details} locale={locale} />
          </div>
        )}

        {tasks.length > 0 && (
          <fieldset className="renting-tasks">
            <legend>{copy.tasksLabel[locale]}</legend>
            {tasks.map((task) => (
              <label key={task.id} className="renting-task">
                <input
                  type="checkbox"
                  checked={checked.has(task.id)}
                  onChange={() => toggle(task.id)}
                  data-task={task.id}
                />
                <span>{task.label[locale]}</span>
              </label>
            ))}
          </fieldset>
        )}

        {RENTING_STEP_RECOMMENDATIONS[step.id] && (
          <RecommendationSlot context={RENTING_STEP_RECOMMENDATIONS[step.id]} locale={locale} />
        )}
        {meta ? (
          <Link to={guideRoutePath(locale, "renting", step.guide)} className="renting-guide-link" data-guide={step.guide}>
            <span>
              {copy.readGuide[locale]}: {meta.title}
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : (
          published && <p className="renting-unpublished">{copy.notPublished[locale]}</p>
        )}
      </li>
    );
  };

  const reset = () => setAnswers({});
  const overview = guideRoutePath(locale, "renting", "renting-letting-agent-overview");

  return (
    <section className="renting-journey" aria-labelledby="renting-journey-title">
      <div className="work-section-heading">
        <h2 id="renting-journey-title">{copy.journeyTitle[locale]}</h2>
        <p>{copy.journeyLead[locale]}</p>
      </div>

      <fieldset className="renting-question">
        <legend>{copy.scopeQuestion[locale]}</legend>
        {RENTING_SCOPES.map((scope) => (
          <label key={scope.id} className="renting-option">
            <input
              type="radio"
              name="renting-scope"
              value={scope.id}
              checked={answers.scope === scope.id}
              onChange={() => setAnswers({ scope: scope.id as RentingScopeId, branch: answers.branch })}
            />
            <span>{scope.label[locale]}</span>
          </label>
        ))}
      </fieldset>

      {outcome.status === "out-of-scope" && (
        <div className="renting-scope-notice" role="status" data-scope={outcome.scope}>
          <h3>{copy.outOfScopeTitle[locale]}</h3>
          <p>{copy.outOfScope[locale]}</p>
          <div className="renting-actions">
            <Link to={overview} className="renting-action-link">
              {copy.readOverview[locale]}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <button type="button" className="renting-reset" onClick={reset}>
              <RotateCcw size={14} aria-hidden="true" />
              {copy.change[locale]}
            </button>
          </div>
        </div>
      )}

      {(outcome.status === "ask-branch" || outcome.status === "steps") && (
        <fieldset className="renting-question">
          <legend>{copy.branchQuestion[locale]}</legend>
          {RENTING_BRANCHES.map((branch) => (
            <label key={branch.id} className="renting-option">
              <input
                type="radio"
                name="renting-branch"
                value={branch.id}
                checked={answers.branch === branch.id}
                onChange={() => setAnswers({ scope: answers.scope, branch: branch.id as RentingBranchId })}
              />
              <span>
                {branch.label[locale]}
                <small>{branch.hint[locale]}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {outcome.status === "steps" && progress && (
        <div className="renting-steps" data-branch={outcome.branch}>
          <div className="renting-branch-note" role="note">
            <p>{RENTING_BRANCHES.find((branch) => branch.id === outcome.branch)?.note[locale]}</p>
            <p className="renting-progress" aria-live="polite">
              {fill(copy.progress[locale], { done: progress.done, total: progress.total })}
            </p>
          </div>
          <ol className="renting-step-list">
            {RENTING_STEPS.map((step, index) => renderStep(step, index + 1, outcome.branch))}
          </ol>
          {progress.total > 0 && progress.done === progress.total && (
            <div className="renting-complete" role="status" data-complete="true">
              <h3>
                <CircleCheck size={18} aria-hidden="true" />
                {copy.completeTitle[locale]}
              </h3>
              <p>{copy.completeText[locale]}</p>
            </div>
          )}
          {moveOutProgress && moveOutProgress.total > 0 && (
            <section className="renting-move-out" aria-labelledby="renting-move-out-title" data-stage="move-out">
              <h3 id="renting-move-out-title">{copy.moveOutTitle[locale]}</h3>
              <p>{copy.moveOutLead[locale]}</p>
              <p className="renting-progress" aria-live="polite">
                {fill(copy.progress[locale], { done: moveOutProgress.done, total: moveOutProgress.total })}
              </p>
              <ol className="renting-step-list" start={RENTING_STEPS.length + 1}>
                {RENTING_MOVE_OUT_STEPS.map((step, index) => renderStep(step, RENTING_STEPS.length + index + 1, outcome.branch))}
              </ol>
            </section>
          )}
          <button type="button" className="renting-reset" onClick={reset}>
            <RotateCcw size={14} aria-hidden="true" />
            {copy.change[locale]}
          </button>
        </div>
      )}
    </section>
  );
}

function FactList({
  facts,
  details,
  locale,
}: {
  facts: ReturnType<typeof stepFacts>;
  details: Record<string, DetailState>;
  locale: GuideLocale;
}) {
  const copy = RENTING_COPY;
  const states = facts.map((fact) => details[fact.guide]);
  if (states.some((state) => state === undefined || state === "loading"))
    return <p className="renting-facts-status">{copy.factsLoading[locale]}</p>;
  const shown = facts
    .map((fact) => {
      const state = details[fact.guide];
      const evidence = typeof state === "object" ? factStatement(state, fact.key) : null;
      return evidence ? { fact, evidence } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (shown.length === 0) return <p className="renting-facts-status">{copy.factsUnavailable[locale]}</p>;
  return (
    <ul className="renting-fact-list">
      {shown.map(({ fact, evidence }) => (
        <li key={`${fact.guide}:${fact.key}`} data-kind={fact.kind} data-evidence={fact.key}>
          <span className="renting-fact-kind">{RENTING_FACT_KINDS[fact.kind][locale]}</span>
          <span className="renting-fact-text">{evidence.statement}</span>
        </li>
      ))}
    </ul>
  );
}
