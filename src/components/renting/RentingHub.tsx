import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, House } from "lucide-react";
import { getGuides, getLocalizedGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import { RENTING_GUIDE_DOMAIN } from "../../guides/domains";
import { formatUkDateFor } from "../../guides/format";
import { GUIDE_LOCALE_LANG, guideRoutePath } from "../../guides/locales";
import type { GuideLocale } from "../../guides/locales";
import { RENTING_COPY, RENTING_GUIDE_SLUGS } from "../../guides/rentingJourney";
import { Link } from "../Link";
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";
import { RentingJourney } from "./RentingJourney";
import { CLUSTER_COPY, clusterGroupsFor } from "../../guides/topicClusters";
import { ClusterOfficialSources } from "../guides/TopicCluster";
import { useClusterHubSeo } from "../guides/useClusterHubSeo";
import "../work-visa/WorkVisa.css";
import "./Renting.css";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: ReadonlyMap<string, GuideMetadata> };

/**
 * Renting & Moving In hub (England, letting-agency lets). Titles, summaries
 * and dates come from the published Guide API for this locale; a Guide is
 * linked only when the API lists it in the renting category. Reuses the Work
 * Visa hub layout.
 */
export function RentingHub({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const copy = RENTING_COPY;
  const [state, setState] = useState<State>({ status: "loading" });
  useClusterHubSeo("renting", locale);
  const position = (slug: string) => RENTING_GUIDE_SLUGS.indexOf(slug as (typeof RENTING_GUIDE_SLUGS)[number]) + 1;

  useEffect(() => {
    const controller = new AbortController();
    const load = locale === "zh-CN" ? getGuides(controller.signal) : getLocalizedGuides(locale, controller.signal);
    load
      .then((guides) => {
        const map = new Map<string, GuideMetadata>();
        for (const slug of RENTING_GUIDE_SLUGS) {
          const guide = guides.find((item) => item.slug === slug && item.category === RENTING_GUIDE_DOMAIN.category);
          if (guide) map.set(slug, guide);
        }
        setState({ status: "ready", guides: map });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [locale]);

  const published = state.status === "ready" ? state.guides : null;

  return (
    <main id="main" className="work-visa-page work-hub renting-hub">
      <div className="guide-toolbar">
        <GuideLanguageSelect locale={locale} domain="renting" />
      </div>
      <section className="work-hero" aria-labelledby="renting-title">
        <span className="eyebrow work-eyebrow">
          <House size={15} aria-hidden="true" />
          {copy.eyebrow[locale]}
        </span>
        <h1 id="renting-title">{copy.title[locale]}</h1>
        <p className="work-hero-lead">{copy.lead[locale]}</p>
      </section>

      <div className="work-status" role="note" aria-labelledby="renting-status-title">
        <h2 id="renting-status-title">{copy.noticeTitle[locale]}</h2>
        <p>{copy.notice[locale]}</p>
        <p>{copy.help[locale]}</p>
      </div>

      {state.status === "error" ? (
        <p className="work-plan-status" role="status">{copy.unavailable[locale]}</p>
      ) : (
        <RentingJourney locale={locale} published={published} />
      )}

      <section className="work-plan" aria-labelledby="renting-guides-title">
        <div className="work-section-heading">
          <h2 id="renting-guides-title">{copy.guidesTitle[locale]}</h2>
          <p>{copy.guidesLead[locale]}</p>
        </div>
        {state.status === "loading" && <p className="work-plan-status" role="status">{copy.loading[locale]}</p>}
        {state.status === "error" && <p className="work-plan-status" role="status">{copy.unavailable[locale]}</p>}
        {state.status === "ready" && (
          <div className="renting-topics">
            {clusterGroupsFor("renting", locale, [...state.guides.values()], CLUSTER_COPY.other[locale]).map((group) => (
              <section key={group.id} className="renting-topic" data-topic={group.id}>
                <h3>{group.title}</h3>
                <ol className="work-guide-list">
                  {group.guides.map(({ guide, domain }) => (
                    <li key={guide.slug} className="work-guide-card" data-slug={guide.slug}>
                      <span className="work-guide-number" aria-hidden="true">{position(guide.slug)}</span>
                      <div className="work-guide-body">
                        <h4 className="renting-card-title">
                          <Link to={guideRoutePath(locale, domain, guide.slug)} className="work-guide-link">
                            {guide.title}
                          </Link>
                        </h4>
                        <p className="work-guide-covers">{guide.summary}</p>
                        <span className="work-guide-meta">
                          <CalendarDays size={13} aria-hidden="true" />
                          {copy.updated[locale]}{" "}
                          <time dateTime={guide.updatedAt}>{formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale])}</time>
                          <ArrowRight size={14} aria-hidden="true" />
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            <ClusterOfficialSources guides={[...state.guides.values()]} locale={locale} />
          </div>
        )}
      </section>
    </main>
  );
}
