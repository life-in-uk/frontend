import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, FileCheck2, ListOrdered } from "lucide-react";
import { getGuide, getGuides, getLocalizedGuide, getLocalizedGuides, GuideNotFoundError, startupGuide, startupGuides } from "../../guides/api";
import type { GuideDetail, GuideMetadata } from "../../guides/api";
import { GUIDE_LOCALES, GUIDE_LOCALE_LANG, GUIDE_UI, guideHomePath, guideRoutePath, localizedGuidePath, textDirection, type GuideLocale } from "../../guides/locales";
import { applyGuideSeo, clearGuideSeo, guideAlternates } from "../../guides/seo";
import { guideSections, inlineText, parseMarkdown, withoutRepeatedUpdatedLine } from "../../guides/markdown";
import type { Block } from "../../guides/markdown";
import type { GuideDomain } from "../../guides/domains";
import { belongsToDomain } from "../../guides/domains";
import { relatedLinksFor } from "../../guides/topicClusters";
import type { ResolvedGuide } from "../../guides/topicClusters";
import { formatUkDateFor, shortGuideTitle } from "../../guides/format";
import { Link } from "../Link";
import { useReportAvailableLocales } from "../site/pageLanguages";
import { GuideMarkdown } from "./GuideMarkdown";
import { titleReferencesFor } from "../../guides/titleReferences";
import { guideStructuredData } from "../../seo/structuredData";
import { GuideDisclaimer } from "./GuideDisclaimer";
import "./Guide.css";

/** Optional section-specific look; the page works without any of it. */
export type GuidePresentation = {
  /** Extra class on <main>, before `guide-page`. */
  pageClassName?: string;
  /** Editorial sub-section shown after the domain label in the kicker. */
  sectionTitle?: (slug: string) => string | undefined;
  /** Tone class (e.g. "tone-blue") for the header and related Guide cards. */
  tone?: (slug: string) => string;
  /** Decorative header artwork; omitted when it returns nothing. */
  headerArt?: (slug: string) => ReactNode;
};

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; guide: GuideDetail };

const REQUEST_DEADLINE_MS = 10_000;

/** Guides with at least this many sections get an "On this page" list. */
const MIN_TOC_SECTIONS = 4;

/** The section list starts open where there is room for it beside the reading flow (not on phones). */
function wideScreen(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(min-width: 900px)").matches;
}

