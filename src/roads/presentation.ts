// Deterministic presentation of backend Roads facts. Nothing here filters,
// reorders or recalculates relevance: the backend owns all of that.
import type { RoadsDisruption } from "./api";

const METRES_PER_MILE = 1609.344;

/**
 * UK-friendly straight-line proximity in miles. Under 0.1 miles reads as
 * "Under 0.1 miles"; under 10 miles keeps one decimal place; otherwise whole miles.
 */
export function formatDistance(distanceMeters: number): string {
  const miles = distanceMeters / METRES_PER_MILE;
  if (miles < 0.1) return "Under 0.1 miles";
  const tenths = Math.round(miles * 10) / 10;
  if (tenths < 10)
    return `${tenths.toFixed(1)} ${tenths === 1 ? "mile" : "miles"}`;
  return `${Math.round(miles)} miles`;
}

/** Provider times shown in UK time, matching the existing live cards. */
export function formatRoadsTime(instant: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

/**
 * Provider enumeration codes (DATEX II camelCase, e.g. "laneClosures",
 * "northBound") as plain words: "Lane closures", "Northbound". Spacing and
 * capitalisation change only; the words themselves are the provider's.
 * Text that is not a single camelCase token is returned unchanged.
 */
export function humaniseCode(code: string): string {
  if (!/^[a-z][A-Za-z]*$/.test(code)) return code;
  if (/^[a-z]+Bound$/.test(code))
    return code[0].toUpperCase() + code.slice(1).toLowerCase();
  const words = code.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words[0].toUpperCase() + words.slice(1);
}

function unique(values: Array<string | null>): string[] {
  const seen: string[] = [];
  for (const value of values)
    if (value !== null && value.trim().length > 0 && !seen.includes(value))
      seen.push(value);
  return seen;
}

export type DisruptionView = {
  /** Road names in provider order, e.g. "M1". Empty when none supplied. */
  roads: string[];
  /** Provider directions, humanised, e.g. "Northbound". */
  directions: string[];
  /** Provider location descriptions, e.g. "M1 northbound between J14 and J15". */
  locations: string[];
  /** The closure kind, e.g. "Lane closures", or null when not supplied. */
  kind: string | null;
  /** Provider public comments that add information beyond the kind code. */
  comments: string[];
  /** Provider validity status, humanised, or null. */
  status: string | null;
  endTime: string | null;
  distance: string;
};

/** Selects the useful human-facing facts; repeated identical text is shown once. */
export function describeDisruption(
  disruption: RoadsDisruption,
): DisruptionView {
  const roadSections = disruption.locations.flatMap(
    (location) => location.roads,
  );
  const kindCode =
    disruption.type?.value ?? disruption.cause?.managementType?.value ?? null;
  const codes = [
    disruption.type?.value,
    disruption.cause?.managementType?.value,
  ].filter((code): code is string => typeof code === "string");
  return {
    roads: unique(roadSections.map((road) => road.name)),
    directions: unique(
      roadSections.map((road) =>
        road.direction === null ? null : humaniseCode(road.direction),
      ),
    ),
    locations: unique(
      disruption.locations.map((location) => location.description),
    ),
    kind: kindCode === null ? null : humaniseCode(kindCode),
    // A comment identical to the kind code repeats it and is omitted.
    comments: unique(disruption.descriptions).filter(
      (comment) => !codes.includes(comment),
    ),
    status: disruption.status === null ? null : humaniseCode(disruption.status),
    endTime: disruption.endTime,
    distance: formatDistance(disruption.distanceMeters),
  };
}
