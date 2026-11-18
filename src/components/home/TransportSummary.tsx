import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BusFront,
  Route,
  TrainFront,
  TrainFrontTunnel,
} from "lucide-react";
import type { GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import { Link } from "../Link";
import { railToolEnabled, TRAVEL_TOOLS } from "../../travel/tools";
import type { TravelToolId } from "../../travel/tools";
import { TRAVEL_UI } from "../../travel/i18n";
import { travelPath } from "../../travel/routes";
import { assessFreshness, isFresh, UNDERGROUND_MAX_AGE_MS } from "../../travel/freshness";
import { useNow } from "../../travel/useNow";
import { classifyStatus, lineColour, summariseLines } from "../../underground/presentation";
import type { UndergroundResponse } from "../../underground/api";

// Homepage order: the status that needs no input first.
const HOME_ORDER: readonly TravelToolId[] = ["underground", "roads", "rail"];
const AFFECTED_SHOWN = 3;

const ICONS: Record<TravelToolId, ReactNode> = {
  underground: <TrainFrontTunnel size={24} aria-hidden="true" />,
  rail: <TrainFront size={24} aria-hidden="true" />,
  roads: <Route size={24} aria-hidden="true" />,
};

type UndergroundState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: UndergroundResponse };

/**
 * One read of the stored Underground snapshot (no-store; the backend never
 * calls TfL for it). The API module is loaded on demand, so the entry script
 * stays free of travel API code.
 */
function useUndergroundSnapshot(): UndergroundState {
  const [state, setState] = useState<UndergroundState>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    import("../../underground/api")
      .then(({ getUnderground }) => getUnderground(controller.signal))
      .then((data) => { if (active) setState({ status: "ready", data }); })
      .catch(() => { if (active) setState({ status: "unavailable" }); })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return state;
}

/** UK time of an observation: "14:05", or "3 Nov, 14:05" when not on today's UK date. */
function ukTime(observedAt: string, now: number): string {
  const day = (time: number) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short" }).format(time);
  const when = Date.parse(observedAt);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    ...(day(when) === day(now) ? {} : { day: "numeric", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(when);
}

/** Inserts an element where a localized template places its time argument. */
function withTime(template: (time: string) => string, time: ReactNode): ReactNode {
  const marker = "\u0000";
  const [before, after = ""] = template(marker).split(marker);
  return (
    <>
      {before}
      {time}
      {after}
    </>
  );
}

/** Underground status for the homepage. Current-status claims appear only for a fresh snapshot. */
function UndergroundStatus({ locale }: { locale: GuideLocale }) {
  const ui = TRAVEL_UI[locale];
  const state = useUndergroundSnapshot();
  const now = useNow();
  if (state.status === "loading")
    return <span className="transport-status" data-state="loading">{ui.home.checking}</span>;
  const freshness =
    state.status === "ready" ? assessFreshness(state.data.observedAt, UNDERGROUND_MAX_AGE_MS, now) : null;
  if (state.status !== "ready" || !freshness || freshness.state === "invalid" || state.data.lines.length === 0)
    return <span className="transport-status" data-state="unavailable">{ui.home.unavailable}</span>;
  const time = <time dateTime={state.data.observedAt}>{ukTime(state.data.observedAt, now)}</time>;
  if (!isFresh(freshness))
    return (
      <span className="transport-status" data-state="stale">
        {withTime(ui.home.stale, time)}
      </span>
    );
  const { lines } = state.data;
  const { affected, unclassified } = summariseLines(lines);
  const affectedLines = lines.flatMap((line) => {
    const status = line.statuses.find((entry) => {
      const kind = classifyStatus(entry);
      return kind === "disruption" || kind === "severe";
    });
    return status ? [{ line, status }] : [];
  });
  return (
    <>
      <span className="transport-status" data-state="fresh">
        <span className="transport-summary">{ui.underground.summary(affected, lines.length, unclassified)}</span>
        <span className="transport-updated">{withTime(ui.home.updated, time)}</span>
      </span>
      {affectedLines.length > 0 && (
        <span className="transport-lines">
          {affectedLines.slice(0, AFFECTED_SHOWN).map(({ line, status }) => (
            <span className="transport-line" key={line.lineId} lang="en" dir="ltr">
              <span
                className="transport-line-mark"
                style={{ background: lineColour(line.lineId) ?? "var(--home-muted)" }}
                aria-hidden="true"
              />
              {line.lineName}: {status.description}
            </span>
          ))}
          {affectedLines.length > AFFECTED_SHOWN && (
            <span className="transport-line transport-line-more" dir="ltr">
              +{affectedLines.length - AFFECTED_SHOWN}
            </span>
          )}
        </span>
      )}
    </>
  );
}

/**
 * Homepage Travel panel, directly under the search: Underground line status
 * with its update time (nothing is presented as current once the stored
 * snapshot is older than the freshness limit), and entries for Roads and
 * Rail. Each entry opens that tool on /travel.
 */
export function TransportSummary({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const ui = TRAVEL_UI[locale];
  return (
    <section className="home-panel transport-panel" aria-labelledby="transport-title">
      <div className="home-panel-head">
        <BusFront size={24} aria-hidden="true" />
        <h2 id="transport-title">{SITE_UI[locale].transport.title}</h2>
        <Link to={travelPath(locale)} className="transport-all">
          {ui.home.all}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <ul className="transport-list">
        {HOME_ORDER.map((id) => {
          const mode = TRAVEL_TOOLS.find((item) => item.id === id)!;
          const name = ui.tools[id].name;
          const unavailable = id === "rail" && !railToolEnabled();
          return (
            <li key={id}>
              <Link to={travelPath(locale, id)} className="transport-item" data-tool={id}>
                <span className="transport-icon">{ICONS[id]}</span>
                <span className="transport-text">
                  <span className="transport-name">
                    {name}
                    {/* Skip the operator when the name already contains it. */}
                    {!name.includes(mode.operator) && (
                      <>
                        {" "}
                        <span lang="en">{mode.operator}</span>
                      </>
                    )}
                  </span>
                  {id === "underground" ? (
                    <UndergroundStatus locale={locale} />
                  ) : (
                    <span className="transport-status" data-state={unavailable ? "unavailable" : "tool"}>
                      {unavailable ? ui.common.notReleased : ui.tools[id].description}
                    </span>
                  )}
                  <span className="sr-only">{ui.home.open(name)}</span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="home-panel-meta">{ui.home.meta}</p>
    </section>
  );
}
