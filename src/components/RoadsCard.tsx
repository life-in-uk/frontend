import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CarFront, LocateFixed, RefreshCw, Search } from "lucide-react";
import { Button } from "./Button";
import { Freshness, OfficialSource } from "./InformationCard";
import { getRoads, RoadsUnavailableError } from "../roads/api";
import type { RoadsResponse } from "../roads/api";
import {
  describeDisruption,
  ESTIMATED_END_PASSED_NOTICE,
} from "../roads/presentation";
import {
  MAX_PLACE_QUERY_LENGTH,
  normalisePlaceQuery,
  PlaceQueryInvalidError,
  PlacesUnavailableError,
  searchPlaces,
} from "../places/api";
import type { Place, PlaceType } from "../places/api";
import { StaleNotice } from "./travel/StaleNotice";
import { formatDistanceZh, formatUkDateTimeZh } from "../travel/format";
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
const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  postcode: "邮编",
  city: "城市",
  town: "城镇",
  village: "村庄",
  hamlet: "小村",
  suburb: "城区",
  settlement: "居民点",
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
            出行
          </span>
          <h2 id="roads-heading">附近道路</h2>
          <p className="roads-coverage">
            <span lang="en">National Highways</span> · 附近当前道路异常
          </p>
        </header>
        <div className="roads-chooser">
          <form className="roads-search" role="search" onSubmit={submitSearch}>
            <label htmlFor={inputId} className="roads-search-label">
              搜索邮编、城镇或地点
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
                搜索
              </Button>
            </div>
          </form>
          <button
            type="button"
            className="roads-link roads-locate"
            onClick={() => locate(false)}
          >
            <LocateFixed size={16} aria-hidden="true" />
            使用我的位置
          </button>
          <div className="roads-places" aria-live="polite">
            {placeSearch.status === "blank" && (
              <p role="status">请输入邮编、城镇或地点。</p>
            )}
            {placeSearch.status === "searching" && (
              <p role="status">正在搜索地点…</p>
            )}
            {placeSearch.status === "empty" && (
              <p role="status">没有找到匹配的地点。</p>
            )}
            {placeSearch.status === "invalid" && (
              <p role="status">
                无法使用这个搜索词，请尝试邮编、城镇或地点名称。
              </p>
            )}
            {placeSearch.status === "unavailable" && (
              <p role="status">
                地点搜索暂时不可用，你仍可以使用当前位置。
              </p>
            )}
            {placeSearch.status === "failed" && (
              <p role="status">地点搜索未能完成。</p>
            )}
            {placeSearch.status === "results" && (
              <>
                <p role="status">
                  找到 {placeSearch.places.length} 个地点，请选择：
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
                        <span lang="en">{place.label}</span>
                        <span className="roads-candidate-type">
                          {PLACE_TYPE_LABELS[place.type]}
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
                  显示{" "}
                  <strong className="roads-active-label" lang="en">
                    {active.label}
                  </strong>{" "}
                  附近的道路
                </>
              ) : (
                <>
                  显示<strong className="roads-active-label">你的当前位置</strong>
                  附近的道路
                </>
              )}
            </p>
          )}
          {phase.status === "idle" && (
            <>
              <p>
                搜索地点或使用当前位置，查看附近由{" "}
                <span lang="en">National Highways</span> 报告的道路异常。
              </p>
              <p className="roads-note">
                搜索词和位置只用于本次查询，不会被保存。
              </p>
            </>
          )}
          {phase.status === "unsupported" && (
            <p role="status">
              此浏览器无法提供你的位置，你可以改为搜索地点。
            </p>
          )}
          {phase.status === "locating" && (
            <p role="status">正在获取你的位置…</p>
          )}
          {phase.status === "denied" && (
            <>
              <p role="status">
                未获得位置权限。你可以改为搜索地点，或在浏览器中允许本网站使用位置后重试。
              </p>
              <div className="roads-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => locate(true)}
                >
                  重试
                </Button>
              </div>
            </>
          )}
          {phase.status === "locationFailed" && (
            <>
              <p role="status">无法获取你的位置。</p>
              <div className="roads-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => locate(true)}
                >
                  重试
                </Button>
              </div>
            </>
          )}
          {phase.status === "loading" && (
            <p role="status">正在查询附近的道路异常…</p>
          )}
          {(phase.status === "unavailable" || phase.status === "failed") && (
            <>
              <p role="status">
                {phase.status === "unavailable"
                  ? "道路信息暂时无法获取。"
                  : "道路信息未能加载。"}
              </p>
              <div className="roads-actions">
                <Button type="button" variant="secondary" onClick={recheck}>
                  重试
                </Button>
              </div>
            </>
          )}
          {freshness && freshness.state !== "fresh" && (
            <StaleNotice
              freshness={freshness}
              subject="附近道路异常信息"
              limitMinutes={ROADS_MAX_AGE_MS / 60_000}
              fallback="National Highways 官方路况"
            />
          )}
          {phase.status === "ready" && (
            <>
              {facts && (
                <p role="status" className="roads-summary">
                  {facts.disruptions.length === 0
                    ? "附近没有找到 National Highways 报告的当前道路异常。"
                    : `${formatDistanceZh(facts.relevanceRadiusMeters)} 范围内有 ${facts.disruptions.length} 条道路异常，按距离由近到远排列。`}
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
                              "未注明道路"
                            )}
                            {view.directions.length > 0 && (
                              <span className="roads-direction" lang="en">
                                {view.directions.join(", ")}
                              </span>
                            )}
                          </h3>
                          <span className="roads-distance">
                            <span className="sr-only">直线距离 </span>
                            {formatDistanceZh(disruption.distanceMeters)}
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
                              {view.estimatedEndPassed
                                ? "原预计结束时间："
                                : "来源结束时间："}
                              <time dateTime={view.endTime}>
                                {formatUkDateTimeZh(view.endTime)}
                              </time>
                              （英国时间）
                            </span>
                          )}
                          {view.status && (
                            <span>
                              来源状态：<span lang="en">{view.status}</span>
                            </span>
                          )}
                        </p>
                        {view.estimatedEndPassed && (
                          <p className="roads-estimate-passed">
                            {ESTIMATED_END_PASSED_NOTICE}
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
                  重新查询
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="provenance">
          {facts && (
            <Freshness
              label={`来源快照时间 ${formatUkDateTimeZh(facts.snapshotAt)}（英国时间）`}
              dateTime={facts.snapshotAt}
            />
          )}
          {facts && facts.disruptions.length > 0 && (
            <p className="roads-note">
              距离为与所选位置之间的直线距离，不是驾车距离。
            </p>
          )}
          {active?.kind === "place" && (
            <p className="roads-note roads-attribution">
              地点搜索：<span lang="en">{active.attribution}</span>
            </p>
          )}
          <OfficialSource
            source={{
              name: "National Highways",
              href: "https://nationalhighways.co.uk/travel-updates/",
            }}
          />
          <p className="travel-attribution" lang="en">
            {NATIONAL_HIGHWAYS_ATTRIBUTION}
          </p>
        </div>
      </article>
    </section>
  );
}
