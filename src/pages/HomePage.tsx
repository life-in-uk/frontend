import { useEffect, useMemo } from "react";
import { HomeHero } from "../components/home/HomeHero";
import { TopicGrid } from "../components/home/TopicGrid";
import type { TopicCount } from "../components/home/TopicGrid";
import { BankHolidaySummary } from "../components/home/BankHolidaySummary";
import { TransportSummary } from "../components/home/TransportSummary";
import { FeaturedGuides } from "../components/home/FeaturedGuides";
import { GuideIndex } from "../components/home/GuideIndex";
import { CommonQuestions } from "../components/home/CommonQuestions";
import type { QuestionGroup } from "../components/home/CommonQuestions";
import { TrustSection } from "../components/home/TrustSection";
import { HEALTH_QUICK_LINKS } from "../guides/catalog";
import { guidePath, HEALTH_GUIDE_DOMAIN, MONEY_GUIDE_DOMAIN } from "../guides/domains";
import { MONEY_QUICK_ANSWERS } from "../guides/moneyQuickAnswers";
import { byRecentUpdate, placeGuides, selectFeatured } from "../home/featured";
import { buildSearchIndex } from "../home/search";
import { FEATURED_GUIDE_SLUGS, HOME_TOPICS, launchedTopics } from "../home/topics";
import { usePublishedGuides } from "../home/usePublishedGuides";
import "../components/home/Home.css";

const FEATURED_COUNT = 4;
const MORE_GUIDES_LIMIT = 8;
const QUESTIONS_PER_GROUP = 6;

const LAUNCHED = launchedTopics();
const DOMAINS = LAUNCHED.map((topic) => topic.domain);
const QUICK_ANSWER_SOURCES = [
  { set: MONEY_QUICK_ANSWERS, domain: MONEY_GUIDE_DOMAIN },
];

export function HomePage() {
  const state = usePublishedGuides();
  const guides = state.status === "ready" ? state.guides : undefined;

  // Arriving at /#about from another page: scroll once the section exists.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id === "about" || id === "all-guides")
      document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  const content = useMemo(() => {
    if (!guides) return undefined;
    const placed = placeGuides(guides, DOMAINS);
    const slugs = new Set(placed.map((item) => item.guide.slug));
    const answersPublished = placed.some(
      (item) =>
        item.guide.slug === MONEY_QUICK_ANSWERS.guideSlug &&
        item.domain === MONEY_GUIDE_DOMAIN,
    );
    const counts = new Map<string, TopicCount>(
      LAUNCHED.map((topic) => [
        topic.id,
        {
          guides: placed.filter((item) => item.domain === topic.domain).length,
          questions:
            topic.domain === MONEY_GUIDE_DOMAIN && answersPublished
              ? MONEY_QUICK_ANSWERS.answers.length
              : 0,
        },
      ]),
    );
    const featured = selectFeatured(placed, FEATURED_GUIDE_SLUGS, FEATURED_COUNT);
    const more = byRecentUpdate(placed).filter((item) => !featured.includes(item));
    const questionGroups: QuestionGroup[] = [
      {
        id: "health",
        title: HEALTH_GUIDE_DOMAIN.label,
        icon: "health",
        note: "指向完整指南",
        questions: HEALTH_QUICK_LINKS.filter((link) => slugs.has(link.slug))
          .slice(0, QUESTIONS_PER_GROUP)
          .map((link) => ({
            question: link.question,
            href: guidePath(HEALTH_GUIDE_DOMAIN, link.slug),
          })),
        hub: { href: HEALTH_GUIDE_DOMAIN.basePath, label: "进入健康与 NHS" },
      },
      {
        id: "money",
        title: MONEY_GUIDE_DOMAIN.label,
        icon: "money",
        note: "简短回答，可查看依据",
        questions: answersPublished
          ? MONEY_QUICK_ANSWERS.answers
              .slice(0, QUESTIONS_PER_GROUP)
              .map((answer) => ({
                question: answer.question,
                href: MONEY_GUIDE_DOMAIN.basePath,
              }))
          : [],
        hub: { href: MONEY_GUIDE_DOMAIN.basePath, label: "进入金钱与财务" },
      },
    ];
    return {
      counts,
      featured,
      more,
      questionGroups,
      sections: LAUNCHED.map((topic) => ({
        domain: topic.domain,
        total: counts.get(topic.id)?.guides ?? 0,
      })),
      index: buildSearchIndex(guides, DOMAINS, QUICK_ANSWER_SOURCES),
    };
  }, [guides]);

  return (
    <main id="main" className="home-page">
      <HomeHero
        index={
          state.status === "error" ? "error" : (content?.index ?? null)
        }
      />
      <TopicGrid topics={HOME_TOPICS} counts={content?.counts} />
      <div className="home-container home-practical">
        <BankHolidaySummary />
        <TransportSummary />
      </div>
      <FeaturedGuides status={state.status} guides={content?.featured ?? []} />
      {content && (
        <>
          <GuideIndex
            guides={content.more}
            sections={content.sections}
            limit={MORE_GUIDES_LIMIT}
          />
          <CommonQuestions groups={content.questionGroups} />
        </>
      )}
      <TrustSection />
    </main>
  );
}
