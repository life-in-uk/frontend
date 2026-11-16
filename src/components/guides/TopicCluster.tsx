import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getGuide, getLocalizedGuide } from "../../guides/api";
import type { GuideMetadata, GuideSource } from "../../guides/api";
import { GUIDE_UI } from "../../guides/locales";
import type { GuideLocale } from "../../guides/locales";
import { CLUSTER_COPY, officialSourcesFor } from "../../guides/topicClusters";

/**
 * The GOV.UK pages the section's published Guides cite most. Read from the
 * Guides themselves; shows nothing until they load, or if they cannot.
 */
export function ClusterOfficialSources({ guides, locale }: { guides: readonly GuideMetadata[]; locale: GuideLocale }) {
  const [sources, setSources] = useState<GuideSource[]>([]);
  const slugs = guides.map((guide) => guide.slug).join(",");
  useEffect(() => {
    if (!slugs) return;
    const controller = new AbortController();
    const load = (slug: string) =>
      locale === "zh-CN" ? getGuide(slug, controller.signal) : getLocalizedGuide(slug, locale, controller.signal).then((row) => row.guide);
    Promise.allSettled(slugs.split(",").map(load)).then((results) => {
      if (controller.signal.aborted) return;
      setSources(officialSourcesFor(results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))));
    });
    return () => controller.abort();
  }, [slugs, locale]);
  if (sources.length === 0) return null;
  return (
    <section className="cluster-official" aria-labelledby="cluster-official-title">
      <h2 id="cluster-official-title">{CLUSTER_COPY.official[locale]}</h2>
      <ul>
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" lang="en" dir="ltr">
              {source.title}
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            <span className="sr-only">{GUIDE_UI[locale].newWindow}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
