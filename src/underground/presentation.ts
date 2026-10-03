// Frontend-local V1 presentation rules for Underground Current State.
// Nothing here changes or reinterprets the backend facts: the exact source
// status text always remains visible beside any colour.

/**
 * Line identity colours, keyed by the stable backend `lineId`.
 *
 * Source: Transport for London, "Colour standard", Issue 11, section 5
 * "London Underground line colours" (https://content.tfl.gov.uk/tfl-colour-standard.pdf).
 * Values are the standard's RGB references, which it specifies for screens.
 * These colours identify a line only; they never indicate service status.
 */
export const LINE_COLOURS: Readonly<Record<string, string>> = {
  bakerloo: "#B26300", // PMS 470, R178 G99 B0
  central: "#DC241F", // PMS 485, R220 G36 B31
  circle: "#FFC80A", // PMS 116, R255 G200 B10
  district: "#007D32", // PMS 356, R0 G125 B50
  "hammersmith-city": "#F589A6", // PMS 197, R245 G137 B166
  jubilee: "#838D93", // PMS 430, R131 G141 B147
  metropolitan: "#9B0058", // PMS 235, R155 G0 B88
  northern: "#000000", // PMS Black, R0 G0 B0
  piccadilly: "#0019A8", // PMS 072, R0 G25 B168
  victoria: "#039BE5", // PMS 299, R3 G155 B229
  "waterloo-city": "#76D0BD", // PMS 338, R118 G208 B189
};

/** Identity colour for a known line, or null for an intentional neutral marker. */
export function lineColour(lineId: string): string | null {
  return Object.hasOwn(LINE_COLOURS, lineId) ? LINE_COLOURS[lineId] : null;
}

export type StatusPresentation = "normal" | "disruption" | "severe" | "unknown";

/**
 * V1 status classification.
 *
 * A status is classified only when its severity and description both match the
 * same Tube entry in TfL's severity metadata (GET https://api.tfl.gov.uk/Line/Meta/Severity,
 * modeName "tube"), and that description is defined on TfL's "Status definitions" page
 * (https://tfl.gov.uk/status-updates/status-definitions):
 *
 * - normal: "Services are running as we'd expect them to" (Good service).
 * - disruption: degraded but running, and TfL does "not recommend changing your route"
 *   (Minor delays).
 * - severe: TfL recommends another route or says all or part of the service is not
 *   running (Severe delays, Suspended/Part suspended, Planned closure/Part closure).
 *
 * Every other severity/description, including a mismatched pair, is "unknown" so no
 * meaning is invented. Severity numbers alone never decide the presentation.
 */
const TFL_TUBE_STATUSES: ReadonlyArray<
  readonly [severity: number, description: string, StatusPresentation]
> = [
  [10, "good service", "normal"],
  [9, "minor delays", "disruption"],
  [6, "severe delays", "severe"],
  [3, "part suspended", "severe"],
  [2, "suspended", "severe"],
  [5, "part closure", "severe"],
  [4, "planned closure", "severe"],
];

export function classifyStatus(status: {
  severity: number;
  description: string;
}): StatusPresentation {
  const description = status.description.trim().toLowerCase();
  const match = TFL_TUBE_STATUSES.find(
    ([severity, text]) => severity === status.severity && text === description,
  );
  return match ? match[2] : "unknown";
}

/** Plain-text meaning of each LED, for assistive technology and tooltips. */
export const PRESENTATION_LABELS: Readonly<Record<StatusPresentation, string>> =
  {
    normal: "normal service",
    disruption: "disruption",
    severe: "severe disruption or closure",
    unknown: "status not classified",
  };

/** Counts lines with at least one disruption/severe status, and lines left unclassified. */
export function summariseLines(
  lines: ReadonlyArray<{
    statuses: ReadonlyArray<{ severity: number; description: string }>;
  }>,
): { affected: number; unclassified: number } {
  let affected = 0;
  let unclassified = 0;
  for (const line of lines) {
    const states = line.statuses.map(classifyStatus);
    if (states.some((state) => state === "disruption" || state === "severe"))
      affected++;
    else if (states.length === 0 || states.includes("unknown")) unclassified++;
  }
  return { affected, unclassified };
}

/** A reason earns a disclosure control only when it contains visible text. */
export function hasMeaningfulReason(reason: string | null): reason is string {
  return reason !== null && reason.trim().length > 0;
}
