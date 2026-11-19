import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Moon,
  Sun,
  Thermometer,
} from "lucide-react";
import type { GuideLocale } from "../../guides/locales";
import { LIVE_SERVICES_UI } from "../../home/liveServicesI18n";
import { useNow } from "../../travel/useNow";
import { weatherCodeInfo } from "../../weather/codes";
import type { WeatherCodeInfo } from "../../weather/codes";
import { getWeather, isCurrentStep, MET_OFFICE_ATTRIBUTION, nextWeatherReadAt } from "../../weather/api";
import type { WeatherResponse } from "../../weather/api";

type WeatherState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: WeatherResponse };

type WeatherResult = { state: WeatherState; readAt: number };

/**
 * Reads /api/weather/current after the page has rendered; the backend picks the
 * nearest supported city to the visitor's approximate location (London if none)
 * (the prerendered page never depends on it). A page left open reads again
 * only when the shown hour has ended, or 10 minutes after a failed read, and
 * only while the tab is visible: a hidden tab waits and reads when it is shown
 * again. No polling: at most one read per hour while things work. The backend
 * serves stored Met Office forecasts, so reads never add Met Office calls.
 */
function useWeather(): WeatherState {
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [reads, setReads] = useState(0);
  // True from asking for a re-read until its answer: a re-read is never started (and so the outstanding one
  // never aborted) while one is pending, whatever visibility changes happen meanwhile.
  const reading = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    reading.current = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    const done = (state: WeatherState) => {
      if (!active) return;
      reading.current = false;
      setResult({ state, readAt: Date.now() });
    };
    getWeather(null, controller.signal)
      .then((data) => done({ status: "ready", data }))
      .catch(() => done({ status: "unavailable" }))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [reads]);

  useEffect(() => {
    if (!result) return;
    const due = nextWeatherReadAt(result.state.status === "ready" ? result.state.data.forecastTime : null, result.readAt);
    let timer: number | undefined;
    const check = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible" || reading.current) return; // read when shown again / once
      const wait = due - Date.now();
      if (wait <= 0) {
        reading.current = true;
        setReads((count) => count + 1);
      } else timer = window.setTimeout(check, Math.min(wait, 2_147_483_647));
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [result]);

  return result?.state ?? { status: "loading" };
}

function conditionIcon(info: WeatherCodeInfo | null): ReactNode {
  const props = { size: 24, "aria-hidden": true } as const;
  switch (info?.condition) {
    case "clear":
    case "sunny":
      return info.night ? <Moon {...props} /> : <Sun {...props} />;
    case "partlyCloudy":
      return info.night ? <CloudMoon {...props} /> : <CloudSun {...props} />;
    case "mist":
    case "fog":
      return <CloudFog {...props} />;
    case "cloudy":
    case "overcast":
      return <Cloud {...props} />;
    case "traceRain":
    case "drizzle":
      return <CloudDrizzle {...props} />;
    case "lightShowers":
    case "lightRain":
    case "heavyShowers":
    case "heavyRain":
      return <CloudRain {...props} />;
    case "hailShowers":
    case "hail":
      return <CloudHail {...props} />;
    case "sleetShowers":
    case "sleet":
    case "lightSnowShowers":
    case "lightSnow":
    case "heavySnowShowers":
    case "heavySnow":
      return <CloudSnow {...props} />;
    case "thunderShowers":
    case "thunder":
      return <CloudLightning {...props} />;
    default:
      return <Thermometer {...props} />;
  }
}

const degrees = (value: number) => `${Math.round(value)}°C`;

/** Hour of a forecast step in UK time, e.g. "14:00". */
function ukHour(instant: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(Date.parse(instant));
}

/**
 * Weather tile of the Live Services row: the Met Office forecast for the
 * current hour at one of the fixed cities, labelled with the hour it is for
 * and when that forecast was issued (it is a forecast, not an observation),
 * and the attribution the Met Office licence requires. A step that is no
 * longer for the current hour is not shown.
 */
export function WeatherShortcut({ locale }: { locale: GuideLocale }) {
  const ui = LIVE_SERVICES_UI[locale].weather;
  const state = useWeather();
  const now = useNow();
  // Plain text, not a control: the backend chooses the city from the visitor's approximate network location.
  const city = state.status === "ready" ? state.data.city : null;

  const current = state.status === "ready" && isCurrentStep(state.data.forecastTime, now) ? state.data : null;
  const info = current ? weatherCodeInfo(current.weatherCode) : null;
  const condition = info ? ui.conditions[info.condition] : null;

  let status: ReactNode;
  if (state.status === "loading")
    status = <span className="transport-status" data-state="loading">{ui.checking}</span>;
  else if (!current || (current.temperatureC === null && condition === null))
    status = <span className="transport-status" data-state="unavailable">{ui.unavailable}</span>;
  else
    status = (
      <span className="transport-status" data-state="fresh">
        <span className="transport-summary weather-now">
          {current.temperatureC !== null && <span className="weather-temp" dir="ltr">{degrees(current.temperatureC)}</span>}
          {condition && <span className="weather-condition">{condition}</span>}
        </span>
        {(current.feelsLikeC !== null || current.precipitationProbability !== null) && (
          <span className="weather-details">
            {[
              current.feelsLikeC !== null ? ui.feelsLike(degrees(current.feelsLikeC)) : null,
              current.precipitationProbability !== null ? ui.rainChance(current.precipitationProbability) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
        <span className="transport-updated">
          <time dateTime={current.forecastTime}>
            {ui.forecastFor(ukHour(current.forecastTime), ukHour(current.modelRunAt))}
          </time>
        </span>
      </span>
    );

  return (
    <li>
      <div className="transport-item weather-item" data-tool="weather" aria-busy={state.status === "loading"}>
        <span className="transport-icon">{current ? conditionIcon(info) : <CloudSun size={24} aria-hidden="true" />}</span>
        <span className="transport-text">
          <span className="weather-head">
            <span className="transport-name">{ui.name}</span>
            {city && (
              <span className="weather-city">
                <MapPin size={14} aria-hidden="true" />
                <span className="weather-city-name" title={ui.cities[city]}>{ui.cities[city]}</span>
                <span className="weather-city-auto" title={ui.automatic}>
                  {ui.autoTag}
                </span>
              </span>
            )}
          </span>
          <span aria-live="polite">{status}</span>
          <span className="weather-attribution" lang="en" dir="ltr">
            {MET_OFFICE_ATTRIBUTION}
          </span>
        </span>
      </div>
    </li>
  );
}
