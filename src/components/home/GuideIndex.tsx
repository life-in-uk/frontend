import { ArrowRight } from "lucide-react";
import type { HomeGuide } from "../../home/featured";
import type { GuideDomain } from "../../guides/domains";
import { formatUkDateFor } from "../../guides/format";
import { GUIDE_LOCALE_LANG, GUIDE_UI, guideRoutePath, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import { Link } from "../Link";
import { FallbackBadge, ForeignText } from "../site/FallbackLabel";
import { homeGuideTitle, itemLang } from "../../home/featured";

type GuideIndexProps = {
  /** Published Guides not already featured, most recent first. */
  guides: HomeGuide[];
  /** Launched sections with their published Guide totals. */
  sections: { domain: GuideDomain; total: number }[];
  limit: number;
  locale?: GuideLocale;
};

/**
 * Compact list of further published Guides. It is capped, with links to
 * each section hub, so it stays short as the catalogue grows.
 */
export function GuideIndex({ guides, sections, limit, locale = "zh-CN" }: GuideIndexProps) {
  if (guides.length === 0) return null;
  const ui = SITE_UI[locale];
  return (
    <section
      id="all-guides"
      className="home-container home-section"
      aria-labelledby="all-guides-title"
    >
      <div className="home-section-head">
        <h2 id="all-guides-title">{ui.index.title}</h2>
        <p>{ui.index.text}</p>
      </div>
      <ul className="guide-index">
        {guides.slice(0, limit).map((item) => (
          <li key={item.guide.slug} data-fallback={item.fallback || undefined}>
            <Link to={item.href} className="guide-index-link" hrefLang={itemLang(item, locale)}>
              <span className={`guide-index-tag tag-${item.domain.id}`}>
                {GUIDE_UI[locale].domain[item.domain.id]}
              </span>
              <span className="guide-index-title">
                <ForeignText lang={itemLang(item, locale)}>{homeGuideTitle(item)}</ForeignText>
                <FallbackBadge label={item.fallback && ui.fallbackBadge} />
              </span>
              <time dateTime={item.guide.updatedAt}>
                {formatUkDateFor(item.guide.updatedAt, GUIDE_LOCALE_LANG[locale])}
              </time>
            </Link>
          </li>
        ))}
      </ul>
      <ul className="guide-index-hubs">
        {sections
          .filter((section) => section.total > 0)
          .map(({ domain, total }) => (
            <li key={domain.id}>
              <Link to={guideRoutePath(locale, domain.id)} className="home-more-link">
                {ui.index.all(GUIDE_UI[locale].domain[domain.id], total)}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}
