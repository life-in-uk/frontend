import { useState } from "react";
import { ArrowRight, ChevronDown, FileCheck2, Info } from "lucide-react";
import { useFamilyVisaLocale } from "../../../guides/familyVisaI18n";
import type { FamilyVisaText } from "../../../guides/familyVisaI18n";
import { guideRoutePath } from "../../../guides/locales";
import type { ShownGuideLink } from "../localizedJourney";
import { QUESTIONS, questionSteps } from "../../../guides/familyVisaJourney";
import type {
  Answers,
  ResolvedPassage,
  ResolvedStage,
  Step,
  TextBlock,
} from "../../../guides/familyVisaJourney";
import { EvidencePanel } from "../../guides/EvidencePanel";
import { Link } from "../../Link";
import { emphasis } from "../emphasis";

function Blocks({ text }: { text: readonly TextBlock[] }) {
  return (
    <>
      {text.map((block, index) =>
        typeof block === "string" ? (
          <p key={index}>{emphasis(block)}</p>
        ) : (
          <ul key={index}>
            {block.map((item, itemIndex) => (
              <li key={itemIndex}>{emphasis(item)}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

const STATUS_TEXT = {
  loading: (t: FamilyVisaText) => t("正在加载…"),
  verified: (t: FamilyVisaText, stage: ResolvedStage) =>
    t("已核对 · {count} 个要点", { count: stage.items.length }),
  partial: (t: FamilyVisaText) => t("部分待核对"),
  pending: (t: FamilyVisaText) => t("待核对"),
} as const;

const FALLBACK_TEXT = {
  unpublished: "这部分的核对内容还没有发布。",
  changed: "内容已更新，请阅读完整指南。",
  loading: "正在加载…",
} as const;

/** The ordered stages alone, for the checklist's "规则说明" disclosure. */
export function JourneyStageList({ stages }: { stages: ResolvedStage[] }) {
  return (
    <ol className="journey-stages">
      {stages.map((stage) => (
        <li key={stage.id} className="journey-stage-item">
          <JourneyStage stage={stage} />
        </li>
      ))}
    </ol>
  );
}

export function AnswerSummary({
  answers,
  onEdit,
}: {
  answers: Answers;
  onEdit: (step: Step) => void;
}) {
  const { t } = useFamilyVisaLocale();
  return (
    <dl className="journey-answers" aria-label={t("你的回答")}>
      {questionSteps(answers).map((step) => (
        <div key={step} className="journey-answer">
          <dt className="sr-only">{t(QUESTIONS[step].title)}</dt>
          <dd>
            <span>{t(QUESTIONS[step].summary(answers) ?? "")}</span>
            <button
              type="button"
              className="journey-edit"
              onClick={() => onEdit(step)}
              aria-label={t("修改：{title}", {
                title: t(QUESTIONS[step].title),
              })}
            >
              {t("修改")}
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function JourneyStage({ stage }: { stage: ResolvedStage }) {
  const { t } = useFamilyVisaLocale();
  const [open, setOpen] = useState(false);
  const panelId = `journey-${stage.id}-details`;
  const titleId = `journey-${stage.id}-title`;
  const hasDetails =
    stage.items.length > 0 ||
    stage.pending.length > 0 ||
    stage.advice.length > 0 ||
    stage.changed ||
    stage.unpublished ||
    stage.guides.length > 0;

  return (
    <article
      className={`journey-stage journey-status-${stage.status}`}
      aria-labelledby={titleId}
    >
      <header className="journey-stage-head">
        <span className="journey-number" aria-hidden="true">
          {stage.number}
        </span>
        <div className="journey-stage-heading">
          <h4 id={titleId}>
            <span className="sr-only">
              {t("第 {n} 步：", { n: stage.number })}
            </span>
            {stage.title}
          </h4>
          <span className="journey-status">
            {STATUS_TEXT[stage.status](t, stage)}
          </span>
        </div>
      </header>
      <p className="journey-intro">{stage.intro}</p>
      <div className="journey-summary">
        {stage.summary?.map((passage) => (
          <Blocks key={passage.id} text={passage.text} />
        ))}
        {stage.summaryFallback && (
          <p className="journey-fallback">
            {t(FALLBACK_TEXT[stage.summaryFallback])}
          </p>
        )}
        {stage.summaryNotices.map((notice) => (
          <p key={notice.id} className="journey-notice">
            {notice.text}
          </p>
        ))}
      </div>
      {hasDetails && (
        <>
          <button
            type="button"
            className="journey-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("收起详细信息") : t("展开详细信息")}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <div id={panelId} className="journey-details" hidden={!open}>
            <StageDetails stage={stage} />
          </div>
        </>
      )}
    </article>
  );
}

function StageDetails({ stage }: { stage: ResolvedStage }) {
  const { locale, t } = useFamilyVisaLocale();
  return (
    <>
      {stage.changed && (
        <p className="journey-fallback">
          {t("部分内容已更新，暂不显示；请阅读完整指南。")}
        </p>
      )}
      {stage.unpublished && stage.items.length === 0 && (
        <p className="journey-fallback">{t("核对内容发布后会显示在这里。")}</p>
      )}
      {stage.pending.map((notice) => (
        <p key={notice.id} className="journey-pending">
          <span className="journey-pending-tag">{t("待核对")}</span>
          {notice.text}
        </p>
      ))}
      {stage.itemsHeading && stage.items.length > 0 && (
        <p className="journey-items-heading">{stage.itemsHeading.text}</p>
      )}
      {stage.items.map((item) => (
        <section key={item.id} className="journey-item" aria-label={item.title}>
          <h5>{item.title}</h5>
          {item.passages.map((passage) => (
            <Passage key={passage.id} passage={passage} />
          ))}
        </section>
      ))}
      {stage.advice.map((notice) => (
        <p key={notice.id} className="journey-advice">
          <Info size={15} aria-hidden="true" />
          <span>{notice.text}</span>
        </p>
      ))}
      {stage.notes.map((notice) => (
        <p key={notice.id} className="journey-note">
          {notice.text}
        </p>
      ))}
      {stage.guides.length > 0 && (
        <ul className="journey-guide-links">
          {stage.guides.map((guide: ShownGuideLink) => (
            <li key={guide.slug}>
              <Link to={guideRoutePath(locale, "family-visa", guide.slug)}>
                {t("阅读完整指南")}{" "}
                <span lang={guide.lang}>
                  {t("《{title}》", { title: guide.title })}
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Passage({ passage }: { passage: ResolvedPassage }) {
  const { locale, t } = useFamilyVisaLocale();
  const [shown, setShown] = useState(false);
  if (passage.state.status !== "verified") return null;
  const { evidence, sources, lang } = passage.state;
  const evidenceId = `journey-e-${passage.id}`;
  return (
    <div className="journey-passage">
      {passage.label && (
        <p className="journey-place">
          {t("{label}：", { label: passage.label })}
        </p>
      )}
      <Blocks text={passage.text} />
      {passage.advice && (
        <p className="journey-advice">
          <Info size={15} aria-hidden="true" />
          <span>{passage.advice}</span>
        </p>
      )}
      <button
        type="button"
        className="evidence-toggle"
        aria-expanded={shown}
        aria-controls={shown ? evidenceId : undefined}
        onClick={() => setShown((value) => !value)}
      >
        <FileCheck2 size={14} aria-hidden="true" />
        {t("查看法律依据（{count} 条）", { count: evidence.length })}
      </button>
      {shown && (
        <div id={evidenceId} className="journey-evidence" lang={lang}>
          {evidence.map((item) => (
            <EvidencePanel
              key={item.key}
              id={`${evidenceId}-${item.key}`}
              evidence={item}
              sources={sources}
              locale={lang ? "zh-CN" : locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
