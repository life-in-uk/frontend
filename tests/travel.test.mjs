import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assessFreshness,
  isFresh,
  ROADS_MAX_AGE_MS,
  UNDERGROUND_MAX_AGE_MS,
} from "../src/travel/freshness.ts";
import { formatDistanceZh, formatUkDateTimeZh } from "../src/travel/format.ts";
import { TRAVEL_TOOLS } from "../src/travel/tools.ts";

const OBSERVED = "2026-10-03T15:47:08.441419123Z";
const at = (ms) => Date.parse("2026-10-03T15:47:08.441Z") + ms;

test("product thresholds: Underground 10 minutes, Roads 30 minutes", () => {
  assert.equal(UNDERGROUND_MAX_AGE_MS, 10 * 60_000);
  assert.equal(ROADS_MAX_AGE_MS, 30 * 60_000);
});

test("fresh up to and including the limit, stale after it", () => {
  const limit = UNDERGROUND_MAX_AGE_MS;
  assert.deepEqual(assessFreshness(OBSERVED, limit, at(0)), {
    state: "fresh",
    observedAt: OBSERVED,
  });
  assert.equal(assessFreshness(OBSERVED, limit, at(limit)).state, "fresh");
  assert.deepEqual(assessFreshness(OBSERVED, limit, at(limit + 1)), {
    state: "stale",
    observedAt: OBSERVED,
  });
  assert.equal(
    assessFreshness(OBSERVED, ROADS_MAX_AGE_MS, at(20 * 60_000)).state,
    "fresh",
  );
  assert.equal(
    assessFreshness(OBSERVED, ROADS_MAX_AGE_MS, at(31 * 60_000)).state,
    "stale",
  );
  // A five-week-old snapshot is stale for both tools.
  const weeks = Date.parse("2026-11-10T21:37:00Z");
  assert.equal(isFresh(assessFreshness(OBSERVED, ROADS_MAX_AGE_MS, weeks)), false);
});

test("missing, invalid or implausibly future timestamps are never fresh", () => {
  const now = at(0);
  for (const value of [
    undefined,
    null,
    "",
    123,
    "2026-10-03",
    "2026-10-03T15:47:08+01:00",
    "2026-13-03T15:47:08Z",
    "not a time",
  ])
    assert.deepEqual(
      assessFreshness(value, UNDERGROUND_MAX_AGE_MS, now),
      { state: "invalid" },
      String(value),
    );
  // Small clock skew is tolerated; far-future observations are not.
  assert.equal(
    assessFreshness("2026-10-03T15:48:08Z", UNDERGROUND_MAX_AGE_MS, now).state,
    "fresh",
  );
  assert.equal(
    assessFreshness("2026-10-03T16:47:08Z", UNDERGROUND_MAX_AGE_MS, now).state,
    "invalid",
  );
  assert.equal(
    assessFreshness(OBSERVED, UNDERGROUND_MAX_AGE_MS, Number.NaN).state,
    "invalid",
  );
});

test("Chinese UK-time formatting is timezone independent", () => {
  assert.equal(formatUkDateTimeZh(OBSERVED), "2026年10月3日 16:47");
  assert.equal(formatUkDateTimeZh("2026-12-04T09:30:00Z"), "2026年12月4日 09:30");
});

test("Chinese distance keeps the English formatter's rounding", () => {
  assert.equal(formatDistanceZh(0), "不到 0.1 英里");
  assert.equal(formatDistanceZh(160), "不到 0.1 英里");
  assert.equal(formatDistanceZh(161), "0.1 英里");
  assert.equal(formatDistanceZh(1276.380340910437), "0.8 英里");
  assert.equal(formatDistanceZh(1609.344), "1.0 英里");
  assert.equal(formatDistanceZh(15000), "9.3 英里");
  assert.equal(formatDistanceZh(16_050), "10 英里");
});

test("dialog tools: Underground, Roads, Rail", () => {
  assert.deepEqual(
    TRAVEL_TOOLS.map((tool) => tool.id),
    ["underground", "roads", "rail"],
  );
});
