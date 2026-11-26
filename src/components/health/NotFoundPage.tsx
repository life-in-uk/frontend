import { Link } from "../Link";
import { GUIDE_UI, guideHomePath, guideRoutePath, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import "./Health.css";

export function NotFoundPage({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const ui = SITE_UI[locale].notFound;
  return (
    <main id="main" className="health-page">
      <div className="health-status-card" role="status">
        <h1>{ui.title}</h1>
        <p>{ui.text}</p>
        <p className="not-found-links">
          <Link to={guideHomePath(locale)} className="button button-secondary">
            {ui.home}
          </Link>
          <Link to={guideRoutePath(locale, "health")} className="button button-secondary">
            {GUIDE_UI[locale].domain.health}
          </Link>
          <Link to={`/${locale}/guides`} className="button button-secondary">
            {SITE_UI[locale].search.emptyAll}
          </Link>
        </p>
      </div>
    </main>
  );
}
