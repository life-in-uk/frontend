import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, TrainFront } from "lucide-react";
import { Freshness, OfficialSource } from "./InformationCard";
import { getUnderground } from "../underground/api";
import type { UndergroundResponse } from "../underground/api";
import {
  PRESENTATION_LABELS,
  classifyStatus,
  hasMeaningfulReason,
  lineColour,
  summariseLines,
} from "../underground/presentation";
import { StaleNotice } from "./travel/StaleNotice";
import { formatUkDateTimeZh } from "../travel/format";
import { assessFreshness, UNDERGROUND_MAX_AGE_MS } from "../travel/freshness";
import { useNow } from "../travel/useNow";
import "./UndergroundCard.css";

/** Required by the TfL Transport Data Service licence. */
export const TFL_ATTRIBUTION = "Powered by TfL Open Data";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: UndergroundResponse };

function summaryText(data: UndergroundResponse): string {
  const { affected, unclassified } = summariseLines(data.lines);
  const total = data.lines.length;
  const parts = [
    affected === 0
      ? `${total} 条线路均未报告异常`
      : `${total} 条线路中有 ${affected} 条报告异常`,
  ];
  if (unclassified > 0) parts.push(`${unclassified} 条未能分类`);
  return parts.join(" · ");
}

export function UndergroundCard() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const idPrefix = useId();
  const now = useNow();
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    getUnderground(controller.signal)
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

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
            出行
          </span>
          <h2 id="underground-heading">
            伦敦地铁 <span lang="en">London Underground</span>
          </h2>
          {facts && facts.lines.length > 0 && (
            <p className="underground-summary">{summaryText(facts)}</p>
          )}
        </header>
        <div className="underground-content" aria-live="polite">
          {state.status === "loading" && (
            <p role="status">正在加载伦敦地铁运行状态…</p>
          )}
          {state.status === "unavailable" && (
            <p role="status">伦敦地铁运行状态暂时无法获取。</p>
          )}
          {freshness && freshness.state !== "fresh" && (
            <StaleNotice
              freshness={freshness}
              subject="伦敦地铁线路运行状态"
              limitMinutes={UNDERGROUND_MAX_AGE_MS / 60_000}
              fallback="TfL 官方运行状态"
            />
          )}
          {facts &&
            (facts.lines.length === 0 ? (
              <p role="status">这次来源观测中没有包含任何地铁线路的状态信息。</p>
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
                                  aria-label={PRESENTATION_LABELS[presentation]}
                                  title={PRESENTATION_LABELS[presentation]}
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
                                      {`，查看 ${line.lineName} 的详情`}
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
              label={`来源观测于 ${formatUkDateTimeZh(facts.observedAt)}（英国时间）`}
              dateTime={facts.observedAt}
            />
          )}
          <OfficialSource
            source={{
              name: "Transport for London",
              href: "https://tfl.gov.uk/tube-dlr-overground/status/",
            }}
          />
          <p className="travel-attribution" lang="en">
            {TFL_ATTRIBUTION}
          </p>
        </div>
      </article>
    </section>
  );
}
