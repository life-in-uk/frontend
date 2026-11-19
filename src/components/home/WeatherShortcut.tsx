import { useEffect, useId, useState } from "react";
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
  Moon,
  Sun,
  Thermometer,
} from "lucide-react";
import type { GuideLocale } from "../../guides/locales";
import { LIVE_SERVICES_UI } from "../../home/liveServicesI18n";
import { useNow } from "../../travel/useNow";
import { readStoredCity, storeCity, WEATHER_CITIES, isWeatherCity } from "../../weather/cities";
import type { WeatherCity } from "../../weather/cities";
import { weatherCodeInfo } from "../../weather/codes";
import type { WeatherCodeInfo } from "../../weather/codes";
import { getWeather, isCurrentStep, MET_OFFICE_ATTRIBUTION } from "../../weather/api";
import type { WeatherResponse } from "../../weather/api";

type WeatherState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: WeatherResponse };

/**
 * One read of /api/weather/current for the chosen city, after the page has
 * rendered (the prerendered page never depends on it). The backend serves a
 * stored Met Office forecast: a page view never causes more than one
 * Met Office request per city per hour.
 */
function useWeather(city: WeatherCity): WeatherState {
  // The result is kept with the city it belongs to, so a new choice reads as "loading" until its answer arrives.
  const [result, setResult] = useState<{ city: WeatherCity; state: WeatherState } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    getWeather(city, controller.signal)
      .then((data) => { if (active) setResult({ city, state: { status: "ready", data } }); })
      .catch(() => { if (active) setResult({ city, state: { status: "unavailable" } }); })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [city]);
  return result?.city === city ? result.state : { status: "loading" };
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
 * current hour at one of the fixed cities, with the forecast time and the
 * attribution the Met Office licence requires. A step that is no longer for
 * the current hour is not shown.
 */
export function WeatherShortcut({ locale }: { locale: GuideLocale }) {
  const ui = LIVE_SERVICES_UI[locale].weather;
  const selectId = useId();
  // The page is rendered in the browser (createRoot), so the remembered city can be read up front.
  const [city, setCity] = useState<WeatherCity>(readStoredCity);
  const state = useWeather(city);
  const now = useNow();

  const choose = (value: string) => {
    if (!isWeatherCity(value)) return;
    storeCity(value);
    setCity(value);
  };

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
          <time dateTime={current.forecastTime}>{ui.forecastFor(ukHour(current.forecastTime))}</time>
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
            <label className="sr-only" htmlFor={selectId}>
              {ui.city}
            </label>
            <select
              id={selectId}
              className="weather-city"
              value={city}
              onChange={(event) => choose(event.target.value)}
            >
              {WEATHER_CITIES.map((id) => (
                <option key={id} value={id}>
                  {ui.cities[id]}
                </option>
              ))}
            </select>
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
