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
  if (!response.ok) throw new Error("Rail data unavailable");
  const data: unknown = await response.json();
  if (!record(data) || !Array.isArray(data.disruptions) || !data.disruptions.every(validDisruption) || typeof data.stationName !== "string" || data.crs !== crs || data.direction !== direction || typeof data.unknownTimingCount !== "number" || !Number.isInteger(data.unknownTimingCount) || data.unknownTimingCount < 0 || !nullableText(data.generatedAt) || (typeof data.generatedAt === "string" && !Number.isFinite(Date.parse(data.generatedAt)))) throw new Error("Invalid rail data");
  return data as Board;
}
