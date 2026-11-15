import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { ArrowUpRight, BusFront, ExternalLink, TrainFront } from "lucide-react";
import { GUIDE_LOCALES, type GuideLocale } from "../../guides/locales";
import { applyGuideSeo, clearGuideSeo } from "../../guides/seo";
import { railToolEnabled, TRAVEL_TOOLS } from "../../travel/tools";
import type { TravelToolId } from "../../travel/tools";
import { OFFICIAL_STATUS, TRAVEL_UI } from "../../travel/i18n";
import { travelPath } from "../../travel/routes";
import "./Travel.css";

// Each tool is loaded only when its tab is first shown.
const UndergroundCard = lazy(() =>
  import("../UndergroundCard").then((m) => ({ default: m.UndergroundCard })),
);
const RoadsCard = lazy(() =>
  import("../RoadsCard").then((m) => ({ default: m.RoadsCard })),
);
// Production builds never contain the Rail tool (see railToolEnabled).
const RailCard = import.meta.env.DEV
  ? lazy(() => import("../RailCard").then((m) => ({ default: m.RailCard })))
  : null;

function toolFromHash(): TravelToolId {
  const hash = window.location.hash.replace(/^#/, "");
  return TRAVEL_TOOLS.some((tool) => tool.id === hash) ? (hash as TravelToolId) : "underground";
}

/**
 * Travel section at /travel (and /{locale}/travel): the first-party
 * Underground, Roads and Rail tools as WAI-ARIA tabs, plus the operators'
 * official status pages as a labelled fallback. The selected tool lives in
 * the URL hash (#underground, #roads, #rail) so Home links can open one.
 */
export function TravelPage({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const ui = TRAVEL_UI[locale];
  const [tool, setTool] = useState<TravelToolId>(toolFromHash);
  const [visited, setVisited] = useState<ReadonlySet<TravelToolId>>(() => new Set([toolFromHash()]));
  const tabs = useRef<Partial<Record<TravelToolId, HTMLButtonElement | null>>>({});
  const focusTab = useRef(false);
  const id = useId();

  // Tabs already shown stay mounted (keeping a Roads search) while on the page.
  if (!visited.has(tool)) setVisited(new Set(visited).add(tool));

  useEffect(() => {
    const onHash = () => setTool(toolFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (focusTab.current) tabs.current[tool]?.focus();
    focusTab.current = false;
  }, [tool]);

  useEffect(() => {
    applyGuideSeo({
      locale,
      canonical: new URL(travelPath(locale), window.location.origin).href,
      title: `${ui.page.title} · Life in UK`,
      description: ui.page.description,
      alternates: GUIDE_LOCALES.map((alt) => ({
        locale: alt,
        href: new URL(travelPath(alt), window.location.origin).href,
      })),
    });
    return () => clearGuideSeo(locale);
  }, [locale, ui.page.title, ui.page.description]);

  function select(next: TravelToolId, focus = false) {
    focusTab.current = focus;
    setTool(next);
    // Keep the choice in the URL without adding history entries.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${next}`);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TRAVEL_TOOLS.findIndex((t) => t.id === tool);
    const last = TRAVEL_TOOLS.length - 1;
    const forward = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backward = forward === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const next =
      event.key === forward
        ? index === last ? 0 : index + 1
        : event.key === backward
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    select(TRAVEL_TOOLS[next].id, true);
  }

  return (
    <main id="main" className="travel-page">
      <section className="travel-hero" aria-labelledby="travel-title">
        <span className="eyebrow travel-eyebrow">
          <BusFront size={15} aria-hidden="true" />
          {ui.common.category}
        </span>
        <h1 id="travel-title">{ui.page.title}</h1>
        <p className="travel-lead">{ui.page.lead}</p>
        <div className="travel-notice" role="note" aria-labelledby={`${id}-notice`}>
          <h2 id={`${id}-notice`}>{ui.page.noticeTitle}</h2>
          <p>{ui.page.notice}</p>
        </div>
      </section>

      <section className="travel-tools" aria-label={ui.page.tabs}>
        <div className="travel-tabs" role="tablist" aria-label={ui.page.tabs}>
          {TRAVEL_TOOLS.map((item) => (
            <button
              key={item.id}
              ref={(element) => {
                tabs.current[item.id] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${item.id}`}
              aria-selected={tool === item.id}
              aria-controls={`${id}-panel-${item.id}`}
              tabIndex={tool === item.id ? 0 : -1}
              className="travel-tab"
              data-tool={item.id}
              onClick={() => select(item.id)}
              onKeyDown={onTabKey}
            >
              {ui.tools[item.id].name}
              {item.id === "rail" && !railToolEnabled() && (
                <span className="travel-tab-badge">{ui.common.notReleased}</span>
              )}
            </button>
          ))}
        </div>
        {TRAVEL_TOOLS.map((item) =>
          visited.has(item.id) ? (
            <div
              key={item.id}
              role="tabpanel"
              id={`${id}-panel-${item.id}`}
              aria-labelledby={`${id}-tab-${item.id}`}
              hidden={tool !== item.id}
              className="travel-panel"
              data-tool={item.id}
            >
              <Suspense
                fallback={
                  <p className="travel-loading" role="status">
                    {ui.page.loadingTool(ui.tools[item.id].name)}
                  </p>
                }
              >
                {toolContent(item.id, tool === item.id, locale)}
              </Suspense>
            </div>
          ) : null,
        )}
      </section>

      <section className="travel-official" aria-labelledby={`${id}-official`}>
        <h2 id={`${id}-official`}>{ui.page.officialTitle}</h2>
        <p>{ui.page.officialLead}</p>
        <ul>
          {TRAVEL_TOOLS.map((item) => (
            <li key={item.id}>
              <a
                href={OFFICIAL_STATUS[item.id].href}
                target="_blank"
                rel="noopener noreferrer"
                data-official={item.id}
              >
                <span className="travel-official-name">
                  <span lang="en">{OFFICIAL_STATUS[item.id].provider}</span>
                  <span className="travel-official-tool">{ui.tools[item.id].name}</span>
                </span>
                <span className="travel-official-external">
                  {ui.page.external}
                  <ExternalLink size={14} aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function toolContent(tool: TravelToolId, active: boolean, locale: GuideLocale): ReactNode {
  if (tool === "underground") return <UndergroundCard active={active} locale={locale} />;
  if (tool === "roads") return <RoadsCard locale={locale} />;
  if (RailCard && railToolEnabled()) return <RailCard locale={locale} />;
  return <RailUnavailable locale={locale} />;
}

/** Released builds: Rail is clearly not available, with the official fallback. */
function RailUnavailable({ locale }: { locale: GuideLocale }) {
  const ui = TRAVEL_UI[locale];
  return (
    <section className="information-card travel-rail-unavailable" aria-labelledby="rail-unavailable-title">
      <span className="category">
        <TrainFront size={18} aria-hidden="true" />
        {ui.common.category}
      </span>
      <h2 id="rail-unavailable-title">
        {ui.rail.unreleasedTitle} <span className="travel-tab-badge">{ui.common.notReleased}</span>
      </h2>
      <p>{ui.rail.unreleased}</p>
      <p>
        {ui.rail.unreleasedBefore}
        <a href={OFFICIAL_STATUS.rail.href}>
          <span lang="en">National Rail</span> {ui.rail.unreleasedLink}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        {ui.rail.unreleasedAfter}
      </p>
    </section>
  );
}