export function GuidePage({
  domain,
  slug,
  locale = "zh-CN",
  presentation = {},
}: {
  domain: GuideDomain;
  slug: string;
  locale?: GuideLocale;
  presentation?: GuidePresentation;
}) {
  // On a prerendered page the first render already has the Guide (fetched
  // before it, see primeStartupGuide), so the static article is replaced in
  // one step instead of by a loading state.
  const [state, setState] = useState<State>(() => {
    const guide = startupGuide(slug, locale);
    return guide && belongsToDomain(guide, domain) ? { status: "ready", guide } : { status: "loading" };
  });
  const [related, setRelated] = useState<ResolvedGuide[]>(() => {
    const guides = startupGuides(locale);
    return guides ? relatedLinksFor(domain, slug, guides) : [];
  });
  // The published list for this locale; it decides which references link.
  const [published, setPublished] = useState<GuideMetadata[] | undefined>(() => startupGuides(locale));
  const references = useMemo(() => titleReferencesFor(domain, locale, published, slug), [domain, locale, published, slug]);
  const [availableLocales, setAvailableLocales] = useState<GuideLocale[]>([locale]);
  // The header's language selector offers only the languages this Guide is published in.
  useReportAvailableLocales(availableLocales);
  const ui = GUIDE_UI[locale];
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => () => clearGuideSeo(), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    const guideRequest = locale === "zh-CN"
      ? getGuide(slug, controller.signal)
      : getLocalizedGuide(slug, locale, controller.signal).then((result) => result.guide);
    guideRequest
      .then((guide) => {
        if (!active) return;
        // A Guide from another section is treated as not found here, so its
        // content never appears under the wrong branded domain.
        setState((current) =>
          current.status === "ready" && current.guide === guide
            ? current
            : belongsToDomain(guide, domain)
              ? { status: "ready", guide }
              : { status: "not-found" },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: error instanceof GuideNotFoundError ? "not-found" : "error",
        });
      })
      .finally(() => window.clearTimeout(timeout));
    // Related-guide titles come from the list; if it fails the article still works.
    const listRequest = locale === "zh-CN" ? getGuides(controller.signal) : getLocalizedGuides(locale, controller.signal);
    listRequest
      .then((guides) => {
        if (!active) return;
        setRelated(relatedLinksFor(domain, slug, guides));
        setPublished(guides);
      })
      .catch(() => {});
    Promise.allSettled(GUIDE_LOCALES.map((candidate) =>
      candidate === "zh-CN" ? getGuides(controller.signal) : getLocalizedGuides(candidate, controller.signal),
    )).then((results) => {
      if (!active) return;
      const found = results.flatMap((result, index) => result.status === "fulfilled"
        && result.value.some((item) => item.slug === slug) ? [GUIDE_LOCALES[index]] : []);
      setAvailableLocales(found.includes(locale) ? found : [...found, locale]);
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [domain, slug, locale]);

  useEffect(() => {
    if (state.status === "ready") {
      const canonical = new URL(localizedGuidePath(locale, domain.id, slug), window.location.origin).href;
      applyGuideSeo({ locale, canonical, title: `${state.guide.title} · Life in UK`, description: state.guide.summary,
        alternates: guideAlternates(window.location.origin, domain.id, slug, availableLocales),
        structuredData: guideStructuredData({ origin: window.location.origin, locale, domainId: domain.id, guide: state.guide }) });
    } else if (state.status === "not-found") {
      applyGuideSeo({ locale, canonical: null, title: "Guide not found · Life in UK", description: "", noIndex: true });
    } else if (state.status === "error") {
      // A failed request is not a missing Guide: no noindex, and the page's own head
      // tags (prerendered, if any) stay, so a temporary API error is never indexed as one.
      document.title = "Guide unavailable · Life in UK";
      document.documentElement.lang = GUIDE_LOCALE_LANG[locale];
      document.documentElement.dir = textDirection(locale);
    } else {
      document.documentElement.lang = GUIDE_LOCALE_LANG[locale];
      document.documentElement.dir = textDirection(locale);
    }
  }, [state, locale, domain.id, slug, availableLocales]);

  const parsed = useMemo(() => {
    if (state.status !== "ready") return null;
    const blocks = parseMarkdown(state.guide.content);
    // The page header already shows the title; drop a leading H1 that repeats it.
    const first = blocks[0];
    const titled: Block[] =
      first &&
      first.type === "heading" &&
      first.level === 1 &&
      inlineText(first.children).trim() === state.guide.title.trim()
        ? blocks.slice(1)
        : blocks;
    // The header shows "Updated …"; a leading line that only repeats that date is not shown twice.
    const body = withoutRepeatedUpdatedLine(titled, state.guide.updatedAt);
    const evidenceLinks = (
      state.guide.content.match(/\]\(#guide-evidence-[^)]+\)/g) ?? []
    ).length;
    const sections = guideSections(body);
    return {
      body,
      sections,
      sectionIds: new Map(sections.map((section) => [section.block, section.id])),
      evidenceLinks,
      evidence: new Map(state.guide.evidence.map((item) => [item.key, item])),
      sources: new Map(
        state.guide.sources.map((source) => [source.key, source]),
      ),
    };
  }, [state]);

  const sectionTitle = locale === "zh-CN" ? presentation.sectionTitle?.(slug) : undefined;
  const tone = (target: string) => presentation.tone?.(target) ?? "";
  const headerArt = presentation.headerArt?.(slug);
  const backLink = (
    <Link to={guideRoutePath(locale, domain.id)} className="button button-secondary">
      <ArrowLeft size={16} aria-hidden="true" />
      {ui.domain[domain.id]}
    </Link>
  );

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <main
      id="main"
      className={
        presentation.pageClassName
          ? `${presentation.pageClassName} guide-page`
          : "guide-page"
      }
    >
      <nav className="breadcrumb" aria-label={ui.home}>
        <ol>
          <li>
            <Link to={guideHomePath(locale)}>{ui.home}</Link>
          </li>
          <li>
            <Link to={guideRoutePath(locale, domain.id)}>{ui.domain[domain.id]}</Link>
          </li>
          {state.status === "ready" && (
            <li aria-current="page">{state.guide.title}</li>
          )}
        </ol>
      </nav>

      {state.status === "loading" && (
        <p className="guide-status page-loading" role="status">{ui.loading}</p>
      )}
      {state.status === "not-found" && (
        <div className="guide-status-card" role="status">
          <h1>{ui.notFound}</h1>
          <p>{ui.notFoundText}</p>
          {backLink}
        </div>
      )}
      {state.status === "error" && (
        <div className="guide-status-card" role="status">
          <h1>{ui.unavailable}</h1>
          <p>{ui.retry}</p>
          {backLink}
        </div>
      )}

      {state.status === "ready" && parsed && (
        <article className="guide-article" lang={GUIDE_LOCALE_LANG[locale]} dir={textDirection(locale)}>
          <header className={`guide-header ${tone(slug)}`.trim()}>
            <div className="guide-header-text">
              <p className="guide-kicker">
                {ui.domain[domain.id]}
                {sectionTitle && (
                  <>
                    <span aria-hidden="true"> · </span>
                    {sectionTitle}
                  </>
                )}
              </p>
              <h1>{state.guide.title}</h1>
              <p className="guide-summary">{state.guide.summary}</p>
              <ul className="guide-meta" aria-label={ui.updated}>
                <li>
                  <CalendarDays size={15} aria-hidden="true" />
                  {ui.updated}{" "}
                  <time dateTime={state.guide.updatedAt}>
                    {formatUkDateFor(state.guide.updatedAt, GUIDE_LOCALE_LANG[locale])}
                  </time>
                </li>
                {parsed.evidenceLinks > 0 && (
                  <li>
                    <FileCheck2 size={15} aria-hidden="true" />
                    {parsed.evidenceLinks} {ui.evidenceCount}
                  </li>
                )}
              </ul>
            </div>
            {headerArt && <div className="guide-header-art">{headerArt}</div>}
          </header>
          <p className="evidence-intro">
            <FileCheck2 size={18} aria-hidden="true" />
              <span>{ui.evidenceIntro}</span>
          </p>
          {parsed.sections.length >= MIN_TOC_SECTIONS && (
            <details className="guide-toc" open={wideScreen()}>
              <summary>
                <ListOrdered size={17} aria-hidden="true" />
                <span>{ui.onThisPage}</span>
                <span className="guide-toc-count">{parsed.sections.length}</span>
              </summary>
              <nav aria-label={ui.onThisPage}>
                <ol>
                  {parsed.sections.map((section) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`}>{section.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>
          )}
          <div className="guide-body">
            <GuideMarkdown
              sectionIds={parsed.sectionIds}
              domain={domain}
              locale={locale}
              references={references}
              blocks={parsed.body}
              evidence={parsed.evidence}
              sources={parsed.sources}
              open={open}
              onToggle={toggle}
            />
          </div>
          <GuideDisclaimer domain={domain.id} locale={locale} content={state.guide.content} />
          {related.length > 0 && (
            <aside className="related-guides" aria-labelledby="related-title">
              <h2 id="related-title">{ui.related}</h2>
              <ul>
                {related.map(({ guide, domain: target }) => (
                  <li
                    key={guide.slug}
                    className={tone(guide.slug) || undefined}
                  >
                    <Link
                      to={guideRoutePath(locale, target, guide.slug)}
                      title={guide.title}
                    >
                      <span>{shortGuideTitle(guide.title)}</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <p className="guide-back">
            <Link to={guideRoutePath(locale, domain.id)}>
              <ArrowLeft size={16} aria-hidden="true" />
              {ui.domain[domain.id]}
            </Link>
          </p>
        </article>
      )}
    </main>
  );
}
