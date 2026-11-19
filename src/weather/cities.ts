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
