import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ExternalLink, Landmark } from "lucide-react";
import { getGuides, getLocalizedGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import { GUIDE_DOMAINS } from "../../guides/domains";
import { formatUkDateFor } from "../../guides/format";
import { GUIDE_LOCALE_LANG, guideRoutePath } from "../../guides/locales";
import type { GuideLocale } from "../../guides/locales";
import {
  SETTLEMENT_COPY,
  SETTLEMENT_GUIDES,
  SETTLEMENT_KEY_DATES,
  SETTLEMENT_TOPICS,
} from "../../guides/settlementPlan";
import { Link } from "../Link";
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";
import { ClusterOfficialSources } from "../guides/TopicCluster";
import { useClusterHubSeo } from "../guides/useClusterHubSeo";
import "../work-visa/WorkVisa.css";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: ReadonlyMap<string, GuideMetadata> };

const key = (domain: string, slug: string) => `${domain}/${slug}`;

/**
 * Settlement / ILR hub. The reading order is editorial; titles, summaries and
 * dates come from the published Guide API for this locale, and a Guide is
 * linked only when the API lists it in its own domain's category. It reuses
 * the Work Visa hub's layout and styles.
 */
export function SettlementHub({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const copy = SETTLEMENT_COPY[locale];
  const [state, setState] = useState<State>({ status: "loading" });
  useClusterHubSeo("settlement", locale);

  useEffect(() => {
    const controller = new AbortController();
    const load = locale === "zh-CN" ? getGuides(controller.signal) : getLocalizedGuides(locale, controller.signal);
    load
      .then((guides) => {
        const map = new Map<string, GuideMetadata>();
        for (const ref of SETTLEMENT_GUIDES) {
          const guide = guides.find((item) => item.slug === ref.slug && item.category === GUIDE_DOMAINS[ref.domain].category);
          if (guide) map.set(key(ref.domain, ref.slug), guide);
        }
        setState({ status: "ready", guides: map });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [locale]);

  const position = (slug: string) => SETTLEMENT_GUIDES.findIndex((ref) => ref.slug === slug) + 1;

  return (
    <main id="main" className="work-visa-page work-hub settlement-hub">
      <div className="guide-toolbar">
        <GuideLanguageSelect locale={locale} domain="settlement" />
      </div>
      <section className="work-hero" aria-labelledby="settlement-title">
        <span className="eyebrow work-eyebrow">
          <Landmark size={15} aria-hidden="true" />
          {copy.eyebrow}
        </span>
        <h1 id="settlement-title">{copy.title}</h1>
        <p className="work-hero-lead">{copy.lead}</p>
        <p className="work-hero-note">{copy.note}</p>
      </section>

      <div className="work-status" role="note" aria-labelledby="settlement-status-title">
        <h2 id="settlement-status-title">{copy.noticeTitle}</h2>
        <p>{copy.notice}</p>
        <p>{copy.adviser}</p>
        <a className="work-official-link" href="https://www.gov.uk/indefinite-leave-to-remain" target="_blank" rel="noopener noreferrer">
          <span lang="en">GOV.UK · Check if you can get indefinite leave to remain</span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <nav className="work-topics-nav" aria-label={copy.topicsNav}>
        <ul>
          {SETTLEMENT_TOPICS.map((topic) => (
            <li key={topic.id}>
              <a href={`#settlement-topic-${topic.id}`}>{topic.title[locale]}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="work-plan" aria-labelledby="settlement-plan-title">
        <div className="work-section-heading">
          <h2 id="settlement-plan-title">{copy.planTitle}</h2>
          <p>{copy.planLead}</p>
        </div>
        {state.status === "loading" && <p className="work-plan-status" role="status">{copy.loading}</p>}
        {state.status === "error" && <p className="work-plan-status" role="status">{copy.unavailable}</p>}
        {state.status === "ready" &&
          SETTLEMENT_TOPICS.map((topic) => (
            <section
              key={topic.id}
              id={`settlement-topic-${topic.id}`}
              className="work-topic"
              aria-labelledby={`settlement-topic-${topic.id}-title`}
            >
              <header className="work-topic-head">
                <h3 id={`settlement-topic-${topic.id}-title`}>{topic.title[locale]}</h3>
                <p>{topic.lead[locale]}</p>
              </header>
              <ol className="work-guide-list">
                {topic.guides.map((ref) => {
                  const guide = state.guides.get(key(ref.domain, ref.slug));
                  return (
                    <li key={ref.slug} className="work-guide-card" data-slug={ref.slug}>
                      <span className="work-guide-number" aria-hidden="true">{position(ref.slug)}</span>
                      <div className="work-guide-body">
                        {guide ? (
                          <>
                            <h4>
                              <Link to={guideRoutePath(locale, ref.domain, ref.slug)} className="work-guide-link">
                                {guide.title}
                              </Link>
                            </h4>
                            <p className="work-guide-covers">{guide.summary}</p>
                            <span className="work-guide-meta">
                              <CalendarDays size={13} aria-hidden="true" />
                              {copy.updated}{" "}
                              <time dateTime={guide.updatedAt}>{formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale])}</time>
                              {ref.domain !== "settlement" && <span className="work-guide-badge">{copy.otherSection}</span>}
                              <ArrowRight size={14} aria-hidden="true" />
                            </span>
                          </>
                        ) : (
                          <p className="work-guide-covers">{copy.notPublished}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
      </section>

      {state.status === "ready" && (
        <ClusterOfficialSources
          guides={[...state.guides.values()].filter((guide) => guide.category === GUIDE_DOMAINS.settlement.category)}
          locale={locale}
        />
      )}

      <section className="work-dates" aria-labelledby="settlement-dates-title">
        <div className="work-section-heading">
          <h2 id="settlement-dates-title">{copy.datesTitle}</h2>
          <p>{copy.datesLead}</p>
        </div>
        <ul className="work-date-list">
          {SETTLEMENT_KEY_DATES.map((item) => (
            <li key={item.date} data-proposed={item.proposed || undefined}>
              <span className="work-date-label">
                <CalendarDays size={14} aria-hidden="true" />
                {item.date === "pending" ? item.label[locale] : <time dateTime={item.date}>{item.label[locale]}</time>}
              </span>
              <span>
                {item.proposed && <span className="work-guide-badge">{copy.proposed}</span>} {item.text[locale]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
