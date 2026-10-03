import { useEffect, useState } from "react";
import { TrainFront } from "lucide-react";
import { Freshness, OfficialSource } from "./InformationCard";
import {
  getUnderground,
  formatUndergroundObservation,
} from "../underground/api";
import type { UndergroundResponse } from "../underground/api";
import "./UndergroundCard.css";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: UndergroundResponse };

export function UndergroundCard() {
  const [state, setState] = useState<State>({ status: "loading" });
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
        <span className="category">
          <TrainFront size={18} aria-hidden="true" />
          Travel
        </span>
        <h2 id="underground-heading">London Underground</h2>
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
                {state.data.lines.map((line, lineIndex) => (
                  <li
                    className="underground-line"
                    key={`${line.lineId}-${lineIndex}`}
                  >
                    <h3>{line.lineName}</h3>
                    <ul className="underground-statuses">
                      {line.statuses.map((status, statusIndex) => (
                        <li key={`${lineIndex}-${statusIndex}`}>
                          <p className="underground-description">
                            {status.description}
                          </p>
                          {status.reason !== null &&
                            status.reason.trim().length > 0 && (
                              <p className="underground-reason">
                                {status.reason}
                              </p>
                            )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
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
