import type { ReactNode } from "react";
import {
  ArrowRight,
  BusFront,
  Coins,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
} from "lucide-react";
import { topicHref, type HomeTopic, type TopicIcon } from "../../home/topics";
import { Link } from "../Link";
import { type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";

const ICONS: Record<TopicIcon, ReactNode> = {
  heart: <HeartPulse size={30} strokeWidth={1.8} aria-hidden="true" />,
  coins: <Coins size={30} strokeWidth={1.8} aria-hidden="true" />,
  "id-card": <IdCard size={30} strokeWidth={1.8} aria-hidden="true" />,
  graduation: <GraduationCap size={30} strokeWidth={1.8} aria-hidden="true" />,
  house: <House size={30} strokeWidth={1.8} aria-hidden="true" />,
  bus: <BusFront size={30} strokeWidth={1.8} aria-hidden="true" />,
};

/** `translated`: Guides published in the page language (equals `guides` for zh-CN). */
export type TopicCount = { guides: number; translated: number; questions: number };

type TopicCardProps = {
  topic: HomeTopic;
  /** Published counts, once known. Never shown for upcoming topics. */
  count?: TopicCount;
  locale?: GuideLocale;
};

export function TopicCard({ topic, count, locale = "zh-CN" }: TopicCardProps) {
  const ui = SITE_UI[locale];
  const text = ui.topics[topic.id] ?? topic;
  const href = topicHref(topic, locale);
  const body = (
    <>
      <div className="topic-card-head">
        <span className="topic-card-icon">{ICONS[topic.icon]}</span>
        <h3>{text.title}</h3>
      </div>
      <p>{text.description}</p>
      <span className="topic-card-foot">
        {topic.domain ? (
          <>
            <span className="topic-card-count">
              {count && ui.topicGrid.count(count.guides, count.translated, count.questions)}
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </>
        ) : href ? (
          <ArrowRight size={18} aria-hidden="true" className="topic-card-arrow-only" />
        ) : (
          <span className="topic-card-soon">{ui.comingSoon}</span>
        )}
      </span>
    </>
  );
  return (
    <li className={`topic-card topic-${topic.tone}`}>
      {href ? (
        <Link to={href} className="topic-card-body">
          {body}
        </Link>
      ) : (
        <div className="topic-card-body" aria-disabled="true">
          {body}
        </div>
      )}
    </li>
  );
}

type TopicGridProps = {
  topics: readonly HomeTopic[];
  counts: ReadonlyMap<string, TopicCount> | undefined;
  locale?: GuideLocale;
};

export function TopicGrid({ topics, counts, locale = "zh-CN" }: TopicGridProps) {
  return (
    <section className="home-container home-topics" aria-labelledby="topics-title">
      <h2 id="topics-title" className="sr-only">
        {SITE_UI[locale].topicGrid.heading}
      </h2>
      <ul className="topic-grid">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} count={counts?.get(topic.id)} locale={locale} />
        ))}
      </ul>
    </section>
  );
}
