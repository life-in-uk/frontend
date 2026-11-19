import { parseInstant } from "../travel/freshness.ts";
import { isWeatherCity } from "./cities.ts";
import type { CitySource, WeatherCity } from "./cities.ts";

/** Attribution the Met Office licence requires next to the data (clause 2.6.1). */
export const MET_OFFICE_ATTRIBUTION = "Data supplied by the Met Office";

export type WeatherResponse = {
  city: WeatherCity;
  /** UTC time of the hourly forecast step shown. */
  forecastTime: string;
  modelRunAt: string;
  fetchedAt: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  weatherCode: number | null;
  precipitationProbability: number | null;
  attribution: string;
  /** How the city was chosen (absent from older backends: treated as the visitor's choice). */
  citySource: CitySource;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const optionalNumber = (value: unknown, min: number, max: number) =>
  value === null || value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max);
const optionalInteger = (value: unknown, min: number, max: number) =>
  value === null || value === undefined || (optionalNumber(value, min, max) && Number.isInteger(value));

export function isWeatherResponse(value: unknown): value is WeatherResponse {
  return (
    isRecord(value) &&
    isWeatherCity(value.city) &&
    parseInstant(value.forecastTime) !== null &&
    parseInstant(value.modelRunAt) !== null &&
    parseInstant(value.fetchedAt) !== null &&
    optionalNumber(value.temperatureC, -80, 60) &&
    optionalNumber(value.feelsLikeC, -100, 70) &&
    optionalInteger(value.weatherCode, -1, 30) &&
    optionalInteger(value.precipitationProbability, 0, 100) &&
    value.attribution === MET_OFFICE_ATTRIBUTION &&
    (value.citySource === undefined || value.citySource === "requested" || value.citySource === "detected" || value.citySource === "default")
  );
}

/**
 * Weather for the visitor's chosen city, or with {@code city} null for the city the backend picks: the nearest
 * supported city to CloudFront's approximate location, or London. Either way one of the eight shared cities.
 */
export async function getWeather(city: WeatherCity | null, signal?: AbortSignal): Promise<WeatherResponse> {
  const query = city === null ? "" : `?city=${encodeURIComponent(city)}`;
  const response = await fetch(`/api/weather/current${query}`, { signal });
  if (!response.ok) throw new Error("Weather unavailable");
  const data: unknown = await response.json();
  if (!isWeatherResponse(data) || (city !== null && data.city !== city)) throw new Error("Invalid weather response");
  return {
    ...data,
    temperatureC: data.temperatureC ?? null,
    feelsLikeC: data.feelsLikeC ?? null,
    weatherCode: data.weatherCode ?? null,
    precipitationProbability: data.precipitationProbability ?? null,
    citySource: city !== null ? "requested" : (data.citySource ?? "default"),
  };
}

/** Each Met Office step covers one hour from its time; the backend answers the step for the current hour. */
export const WEATHER_STEP_MS = 60 * 60_000;
/** Allowance for a visitor's clock being a little off the server's. */
export const WEATHER_CLOCK_SKEW_MS = 5 * 60_000;
/** Read again this long after the shown hour ends (the backend has the next step by then). */
export const WEATHER_NEXT_HOUR_DELAY_MS = 60_000;
/** After a failed read, try again no sooner than this (the backend backs off for 10 minutes too). */
export const WEATHER_RETRY_MS = 10 * 60_000;
/** Never read more often than this, whatever the times say. */
export const WEATHER_MIN_GAP_MS = 60_000;

/** A forecast step is shown only during its own hour (with a small clock allowance). */
export function isCurrentStep(forecastTime: string, now: number): boolean {
  const time = parseInstant(forecastTime);
  return time !== null && now >= time - WEATHER_CLOCK_SKEW_MS && now < time + WEATHER_STEP_MS + WEATHER_CLOCK_SKEW_MS;
}

/**
 * When a long-open page should read the weather again: just after the shown hour ends, or
 * {@link WEATHER_RETRY_MS} after a failed read; never sooner than {@link WEATHER_MIN_GAP_MS} after the last read.
 * One read per city per hour at most, while the page is visible; the backend serves stored forecasts, so this
 * never adds Met Office calls.
 */
export function nextWeatherReadAt(forecastTime: string | null, readAt: number): number {
  const time = forecastTime === null ? null : parseInstant(forecastTime);
  const due = time === null ? readAt + WEATHER_RETRY_MS : time + WEATHER_STEP_MS + WEATHER_NEXT_HOUR_DELAY_MS;
  return Math.max(due, readAt + WEATHER_MIN_GAP_MS);
}
