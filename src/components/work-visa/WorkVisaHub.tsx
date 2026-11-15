import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, CalendarDays, ExternalLink } from "lucide-react";
import { getGuides, getLocalizedGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import { domainGuides, WORK_VISA_GUIDE_DOMAIN } from "../../guides/domains";
import { formatUkDateFor } from "../../guides/format";
import { GUIDE_LOCALE_LANG, guideRoutePath } from "../../guides/locales";
import type { GuideLocale } from "../../guides/locales";
import {
  WORK_VISA_COPY,
  WORK_VISA_KEY_DATES,
  WORK_VISA_SLUGS,
  WORK_VISA_TOPICS,
} from "../../guides/workVisaPlan";
import { Link } from "../Link";
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";
import { SettlementCrossLink } from "../settlement/SettlementCrossLink";
import "./WorkVisa.css";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: ReadonlyMap<string, GuideMetadata> };

/**
 * Work Visa (Skilled Worker) hub. The reading order is editorial; titles,
 * summaries and dates come from the published Guide API for this locale, and
 * a Guide is linked only when the API lists it.
 */
export function WorkVisaHub({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const copy = WORK_VISA_COPY[locale];
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const load = locale === "zh-CN" ? getGuides(controller.signal) : getLocalizedGuides(locale, controller.signal);
    load
      .then((guides) =>
        setState({
          status: "ready",
          guides: new Map(domainGuides(guides, WORK_VISA_GUIDE_DOMAIN).map((guide) => [guide.slug, guide])),
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [locale]);

  const position = (slug: string) => WORK_VISA_SLUGS.indexOf(slug) + 1;

  return (
    <main id="main" className="work-visa-page work-hub">
      <div className="guide-toolbar">
        <GuideLanguageSelect locale={locale} domain="work-visa" />
      </div>
      <section className="work-hero" aria-labelledby="work-title">
        <span className="eyebrow work-eyebrow">
          <Briefcase size={15} aria-hidden="true" />
          {copy.eyebrow}
        </span>
        <h1 id="work-title">{copy.title}</h1>
        <p className="work-hero-lead">{copy.lead}</p>
        <p className="work-hero-note">{copy.note}</p>
      </section>

      <div className="work-status" role="note" aria-labelledby="work-status-title">
        <h2 id="work-status-title">{copy.noticeTitle}</h2>
        <p>{copy.notice}</p>
        <p>{copy.adviser}</p>
        <a className="work-official-link" href="https://www.gov.uk/skilled-worker-visa" target="_blank" rel="noopener noreferrer">
          <span lang="en">GOV.UK · Skilled Worker visa</span>
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <nav className="work-topics-nav" aria-label={copy.topicsNav}>
        <ul>
          {WORK_VISA_TOPICS.map((topic) => (
            <li key={topic.id}>
              <a href={`#work-topic-${topic.id}`}>{topic.title[locale]}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="work-plan" aria-labelledby="work-plan-title">
        <div className="work-section-heading">
          <h2 id="work-plan-title">{copy.planTitle}</h2>
          <p>{copy.planLead}</p>
        </div>
        {state.status === "loading" && <p className="work-plan-status" role="status">{copy.loading}</p>}
        {state.status === "error" && <p className="work-plan-status" role="status">{copy.unavailable}</p>}
        {state.status === "ready" &&
          WORK_VISA_TOPICS.map((topic) => (
            <section key={topic.id} id={`work-topic-${topic.id}`} className="work-topic" aria-labelledby={`work-topic-${topic.id}-title`}>
              <header className="work-topic-head">
                <h3 id={`work-topic-${topic.id}-title`}>{topic.title[locale]}</h3>
                <p>{topic.lead[locale]}</p>
              </header>
              <ol className="work-guide-list">
                {topic.slugs.map((slug) => {
                  const guide = state.guides.get(slug);
                  const number = position(slug);
                  return (
                    <li key={slug} className="work-guide-card">
                      <span className="work-guide-number" aria-hidden="true">{number}</span>
                      <div className="work-guide-body">
                        {guide ? (
                          <>
                            <h4>
                              <Link to={guideRoutePath(locale, "work-visa", slug)} className="work-guide-link">
                                {guide.title}
                              </Link>
                            </h4>
                            <p className="work-guide-covers">{guide.summary}</p>
                            <span className="work-guide-meta">
                              <CalendarDays size={13} aria-hidden="true" />
                              {copy.updated}{" "}
                              <time dateTime={guide.updatedAt}>{formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale])}</time>
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

      <section className="work-dates" aria-labelledby="work-dates-title">
        <div className="work-section-heading">
          <h2 id="work-dates-title">{copy.datesTitle}</h2>
          <p>{copy.datesLead}</p>
        </div>
        <ul className="work-date-list">
          {WORK_VISA_KEY_DATES.map((item) => (
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
      <SettlementCrossLink locale={locale} />
    </main>
  );
}
