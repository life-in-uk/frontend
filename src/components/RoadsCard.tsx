import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CarFront, LocateFixed, RefreshCw, Search } from "lucide-react";
import { Button } from "./Button";
import { Freshness, OfficialSource } from "./InformationCard";
import { getRoads, RoadsUnavailableError } from "../roads/api";
import type { RoadsResponse } from "../roads/api";
import {
  describeDisruption,
} from "../roads/presentation";
import {
  MAX_PLACE_QUERY_LENGTH,
  normalisePlaceQuery,
  PlaceQueryInvalidError,
  PlacesUnavailableError,
  searchPlaces,
} from "../places/api";
import type { Place } from "../places/api";
import { StaleNotice } from "./travel/StaleNotice";
import { formatDistanceIn, formatUkDateTime } from "../travel/format";
import { GUIDE_LOCALE_LANG, type GuideLocale } from "../guides/locales";
import { TRAVEL_UI } from "../travel/i18n";
import { assessFreshness, ROADS_MAX_AGE_MS } from "../travel/freshness";
import { useNow } from "../travel/useNow";
import "./RoadsCard.css";

/**
 * Required by the National Highways Transport Data Feeds licence, para 20(a)
 * (https://developer.data.nationalhighways.co.uk/terms, read 2026-11-10).
 */
