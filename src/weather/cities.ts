// The fixed homepage cities. Must match the backend's WeatherCity list: the
// backend reads only these, which keeps the Met Office quota bounded.
export const WEATHER_CITIES = [
  "london",
  "birmingham",
  "manchester",
  "leeds",
  "glasgow",
  "edinburgh",
  "cardiff",
  "belfast",
] as const;
export type WeatherCity = (typeof WEATHER_CITIES)[number];
export const DEFAULT_WEATHER_CITY: WeatherCity = "london";

export function isWeatherCity(value: unknown): value is WeatherCity {
  return typeof value === "string" && (WEATHER_CITIES as readonly string[]).includes(value);
}

const STORAGE_KEY = "lifeinuk.weather.city";

/** The visitor's remembered city; storage can be missing or throw (privacy modes). */
export function readStoredCity(): WeatherCity {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isWeatherCity(value) ? value : DEFAULT_WEATHER_CITY;
  } catch {
    return DEFAULT_WEATHER_CITY;
  }
}

export function storeCity(city: WeatherCity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, city);
  } catch {
    // Not remembered; the choice still applies to this page.
  }
}
