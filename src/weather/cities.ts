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
/** How the backend chose the city: the visitor's choice, nearest to their approximate location, or the default. */
export type CitySource = "requested" | "detected" | "default";

export function isWeatherCity(value: unknown): value is WeatherCity {
  return typeof value === "string" && (WEATHER_CITIES as readonly string[]).includes(value);
}

const STORAGE_KEY = "lifeinuk.weather.city";

/**
 * The visitor's own city choice, or null: then the backend picks the nearest supported city to CloudFront's
 * approximate location (London if none). Storage can be missing or throw (privacy modes).
 */
export function readStoredCity(): WeatherCity | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isWeatherCity(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeCity(city: WeatherCity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, city);
  } catch {
    // Not remembered; the choice still applies to this page.
  }
}

/** Back to automatic: forget the visitor's choice. */
export function clearStoredCity(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

/** Case-, accent- and space-insensitive form for searching city names. */
const folded = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();

/** Cities whose name in any of {@code names} (e.g. the page language and English) contains the query. */
export function searchCities(query: string, ...names: Record<WeatherCity, string>[]): WeatherCity[] {
  const q = folded(query.trim());
  if (!q) return [...WEATHER_CITIES];
  return WEATHER_CITIES.filter((city) => folded(city).includes(q) || names.some((set) => folded(set[city]).includes(q)));
}
