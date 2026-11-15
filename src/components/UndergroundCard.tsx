import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, TrainFront } from "lucide-react";
import { Freshness, OfficialSource } from "./InformationCard";
import { getUnderground } from "../underground/api";
import type { UndergroundResponse } from "../underground/api";
import {
  classifyStatus,
  hasMeaningfulReason,
  lineColour,
  summariseLines,
} from "../underground/presentation";
import { StaleNotice } from "./travel/StaleNotice";
import { formatUkDateTime } from "../travel/format";
import { GUIDE_LOCALE_LANG, type GuideLocale } from "../guides/locales";
import { TRAVEL_UI } from "../travel/i18n";
import { assessFreshness, UNDERGROUND_MAX_AGE_MS } from "../travel/freshness";
import { useNow } from "../travel/useNow";
import "./UndergroundCard.css";

/** Required by the TfL Transport Data Service licence. */
export const TFL_ATTRIBUTION = "Powered by TfL Open Data";

/**
 * Also required by the TfL Transport Data Service licence ("Requirements"),
 * reproduced verbatim as read on 2026-11-11 from
 * https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service,
 * including the licence's own years and brackets.
 */
export const TFL_OS_GEOMNI_ATTRIBUTION =
  "Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights [2019]";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: UndergroundResponse };

function summaryText(data: UndergroundResponse, locale: GuideLocale): string {
  const { affected, unclassified } = summariseLines(data.lines);
  return TRAVEL_UI[locale].underground.summary(affected, data.lines.length, unclassified);
}

/**
 * While the Underground tab is active in the open dialog, the stored snapshot
 * is re-read every 2 minutes (the backend's default refresh interval).
 */
export const UNDERGROUND_REREAD_MS = 2 * 60_000;
const REQUEST_DEADLINE_MS = 10_000;

interface UndergroundCardProps {
  /** False while another dialog tab is shown: no re-reads are scheduled. */
  active?: boolean;
  locale?: GuideLocale;
}

