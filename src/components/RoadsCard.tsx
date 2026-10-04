import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CarFront, LocateFixed, RefreshCw, Search } from "lucide-react";
import { Button } from "./Button";
import { Freshness, OfficialSource } from "./InformationCard";
import { getRoads, RoadsUnavailableError } from "../roads/api";
import type { RoadsResponse } from "../roads/api";
import {
  describeDisruption,
  formatDistance,
  formatRoadsTime,
} from "../roads/presentation";
import {
  MAX_PLACE_QUERY_LENGTH,
  normalisePlaceQuery,
  PlaceQueryInvalidError,
  PlacesUnavailableError,
  searchPlaces,
} from "../places/api";
import type { Place, PlaceType } from "../places/api";
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
/** Place lookup state, kept separate from the Roads request state. */
type PlaceSearch =
  | { status: "idle" }
  | { status: "blank" }
  | { status: "searching" }
  | { status: "results"; places: Place[]; attribution: string }
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "unavailable" }
  | { status: "failed" };
/** The one location the Roads results currently describe. */
type ActiveLocation =
  { kind: "place"; label: string; attribution: string } | { kind: "device" };

// One position per explicit request; never watchPosition or background tracking.
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15_000,
  maximumAge: 60_000,
};
const REQUEST_DEADLINE_MS = 10_000;
const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  postcode: "Postcode",
  city: "City",
  town: "Town",
  village: "Village",
  hamlet: "Hamlet",
  suburb: "Suburb",
  settlement: "Settlement",
};

