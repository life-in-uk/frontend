import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, FileCheck2 } from "lucide-react";
import { getGuide, getGuides, GuideNotFoundError } from "../../guides/api";
import type { GuideDetail, GuideMetadata } from "../../guides/api";
import { inlineText, parseMarkdown } from "../../guides/markdown";
import type { Block } from "../../guides/markdown";
import {
  formatUkDate,
  groupForSlug,
  healthGuidePath,
  RELATED_GUIDES,
  shortGuideTitle,
} from "../../guides/catalog";
import { Link } from "../Link";
import { CategoryArt } from "./CategoryArt";
import { GuideMarkdown } from "./GuideMarkdown";
import "./Health.css";

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; guide: GuideDetail };

const REQUEST_DEADLINE_MS = 10_000;

export function GuidePage({ slug }: { slug: string }) {
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
        if (active) setState({ status: "ready", guide });
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
        if (!active) return;
        const wanted = RELATED_GUIDES[slug] ?? [];
        setRelated(
          wanted
            .map((target) => guides.find((guide) => guide.slug === target))
            .filter((guide): guide is GuideMetadata => guide !== undefined),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [slug]);

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

  const group = groupForSlug(slug);

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <main id="main" className="health-page guide-page">
      <nav className="breadcrumb" aria-label="当前位置">
        <ol>
          <li>
            <Link to="/">首页</Link>
          </li>
          <li>
            <Link to="/health">健康与 NHS</Link>
          </li>
          {state.status === "ready" && (
            <li aria-current="page">{state.guide.title}</li>
          )}
        </ol>
      </nav>

      {state.status === "loading" && (
        <p className="health-status" role="status">
          正在加载指南…
        </p>
      )}
      {state.status === "not-found" && (
        <div className="health-status-card" role="status">
          <h1>没有找到这篇指南</h1>
          <p>链接可能有误，或者这篇指南暂时不在了。</p>
          <Link to="/health" className="button button-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            回到健康与 NHS
          </Link>
        </div>
      )}
      {state.status === "error" && (
        <div className="health-status-card" role="status">
          <h1>指南暂时无法加载</h1>
          <p>请稍后再试。</p>
          <Link to="/health" className="button button-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            回到健康与 NHS
          </Link>
        </div>
      )}

      {state.status === "ready" && parsed && (
        <article className="guide-article" lang="zh-CN">
          <header className={`guide-header tone-${group?.tone ?? "neutral"}`}>
            <div className="guide-header-text">
              <p className="guide-kicker">
                健康与 NHS
                {group && (
                  <>
                    <span aria-hidden="true"> · </span>
                    {group.title}
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
            {group && (
              <div className="guide-header-art">
                <CategoryArt id={group.id} />
              </div>
            )}
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
                    className={`tone-${groupForSlug(guide.slug)?.tone ?? "neutral"}`}
                  >
                    <Link to={healthGuidePath(guide.slug)} title={guide.title}>
                      <span>{shortGuideTitle(guide.title)}</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <p className="guide-back">
            <Link to="/health">
              <ArrowLeft size={16} aria-hidden="true" />
              回到健康与 NHS
            </Link>
          </p>
        </article>
      )}
    </main>
  );
}
