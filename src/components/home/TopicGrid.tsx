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
import type { HomeTopic, TopicIcon } from "../../home/topics";
import { Link } from "../Link";

const ICONS: Record<TopicIcon, ReactNode> = {
  heart: <HeartPulse size={30} strokeWidth={1.8} aria-hidden="true" />,
  coins: <Coins size={30} strokeWidth={1.8} aria-hidden="true" />,
  "id-card": <IdCard size={30} strokeWidth={1.8} aria-hidden="true" />,
  graduation: <GraduationCap size={30} strokeWidth={1.8} aria-hidden="true" />,
  house: <House size={30} strokeWidth={1.8} aria-hidden="true" />,
  bus: <BusFront size={30} strokeWidth={1.8} aria-hidden="true" />,
};

export type TopicCount = { guides: number; questions: number };

type TopicCardProps = {
  topic: HomeTopic;
  /** Published counts, once known. Never shown for upcoming topics. */
  count?: TopicCount;
};

export function TopicCard({ topic, count }: TopicCardProps) {
  const body = (
    <>
      <div className="topic-card-head">
        <span className="topic-card-icon">{ICONS[topic.icon]}</span>
        <h3>{topic.title}</h3>
      </div>
      <p>{topic.description}</p>
      <span className="topic-card-foot">
        {topic.domain ? (
          <>
            <span className="topic-card-count">
              {count &&
                [
                  count.guides > 0 && `${count.guides} 篇指南`,
                  count.questions > 0 && `${count.questions} 条解答`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </>
        ) : (
          <span className="topic-card-soon">即将推出</span>
        )}
      </span>
    </>
  );
  return (
    <li className={`topic-card topic-${topic.tone}`}>
      {topic.domain ? (
        <Link to={topic.domain.basePath} className="topic-card-body">
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
};

export function TopicGrid({ topics, counts }: TopicGridProps) {
  return (
    <section className="home-container home-topics" aria-labelledby="topics-title">
      <h2 id="topics-title" className="sr-only">
        按主题浏览
      </h2>
      <ul className="topic-grid">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} count={counts?.get(topic.id)} />
        ))}
      </ul>
    </section>
  );
}
