import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Landmark, TrendingUp } from "lucide-react";
import type { GuideLocale } from "../../guides/locales";
import { GUIDE_LOCALE_LANG } from "../../guides/locales";
import { LIVE_SERVICES_UI } from "../../home/liveServicesI18n";
import { getMarketIndices, isCrypto } from "../../markets/api";
import type { MarketIndicesData, MarketSymbol } from "../../markets/api";
import { formatMarketTime, indexView, UK_SYMBOLS, unavailableView, US_SYMBOLS } from "../../markets/present";
import type { IndexView } from "../../markets/present";

/** Short names on the cards; the backend's full name is kept as the tooltip. */
const SHORT_NAME: Record<MarketSymbol, string> = {
  UKX: "FTSE 100",
  SPX: "S&P 500",
  IXIC: "Nasdaq Composite",
  DJI: "Dow Jones",
  BTCUSD: "Bitcoin (BTC)",
  ETHUSD: "Ethereum (ETH)",
};

/**
 * Read again this often while the page is open and visible, so a Live label never outlives its quote by much (the
 * backend serves stored values; no upstream calls).
 */
export const MARKET_READ_INTERVAL_MS = 60_000;

type MarketState = { status: "waiting" } | { status: "ready"; data: MarketIndicesData; readAt: number };

/**
 * Reads /api/market-indices/latest after the page has rendered (the prerendered page never depends on it), then
 * every five minutes while the tab is visible. Disabled (404), failed or invalid reads keep the placeholders.
 */
function useMarketIndices(): MarketState {
  const [state, setState] = useState<MarketState>({ status: "waiting" });
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const read = () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeout = window.setTimeout(() => current.abort(), 10_000);
      getMarketIndices(current.signal)
        .then((result) => {
          if (!active) return;
          setState(result.kind === "ready" ? { status: "ready", data: result.data, readAt: Date.now() } : { status: "waiting" });
        })
        .catch(() => {
          if (active) setState({ status: "waiting" });
        })
        .finally(() => window.clearTimeout(timeout));
    };
    read();
    const interval = window.setInterval(read, MARKET_READ_INTERVAL_MS);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, []);
  return state;
}

function IndexRow({ view, locale, now }: { view: IndexView; locale: GuideLocale; now: number }) {
  const ui = LIVE_SERVICES_UI[locale].markets;
  const lang = GUIDE_LOCALE_LANG[locale];
  const changeText = view.change === null ? null : `${view.change}${view.changePercent ? ` (${view.changePercent})` : ""}`;
  const crypto = view.kind === "crypto";
  return (
    <li className="market-row" data-status={view.status} data-kind={view.kind}>
      <span className="market-name" lang="en" dir="ltr" title={view.name}>
        {SHORT_NAME[view.symbol]}
      </span>
      <span className="market-value" dir="ltr">
        {view.value ?? "—"}
      </span>
      {changeText && (
        <span className="market-change" data-direction={view.direction ?? "flat"}
          aria-label={`${crypto ? ui.change24h : ui.change} ${changeText}`}>
          <span dir="ltr">{changeText}</span>
          {crypto && <span className="market-window" aria-hidden="true">{ui.window24h}</span>}
        </span>
      )}
      <span className="market-meta">
        <span className="live-badge market-badge">{ui.status[view.status]}</span>
        {view.status === "live" && <span className="market-delay">{ui.delayNote(view.delayMinutes)}</span>}
        {view.observedAt && (
          <time dateTime={view.observedAt}>{ui.asOf(formatMarketTime(view.observedAt, lang, now))}</time>
        )}
      </span>
    </li>
  );
}

function IndexCard({ id, icon, label, symbols, data, locale, now, attribution }: {
  id: string;
  icon: ReactNode;
  label: string;
  symbols: readonly MarketSymbol[];
  data: MarketIndicesData;
  locale: GuideLocale;
  now: number;
  attribution?: string;
}) {
  return (
    <div className="live-card market-card" data-state="live" role="group" aria-labelledby={`${id}-label`}>
      <span className="live-card-icon">{icon}</span>
      <span className="live-card-text">
        <span className="live-card-label" id={`${id}-label`}>
          {label}
        </span>
        {attribution && <bdi className="market-attribution">{attribution}</bdi>}
        <ul className="market-rows">
          {symbols.map((symbol) => {
            const index = data.indices.find((i) => i.symbol === symbol);
            // A pair the backend does not serve yet still has its row, marked unavailable.
            const view = index ? indexView(index) : unavailableView(symbol, SHORT_NAME[symbol], isCrypto(symbol) ? "crypto" : "index");
            return <IndexRow key={symbol} view={view} locale={locale} now={now} />;
          })}
        </ul>
      </span>
    </div>
  );
}

/**
 * The homepage's market cards: US indices, then FTSE 100 with Bitcoin and Ethereum (USD, rolling 24-hour change). Until the backend serves licensed, attributed index data they render
 * {@code placeholders} unchanged; afterwards each index shows its value, change, market time (UK time) and the
 * backend's freshness rating, with the provider's attribution in the FTSE 100 card.
 */
export function MarketIndexCards({ locale, placeholders }: { locale: GuideLocale; placeholders: ReactNode }) {
  const state = useMarketIndices();
  if (state.status !== "ready") return <div className="live-markets">{placeholders}</div>;
  const ui = LIVE_SERVICES_UI[locale].markets;
  return (
    <div className="live-markets">
      <IndexCard id="live-us" icon={<TrendingUp size={22} aria-hidden="true" />} label={ui.us} symbols={US_SYMBOLS}
        data={state.data} locale={locale} now={state.readAt} />
      <IndexCard id="live-uk" icon={<Landmark size={22} aria-hidden="true" />} label={ui.uk} symbols={UK_SYMBOLS}
        data={state.data} locale={locale} now={state.readAt} attribution={state.data.attribution} />
    </div>
  );
}
