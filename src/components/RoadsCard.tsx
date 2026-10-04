import { useEffect, useRef, useState } from "react";
import { CarFront, LocateFixed, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { Freshness, OfficialSource } from "./InformationCard";
import { getRoads, RoadsUnavailableError } from "../roads/api";
import type { RoadsResponse } from "../roads/api";
import {
  describeDisruption,
  formatDistance,
  formatRoadsTime,
} from "../roads/presentation";
import "./RoadsCard.css";

type Coordinates = { latitude: number; longitude: number };
type Phase =
  | { status: "idle" }
  | { status: "unsupported" }
  | { status: "locating" }
  | { status: "denied" }
  | { status: "locationFailed" }
  | { status: "loading" }
  | { status: "ready"; data: RoadsResponse }
  | { status: "unavailable" }
  | { status: "failed" };

// One position per explicit request; never watchPosition or background tracking.
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15_000,
  maximumAge: 60_000,
};
const REQUEST_DEADLINE_MS = 10_000;

export function RoadsCard() {
  const [phase, setPhase] = useState<Phase>({ status: "idle" });
  // Precise coordinates live only in this component's memory for the page session.
  const coordinates = useRef<Coordinates | null>(null);
  const request = useRef<AbortController | null>(null);
  // Each lookup gets a generation; late geolocation/fetch results from older ones are ignored.
  const generation = useRef(0);
  const mounted = useRef(true);
  const content = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);

  // Actions replace the control that was pressed, so keep keyboard focus in the card.
  useEffect(() => {
    if (!moveFocus.current || phase.status === "locating") return;
    if (phase.status === "loading") return;
    moveFocus.current = false;
    content.current?.focus();
  }, [phase]);

  function query(location: Coordinates) {
    request.current?.abort();
    const current = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    setPhase({ status: "loading" });
    getRoads(location.latitude, location.longitude, controller.signal)
      .then((data) => {
        if (mounted.current && current === generation.current)
          setPhase({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!mounted.current || current !== generation.current) return;
        setPhase({
          status:
            error instanceof RoadsUnavailableError ? "unavailable" : "failed",
        });
      })
      .finally(() => window.clearTimeout(timeout));
  }

  function locate() {
    moveFocus.current = true;
    request.current?.abort();
    const current = ++generation.current;
    if (!("geolocation" in navigator) || !navigator.geolocation) {
      setPhase({ status: "unsupported" });
      return;
    }
    setPhase({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current || current !== generation.current) return;
        coordinates.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        query(coordinates.current);
      },
      (error) => {
        if (!mounted.current || current !== generation.current) return;
        setPhase({
          status:
            error.code === error.PERMISSION_DENIED
              ? "denied"
              : "locationFailed",
        });
      },
      POSITION_OPTIONS,
    );
  }

  // Reuses the in-memory location; asks the browser again only if there is none.
  function recheck() {
    moveFocus.current = true;
    if (coordinates.current) query(coordinates.current);
    else locate();
  }

  const busy = phase.status === "locating" || phase.status === "loading";

  return (
    <section
      className="information-section roads-section"
      aria-labelledby="roads-heading"
      lang="en"
    >
      <article className="information-card roads-card" aria-busy={busy}>
        <header className="roads-header">
          <span className="category">
            <CarFront size={18} aria-hidden="true" />
            Travel
          </span>
          <h2 id="roads-heading">Roads near you</h2>
          <p className="roads-coverage">
            National Highways · nearby current disruptions
          </p>
        </header>
        <div
          className="roads-content"
          aria-live="polite"
          tabIndex={-1}
          ref={content}
        >
          {phase.status === "idle" && (
            <>
              <p>
                Road disruptions depend on where you are. Share your location
                once to see nearby National Highways disruptions.
              </p>
              <div className="roads-actions">
                <Button type="button" onClick={locate}>
                  <LocateFixed size={16} aria-hidden="true" />
                  Use my location
                </Button>
              </div>
              <p className="roads-note">
                Your location is used only for this lookup and is not saved.
              </p>
            </>
          )}
          {phase.status === "unsupported" && (
            <p role="status">
              This browser can’t share your location, so nearby road disruptions
              can’t be shown.
            </p>
          )}
          {phase.status === "locating" && (
            <p role="status">Finding your location…</p>
          )}
          {phase.status === "denied" && (
            <>
              <p role="status">
                Location access wasn’t allowed. To see nearby disruptions, allow
                location for this site in your browser, then try again.
              </p>
              <div className="roads-actions">
                <Button type="button" variant="secondary" onClick={locate}>
                  Try again
                </Button>
              </div>
            </>
          )}
          {phase.status === "locationFailed" && (
            <>
              <p role="status">Your location couldn’t be found.</p>
              <div className="roads-actions">
                <Button type="button" variant="secondary" onClick={locate}>
                  Try again
                </Button>
              </div>
            </>
          )}
          {phase.status === "loading" && (
            <p role="status">Checking nearby road disruptions…</p>
          )}
          {(phase.status === "unavailable" || phase.status === "failed") && (
            <>
              <p role="status">
                {phase.status === "unavailable"
                  ? "Road information is temporarily unavailable."
                  : "Road information couldn’t be loaded."}
              </p>
              <div className="roads-actions">
                <Button type="button" variant="secondary" onClick={recheck}>
                  Try again
                </Button>
              </div>
            </>
          )}
          {phase.status === "ready" && (
            <>
              <p role="status" className="roads-summary">
                {phase.data.disruptions.length === 0
                  ? "No current National Highways disruptions found nearby."
                  : `${phase.data.disruptions.length} ${phase.data.disruptions.length === 1 ? "disruption" : "disruptions"} within ${formatDistance(phase.data.relevanceRadiusMeters)}, nearest first.`}
              </p>
              {phase.data.disruptions.length > 0 && (
                <ol className="roads-list">
                  {phase.data.disruptions.map((disruption, index) => {
                    const view = describeDisruption(disruption);
                    return (
                      <li
                        className="roads-item"
                        key={`${disruption.situationId}/${disruption.recordId}/${index}`}
                      >
                        <div className="roads-item-head">
                          <h3>
                            {view.roads.length > 0
                              ? view.roads.join(", ")
                              : "Road not specified"}
                            {view.directions.length > 0 && (
                              <span className="roads-direction">
                                {view.directions.join(", ")}
                              </span>
                            )}
                          </h3>
                          <span className="roads-distance">
                            {view.distance}
                            <span className="sr-only"> away</span>
                          </span>
                        </div>
                        {view.locations.map((text) => (
                          <p className="roads-location" key={text}>
                            {text}
                          </p>
                        ))}
                        {view.comments.map((text) => (
                          <p className="roads-comment" key={text}>
                            {text}
                          </p>
                        ))}
                        <p className="roads-meta">
                          {view.kind && (
                            <span className="roads-kind">{view.kind}</span>
                          )}
                          {view.endTime && (
                            <span>
                              Provider end time:{" "}
                              <time dateTime={view.endTime}>
                                {formatRoadsTime(view.endTime)}
                              </time>{" "}
                              UK time
                            </span>
                          )}
                          {view.status && (
                            <span>Provider status: {view.status}</span>
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="roads-actions">
                <Button type="button" variant="secondary" onClick={recheck}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
                </Button>
                <button type="button" className="roads-link" onClick={locate}>
                  Use my location again
                </button>
              </div>
            </>
          )}
        </div>
        <div className="provenance">
          {phase.status === "ready" && (
            <Freshness
              label={`Source snapshot: ${formatRoadsTime(phase.data.snapshotAt)} UK time`}
              dateTime={phase.data.snapshotAt}
            />
          )}
          {phase.status === "ready" && phase.data.disruptions.length > 0 && (
            <p className="roads-note">
              Distances are straight-line from your location, not driving
              distance.
            </p>
          )}
          <OfficialSource
            source={{
              name: "National Highways",
              href: "https://nationalhighways.co.uk/",
            }}
          />
        </div>
      </article>
    </section>
  );
}
