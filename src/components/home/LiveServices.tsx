import { ArrowRight, Landmark, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import type { GuideLocale } from "../../guides/locales";
import { LIVE_SERVICES_UI } from "../../home/liveServicesI18n";
import { TRAVEL_UI } from "../../travel/i18n";
import { travelPath } from "../../travel/routes";
import type { TravelToolId } from "../../travel/tools";
import { Link } from "../Link";
import { MarketIndexCards } from "./MarketIndexCards";
import { TransportShortcut } from "./TransportShortcut";
import { WeatherShortcut } from "./WeatherShortcut";

// Approved order of the shortcut row; Weather is the fourth tile.
const TRAVEL_ORDER: readonly TravelToolId[] = ["underground", "rail", "roads"];
const US_INDICES = ["S&P 500", "Nasdaq Composite", "Dow Jones"];
const UK_INDICES = ["FTSE 100", "Bitcoin (BTC)", "Ethereum (ETH)"];

/**
 * Not-yet-available market card: no value, no source branding and no link.
 * Shown while the backend serves no market data.
 */
function ComingSoonCard({
  id,
  icon,
  label,
  badge,
  items,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  badge: string;
  items?: string[];
}) {
  return (
    <div className="live-card" data-state="coming-soon" role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-badge`}>
      <span className="live-card-icon">{icon}</span>
      <span className="live-card-text">
        <span className="live-card-label" id={`${id}-label`}>
          {label}
        </span>
        {items && (
          <span className="live-card-items" lang="en" dir="ltr">
            {items.join(" · ")}
          </span>
        )}
      </span>
      <span className="live-badge" id={`${id}-badge`}>
        {badge}
      </span>
    </div>
  );
}

/**
 * Homepage "Live Services", directly under the search: section heading, the
 * US and Global market cards side by side, and one row of four equal
 * shortcuts (Underground, Rail, Roads, Weather). The market cards show a
 * "coming soon" fallback only while no market data can be shown
 * (MarketIndexCards).
 */
export function LiveServices({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const ui = LIVE_SERVICES_UI[locale];
  const travel = TRAVEL_UI[locale];
  return (
    <section className="home-panel live-panel" aria-labelledby="live-title" aria-describedby="live-subtitle">
      <div className="home-panel-head live-head">
        <div className="live-heading">
          <h2 id="live-title">{ui.title}</h2>
          <p id="live-subtitle" className="live-subtitle">
            {ui.subtitle}
          </p>
        </div>
        <Link to={travelPath(locale)} className="transport-all">
          {travel.home.all}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <MarketIndexCards
        locale={locale}
        placeholders={
          <>
            <ComingSoonCard
              id="live-us"
              icon={<TrendingUp size={22} aria-hidden="true" />}
              label={ui.markets.us}
              badge={ui.comingSoon}
              items={US_INDICES}
            />
            <ComingSoonCard
              id="live-uk"
              icon={<Landmark size={22} aria-hidden="true" />}
              label={ui.markets.uk}
              badge={ui.comingSoon}
              items={UK_INDICES}
            />
          </>
        }
      />
      <ul className="transport-list live-shortcuts">
        {TRAVEL_ORDER.map((id) => (
          <TransportShortcut key={id} locale={locale} id={id} />
        ))}
        <WeatherShortcut locale={locale} />
      </ul>
      <p className="home-panel-meta">{travel.home.meta}</p>
    </section>
  );
}
