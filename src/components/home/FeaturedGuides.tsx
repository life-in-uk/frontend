import { ArrowRight, Coins, FileText, HeartPulse } from "lucide-react";
import { homeGuideTitle, itemLang } from "../../home/featured";
import type { HomeGuide } from "../../home/featured";
import { formatUkDateFor } from "../../guides/format";
import { GUIDE_LOCALE_LANG, GUIDE_UI, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import { Link } from "../Link";
import { FallbackBadge, ForeignText } from "../site/FallbackLabel";


/** Restrained, consistent artwork stand-in: no Guide has an approved image. */
function GuideCover({ domainId }: { domainId: string }) {
  const Icon = domainId === "money" ? Coins : HeartPulse;
  return (
    <span className="guide-cover" aria-hidden="true">
      <Icon size={56} strokeWidth={1.3} />
    </span>
  );
}

export function FeaturedGuideCard({ item, locale = "zh-CN" }: { item: HomeGuide; locale?: GuideLocale }) {
  const { guide, domain } = item;
  const ui = SITE_UI[locale];
  const lang = itemLang(item, locale);
  return (
    <li className={`featured-card featured-${domain.id}`} data-fallback={item.fallback || undefined}>
      <Link to={item.href} className="featured-card-link" hrefLang={lang}>
        <span className="featured-media">
          <GuideCover domainId={domain.id} />
          <span className="featured-tag">{GUIDE_UI[locale].domain[domain.id]}</span>
        </span>
        <div className="featured-body">
          <h3><ForeignText lang={lang}>{homeGuideTitle(item)}</ForeignText></h3>
          <FallbackBadge label={item.fallback && ui.fallbackBadge} />
          {/* lang/dir on the clamped element itself, so the ellipsis follows the text direction. */}
          <span className="featured-summary" lang={lang} dir={lang ? "ltr" : undefined}>{guide.summary}</span>
          <span className="featured-meta">
            <FileText size={15} aria-hidden="true" />
            {ui.featured.meta}{" "}
            <time dateTime={guide.updatedAt}>{formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale])}</time>
          </span>
        </div>
      </Link>
    </li>
  );
}

type FeaturedGuidesProps = {
  status: "loading" | "error" | "ready";
  guides: HomeGuide[];
  locale?: GuideLocale;
};

export function FeaturedGuides({ status, guides, locale = "zh-CN" }: FeaturedGuidesProps) {
  const ui = SITE_UI[locale].featured;
  return (
    <section className="home-container home-section" aria-labelledby="featured-title">
      <div className="home-section-head">
        <h2 id="featured-title">{ui.title}</h2>
        <p>{ui.text}</p>
        <a href="#all-guides" className="home-more-link">
          {ui.more}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
      {status === "loading" && (
        <ul className="featured-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="featured-card featured-skeleton" />
          ))}
        </ul>
      )}
      {status === "loading" && (
        <p className="sr-only" role="status">
          {GUIDE_UI[locale].loading}
        </p>
      )}
      {status === "error" && (
        <p className="home-notice" role="status">
          {ui.error}
        </p>
      )}
      {status === "ready" && guides.length === 0 && (
        <p className="home-notice">{ui.empty}</p>
      )}
      {guides.length > 0 && (
        <ul className="featured-grid">
          {guides.map((item) => (
            <FeaturedGuideCard key={item.guide.slug} item={item} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}
