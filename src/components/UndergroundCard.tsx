import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, TrainFront } from "lucide-react";
import { Freshness, OfficialSource } from "./InformationCard";
import {
  getUnderground,
  formatUndergroundObservation,
} from "../underground/api";
import type { UndergroundResponse } from "../underground/api";
import {
  PRESENTATION_LABELS,
  classifyStatus,
  hasMeaningfulReason,
  lineColour,
  summariseLines,
} from "../underground/presentation";
import "./UndergroundCard.css";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: UndergroundResponse };

function summaryText(data: UndergroundResponse): string {
  const { affected, unclassified } = summariseLines(data.lines);
  const total = data.lines.length;
  const parts = [
    affected === 0
      ? `No disruption reported for ${total} ${total === 1 ? "line" : "lines"}`
      : `${affected} of ${total} ${total === 1 ? "line" : "lines"} reporting disruption`,
  ];
  if (unclassified > 0) parts.push(`${unclassified} not classified`);
  return parts.join(" · ");
}

export function UndergroundCard() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const idPrefix = useId();
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

  return (
    <section
      className="information-section underground-section"
      aria-labelledby="underground-heading"
      lang="en"
    >
      <article
        className="information-card underground-card"
        aria-busy={state.status === "loading"}
      >
        <header className="underground-header">
          <span className="category">
            <TrainFront size={18} aria-hidden="true" />
            Travel
          </span>
          <h2 id="underground-heading">London Underground</h2>
          {state.status === "ready" && state.data.lines.length > 0 && (
            <p className="underground-summary">{summaryText(state.data)}</p>
          )}
        </header>
        <div className="underground-content" aria-live="polite">
          {state.status === "loading" && (
            <p role="status">Loading Underground status…</p>
          )}
          {state.status === "unavailable" && (
            <p role="status">Underground status is temporarily unavailable.</p>
          )}
          {state.status === "ready" &&
            (state.data.lines.length === 0 ? (
              <p role="status">
                No Underground line status information was included in this
                observation.
              </p>
            ) : (
              <ul className="underground-lines">
                {state.data.lines.map((line, lineIndex, lines) => {
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
                        <h3>{line.lineName}</h3>
                        <ul className="underground-statuses">
                          {line.statuses.map((status, statusIndex) => {
                            const key = `${lineIndex}-${statusIndex}`;
                            const presentation = classifyStatus(status);
                            const reasonId = `${idPrefix}-reason-${key}`;
                            const isOpen = expanded.has(key);
                            const description = (
                              <span className="underground-description">
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
                                      {`, details for ${line.lineName}`}
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
          {state.status === "ready" && (
            <Freshness
              label={`Source observed: ${formatUndergroundObservation(state.data.observedAt)} UK time`}
              dateTime={state.data.observedAt}
            />
          )}
          <OfficialSource
            source={{
              name: "Transport for London",
              href: "https://tfl.gov.uk/tube-dlr-overground/status/",
            }}
          />
        </div>
      </article>
    </section>
  );
}
