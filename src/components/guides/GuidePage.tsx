import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, FileCheck2 } from "lucide-react";
import { getGuide, getGuides, GuideNotFoundError } from "../../guides/api";
import type { GuideDetail, GuideMetadata } from "../../guides/api";
import { inlineText, parseMarkdown } from "../../guides/markdown";
import type { Block } from "../../guides/markdown";
import type { GuideDomain } from "../../guides/domains";
import {
  belongsToDomain,
  guidePath,
  relatedGuidesFor,
} from "../../guides/domains";
import { formatUkDate, shortGuideTitle } from "../../guides/format";
import { Link } from "../Link";
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
  presentation = {},
}: {
  domain: GuideDomain;
  slug: string;
  presentation?: GuidePresentation;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [related, setRelated] = useState<GuideMetadata[]>([]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    getGuide(slug, controller.signal)
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
    getGuides(controller.signal)
      .then((guides) => {
        if (active) setRelated(relatedGuidesFor(domain, slug, guides));
      })
      .catch(() => {});
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [domain, slug]);

  useEffect(() => {
    if (state.status === "ready")
      document.title = `${state.guide.title} · Life in UK`;
    else if (state.status === "not-found")
      document.title = "没有找到这篇指南 · Life in UK";
  }, [state]);

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

  const sectionTitle = presentation.sectionTitle?.(slug);
  const tone = (target: string) => presentation.tone?.(target) ?? "";
  const headerArt = presentation.headerArt?.(slug);
  const backLink = (
    <Link to={domain.basePath} className="button button-secondary">
      <ArrowLeft size={16} aria-hidden="true" />
      {domain.backLabel}
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
      <nav className="breadcrumb" aria-label="当前位置">
        <ol>
          <li>
            <Link to="/">首页</Link>
          </li>
          <li>
            <Link to={domain.basePath}>{domain.label}</Link>
          </li>
          {state.status === "ready" && (
            <li aria-current="page">{state.guide.title}</li>
          )}
        </ol>
      </nav>

      {state.status === "loading" && (
        <p className="guide-status" role="status">
          正在加载指南…
        </p>
      )}
      {state.status === "not-found" && (
        <div className="guide-status-card" role="status">
          <h1>没有找到这篇指南</h1>
          <p>链接可能有误，或者这篇指南暂时不在了。</p>
          {backLink}
        </div>
      )}
      {state.status === "error" && (
        <div className="guide-status-card" role="status">
          <h1>指南暂时无法加载</h1>
          <p>请稍后再试。</p>
          {backLink}
        </div>
      )}

      {state.status === "ready" && parsed && (
        <article className="guide-article" lang="zh-CN">
          <header className={`guide-header ${tone(slug)}`.trim()}>
            <div className="guide-header-text">
              <p className="guide-kicker">
                {domain.label}
                {sectionTitle && (
                  <>
                    <span aria-hidden="true"> · </span>
                    {sectionTitle}
                  </>
                )}
              </p>
              <h1>{state.guide.title}</h1>
              <p className="guide-summary">{state.guide.summary}</p>
              <ul className="guide-meta" aria-label="指南信息">
                <li>
                  <CalendarDays size={15} aria-hidden="true" />
                  更新于{" "}
                  <time dateTime={state.guide.updatedAt}>
                    {formatUkDate(state.guide.updatedAt)}
                  </time>
                </li>
                {parsed.evidenceLinks > 0 && (
                  <li>
                    <FileCheck2 size={15} aria-hidden="true" />
                    {parsed.evidenceLinks} 处标注了官方依据
                  </li>
                )}
              </ul>
            </div>
            {headerArt && <div className="guide-header-art">{headerArt}</div>}
          </header>
          <p className="evidence-intro">
            <FileCheck2 size={18} aria-hidden="true" />
            <span>
              文中标着<strong>“查看官方依据”</strong>
              的地方，可以点开看这句话依据的是哪条英国官方资料。
            </span>
          </p>
          <div className="guide-body">
            <GuideMarkdown
              domain={domain}
              blocks={parsed.body}
              evidence={parsed.evidence}
              sources={parsed.sources}
              open={open}
              onToggle={toggle}
            />
          </div>
          {related.length > 0 && (
            <aside className="related-guides" aria-labelledby="related-title">
              <h2 id="related-title">相关指南</h2>
              <ul>
                {related.map((guide) => (
                  <li
                    key={guide.slug}
                    className={tone(guide.slug) || undefined}
                  >
                    <Link
                      to={guidePath(domain, guide.slug)}
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
            <Link to={domain.basePath}>
              <ArrowLeft size={16} aria-hidden="true" />
              {domain.backLabel}
            </Link>
          </p>
        </article>
      )}
    </main>
  );
}