export const NATIONAL_HIGHWAYS_ATTRIBUTION =
  "Powered by National Highways’ Transport Data Feeds";

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
export function RoadsCard({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const t = TRAVEL_UI[locale].roads;
  const common = TRAVEL_UI[locale].common;
  const lang = GUIDE_LOCALE_LANG[locale];
  const distance = (meters: number) => formatDistanceIn(meters, t);
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
  const now = useNow();

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
  const freshness =
    phase.status === "ready"
      ? assessFreshness(phase.data.snapshotAt, ROADS_MAX_AGE_MS, now)
      : null;
  // Only a fresh snapshot may show disruptions, counts or "none nearby".
  const facts =
    phase.status === "ready" && freshness?.state === "fresh"
      ? phase.data
      : null;

  return (
    <section
      className="information-section roads-section"
      aria-labelledby="roads-heading"
    >
      <article className="information-card roads-card" aria-busy={busy}>
        <header className="roads-header">
          <span className="category">
            <CarFront size={18} aria-hidden="true" />
            {common.category}
          </span>
          <h2 id="roads-heading">{t.title}</h2>
          <p className="roads-coverage">
            <span lang="en">National Highways</span> · {t.coverage}
          </p>
        </header>
        <div className="roads-chooser">
          <form className="roads-search" role="search" onSubmit={submitSearch}>
            <label htmlFor={inputId} className="roads-search-label">
              {t.searchLabel}
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
                {t.search}
              </Button>
            </div>
          </form>
          <button
            type="button"
            className="roads-link roads-locate"
            onClick={() => locate(false)}
          >
            <LocateFixed size={16} aria-hidden="true" />
            {t.locate}
          </button>
          <div className="roads-places" aria-live="polite">
            {placeSearch.status === "blank" && (
              <p role="status">{t.blank}</p>
            )}
            {placeSearch.status === "searching" && (
              <p role="status">{t.searching}</p>
            )}
            {placeSearch.status === "empty" && (
              <p role="status">{t.empty}</p>
            )}
            {placeSearch.status === "invalid" && (
<p role="status">{t.invalid}</p>
            )}
            {placeSearch.status === "unavailable" && (
<p role="status">{t.placesUnavailable}</p>
            )}
            {placeSearch.status === "failed" && (
              <p role="status">{t.placesFailed}</p>
            )}
            {placeSearch.status === "results" && (
              <>
                <p role="status">{t.results(placeSearch.places.length)}</p>
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
                        <span lang="en">{place.label}</span>
                        <span className="roads-candidate-type">
                          {t.placeTypes[place.type]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="roads-attribution" lang="en">
                  {placeSearch.attribution}
                </p>
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
                  {t.showingBefore}{" "}
                  <strong className="roads-active-label" lang="en">
                    {active.label}
                  </strong>{" "}
                  {t.showingAfter}
                </>
              ) : (
                <>
                  {t.showingBefore}
                  {lang.startsWith("zh") ? "" : " "}
                  <strong className="roads-active-label">{t.yourLocation}</strong>
                  {t.showingAfter}
                </>
              )}
            </p>
          )}
          {phase.status === "idle" && (
            <>
              <p>
                {t.idleBefore} <span lang="en">National Highways</span>
                {t.idleAfter === "." ? "" : " "}
                {t.idleAfter}
              </p>
              <p className="roads-note">{t.privacy}</p>
            </>
          )}
          {phase.status === "unsupported" && (
<p role="status">{t.unsupported}</p>
          )}
          {phase.status === "locating" && (
            <p role="status">{t.locating}</p>
          )}
          {phase.status === "denied" && (
            <>
<p role="status">{t.denied}</p>
              <div className="roads-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => locate(true)}
                >
                  {t.tryAgain}
                </Button>
              </div>
            </>
          )}
          {phase.status === "locationFailed" && (
            <>
              <p role="status">{t.locationFailed}</p>
              <div className="roads-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => locate(true)}
                >
                  {t.tryAgain}
                </Button>
              </div>
            </>
          )}
          {phase.status === "loading" && (
            <p role="status">{t.loading}</p>
          )}
          {(phase.status === "unavailable" || phase.status === "failed") && (
            <>
              <p role="status">
                {phase.status === "unavailable" ? t.unavailable : t.failed}
              </p>
              <p>{common.seeOfficial(t.fallback)}</p>
              <div className="roads-actions">
                <Button type="button" variant="secondary" onClick={recheck}>
                  {t.tryAgain}
                </Button>
              </div>
            </>
          )}
          {freshness && freshness.state !== "fresh" && (
            <StaleNotice
              freshness={freshness}
              subject={t.subject}
              limitMinutes={ROADS_MAX_AGE_MS / 60_000}
              fallback={t.fallback}
              locale={locale}
            />
          )}
          {phase.status === "ready" && (
            <>
              {facts && (
                <p role="status" className="roads-summary">
                  {facts.disruptions.length === 0
                    ? t.none
                    : t.found(facts.disruptions.length, distance(facts.relevanceRadiusMeters))}
                </p>
              )}
              {facts && facts.disruptions.length > 0 && (
                <ol className="roads-list">
                  {facts.disruptions.map((disruption, index) => {
                    const view = describeDisruption(
                      disruption,
                      facts.snapshotAt,
                    );
                    return (
                      <li
                        className="roads-item"
                        key={`${disruption.situationId}/${disruption.recordId}/${index}`}
                      >
                        <div className="roads-item-head">
                          <h3>
                            {view.roads.length > 0 ? (
                              <span lang="en">{view.roads.join(", ")}</span>
                            ) : (
                              t.roadUnknown
                            )}
                            {view.directions.length > 0 && (
                              <span className="roads-direction" lang="en">
                                {view.directions.join(", ")}
                              </span>
                            )}
                          </h3>
                          <span className="roads-distance">
                            <span className="sr-only">{t.distanceSr}</span>
                            {distance(disruption.distanceMeters)}
                          </span>
                        </div>
                        {view.locations.map((text) => (
                          <p className="roads-location" key={text} lang="en">
                            {text}
                          </p>
                        ))}
                        {view.comments.map((text) => (
                          <p className="roads-comment" key={text} lang="en">
                            {text}
                          </p>
                        ))}
                        <p className="roads-meta">
                          {view.kind && (
                            <span className="roads-kind" lang="en">
                              {view.kind}
                            </span>
                          )}
                          {view.endTime && (
                            <span>
                              {view.estimatedEndPassed ? t.endPassed : t.endTime}
                              <time dateTime={view.endTime}>
                                {formatUkDateTime(view.endTime, lang)}
                              </time>
                              {common.ukTime}
                            </span>
                          )}
                          {view.status && (
                            <span>
                              {t.providerStatus}
                              <span lang="en">{view.status}</span>
                            </span>
                          )}
                        </p>
                        {view.estimatedEndPassed && (
                          <p className="roads-estimate-passed">
                            {t.endNotice}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <div className="roads-actions">
                <Button type="button" variant="secondary" onClick={recheck}>
                  <RefreshCw size={16} aria-hidden="true" />
                  {t.refresh}
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="provenance">
          {facts && (
            <Freshness
              label={t.snapshot(formatUkDateTime(facts.snapshotAt, lang))}
              dateTime={facts.snapshotAt}
            />
          )}
          {facts && facts.disruptions.length > 0 && (
<p className="roads-note">{t.straightLine}</p>
          )}
          {active?.kind === "place" && (
            <p className="roads-note roads-attribution">
              {t.placeSearch}
              <span lang="en">{active.attribution}</span>
            </p>
          )}
          <OfficialSource
            source={{
              name: "National Highways",
              href: "https://nationalhighways.co.uk/travel-updates/",
            }}
            label={common.officialSource}
          />
          <p className="travel-attribution" lang="en">
            {NATIONAL_HIGHWAYS_ATTRIBUTION}
          </p>
        </div>
      </article>
    </section>
  );
}
