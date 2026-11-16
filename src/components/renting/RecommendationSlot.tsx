import { ExternalLink } from "lucide-react";
import type { GuideLocale } from "../../guides/locales";
import { activeRecommendations, RECOMMENDATION_LABEL } from "../../guides/recommendations";
import type { RecommendationContext } from "../../guides/recommendations";

/**
 * An optional commercial recommendation slot. Renders nothing (not even an
 * empty container) unless the slot is enabled with a valid partner; all slots
 * are currently disabled. When active it is a plain list of sponsored links,
 * each with its disclosure, and loads no scripts, images or trackers.
 */
export function RecommendationSlot({ context, locale }: { context: RecommendationContext; locale: GuideLocale }) {
  const partners = activeRecommendations(context);
  if (partners.length === 0) return null;
  return (
    <aside className="renting-recommendation" data-recommendation={context} aria-label={RECOMMENDATION_LABEL[locale]}>
      <h4>{RECOMMENDATION_LABEL[locale]}</h4>
      <ul>
        {partners.map((partner) => (
          <li key={partner.id}>
            <a href={partner.url} target="_blank" rel="sponsored noopener noreferrer">
              <span lang="en" dir="ltr">{partner.name}</span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            <p>{partner.description[locale]}</p>
            <p className="renting-recommendation-disclosure">{partner.disclosure[locale]}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
