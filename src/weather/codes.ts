// Met Office significant weather codes → a condition and day/night, for
// presentation. Adapted from the Short Breaks Hub weather-code table
// (code → illustration + description, with an "unknown" fallback), re-keyed to
// the Met Office codes (https://datahub.metoffice.gov.uk/definition-of-codes),
// which differ from the WMO codes that table used. Descriptions per language
// live in src/home/liveServicesI18n.ts.

export const WEATHER_CONDITIONS = [
  "traceRain",
  "clear",
  "sunny",
  "partlyCloudy",
  "mist",
  "fog",
  "cloudy",
  "overcast",
  "lightShowers",
  "drizzle",
  "lightRain",
  "heavyShowers",
  "heavyRain",
  "sleetShowers",
  "sleet",
  "hailShowers",
  "hail",
  "lightSnowShowers",
  "lightSnow",
  "heavySnowShowers",
  "heavySnow",
  "thunderShowers",
  "thunder",
] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

export type WeatherCodeInfo = { condition: WeatherCondition; night: boolean };

const day = (condition: WeatherCondition): WeatherCodeInfo => ({ condition, night: false });
const night = (condition: WeatherCondition): WeatherCodeInfo => ({ condition, night: true });

/** Code 4 is "Not used" by the Met Office and so has no entry. */
export const MET_OFFICE_CODES: Readonly<Record<number, WeatherCodeInfo>> = {
  [-1]: day("traceRain"),
  0: night("clear"),
  1: day("sunny"),
  2: night("partlyCloudy"),
  3: day("partlyCloudy"),
  5: day("mist"),
  6: day("fog"),
  7: day("cloudy"),
  8: day("overcast"),
  9: night("lightShowers"),
  10: day("lightShowers"),
  11: day("drizzle"),
  12: day("lightRain"),
  13: night("heavyShowers"),
  14: day("heavyShowers"),
  15: day("heavyRain"),
  16: night("sleetShowers"),
  17: day("sleetShowers"),
  18: day("sleet"),
  19: night("hailShowers"),
  20: day("hailShowers"),
  21: day("hail"),
  22: night("lightSnowShowers"),
  23: day("lightSnowShowers"),
  24: day("lightSnow"),
  25: night("heavySnowShowers"),
  26: day("heavySnowShowers"),
  27: day("heavySnow"),
  28: night("thunderShowers"),
  29: day("thunderShowers"),
  30: day("thunder"),
};

/** The condition for a code, or null for a missing, unused or unknown code (shown without a description). */
export function weatherCodeInfo(code: number | null | undefined): WeatherCodeInfo | null {
  if (typeof code !== "number" || !Number.isInteger(code)) return null;
  return MET_OFFICE_CODES[code] ?? null;
}
