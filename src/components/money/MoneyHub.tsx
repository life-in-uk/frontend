import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  FileCheck2,
  Landmark,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { getGuide, getGuides } from "../../guides/api";
import type { GuideDetail, GuideMetadata, GuideSource } from "../../guides/api";
import {
  domainGuides,
  guidePath,
  MONEY_GUIDE_DOMAIN,
} from "../../guides/domains";
import { formatUkDate } from "../../guides/format";
import {
  MONEY_QUICK_ANSWERS,
  resolveQuickAnswers,
} from "../../guides/moneyQuickAnswers";
import type { ResolvedQuickAnswer } from "../../guides/moneyQuickAnswers";
import { Link } from "../Link";
import { EvidencePanel } from "../guides/EvidencePanel";
import { MoneyHeroArt } from "./MoneyArt";
import { AffiliateCard } from "./AffiliateCard";
import {
  displayableOffer,
  MONEY_AFFILIATE_DRAFT,
  MONEY_AFFILIATE_OFFER,
} from "./affiliate";
import type { AffiliateOffer } from "./affiliate";
import "../guides/Guide.css";
import "./Money.css";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: GuideMetadata[] };

type AnswersState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guide: GuideDetail };

const REQUEST_DEADLINE_MS = 10_000;

/** On narrow screens the optional commercial card follows this many answers. */
const AFFILIATE_INLINE_AFTER = 5;

/**
 * The optional commercial card: the live offer if one is configured (none
 * is), else a development-only preview of the approved draft copy, requested
 * with ?affiliate-preview. Vite removes the preview from production builds.
 */
function moneyAffiliate(): AffiliateOffer | null {
  if (MONEY_AFFILIATE_OFFER) return displayableOffer(MONEY_AFFILIATE_OFFER);
  if (!import.meta.env.DEV) return null;
  return new URLSearchParams(window.location.search).has("affiliate-preview")
    ? MONEY_AFFILIATE_DRAFT
    : null;
}

/**
 * Money & Finance hub, short-answer first. Questions come from the Quick
 * Answer configuration; answers and their evidence are checked against the
 * published Guide (one detail request), which stays one click away.
 */
