import { parseInstant } from "../travel/freshness.ts";
import { isWeatherCity } from "./cities.ts";
import type { WeatherCity } from "./cities.ts";

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
    value.attribution === MET_OFFICE_ATTRIBUTION
  );
}

export async function getWeather(city: WeatherCity, signal?: AbortSignal): Promise<WeatherResponse> {
  const response = await fetch(`/api/weather/current?city=${encodeURIComponent(city)}`, { signal });
  if (!response.ok) throw new Error("Weather unavailable");
  const data: unknown = await response.json();
  if (!isWeatherResponse(data) || data.city !== city) throw new Error("Invalid weather response");
  return {
    ...data,
    temperatureC: data.temperatureC ?? null,
    feelsLikeC: data.feelsLikeC ?? null,
    weatherCode: data.weatherCode ?? null,
    precipitationProbability: data.precipitationProbability ?? null,
  };
}

/** A forecast step is shown only while it is for (about) the current hour. */
export const WEATHER_STEP_TOLERANCE_MS = 90 * 60_000;

export function isCurrentStep(forecastTime: string, now: number): boolean {
  const time = parseInstant(forecastTime);
  return time !== null && Math.abs(now - time) <= WEATHER_STEP_TOLERANCE_MS;
}
