import { CalendarCheck2, Landmark, MapPin, Scale } from "lucide-react";
import type { GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";

// Each statement describes how the site already works (see GuidePage,
// EvidencePanel and Quick Answer verification); none is a new promise.
const ICONS = [
  <Landmark size={22} aria-hidden="true" />,
  <MapPin size={22} aria-hidden="true" />,
  <CalendarCheck2 size={22} aria-hidden="true" />,
  <Scale size={22} aria-hidden="true" />,
];

export function TrustSection({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const ui = SITE_UI[locale].trust;
  return (
    <section
      id="about"
      className="home-container home-section home-trust"
      aria-labelledby="about-title"
      tabIndex={-1}
    >
      <div className="home-section-head">
        <h2 id="about-title">{ui.title}</h2>
        <p>{ui.intro}</p>
      </div>
      <ul className="trust-grid">
        {ui.points.map((point, index) => (
          <li key={point.title}>
            <span className="trust-icon">{ICONS[index]}</span>
            <h3>{point.title}</h3>
            <p>{point.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