export function MoneyHub() {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [answers, setAnswers] = useState<AnswersState>({ status: "idle" });
  const [affiliate] = useState(moneyAffiliate);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    getGuides(controller.signal)
      .then((all) => {
        if (!active) return;
        const guides = domainGuides(all, MONEY_GUIDE_DOMAIN);
        setList({ status: "ready", guides });
        if (!guides.some((g) => g.slug === MONEY_QUICK_ANSWERS.guideSlug))
          return;
        setAnswers({ status: "loading" });
        return getGuide(MONEY_QUICK_ANSWERS.guideSlug, controller.signal)
          .then((guide) => {
            if (active) setAnswers({ status: "ready", guide });
          })
          .catch(() => {
            if (active) setAnswers({ status: "error" });
          });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const guides = list.status === "ready" ? list.guides : [];
  const answerGuide = guides.find(
    (g) => g.slug === MONEY_QUICK_ANSWERS.guideSlug,
  );
  const otherGuides = guides.filter((g) => g !== answerGuide);
  const loading =
    list.status === "loading" ||
    answers.status === "loading" ||
    (answerGuide !== undefined && answers.status === "idle");

  return (
    <main id="main" className="money-page money-hub">
      <section className="money-hero" aria-labelledby="money-title">
        <div className="money-hero-copy">
          <span className="eyebrow money-eyebrow">
            <Wallet size={15} aria-hidden="true" />
            MONEY &amp; FINANCE · 英国
          </span>
          <h1 id="money-title">金钱与财务</h1>
          <p className="money-hero-lead">
            刚到英国开户、存钱遇到的问题，先看简短回答；每条都能查看依据，需要细节再打开完整指南。
          </p>
          <p className="money-hero-note">
            Life in UK
            是独立的中文生活信息服务，不隶属于任何银行或金融监管机构。
          </p>
        </div>
        <div className="money-hero-media">
          <MoneyHeroArt />
        </div>
      </section>

      <div className="money-layout">
        <section className="money-answers" aria-labelledby="money-qa-title">
          <div className="money-section-heading">
            <h2 id="money-qa-title">快速解答</h2>
            <p>选一个问题，先看简短回答。</p>
          </div>

          {loading && (
            <div className="money-skeleton">
              <p className="sr-only" role="status">
                正在加载金钱与财务的解答…
              </p>
              <ul className="money-qa-skeleton" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <li key={i}>
                    <span className="money-skeleton-line" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {list.status === "error" && (
            <div className="money-panel money-error" role="status">
              <h3>解答暂时无法加载</h3>
              <p>请稍后再试。</p>
            </div>
          )}

          {list.status === "ready" && guides.length === 0 && (
            <div className="money-panel money-empty" role="status">
              <h3>解答正在整理中</h3>
              <p>
                金钱与财务的中文解答和指南还在编写和核对，发布后会显示在这里。
              </p>
            </div>
          )}

          {answers.status === "error" && answerGuide && (
            <div className="money-panel money-error" role="status">
              <h3>解答暂时无法加载</h3>
              <p>请稍后再试，或直接打开完整指南。</p>
            </div>
          )}

          {answers.status === "ready" && answerGuide && (
            <QuickAnswers
              guide={answers.guide}
              guideMeta={answerGuide}
              affiliate={affiliate}
            />
          )}

          {list.status === "ready" &&
            !answerGuide &&
            otherGuides.length > 0 && <GuideList guides={otherGuides} />}
        </section>

        {answerGuide && (
          <aside className="money-aside" aria-labelledby="money-guide-title">
            <FullGuideCard guide={answerGuide} />
            <AffiliateCard offer={affiliate} placement="aside" />
            <TrustNotes />
          </aside>
        )}
      </div>

      {answerGuide && otherGuides.length > 0 && (
        <section className="money-more" aria-labelledby="money-more-title">
          <div className="money-section-heading">
            <h2 id="money-more-title">更多指南</h2>
          </div>
          <GuideList guides={otherGuides} />
        </section>
      )}
    </main>
  );
}

/** One open question at a time; evidence on demand; next question nearby. */
function QuickAnswers({
  guide,
  guideMeta,
  affiliate,
}: {
  guide: GuideDetail;
  guideMeta: GuideMetadata;
  /** Optional commercial card shown between answers on narrow screens. */
  affiliate: AffiliateOffer | null;
}) {
  const resolved = useMemo(
    () =>
      resolveQuickAnswers(
        MONEY_QUICK_ANSWERS,
        guide,
        MONEY_GUIDE_DOMAIN.category,
      ),
    [guide],
  );
  const sources = useMemo(
    () => new Map(guide.sources.map((source) => [source.key, source])),
    [guide],
  );
  const [openId, setOpenId] = useState<string | null>(resolved[0]?.id ?? null);
  const [evidenceOpen, setEvidenceOpen] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (focusId) document.getElementById(`qa-q-${focusId}`)?.focus();
  }, [focusId]);

  const unverified = resolved.filter((answer) => !answer.evidence).length;
  const guideHref = guidePath(MONEY_GUIDE_DOMAIN, guideMeta.slug);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
    setEvidenceOpen(null);
  }
  function openNext(id: string) {
    setOpenId(id);
    setEvidenceOpen(null);
    setFocusId(id);
  }

  function renderItem(answer: ResolvedQuickAnswer, index: number) {
    const open = openId === answer.id;
    const next = resolved[index + 1];
    return (
      <li
        key={answer.id}
        className={open ? "money-qa-item is-open" : "money-qa-item"}
        data-answer={answer.id}
      >
        <h3>
          <button
            type="button"
            id={`qa-q-${answer.id}`}
            className="money-qa-question"
            aria-expanded={open}
            aria-controls={open ? `qa-a-${answer.id}` : undefined}
            onClick={() => toggle(answer.id)}
          >
            <span>{answer.question}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </h3>
        {open && (
          <div
            id={`qa-a-${answer.id}`}
            className="money-qa-answer"
            role="region"
            aria-labelledby={`qa-q-${answer.id}`}
          >
            {answer.evidence ? (
              <VerifiedAnswer
                answer={answer}
                evidence={answer.evidence}
                sources={sources}
                guideHref={guideHref}
                evidenceShown={evidenceOpen === answer.id}
                onToggleEvidence={() =>
                  setEvidenceOpen((current) =>
                    current === answer.id ? null : answer.id,
                  )
                }
              />
            ) : (
              <div className="money-qa-unverified">
                <p>
                  这条简答的依据暂时无法核对，先不显示。请在完整指南里查看这部分内容。
                </p>
                <Link to={guideHref} className="money-qa-guide-link">
                  打开完整指南
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            )}
            {next && (
              <button
                type="button"
                className="money-qa-next-question"
                onClick={() => openNext(next.id)}
              >
                <span className="money-qa-next-label">下一个问题</span>
                <span className="money-qa-next-text">{next.question}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <>
      {unverified === resolved.length && (
        <p className="money-qa-notice" role="status">
          完整指南有更新，这些简答正在重新核对；核对完成前不显示简答内容，请先看完整指南。
        </p>
      )}
      {affiliate ? (
        <>
          <ul className="money-qa-list">
            {resolved.slice(0, AFFILIATE_INLINE_AFTER).map(renderItem)}
          </ul>
          <AffiliateCard offer={affiliate} placement="inline" />
          <ul className="money-qa-list money-qa-list-continued">
            {resolved
              .slice(AFFILIATE_INLINE_AFTER)
              .map((answer, index) =>
                renderItem(answer, index + AFFILIATE_INLINE_AFTER),
              )}
          </ul>
        </>
      ) : (
        <ul className="money-qa-list">{resolved.map(renderItem)}</ul>
      )}
    </>
  );
}

function VerifiedAnswer({
  answer,
  evidence,
  sources,
  guideHref,
  evidenceShown,
  onToggleEvidence,
}: {
  answer: ResolvedQuickAnswer;
  evidence: NonNullable<ResolvedQuickAnswer["evidence"]>;
  sources: Map<string, GuideSource>;
  guideHref: string;
  evidenceShown: boolean;
  onToggleEvidence: () => void;
}) {
  const evidenceId = `qa-e-${answer.id}`;
  return (
    <>
      <p className="money-qa-text">{answer.answer}</p>
      {answer.nextStep && (
        <p className="money-qa-step">
          <span className="money-qa-step-label">下一步</span>
          {answer.nextStep}
        </p>
      )}
      <div className="money-qa-actions">
        <button
          type="button"
          className="evidence-toggle"
          aria-expanded={evidenceShown}
          aria-controls={evidenceShown ? evidenceId : undefined}
          onClick={onToggleEvidence}
        >
          <FileCheck2 size={14} aria-hidden="true" />
          查看依据（{evidence.length} 条）
        </button>
        <Link to={guideHref} className="money-qa-guide-link">
          在完整指南里看详细说明
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {evidenceShown && (
        <div id={evidenceId} className="money-qa-evidence">
          {evidence.map((item) => (
            <EvidencePanel
              key={item.key}
              id={`${evidenceId}-${item.key}`}
              evidence={item}
              sources={sources}
              isExampleSource={MONEY_GUIDE_DOMAIN.isExampleSource}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** The complete Guide: always reachable, deliberately secondary. */
function FullGuideCard({ guide }: { guide: GuideMetadata }) {
  return (
    <div className="money-guide-aside">
      <span className="money-aside-kicker">完整指南</span>
      <h2 id="money-guide-title">{guide.title}</h2>
      <p className="money-aside-summary">{guide.summary}</p>
      <span className="money-updated">
        <CalendarDays size={14} aria-hidden="true" />
        更新于{" "}
        <time dateTime={guide.updatedAt}>{formatUkDate(guide.updatedAt)}</time>
      </span>
      <Link
        to={guidePath(MONEY_GUIDE_DOMAIN, guide.slug)}
        className="money-aside-link"
      >
        打开完整指南
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

function TrustNotes() {
  return (
    <ul className="money-trust-points" aria-label="依据与来源">
      <li>
        <FileCheck2 size={17} aria-hidden="true" />
        <p>
          每条简答都能查看依据，看这句话出自哪份资料、哪个机构，并附原文链接。
        </p>
      </li>
      <li>
        <Landmark size={17} aria-hidden="true" />
        <p>
          来源可能是法规、政府或监管机构的说明，也可能是银行自己公布的信息；每条都写明出自哪里。
        </p>
      </li>
      <li>
        <RefreshCw size={17} aria-hidden="true" />
        <p>规则会变，办理前请以原文和相关机构当时的说明为准。</p>
      </li>
    </ul>
  );
}

function GuideList({ guides }: { guides: GuideMetadata[] }) {
  return (
    <ul className="money-guide-list">
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link
            to={guidePath(MONEY_GUIDE_DOMAIN, guide.slug)}
            className="money-guide-card"
          >
            <h3>{guide.title}</h3>
            <p className="money-guide-summary">{guide.summary}</p>
            <span className="money-guide-meta">
              <span className="money-updated">
                <CalendarDays size={14} aria-hidden="true" />
                更新于{" "}
                <time dateTime={guide.updatedAt}>
                  {formatUkDate(guide.updatedAt)}
                </time>
              </span>
              <ArrowRight
                className="money-guide-arrow"
                size={16}
                aria-hidden="true"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
