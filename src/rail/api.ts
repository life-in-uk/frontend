export type Direction = "departures" | "arrivals";
export type Disruption = {
  status: "cancelled" | "delayed" | "partially_cancelled";
  delayMinutes: number | null;
  scheduledTime: string | null;
  estimatedTime: string | null;
  locations: { name: string | null; crs: string | null }[] | null;
  platform: string | null;
  operator: string | null;
  reason: string | null;
  checkDelayRepay: boolean;
  affectedStops: { name: string | null; crs: string | null }[];
};
export type Board = {
  stationName: string;
  crs: string;
  generatedAt: string | null;
  direction: Direction;
  unknownTimingCount: number;
  disruptions: Disruption[];
};
/**
 * The backend answers 503 with one of these codes when it has no Rail
 * provider credentials (RAIL_NOT_CONFIGURED) or when the Rail access flag is
 * off (RAIL_DISABLED). Either way no train data exists to show.
 */
export const RAIL_NOT_ENABLED_CODES: readonly string[] = ["RAIL_NOT_CONFIGURED", "RAIL_DISABLED"];
/**
 * Too many checks: 429 RAIL_CLIENT_RATE_LIMIT (this visitor's per-minute
 * limit), or 503 when the site's per-minute budget is used up or the provider
 * throttles (RAIL_RATE_LIMIT, RAIL_UPSTREAM_RATE_LIMIT). Waiting helps.
 */
export const RAIL_BUSY_CODES: readonly string[] = ["RAIL_CLIENT_RATE_LIMIT", "RAIL_RATE_LIMIT", "RAIL_UPSTREAM_RATE_LIMIT"];
export class RailRateLimitedError extends Error {
  constructor() {
    super("Rail checks rate limited");
    this.name = "RailRateLimitedError";
  }
}
export class RailNotConfiguredError extends Error {
  constructor() {
    super("Rail provider not configured");
    this.name = "RailNotConfiguredError";
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nullableText(value: unknown): boolean { return value === null || typeof value === "string"; }
function validDisruption(value: unknown): boolean {
  if (!record(value)) return false;
  return (value.status === "cancelled" || value.status === "delayed" || value.status === "partially_cancelled") &&
    (value.delayMinutes === null || (typeof value.delayMinutes === "number" && Number.isInteger(value.delayMinutes))) &&
    [value.scheduledTime, value.estimatedTime, value.platform, value.operator, value.reason].every(nullableText) &&
    (value.locations === null || (Array.isArray(value.locations) && value.locations.every(location => record(location) && nullableText(location.name) && nullableText(location.crs)))) &&
    typeof value.checkDelayRepay === "boolean" && Array.isArray(value.affectedStops) && value.affectedStops.every(location => record(location) && nullableText(location.name) && nullableText(location.crs));
}
export async function getDisruptions(crs: string, direction: Direction, signal: AbortSignal): Promise<Board> {
  const response = await fetch(`/api/rail/stations/${encodeURIComponent(crs)}/disruptions?direction=${direction}`, { signal });
  if (!response.ok) {
    if (response.status === 503 || response.status === 429) {
      const body: unknown = await response.json().catch(() => null);
      const code = record(body) && typeof body.code === "string" ? body.code : "";
      if (response.status === 503 && RAIL_NOT_ENABLED_CODES.includes(code)) throw new RailNotConfiguredError();
      if (response.status === 429 || RAIL_BUSY_CODES.includes(code)) throw new RailRateLimitedError();
    }
    throw new Error("Rail data unavailable");
  }
  const data: unknown = await response.json();
  if (!record(data) || !Array.isArray(data.disruptions) || !data.disruptions.every(validDisruption) || typeof data.stationName !== "string" || data.crs !== crs || data.direction !== direction || typeof data.unknownTimingCount !== "number" || !Number.isInteger(data.unknownTimingCount) || data.unknownTimingCount < 0 || !nullableText(data.generatedAt) || (typeof data.generatedAt === "string" && !Number.isFinite(Date.parse(data.generatedAt)))) throw new Error("Invalid rail data");
  return data as Board;
}
