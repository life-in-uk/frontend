import { parseInstant } from "../travel/freshness.ts";

/**
 * GET /api/market-indices/latest (backend docs/market-indices.md). The backend answers 404
 * MARKET_INDICES_DISABLED until public display is licensed and switched on; it never serves the "mock" source
 * publicly. This module only reads and checks the response: what may be shown is decided in present.ts.
 */

export const MARKET_SYMBOLS = ["UKX", "SPX", "IXIC", "DJI"] as const;
export type MarketSymbol = (typeof MARKET_SYMBOLS)[number];

export const FRESHNESS_STATUSES = [
  "FRESH",
  "DELAYED",
  "STALE",
  "MARKET_CLOSED",
  "MARKET_STATUS_UNKNOWN",
  "MARKET_TIME_UNKNOWN",
  "UNAVAILABLE",
] as const;
export type FreshnessStatus = (typeof FRESHNESS_STATUSES)[number];

export type MarketIndex = {
  symbol: MarketSymbol;
  name: string;
  /** Decimal strings, never numbers (the backend keeps exact values). Null without data. */
  value: string | null;
  previousClose: string | null;
  change: string | null;
  changePercent: string | null;
  source: string | null;
  observedAt: string | null;
  observedAtSource: "EXCHANGE" | "PROVIDER" | "COLLECTOR" | null;
  session: "OPEN" | "CLOSED" | "UNKNOWN";
  freshness: FreshnessStatus;
};

export type MarketIndicesData = {
  generatedAt: string;
  indices: MarketIndex[];
  attribution: string;
};

export type MarketIndicesResult = { kind: "disabled" } | { kind: "ready"; data: MarketIndicesData };

const DECIMAL = /^-?[0-9]{1,8}(\.[0-9]{1,4})?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const decimalOrNull = (value: unknown): value is string | null => value === null || (typeof value === "string" && DECIMAL.test(value));

function parseIndex(value: unknown): MarketIndex | null {
  if (!isRecord(value) || !isRecord(value.market) || !isRecord(value.freshness)) return null;
  const provenance = isRecord(value.provenance) ? value.provenance : null;
  const symbol = value.symbol;
  const status = value.freshness.status;
  const session = value.market.session;
  if (typeof symbol !== "string" || !(MARKET_SYMBOLS as readonly string[]).includes(symbol)) return null;
  if (typeof value.name !== "string" || value.name.trim() === "") return null;
  if (typeof status !== "string" || !(FRESHNESS_STATUSES as readonly string[]).includes(status)) return null;
  if (session !== "OPEN" && session !== "CLOSED" && session !== "UNKNOWN") return null;
  for (const field of [value.value, value.previousClose, value.change, value.changePercent]) {
    if (!decimalOrNull(field)) return null;
  }
  const observedAt = provenance && typeof provenance.observedAt === "string" && parseInstant(provenance.observedAt) !== null
    ? provenance.observedAt : null;
  const timeSource = provenance?.observedAtSource;
  const observedAtSource = timeSource === "EXCHANGE" || timeSource === "PROVIDER" || timeSource === "COLLECTOR" ? timeSource : null;
  return {
    symbol: symbol as MarketSymbol,
    name: value.name,
    value: value.value as string | null,
    previousClose: value.previousClose as string | null,
    change: value.change as string | null,
    changePercent: value.changePercent as string | null,
    source: typeof value.source === "string" ? value.source : null,
    observedAt,
    observedAtSource,
    session,
    freshness: status as FreshnessStatus,
  };
}

/** The checked response, or null when anything is missing, malformed, unattributed or from the mock source. */
export function parseMarketIndices(value: unknown): MarketIndicesData | null {
  if (!isRecord(value) || !Array.isArray(value.indices)) return null;
  if (typeof value.generatedAt !== "string" || parseInstant(value.generatedAt) === null) return null;
  // Public display needs the licensed source's attribution next to the values.
  if (typeof value.attribution !== "string" || value.attribution.trim() === "") return null;
  const indices = value.indices.map(parseIndex);
  if (indices.some((index) => index === null)) return null;
  const parsed = indices as MarketIndex[];
  // All four symbols, once each (the backend always sends all four, in a fixed order).
  if (parsed.length !== MARKET_SYMBOLS.length || MARKET_SYMBOLS.some((s) => parsed.filter((i) => i.symbol === s).length !== 1)) return null;
  // Mock data is never shown, whatever the backend says.
  if (parsed.some((index) => index.source === "mock")) return null;
  return { generatedAt: value.generatedAt, indices: parsed, attribution: value.attribution.trim() };
}

export async function getMarketIndices(signal?: AbortSignal): Promise<MarketIndicesResult> {
  const response = await fetch("/api/market-indices/latest", { signal, headers: { Accept: "application/json" } });
  if (response.status === 404) return { kind: "disabled" };
  if (!response.ok) throw new Error("Market indices unavailable");
  const data = parseMarketIndices(await response.json());
  if (data === null) throw new Error("Invalid market indices response");
  return { kind: "ready", data };
}
