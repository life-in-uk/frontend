import type { FreshnessStatus, MarketIndex } from "./api.ts";

/**
 * What an index card may show. The backend rates freshness from the market time only; the card follows that
 * rating and never upgrades it:
 * - FRESH and at most LIVE_MAX_AGE_SECONDS old: "Live", with a small delay note (the source runs 1-3 minutes
 *   behind). FRESH but older, or DELAYED: "Delayed". MARKET_CLOSED: "Closed". Each with value, change and the
 *   market time.
 * - MARKET_STATUS_UNKNOWN: value and market time, labelled "status unknown" (never as open or closed).
 * - STALE, MARKET_TIME_UNKNOWN, UNAVAILABLE: no number at all. A value without a usable market time, or past
 *   stale-after, is never shown, so an old or collector-stamped value can never pass for a current one.
 */
export type CardStatus = "live" | "delayed" | "closed" | "unknown" | "stale" | "unavailable";

/** A FRESH quote is shown as Live only up to this age (by the backend's clock); older ones are Delayed. */
export const LIVE_MAX_AGE_SECONDS = 5 * 60;

const STATUS: Record<FreshnessStatus, CardStatus> = {
  FRESH: "live",
  DELAYED: "delayed",
  MARKET_CLOSED: "closed",
  MARKET_STATUS_UNKNOWN: "unknown",
  STALE: "stale",
  MARKET_TIME_UNKNOWN: "unavailable",
  UNAVAILABLE: "unavailable",
};

export type IndexView = {
  symbol: MarketIndex["symbol"];
  name: string;
  status: CardStatus;
  /** Null when no number may be shown. */
  value: string | null;
  change: string | null;
  changePercent: string | null;
  direction: "up" | "down" | "flat" | null;
  /** Live only: the quote's delay in whole minutes ("~2 min delay"), or null under a minute. */
  delayMinutes: number | null;
  /** The market time (EXCHANGE or PROVIDER), never a collector or receipt time. */
  observedAt: string | null;
};

export function indexView(index: MarketIndex): IndexView {
  let status = STATUS[index.freshness];
  // Live needs a known, small age; FRESH without one, or older than the Live limit, is shown as Delayed.
  if (status === "live" && !(index.ageSeconds !== null && index.ageSeconds <= LIVE_MAX_AGE_SECONDS)) status = "delayed";
  const marketTime = index.observedAtSource === "EXCHANGE" || index.observedAtSource === "PROVIDER" ? index.observedAt : null;
  const showable = (status === "live" || status === "delayed" || status === "closed" || status === "unknown")
    && index.value !== null && marketTime !== null;
  if (!showable) {
    return { symbol: index.symbol, name: index.name, status: status === "unknown" ? "unavailable" : status, value: null,
      change: null, changePercent: null, direction: null, delayMinutes: null, observedAt: null };
  }
  const change = index.change;
  const sign = change === null ? null : Math.sign(Number(change));
  return {
    symbol: index.symbol,
    name: index.name,
    status,
    value: formatLevel(index.value as string),
    change: change === null ? null : formatSigned(change, 2),
    changePercent: index.changePercent === null ? null : `${formatSigned(index.changePercent, 2)}%`,
    direction: sign === null ? null : sign > 0 ? "up" : sign < 0 ? "down" : "flat",
    delayMinutes: status === "live" && index.ageSeconds !== null && index.ageSeconds >= 60 ? Math.round(index.ageSeconds / 60) : null,
    observedAt: marketTime,
  };
}

/** Index levels in the usual form: thousands grouped, two decimals ("8,123.45"), the same in every locale. */
export function formatLevel(decimal: string): string {
  return new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(decimal));
}

/** "+23.33", "−4.10" (true minus sign), "0.00". */
export function formatSigned(decimal: string, digits: number): string {
  const n = Number(decimal);
  const text = new Intl.NumberFormat("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(n));
  if (Number(text.replace(/,/g, "")) === 0) return text;
  return `${n > 0 ? "+" : "−"}${text}`;
}

/**
 * The market time in UK time: "16:35" on the same UK day as now, otherwise with the date ("20 Nov 16:35").
 * Chinese keeps its own date form ("11月20日 16:35").
 */
export function formatMarketTime(instant: string, lang: string, now: number): string {
  const time = new Date(instant);
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", dateStyle: "short" }).format(d);
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(time);
  if (day(time) === day(new Date(now))) return clock;
  const date = new Intl.DateTimeFormat(lang, { timeZone: "Europe/London", month: "short", day: "numeric" }).format(time);
  return `${date} ${clock}`;
}

/** US card first (S&P 500, Nasdaq Composite, Dow), then the UK card (FTSE 100), as approved for the homepage. */
export const US_SYMBOLS = ["SPX", "IXIC", "DJI"] as const;
export const UK_SYMBOLS = ["UKX"] as const;
