import { useEffect } from "react";
import type { GuideDomainId } from "../../guides/domains";
import { localizedGuidePath } from "../../guides/locales";
import type { GuideLocale } from "../../guides/locales";
import { applyGuideSeo, clearGuideSeo, hubAlternates } from "../../guides/seo";
import { TOPIC_CLUSTERS } from "../../guides/topicClusters";

/** Hub SEO for a topic-cluster section: same title, description and links as the prerendered page. */
export function useClusterHubSeo(domainId: GuideDomainId, locale: GuideLocale): void {
  useEffect(() => {
    const cluster = TOPIC_CLUSTERS[domainId];
    if (!cluster) return;
    applyGuideSeo({
      locale,
      canonical: new URL(localizedGuidePath(locale, domainId), window.location.origin).href,
      title: `${cluster.seoTitle[locale]} · Life in UK`,
      description: cluster.seoDescription[locale],
      alternates: hubAlternates(window.location.origin, domainId),
    });
    return () => clearGuideSeo(locale);
  }, [domainId, locale]);
}

