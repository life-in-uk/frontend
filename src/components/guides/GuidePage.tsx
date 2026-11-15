import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, FileCheck2 } from "lucide-react";
import { getGuide, getGuides, getLocalizedGuide, getLocalizedGuides, GuideNotFoundError } from "../../guides/api";
import type { GuideDetail, GuideMetadata } from "../../guides/api";
import { GUIDE_LOCALES, GUIDE_LOCALE_LANG, GUIDE_UI, guideHomePath, guideRoutePath, localizedGuidePath, textDirection, type GuideLocale } from "../../guides/locales";
import { applyGuideSeo, clearGuideSeo, guideAlternates } from "../../guides/seo";
import { inlineText, parseMarkdown } from "../../guides/markdown";
import type { Block } from "../../guides/markdown";
import type { GuideDomain } from "../../guides/domains";
import {
  belongsToDomain,
  relatedGuidesFor,
} from "../../guides/domains";
import { formatUkDateFor, shortGuideTitle } from "../../guides/format";
import { Link } from "../Link";
import { GuideLanguageSelect } from "./GuideLanguageSelect";
import { GuideMarkdown } from "./GuideMarkdown";
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
  const [state, setState] = useState<State>({ status: "loading" });
  const [related, setRelated] = useState<GuideMetadata[]>([]);
  const [availableLocales, setAvailableLocales] = useState<GuideLocale[]>([locale]);
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
        setState(
          belongsToDomain(guide, domain)
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
        if (active) setRelated(relatedGuidesFor(domain, slug, guides));
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
        alternates: guideAlternates(window.location.origin, domain.id, slug, availableLocales) });
    } else if (state.status === "not-found" || state.status === "error") {
      applyGuideSeo({ locale, canonical: null,
        title: state.status === "not-found" ? "Guide not found · Life in UK" : "Guide unavailable · Life in UK",
        description: "", noIndex: true });
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
    const body: Block[] =
      first &&
      first.type === "heading" &&
      first.level === 1 &&
      inlineText(first.children).trim() === state.guide.title.trim()
        ? blocks.slice(1)
        : blocks;
    const evidenceLinks = (
      state.guide.content.match(/\]\(#guide-evidence-[^)]+\)/g) ?? []
    ).length;
    return {
      body,
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
      <div className="guide-toolbar">
        <GuideLanguageSelect locale={locale} domain={domain.id} slug={slug} available={availableLocales} />
      </div>

      {state.status === "loading" && (
        <p className="guide-status" role="status">{ui.loading}</p>
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
          <div className="guide-body">
            <GuideMarkdown
              domain={domain}
              locale={locale}
              blocks={parsed.body}
              evidence={parsed.evidence}
              sources={parsed.sources}
              open={open}
              onToggle={toggle}
            />
          </div>
          {related.length > 0 && (
            <aside className="related-guides" aria-labelledby="related-title">
              <h2 id="related-title">{ui.related}</h2>
              <ul>
                {related.map((guide) => (
                  <li
                    key={guide.slug}
                    className={tone(guide.slug) || undefined}
                  >
                    <Link
                      to={guideRoutePath(locale, domain.id, guide.slug)}
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
