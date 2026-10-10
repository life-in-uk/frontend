import { useId, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  isAnswered,
  isComplete,
  nextStep,
  previousStep,
  QUESTIONS,
  questionSteps,
  validateAnswers,
} from "../../../guides/familyVisaJourney";
import type {
  Answers,
  ChildRelation,
  QuestionStep,
  Step,
} from "../../../guides/familyVisaJourney";

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  step: QuestionStep;
  answers: Answers;
  onAnswer: (answers: Answers) => void;
  onGo: (step: Step) => void;
};

/** One question per screen: native radios or checkboxes, explicit next. */
export function NavigatorQuestion({
  headingRef,
  step,
  answers,
  onAnswer,
  onGo,
}: Props) {
  const question = QUESTIONS[step];
  const id = useId();
  const [error, setError] = useState(false);
  const steps = questionSteps(answers);
  const index = steps.indexOf(step);
  const previous = previousStep(step, answers);
  const next = nextStep(step, answers);
  const answered = isAnswered(answers, step);
  const canSkipToResults = next !== "results" && isComplete(answers);

  function choose(value: string, checked: boolean) {
    setError(false);
    if (step === "childRelations") {
      const current = new Set(answers.childRelations ?? []);
      if (checked) current.add(value as ChildRelation);
      else current.delete(value as ChildRelation);
      const ordered = question.options
        .map((option) => option.value as ChildRelation)
        .filter((option) => current.has(option));
      onAnswer({
        ...answers,
        childRelations: ordered.length > 0 ? ordered : undefined,
      });
    } else onAnswer(validateAnswers({ ...answers, [step]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!answered) {
      setError(true);
      return;
    }
    onGo(next);
  }

  const selected = (value: string) =>
    step === "childRelations"
      ? (answers.childRelations ?? []).includes(value as ChildRelation)
      : answers[step] === value;

  return (
    <form className="navigator-card" onSubmit={submit} noValidate>
      <p className="navigator-progress">
        第 {index + 1} 步，共 {steps.length} 步
      </p>
      <div className="navigator-progress-bar" aria-hidden="true">
        <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <fieldset
        className="navigator-fieldset"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
      >
        <h3
          id={`${id}-title`}
          ref={headingRef}
          tabIndex={-1}
          className="navigator-question"
        >
          {question.title}
        </h3>
        <p id={`${id}-hint`} className="navigator-hint">
          {question.hint}
        </p>
        <div className="navigator-options">
          {question.options.map((option) => (
            <label key={option.value} className="navigator-option">
              <input
                type={question.multiple ? "checkbox" : "radio"}
                name={step}
                value={option.value}
                checked={selected(option.value)}
                onChange={(event) =>
                  choose(option.value, event.currentTarget.checked)
                }
              />
              <span className="navigator-option-text">
                <span className="navigator-option-label">{option.label}</span>
                {option.detail && (
                  <span className="navigator-option-detail">
                    {option.detail}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        {error && (
          <p id={`${id}-error`} className="navigator-error" role="alert">
            {question.multiple ? "请至少选择一项。" : "请选择一项。"}
          </p>
        )}
      </fieldset>
      <div className="navigator-actions">
        {previous && (
          <button
            type="button"
            className="navigator-button navigator-button-quiet"
            onClick={() => onGo(previous)}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            上一步
          </button>
        )}
        <button
          type="submit"
          className="navigator-button navigator-button-primary"
        >
          {next === "results" ? "查看结果" : "下一步"}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        {canSkipToResults && answered && (
          <button
            type="button"
            className="navigator-button navigator-button-link"
            onClick={() => onGo("results")}
          >
            直接查看结果
          </button>
        )}
      </div>
    </form>
  );
}
