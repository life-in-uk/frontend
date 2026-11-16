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
import { getGuide, getGuides, getLocalizedGuide, getLocalizedGuides } from "../../guides/api";
import type { GuideDetail, GuideMetadata, GuideSource } from "../../guides/api";
import {
  domainGuides,
  MONEY_GUIDE_DOMAIN,
} from "../../guides/domains";
import { formatUkDateFor } from "../../guides/format";
import {
  MONEY_QUICK_ANSWERS,
  resolveQuickAnswers,
} from "../../guides/moneyQuickAnswers";
import { moneyQuickAnswersFor } from "../../guides/moneyQuickAnswersLocales";
import { GUIDE_LOCALE_LANG, GUIDE_UI, guideRoutePath, textDirection, type GuideLocale } from "../../guides/locales";
import { MONEY_COPY, type MoneyCopy } from "./moneyCopy";
import { applyGuideSeo, clearGuideSeo, hubAlternates } from "../../guides/seo";
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
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";

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
export function MoneyHub({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const c = MONEY_COPY[locale];
  const translatedPage = locale !== "zh-CN";
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
    // Translated pages read that locale's published list and Guide.
    (translatedPage ? getLocalizedGuides(locale, controller.signal) : getGuides(controller.signal))
      .then((all) => {
        if (!active) return;
        const guides = domainGuides(all, MONEY_GUIDE_DOMAIN);
        setList({ status: "ready", guides });
        if (!guides.some((g) => g.slug === MONEY_QUICK_ANSWERS.guideSlug))
          return;
        setAnswers({ status: "loading" });
        return (translatedPage
          ? getLocalizedGuide(MONEY_QUICK_ANSWERS.guideSlug, locale, controller.signal).then((result) => result.guide)
          : getGuide(MONEY_QUICK_ANSWERS.guideSlug, controller.signal))
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
  }, [locale, translatedPage]);

  // Translated hubs keep the SEO the generic localized index used to provide.
  useEffect(() => {
    if (!translatedPage) return;
    applyGuideSeo({
      locale,
      canonical: new URL(guideRoutePath(locale, MONEY_GUIDE_DOMAIN.id), window.location.origin).href,
      title: `${GUIDE_UI[locale].domain.money} · Life in UK`,
      description: c.lead,
      alternates: hubAlternates(window.location.origin, MONEY_GUIDE_DOMAIN.id),
    });
    return () => clearGuideSeo();
  }, [locale, translatedPage, c]);

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
    <main
      id="main"
      className="money-page money-hub"
      lang={translatedPage ? GUIDE_LOCALE_LANG[locale] : undefined}
      dir={translatedPage ? textDirection(locale) : undefined}
    >
      <div className="guide-toolbar"><GuideLanguageSelect locale={locale} domain="money" /></div>
      <section className="money-hero" aria-labelledby="money-title">
        <div className="money-hero-copy">
          <span className="eyebrow money-eyebrow">
            <Wallet size={15} aria-hidden="true" />
            MONEY &amp; FINANCE · {c.region}
          </span>
          <h1 id="money-title">{GUIDE_UI[locale].domain.money}</h1>
          <p className="money-hero-lead">{c.lead}</p>
          <p className="money-hero-note">{c.note}</p>
        </div>
        <div className="money-hero-media">
          <MoneyHeroArt />
        </div>
      </section>

      <div className="money-layout">
        <section className="money-answers" aria-labelledby="money-qa-title">
          <div className="money-section-heading">
            <h2 id="money-qa-title">{c.qaTitle}</h2>
            <p>{c.qaIntro}</p>
          </div>

          {loading && (
            <div className="money-skeleton">
              <p className="sr-only" role="status">
                {c.loading}
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
              <h3>{c.errorTitle}</h3>
              <p>{c.retry}</p>
            </div>
          )}

          {list.status === "ready" && guides.length === 0 && (
            <div className="money-panel money-empty" role="status">
              <h3>{c.emptyTitle}</h3>
              <p>{c.emptyText}</p>
            </div>
          )}

          {answers.status === "error" && answerGuide && (
            <div className="money-panel money-error" role="status">
              <h3>{c.errorTitle}</h3>
              <p>{c.retryOrGuide}</p>
            </div>
          )}

          {answers.status === "ready" && answerGuide && (
            <QuickAnswers
              guide={answers.guide}
              guideMeta={answerGuide}
              affiliate={affiliate}
              locale={locale}
            />
          )}

          {list.status === "ready" &&
            !answerGuide &&
            otherGuides.length > 0 && <GuideList guides={otherGuides} locale={locale} />}
        </section>

        {answerGuide && (
          <aside className="money-aside" aria-labelledby="money-guide-title">
            <FullGuideCard guide={answerGuide} locale={locale} />
            <AffiliateCard offer={affiliate} placement="aside" />
            <TrustNotes c={c} />
          </aside>
        )}
      </div>

      {answerGuide && otherGuides.length > 0 && (
        <section className="money-more" aria-labelledby="money-more-title">
          <div className="money-section-heading">
            <h2 id="money-more-title">{c.more}</h2>
          </div>
          <GuideList guides={otherGuides} locale={locale} />
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
  locale,
}: {
  guide: GuideDetail;
  guideMeta: GuideMetadata;
  /** Optional commercial card shown between answers on narrow screens. */
  affiliate: AffiliateOffer | null;
  locale: GuideLocale;
}) {
  const c = MONEY_COPY[locale];
  // Each locale's answers are checked against that locale's published evidence.
  const resolved = useMemo(
    () =>
      resolveQuickAnswers(
        moneyQuickAnswersFor(locale),
        guide,
        MONEY_GUIDE_DOMAIN.category,
      ),
    [guide, locale],
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
  const guideHref = guideRoutePath(locale, MONEY_GUIDE_DOMAIN.id, guideMeta.slug);

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
                locale={locale}
                evidenceShown={evidenceOpen === answer.id}
                onToggleEvidence={() =>
                  setEvidenceOpen((current) =>
                    current === answer.id ? null : answer.id,
                  )
                }
              />
            ) : (
              <div className="money-qa-unverified">
                <p>{c.unverified}</p>
                <Link to={guideHref} className="money-qa-guide-link">
                  {c.openGuide}
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
                <span className="money-qa-next-label">{c.nextQuestion}</span>
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
          {c.recheck}
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
  locale,
  evidenceShown,
  onToggleEvidence,
}: {
  answer: ResolvedQuickAnswer;
  evidence: NonNullable<ResolvedQuickAnswer["evidence"]>;
  sources: Map<string, GuideSource>;
  guideHref: string;
  locale: GuideLocale;
  evidenceShown: boolean;
  onToggleEvidence: () => void;
}) {
  const evidenceId = `qa-e-${answer.id}`;
  const c = MONEY_COPY[locale];
  return (
    <>
      <p className="money-qa-text">{answer.answer}</p>
      {answer.nextStep && (
        <p className="money-qa-step">
          <span className="money-qa-step-label">{c.nextStep}</span>
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
          {c.evidenceCount.replace("{n}", String(evidence.length))}
        </button>
        <Link to={guideHref} className="money-qa-guide-link">
          {c.detailsInGuide}
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
              locale={locale}
              isExampleSource={MONEY_GUIDE_DOMAIN.isExampleSource}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** The complete Guide: always reachable, deliberately secondary. */
function FullGuideCard({ guide, locale }: { guide: GuideMetadata; locale: GuideLocale }) {
  const c = MONEY_COPY[locale];
  return (
    <div className="money-guide-aside">
      <span className="money-aside-kicker">{c.fullGuide}</span>
      <h2 id="money-guide-title">{guide.title}</h2>
      <p className="money-aside-summary">{guide.summary}</p>
      <span className="money-updated">
        <CalendarDays size={14} aria-hidden="true" />
        {GUIDE_UI[locale].updated}{" "}
        <time dateTime={guide.updatedAt}>{formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale])}</time>
      </span>
      <Link
        to={guideRoutePath(locale, MONEY_GUIDE_DOMAIN.id, guide.slug)}
        className="money-aside-link"
      >
        {c.openGuide}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

function TrustNotes({ c }: { c: MoneyCopy }) {
  return (
    <ul className="money-trust-points" aria-label={c.trustLabel}>
      <li>
        <FileCheck2 size={17} aria-hidden="true" />
        <p>{c.trust1}</p>
      </li>
      <li>
        <Landmark size={17} aria-hidden="true" />
        <p>{c.trust2}</p>
      </li>
      <li>
        <RefreshCw size={17} aria-hidden="true" />
        <p>{c.trust3}</p>
      </li>
    </ul>
  );
}

function GuideList({ guides, locale }: { guides: GuideMetadata[]; locale: GuideLocale }) {
  return (
    <ul className="money-guide-list">
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link
            to={guideRoutePath(locale, MONEY_GUIDE_DOMAIN.id, guide.slug)}
            className="money-guide-card"
          >
            <h3>{guide.title}</h3>
            <p className="money-guide-summary">{guide.summary}</p>
            <span className="money-guide-meta">
              <span className="money-updated">
                <CalendarDays size={14} aria-hidden="true" />
                {GUIDE_UI[locale].updated}{" "}
                <time dateTime={guide.updatedAt}>
                  {formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale])}
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
