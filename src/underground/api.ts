export type UndergroundStatus = {
  severity: number;
  description: string;
  // The accepted DTO always emits this field: absent source reasons become null.
  reason: string | null;
};
export type UndergroundLine = {
  lineId: string;
  lineName: string;
  statuses: UndergroundStatus[];
};
export type UndergroundResponse = {
  observedAt: string;
  lines: UndergroundLine[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSourceText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isObservation(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(
      value,
    )
  )
    return false;
  const instant = new Date(value);
  // Reject calendar rollover such as 30 February. Formatting may lose sub-ms
  // precision, but the original UTC string is retained unchanged in the model.
  return (
    Number.isFinite(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === value.slice(0, 10)
  );
}
function isStatus(value: unknown): value is UndergroundStatus {
  return (
    isRecord(value) &&
    typeof value.severity === "number" &&
    Number.isInteger(value.severity) &&
    value.severity >= -2147483648 &&
    value.severity <= 2147483647 &&
    isSourceText(value.description) &&
    (value.reason === null || typeof value.reason === "string")
  );
}
function isLine(value: unknown): value is UndergroundLine {
  return (
    isRecord(value) &&
    isSourceText(value.lineId) &&
    isSourceText(value.lineName) &&
    Array.isArray(value.statuses) &&
    value.statuses.every(isStatus)
  );
}
export function isUndergroundResponse(
  value: unknown,
): value is UndergroundResponse {
  return (
    isRecord(value) &&
    isObservation(value.observedAt) &&
    Array.isArray(value.lines) &&
    value.lines.every(isLine)
  );
}
export async function getUnderground(
  signal?: AbortSignal,
): Promise<UndergroundResponse> {
  const response = await fetch("/api/travel/underground", { signal });
  if (!response.ok) throw new Error("Underground unavailable");
  const data: unknown = await response.json();
  if (!isUndergroundResponse(data))
    throw new Error("Invalid Underground response");
  return data;
}
export function formatUndergroundObservation(observedAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(observedAt));
}
