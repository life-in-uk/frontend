import { ArrowRight } from "lucide-react";
import type { PlacedGuide } from "../../home/featured";
import type { GuideDomain } from "../../guides/domains";
import { guidePath } from "../../guides/domains";
import { formatUkDate, shortGuideTitle } from "../../guides/format";
import { Link } from "../Link";

type GuideIndexProps = {
  /** Published Guides not already featured, most recent first. */
  guides: PlacedGuide[];
  /** Launched sections with their published Guide totals. */
  sections: { domain: GuideDomain; total: number }[];
  limit: number;
};

/**
 * Compact list of further published Guides. It is capped, with links to
 * each section hub, so it stays short as the catalogue grows.
 */
export function GuideIndex({ guides, sections, limit }: GuideIndexProps) {
  if (guides.length === 0) return null;
  return (
    <section
      id="all-guides"
      className="home-container home-section"
      aria-labelledby="all-guides-title"
    >
      <div className="home-section-head">
        <h2 id="all-guides-title">更多指南</h2>
        <p>最近更新的已发布指南。</p>
      </div>
      <ul className="guide-index">
        {guides.slice(0, limit).map(({ guide, domain }) => (
          <li key={guide.slug}>
            <Link to={guidePath(domain, guide.slug)} className="guide-index-link">
              <span className={`guide-index-tag tag-${domain.id}`}>
                {domain.label}
              </span>
              <span className="guide-index-title">
                {shortGuideTitle(guide.title)}
              </span>
              <time dateTime={guide.updatedAt}>
                {formatUkDate(guide.updatedAt)}
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
              <Link to={domain.basePath} className="home-more-link">
                {domain.label}：全部 {total} 篇指南
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
      </ul>
    </section>
  );
}
