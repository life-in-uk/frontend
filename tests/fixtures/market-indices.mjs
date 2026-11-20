// A /api/market-indices/latest response as the backend sends it once a licensed source is public
// (backend docs/market-indices.md). Test-only: the source and attribution are fictional.
export const TEST_ATTRIBUTION = "Index data: Example Licensed Provider (test fixture)";

const index = (symbol, name, exchange, timeZone, fields) => ({
  symbol,
  name,
  value: null,
  previousClose: null,
  change: null,
  changePercent: null,
  source: "licensed-test",
  collectorStatus: "OK",
  provenance: null,
  market: { exchange, timeZone, session: "UNKNOWN", calendarCoveredThrough: "2027-12-31" },
  freshness: { status: "UNAVAILABLE", ageSeconds: null, basis: "observedAt", freshWithinSeconds: 1200, staleAfterSeconds: 3600 },
  ...fields,
});

const at = (now, minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
const provenance = (observedAt, observedAtSource = "PROVIDER") => ({
  observedAt, observedAtSource, collectedAt: observedAt, receivedAt: observedAt,
});

/** S&P 500 live, 2 minutes behind (up), Nasdaq delayed (down), Dow stale (no number), FTSE 100 closed (flat). */
export function marketIndices(now = Date.now(), overrides = {}) {
  return {
    generatedAt: new Date(now).toISOString(),
    collector: { status: "OK", basis: "heartbeatReceivedAt", heartbeatTimeoutSeconds: 360, sources: [{ source: "licensed-test", status: "OK" }] },
    indices: [
      index("UKX", "FTSE 100", "LSE", "Europe/London", {
        value: "8123.4500", previousClose: "8123.4500", change: "0.00", changePercent: "0.00",
        provenance: provenance(at(now, 90)),
        market: { exchange: "LSE", timeZone: "Europe/London", session: "CLOSED", calendarCoveredThrough: "2027-12-31" },
        freshness: { status: "MARKET_CLOSED", ageSeconds: 5400, basis: "observedAt", freshWithinSeconds: 1200, staleAfterSeconds: 3600 },
      }),
      index("SPX", "S&P 500", "NYSE", "America/New_York", {
        value: "5985.2500", previousClose: "5960.0000", change: "25.25", changePercent: "0.42",
        provenance: provenance(at(now, 2), "EXCHANGE"),
        market: { exchange: "NYSE", timeZone: "America/New_York", session: "OPEN", calendarCoveredThrough: "2027-12-31" },
        freshness: { status: "FRESH", ageSeconds: 120, basis: "observedAt", freshWithinSeconds: 1200, staleAfterSeconds: 3600 },
      }),
      index("IXIC", "Nasdaq Composite", "NASDAQ", "America/New_York", {
        value: "19410.1000", previousClose: "19500.0000", change: "-89.90", changePercent: "-0.46",
        provenance: provenance(at(now, 25)),
        market: { exchange: "NASDAQ", timeZone: "America/New_York", session: "OPEN", calendarCoveredThrough: "2026-12-31" },
        freshness: { status: "DELAYED", ageSeconds: 1500, basis: "observedAt", freshWithinSeconds: 1200, staleAfterSeconds: 3600 },
      }),
      index("DJI", "Dow Jones Industrial Average", "NYSE", "America/New_York", {
        value: "43445.1000", previousClose: "43400.0000", change: "45.10", changePercent: "0.10",
        provenance: provenance(at(now, 240)),
        market: { exchange: "NYSE", timeZone: "America/New_York", session: "OPEN", calendarCoveredThrough: "2027-12-31" },
        freshness: { status: "STALE", ageSeconds: 14400, basis: "observedAt", freshWithinSeconds: 1200, staleAfterSeconds: 3600 },
      }),
    ],
    attribution: TEST_ATTRIBUTION,
    ...overrides,
  };
}
