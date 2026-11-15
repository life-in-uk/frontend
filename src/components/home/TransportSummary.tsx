import type { ReactNode } from "react";
import {
  ArrowRight,
  BusFront,
  Route,
  TrainFront,
  TrainFrontTunnel,
} from "lucide-react";
import type { GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import { Link } from "../Link";
import { railPreviewEnabled, TRAVEL_TOOLS } from "../../travel/tools";
import type { TravelToolId } from "../../travel/tools";
import { TRAVEL_UI } from "../../travel/i18n";
import { travelPath } from "../../travel/routes";

// Homepage order of the approved design.
const HOME_ORDER: readonly TravelToolId[] = ["underground", "rail", "roads"];

const ICONS: Record<TravelToolId, ReactNode> = {
  underground: <TrainFrontTunnel size={26} aria-hidden="true" />,
  rail: <TrainFront size={26} aria-hidden="true" />,
  roads: <Route size={26} aria-hidden="true" />,
};

/**
 * Compact homepage entry to the Travel section. It shows no service data
 * itself and makes no requests: each entry opens that tool on /travel, which
 * loads it only when shown.
 */
export function TransportSummary({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const ui = TRAVEL_UI[locale];
  return (
    <section className="home-panel transport-panel" aria-labelledby="transport-title">
      <div className="home-panel-head">
        <BusFront size={24} aria-hidden="true" />
        <h2 id="transport-title">{SITE_UI[locale].transport.title}</h2>
      </div>
      <ul className="transport-list">
        {HOME_ORDER.map((id) => {
          const mode = TRAVEL_TOOLS.find((item) => item.id === id)!;
          const name = ui.tools[id].name;
          const unavailable = id === "rail" && !railPreviewEnabled();
          return (
            <li key={id}>
              <Link to={travelPath(locale, id)} className="transport-item" data-tool={id}>
                <span className="transport-icon">{ICONS[id]}</span>
                <span className="transport-text">
                  <span className="transport-name">
                    {name}
                    {/* Skip the operator when the name already contains it. */}
                    {!name.includes(mode.operator) && (
                      <>
                        {" "}
                        <span lang="en">{mode.operator}</span>
                      </>
                    )}
                  </span>
                  <span className="transport-status">
                    {unavailable ? ui.common.notReleased : ui.tools[id].description}
                  </span>
                  <span className="sr-only">{ui.home.open(name)}</span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="home-panel-meta">{ui.home.meta}</p>
    </section>
  );
}
