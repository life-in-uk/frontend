import { ArrowRight, Coins, FileText, HeartPulse } from "lucide-react";
import type { PlacedGuide } from "../../home/featured";
import { formatUkDate, shortGuideTitle } from "../../guides/format";
import { Link } from "../Link";
import { guidePath } from "../../guides/domains";

/** Restrained, consistent artwork stand-in: no Guide has an approved image. */
function GuideCover({ domainId }: { domainId: string }) {
  const Icon = domainId === "money" ? Coins : HeartPulse;
  return (
    <span className="guide-cover" aria-hidden="true">
      <Icon size={56} strokeWidth={1.3} />
    </span>
  );
}

export function FeaturedGuideCard({ guide, domain }: PlacedGuide) {
  return (
    <li className={`featured-card featured-${domain.id}`}>
      <Link to={guidePath(domain, guide.slug)} className="featured-card-link">
        <span className="featured-media">
          <GuideCover domainId={domain.id} />
          <span className="featured-tag">{domain.label}</span>
        </span>
        <div className="featured-body">
          <h3>{shortGuideTitle(guide.title)}</h3>
          <span className="featured-summary">{guide.summary}</span>
          <span className="featured-meta">
            <FileText size={15} aria-hidden="true" />
            完整指南 · 更新于{" "}
            <time dateTime={guide.updatedAt}>{formatUkDate(guide.updatedAt)}</time>
          </span>
        </div>
      </Link>
    </li>
  );
}

type FeaturedGuidesProps = {
  status: "loading" | "error" | "ready";
  guides: PlacedGuide[];
};

export function FeaturedGuides({ status, guides }: FeaturedGuidesProps) {
  return (
    <section className="home-container home-section" aria-labelledby="featured-title">
      <div className="home-section-head">
        <h2 id="featured-title">精选指南</h2>
        <p>从最常见、最实用的问题开始，快速了解在英国生活的关键事项。</p>
        <a href="#all-guides" className="home-more-link">
          查看更多指南
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
          正在加载指南…
        </p>
      )}
      {status === "error" && (
        <p className="home-notice" role="status">
          指南列表暂时无法加载，请稍后再试，或从上方主题进入。
        </p>
      )}
      {status === "ready" && guides.length === 0 && (
        <p className="home-notice">指南正在编写和核对中，发布后会显示在这里。</p>
      )}
      {guides.length > 0 && (
        <ul className="featured-grid">
          {guides.map((item) => (
            <FeaturedGuideCard key={item.guide.slug} {...item} />
          ))}
        </ul>
      )}
    </section>
  );
}
