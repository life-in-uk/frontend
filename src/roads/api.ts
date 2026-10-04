// Backend contract: life-in-uk/backend Issue #30, `RoadsResponse`.
// The backend always emits every field; absent provider values are null.
export type RoadsCode = { value: string; extendedValue: string | null };
export type RoadsCause = {
  type: string | null;
  managementType: RoadsCode | null;
};
export type RoadsRoad = {
  name: string | null;
  direction: string | null;
  relativeDirection: string | null;
};
export type RoadsCoordinate = { latitude: number; longitude: number };
export type RoadsLocation = {
  description: string | null;
  roads: RoadsRoad[];
  coordinates: RoadsCoordinate[];
};
export type RoadsDisruption = {
  situationId: string;
  recordId: string;
  recordVersion: string | null;
  descriptions: string[];
  type: RoadsCode | null;
  cause: RoadsCause | null;
  status: string | null;
  startTime: string | null;
  endTime: string | null;
  /** Straight-line proximity to the provider geometry, not driving distance. */
  distanceMeters: number;
  locations: RoadsLocation[];
};
export type RoadsResponse = {
  snapshotAt: string;
  relevanceRadiusMeters: number;
  disruptions: RoadsDisruption[];
};

/** 404: the backend has no Roads Current State yet. */
export class RoadsUnavailableError extends Error {
  constructor() {
    super("Roads unavailable");
    this.name = "RoadsUnavailableError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function isInstant(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(
      value,
    )
  )
    return false;
  const instant = new Date(value);
  // Reject calendar rollover such as 30 February.
  return (
    Number.isFinite(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === value.slice(0, 10)
  );
}
function isOptionalInstant(value: unknown): value is string | null {
  return value === null || isInstant(value);
}
function isCode(value: unknown): value is RoadsCode {
  return (
    isRecord(value) &&
    isText(value.value) &&
    isOptionalText(value.extendedValue)
  );
}
function isCause(value: unknown): value is RoadsCause {
  return (
    isRecord(value) &&
    isOptionalText(value.type) &&
    (value.managementType === null || isCode(value.managementType))
  );
}
function isRoad(value: unknown): value is RoadsRoad {
  return (
    isRecord(value) &&
    isOptionalText(value.name) &&
    isOptionalText(value.direction) &&
    isOptionalText(value.relativeDirection)
  );
}
function isCoordinate(value: unknown): value is RoadsCoordinate {
  return (
    isRecord(value) &&
    isFiniteNumber(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    isFiniteNumber(value.longitude) &&
    Math.abs(value.longitude) <= 180
  );
}
function isLocation(value: unknown): value is RoadsLocation {
  return (
    isRecord(value) &&
    isOptionalText(value.description) &&
    Array.isArray(value.roads) &&
    value.roads.every(isRoad) &&
    Array.isArray(value.coordinates) &&
    value.coordinates.every(isCoordinate)
  );
}
function isDisruption(value: unknown): value is RoadsDisruption {
  return (
    isRecord(value) &&
    isText(value.situationId) &&
    isText(value.recordId) &&
    isOptionalText(value.recordVersion) &&
    Array.isArray(value.descriptions) &&
    value.descriptions.every((text) => typeof text === "string") &&
    (value.type === null || isCode(value.type)) &&
    (value.cause === null || isCause(value.cause)) &&
    isOptionalText(value.status) &&
    isOptionalInstant(value.startTime) &&
    isOptionalInstant(value.endTime) &&
    isFiniteNumber(value.distanceMeters) &&
    value.distanceMeters >= 0 &&
    Array.isArray(value.locations) &&
    value.locations.every(isLocation)
  );
}
export function isRoadsResponse(value: unknown): value is RoadsResponse {
  return (
    isRecord(value) &&
    isInstant(value.snapshotAt) &&
    isFiniteNumber(value.relevanceRadiusMeters) &&
    value.relevanceRadiusMeters > 0 &&
    Array.isArray(value.disruptions) &&
    value.disruptions.every(isDisruption)
  );
}

/** The only Roads URL: relative, so the dev proxy or same-origin routing applies. */
export function roadsUrl(latitude: number, longitude: number): string {
  const query = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  return `/api/travel/roads?${query}`;
}
export async function getRoads(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<RoadsResponse> {
  const response = await fetch(roadsUrl(latitude, longitude), { signal });
  if (response.status === 404) throw new RoadsUnavailableError();
  if (!response.ok) throw new Error("Roads request failed");
  const data: unknown = await response.json();
  if (!isRoadsResponse(data)) throw new Error("Invalid Roads response");
  return data;
}
