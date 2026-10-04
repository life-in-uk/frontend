// Backend contract: life-in-uk/backend Issue #32, `PlaceSearchResponse`.
// The backend resolves places through OS Names; the browser never calls OS.
export const PLACE_TYPES = [
  "postcode",
  "city",
  "town",
  "village",
  "hamlet",
  "suburb",
  "settlement",
] as const;
export type PlaceType = (typeof PLACE_TYPES)[number];
export type Place = {
  /** OS identifier: used only as a rendering key, never displayed. */
  id: string;
  label: string;
  name: string;
  type: PlaceType;
  area: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};
export type PlaceSearchResponse = {
  query: string;
  places: Place[];
  attribution: string;
};

/** Mirrors the backend limit, so over-long input is stopped before any request. */
export const MAX_PLACE_QUERY_LENGTH = 100;

/** 400 `PLACE_QUERY_INVALID`. */
export class PlaceQueryInvalidError extends Error {
  constructor() {
    super("Place query invalid");
    this.name = "PlaceQueryInvalidError";
  }
}
/** 502/503: place search is not configured or the provider is unavailable. */
export class PlacesUnavailableError extends Error {
  constructor() {
    super("Place search unavailable");
    this.name = "PlacesUnavailableError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isOptionalText(value: unknown): value is string | null {
  return value === null || isText(value);
}
function isPlace(value: unknown): value is Place {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.label) &&
    isText(value.name) &&
    (PLACE_TYPES as readonly unknown[]).includes(value.type) &&
    isOptionalText(value.area) &&
    isOptionalText(value.region) &&
    isOptionalText(value.country) &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180
  );
}
export function isPlaceSearchResponse(
  value: unknown,
): value is PlaceSearchResponse {
  return (
    isRecord(value) &&
    typeof value.query === "string" &&
    isText(value.attribution) &&
    Array.isArray(value.places) &&
    value.places.every(isPlace)
  );
}

/** Trimmed query to submit, or null when there is nothing to search for. */
export function normalisePlaceQuery(input: string): string | null {
  const query = input.trim();
  return query.length === 0 ? null : query;
}

/** The only place-search URL: relative, so the dev proxy or same-origin routing applies. */
export function placeSearchUrl(query: string): string {
  return `/api/places/search?${new URLSearchParams({ q: query })}`;
}
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSearchResponse> {
  const response = await fetch(placeSearchUrl(query), { signal });
  if (response.status === 400) throw new PlaceQueryInvalidError();
  if (response.status === 502 || response.status === 503)
    throw new PlacesUnavailableError();
  if (!response.ok) throw new Error("Place search failed");
  const data: unknown = await response.json();
  if (!isPlaceSearchResponse(data))
    throw new Error("Invalid place search response");
  return data;
}