export function RoadsCard() {
  const [phase, setPhase] = useState<Phase>({ status: "idle" });
  const [placeSearch, setPlaceSearch] = useState<PlaceSearch>({
    status: "idle",
  });
  const [queryText, setQueryText] = useState("");
  const [active, setActive] = useState<ActiveLocation | null>(null);
  // Precise coordinates live only in this component's memory for the page session.
  const coordinates = useRef<Coordinates | null>(null);
  const request = useRef<AbortController | null>(null);
  const placeRequest = useRef<AbortController | null>(null);
  // Each lookup gets a generation; late results from superseded ones are ignored.
  const generation = useRef(0);
  const placeGeneration = useRef(0);
  const mounted = useRef(true);
  const content = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const inputId = useId();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
      placeRequest.current?.abort();
    };
  }, []);

  // When the pressed control disappears, keep keyboard focus in the card.
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

  function cancelPlaceSearch() {
    placeGeneration.current++;
    placeRequest.current?.abort();
  }

  // A searched place becomes the single active location.
  function choosePlace(place: Place, attribution: string, focus: boolean) {
    cancelPlaceSearch();
    moveFocus.current = focus;
    coordinates.current = {
      latitude: place.latitude,
      longitude: place.longitude,
    };
    setActive({ kind: "place", label: place.label, attribution });
    setPlaceSearch({ status: "idle" });
    query(coordinates.current);
  }

  // Device location replaces any searched place as the single active location.
  // Choosing a location also cancels any pending place search, so a late single
  // match can never replace the newer choice.
  function locate(focus: boolean) {
    cancelPlaceSearch();
    setPlaceSearch({ status: "idle" });
    moveFocus.current = focus;
    request.current?.abort();
    coordinates.current = null;
    setActive(null);
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
        setActive({ kind: "device" });
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

  // Reuses the active in-memory location; asks the browser only if there is none.
  function recheck() {
    moveFocus.current = true;
    if (coordinates.current) query(coordinates.current);
    else locate(true);
  }

  // Searches only on explicit submit (button or Enter), never while typing.
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = normalisePlaceQuery(queryText);
    cancelPlaceSearch();
    if (text === null) {
      setPlaceSearch({ status: "blank" });
      return;
    }
    if (text.length > MAX_PLACE_QUERY_LENGTH) {
      setPlaceSearch({ status: "invalid" });
      return;
    }
    const current = placeGeneration.current;
    const controller = new AbortController();
    placeRequest.current = controller;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    setPlaceSearch({ status: "searching" });
    searchPlaces(text, controller.signal)
      .then((data) => {
        if (!mounted.current || current !== placeGeneration.current) return;
        if (data.places.length === 0) setPlaceSearch({ status: "empty" });
        // A single match is used directly.
        else if (data.places.length === 1)
          choosePlace(data.places[0], data.attribution, false);
        else
          setPlaceSearch({
            status: "results",
            places: data.places,
            attribution: data.attribution,
          });
      })
      .catch((error: unknown) => {
        if (!mounted.current || current !== placeGeneration.current) return;
        setPlaceSearch({
          status:
            error instanceof PlaceQueryInvalidError
              ? "invalid"
              : error instanceof PlacesUnavailableError
                ? "unavailable"
                : "failed",
        });
      })
      .finally(() => window.clearTimeout(timeout));
  }

  const busy =
    phase.status === "locating" ||
    phase.status === "loading" ||
    placeSearch.status === "searching";

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
        <div className="roads-chooser">
          <form className="roads-search" role="search" onSubmit={submitSearch}>
            <label htmlFor={inputId} className="roads-search-label">
              Search postcode, town or place
            </label>
            <div className="roads-search-row">
              <input
                id={inputId}
                className="roads-search-input"
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                maxLength={MAX_PLACE_QUERY_LENGTH}
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
              />
              <Button type="submit" variant="secondary">
                <Search size={16} aria-hidden="true" />
                Search
              </Button>
            </div>
          </form>
          <button
            type="button"
            className="roads-link roads-locate"
            onClick={() => locate(false)}
          >
            <LocateFixed size={16} aria-hidden="true" />
            Use my location
          </button>
          <div className="roads-places" aria-live="polite">
            {placeSearch.status === "blank" && (
              <p role="status">Enter a postcode, town or place.</p>
            )}
            {placeSearch.status === "searching" && (
              <p role="status">Searching for places…</p>
            )}
            {placeSearch.status === "empty" && (
              <p role="status">No matching place found.</p>
            )}
            {placeSearch.status === "invalid" && (
              <p role="status">
                That search can’t be used. Try a postcode, town or place name.
              </p>
            )}
            {placeSearch.status === "unavailable" && (
              <p role="status">
                Place search is temporarily unavailable. You can still use your
                location.
              </p>
            )}
            {placeSearch.status === "failed" && (
              <p role="status">Place search couldn’t be completed.</p>
            )}
            {placeSearch.status === "results" && (
              <>
                <p role="status">
                  {placeSearch.places.length} places found. Choose one:
                </p>
                <ul className="roads-candidates">
                  {placeSearch.places.map((place, index) => (
                    <li key={`${place.id}/${index}`}>
                      <button
                        type="button"
                        className="roads-candidate"
                        onClick={() =>
                          choosePlace(place, placeSearch.attribution, true)
                        }
                      >
                        <span>{place.label}</span>
                        <span className="roads-candidate-type">
                          {PLACE_TYPE_LABELS[place.type]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="roads-attribution">{placeSearch.attribution}</p>
              </>
            )}
          </div>
        </div>
        <div
          className="roads-content"
          aria-live="polite"
          tabIndex={-1}
          ref={content}
        >
          {active && (
            <p className="roads-active">
              {active.kind === "place" ? (
                <>
                  Showing roads near{" "}
                  <strong className="roads-active-label">{active.label}</strong>
                </>
              ) : (
                <>
                  Showing roads near{" "}
                  <strong className="roads-active-label">
                    your current location
                  </strong>
                </>
              )}
            </p>
          )}
          {phase.status === "idle" && (
            <>
              <p>
                Search for a place or use your location to see nearby National
                Highways disruptions.
              </p>
              <p className="roads-note">
                Searches and locations are used only for this lookup and are not
                saved.
              </p>
            </>
          )}
          {phase.status === "unsupported" && (
            <p role="status">
              This browser can’t share your location. You can search for a place
              instead.
            </p>
          )}
          {phase.status === "locating" && (
            <p role="status">Finding your location…</p>
          )}
          {phase.status === "denied" && (
            <>
              <p role="status">
                Location access wasn’t allowed. Search for a place instead, or
                allow location for this site in your browser and try again.
              </p>
              <div className="roads-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => locate(true)}
                >
                  Try again
                </Button>
              </div>
            </>
          )}
          {phase.status === "locationFailed" && (
            <>
              <p role="status">Your location couldn’t be found.</p>
              <div className="roads-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => locate(true)}
                >
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
              Distances are straight-line from the chosen location, not driving
              distance.
            </p>
          )}
          {active?.kind === "place" && (
            <p className="roads-note roads-attribution">
              Place search: {active.attribution}
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
