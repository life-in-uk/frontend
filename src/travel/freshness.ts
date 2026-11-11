// Display freshness rules for stored travel snapshots.
//
// These are Life in UK product rules, not provider guarantees. A snapshot
// older than its limit is "stale": the UI hides every current-status claim
// (statuses, disruption lists, counts, summaries) and shows only when the
// source was observed, with the official source as a fallback.
//
// A missing, unparsable or implausibly future timestamp is treated as stale.

export const UNDERGROUND_MAX_AGE_MS = 10 * 60_000;
export const ROADS_MAX_AGE_MS = 30 * 60_000;

/** Tolerated clock difference between the backend and the browser. */
const FUTURE_TOLERANCE_MS = 2 * 60_000;

const INSTANT =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/;

/**
 * Milliseconds for a strict UTC instant ("…Z", as the backend sends), or null
 * for a missing, malformed or impossible value.
 */
export function parseInstant(value: unknown): number | null {
  if (typeof value !== "string" || !INSTANT.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  // Reject impossible calendar dates (e.g. 30 February) that Date.parse
  // would otherwise roll over into the next month.
  return new Date(time).toISOString().slice(0, 10) === value.slice(0, 10)
    ? time
    : null;
}

export type Freshness =
  | { state: "fresh"; observedAt: string }
  | { state: "stale"; observedAt: string }
  | { state: "invalid" };

export function assessFreshness(
  observedAt: unknown,
  maxAgeMs: number,
  now: number = Date.now(),
): Freshness {
  if (typeof observedAt !== "string" || !INSTANT.test(observedAt))
    return { state: "invalid" };
  const time = Date.parse(observedAt);
  if (!Number.isFinite(time) || !Number.isFinite(now))
    return { state: "invalid" };
  const age = now - time;
  if (age < -FUTURE_TOLERANCE_MS) return { state: "invalid" };
  return age <= maxAgeMs
    ? { state: "fresh", observedAt }
    : { state: "stale", observedAt };
}

/** Only fresh snapshots may show current-status claims. */
export function isFresh(freshness: Freshness): boolean {
  return freshness.state === "fresh";
}