export function UndergroundCard({ active = true, locale = "zh-CN" }: UndergroundCardProps) {
  const t = TRAVEL_UI[locale].underground;
  const common = TRAVEL_UI[locale].common;
  const lang = GUIDE_LOCALE_LANG[locale];
  const [state, setState] = useState<State>({ status: "loading" });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const idPrefix = useId();
  const now = useNow();
  // Request bookkeeping lives in refs so switching tabs never refetches early.
  const mountToken = useRef<object | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const lastStarted = useRef<number | null>(null);
  const hasData = useRef(false);
  const shownObservedAt = useRef<number | null>(null);

  // Unmounting (closing the dialog) aborts any request and forgets timing,
  // and results that belong to an earlier mount are ignored.
  useEffect(() => {
    mountToken.current = {};
    return () => {
      mountToken.current = null;
      inFlight.current?.abort();
      inFlight.current = null;
      lastStarted.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    // One request at a time: a tick that finds one in flight is skipped.
    function load() {
      if (inFlight.current) return;
      const mount = mountToken.current;
      const controller = new AbortController();
      inFlight.current = controller;
      lastStarted.current = Date.now();
      const deadline = window.setTimeout(
        () => controller.abort(),
        REQUEST_DEADLINE_MS,
      );
      getUnderground(controller.signal)
        .then((data) => {
          if (mount === null || mountToken.current !== mount) return;
          const observed = Date.parse(data.observedAt);
          // An older snapshot never replaces a newer one already shown.
          if (
            shownObservedAt.current !== null &&
            Number.isFinite(observed) &&
            observed < shownObservedAt.current
          )
            return;
          shownObservedAt.current = Number.isFinite(observed)
            ? observed
            : shownObservedAt.current;
          hasData.current = true;
          setState({ status: "ready", data });
        })
        .catch(() => {
          // A failed re-read keeps the last snapshot; the freshness rule
          // withdraws it once it is too old. Only a first load is unavailable.
          if (
            mount !== null &&
            mountToken.current === mount &&
            !hasData.current
          )
            setState({ status: "unavailable" });
        })
        .finally(() => {
          window.clearTimeout(deadline);
          if (inFlight.current === controller) inFlight.current = null;
        });
    }
    let timer = 0;
    function tick() {
      load();
      timer = window.setTimeout(tick, UNDERGROUND_REREAD_MS);
    }
    // Opening reads at once; returning to the tab reads at once only if a
    // re-read is already due, otherwise when it falls due.
    const due =
      lastStarted.current === null
        ? 0
        : Math.max(0, lastStarted.current + UNDERGROUND_REREAD_MS - Date.now());
    if (due === 0) tick();
    else timer = window.setTimeout(tick, due);
    return () => window.clearTimeout(timer);
  }, [active]);

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  const freshness =
    state.status === "ready"
      ? assessFreshness(state.data.observedAt, UNDERGROUND_MAX_AGE_MS, now)
      : null;
  // Only a fresh snapshot may show line statuses, counts or summaries.
  const facts =
    state.status === "ready" && freshness?.state === "fresh"
      ? state.data
      : null;

  return (
    <section
      className="information-section underground-section"
      aria-labelledby="underground-heading"
    >
      <article
        className="information-card underground-card"
        aria-busy={state.status === "loading"}
      >
        <header className="underground-header">
          <span className="category">
            <TrainFront size={18} aria-hidden="true" />
            {common.category}
          </span>
          <h2 id="underground-heading">
            {t.title === "London Underground" ? (
              <span lang="en">London Underground</span>
            ) : (
              <>
                {t.title} <span lang="en">London Underground</span>
              </>
            )}
          </h2>
          {facts && facts.lines.length > 0 && (
            <p className="underground-summary">{summaryText(facts, locale)}</p>
          )}
        </header>
        <div className="underground-content" aria-live="polite">
          {state.status === "loading" && (
            <p role="status">{t.loading}</p>
          )}
          {state.status === "unavailable" && (
            <div role="status">
              <p>{t.unavailable}</p>
              <p>{common.seeOfficial(t.fallback)}</p>
            </div>
          )}
          {freshness && freshness.state !== "fresh" && (
            <StaleNotice
              freshness={freshness}
              subject={t.subject}
              limitMinutes={UNDERGROUND_MAX_AGE_MS / 60_000}
              fallback={t.fallback}
              locale={locale}
            />
          )}
          {facts &&
            (facts.lines.length === 0 ? (
              <p role="status">{t.empty}</p>
            ) : (
              <ul className="underground-lines">
                {facts.lines.map((line, lineIndex, lines) => {
                  const colour = lineColour(line.lineId);
                  // Desktop shows two column stacks: the second starts halfway through.
                  const columnStart = Math.ceil(lines.length / 2);
                  const column =
                    lineIndex === columnStart
                      ? " underground-column-start"
                      : lineIndex === columnStart - 1
                        ? " underground-column-end"
                        : "";
                  return (
                    <li
                      className={`underground-line${column}`}
                      key={`${line.lineId}-${lineIndex}`}
                      data-line-id={line.lineId}
                    >
                      <div className="underground-row">
                        <span
                          className={`underground-marker${colour ? "" : " underground-marker-neutral"}`}
                          style={
                            colour
                              ? ({ "--line-colour": colour } as CSSProperties)
                              : undefined
                          }
                          aria-hidden="true"
                        />
                        <h3 lang="en">{line.lineName}</h3>
                        <ul className="underground-statuses">
                          {line.statuses.map((status, statusIndex) => {
                            const key = `${lineIndex}-${statusIndex}`;
                            const presentation = classifyStatus(status);
                            const reasonId = `${idPrefix}-reason-${key}`;
                            const isOpen = expanded.has(key);
                            const description = (
                              <span
                                className="underground-description"
                                lang="en"
                              >
                                {status.description}
                              </span>
                            );
                            return (
                              <li
                                key={key}
                                className="underground-status"
                                data-presentation={presentation}
                              >
                                <span
                                  className={`underground-led underground-led-${presentation}`}
                                  role="img"
                                  aria-label={t.labels[presentation]}
                                  title={t.labels[presentation]}
                                />
                                {hasMeaningfulReason(status.reason) ? (
                                  <button
                                    type="button"
                                    className="underground-toggle"
                                    aria-expanded={isOpen}
                                    aria-controls={reasonId}
                                    onClick={() => toggle(key)}
                                  >
                                    {description}
                                    <span className="sr-only">
                                      {t.details(line.lineName)}
                                    </span>
                                    <ChevronDown
                                      className="underground-chevron"
                                      size={16}
                                      aria-hidden="true"
                                    />
                                  </button>
                                ) : (
                                  description
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      {line.statuses.map((status, statusIndex) => {
                        const key = `${lineIndex}-${statusIndex}`;
                        return (
                          hasMeaningfulReason(status.reason) && (
                            <p
                              key={key}
                              id={`${idPrefix}-reason-${key}`}
                              className="underground-reason"
                              lang="en"
                              hidden={!expanded.has(key)}
                            >
                              {status.reason}
                            </p>
                          )
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
            ))}
        </div>
        <div className="provenance">
          {facts && (
            <Freshness
              label={t.observed(formatUkDateTime(facts.observedAt, lang))}
              dateTime={facts.observedAt}
            />
          )}
          <OfficialSource
            source={{
              name: "Transport for London",
              href: "https://tfl.gov.uk/tube-dlr-overground/status/",
            }}
            label={common.officialSource}
          />
          <p className="travel-attribution" lang="en">
            {TFL_ATTRIBUTION}
          </p>
          <p className="travel-attribution-os" lang="en">
            {TFL_OS_GEOMNI_ATTRIBUTION}
          </p>
        </div>
      </article>
    </section>
  );
}
