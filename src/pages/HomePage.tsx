import { HOUSEHOLD_CATEGORY } from "../guides/household";
import { useEffect, useMemo, useState } from "react";
import { HomeHero } from "../components/home/HomeHero";
import { TopicGrid } from "../components/home/TopicGrid";
import type { TopicCount } from "../components/home/TopicGrid";
import { BankHolidaySummary } from "../components/home/BankHolidaySummary";
import { LiveServices } from "../components/home/LiveServices";
import { FeaturedGuides } from "../components/home/FeaturedGuides";
import { GuideIndex } from "../components/home/GuideIndex";
import { CommonQuestions } from "../components/home/CommonQuestions";
import type { QuestionGroup } from "../components/home/CommonQuestions";
import { TrustSection } from "../components/home/TrustSection";
import { getLocalizedGuides } from "../guides/api";
import type { GuideMetadata } from "../guides/api";
import { HEALTH_QUICK_LINKS } from "../guides/catalog";
import { UNIVERSITY_CATEGORY, guidePath, HEALTH_GUIDE_DOMAIN, MONEY_GUIDE_DOMAIN } from "../guides/domains";
import { GUIDE_LOCALE_LANG, GUIDE_UI, guideRoutePath, textDirection, type GuideLocale } from "../guides/locales";
import { SITE_UI } from "../guides/siteUi";
import { MONEY_QUICK_ANSWERS } from "../guides/moneyQuickAnswers";
import { moneyQuickAnswersFor } from "../guides/moneyQuickAnswersLocales";
import { byRecentUpdate, localizeHomeGuides, selectFeatured } from "../home/featured";
import { buildSearchIndex } from "../home/search";
import { FEATURED_GUIDE_SLUGS, availableHomeTopics, launchedTopics } from "../home/topics";
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

type LocalizedState = { status: "loading" } | { status: "error" } | { status: "ready"; guides: GuideMetadata[] };

/** The published list for a translated home page; zh-CN needs none. */
function useLocalizedGuides(locale: GuideLocale): LocalizedState {
  const [state, setState] = useState<LocalizedState>(
    locale === "zh-CN" ? { status: "ready", guides: [] } : { status: "loading" },
  );
  useEffect(() => {
    if (locale === "zh-CN") return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    getLocalizedGuides(locale, controller.signal)
      .then((guides) => { if (active) setState({ status: "ready", guides }); })
      .catch(() => { if (active) setState({ status: "error" }); })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locale]);
  return state;
}

export function HomePage({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const source = usePublishedGuides();
  const localized = useLocalizedGuides(locale);
  const translatedPage = locale !== "zh-CN";
  const ui = SITE_UI[locale];
  const status =
    source.status === "error" || localized.status === "error"
      ? "error"
      : source.status === "ready" && localized.status === "ready"
        ? "ready"
        : "loading";
  const guides = source.status === "ready" ? source.guides : undefined;
  const translations = localized.status === "ready" ? localized.guides : undefined;
  // Translated home cards can show labelled Chinese fallbacks. Search uses
  // only the selected locale's public list, independently of those cards.
  const searchSource = translatedPage ? localized : source;
  const universityAvailable = searchSource.status === "ready" &&
    searchSource.guides.some((guide) => guide.category === UNIVERSITY_CATEGORY);
  const householdAvailable = searchSource.status === "ready" &&
    searchSource.guides.some((guide) => guide.category === HOUSEHOLD_CATEGORY);
  const educationAvailable = searchSource.status === "ready" &&
    searchSource.guides.some((guide) => guide.category === "education");
  const searchIndex = useMemo(() => {
    if (searchSource.status === "loading") return null;
    if (searchSource.status === "error") return "error";
    return buildSearchIndex(searchSource.guides, DOMAINS, QUICK_ANSWER_SOURCES, locale);
  }, [searchSource, locale]);

  // Arriving at /#about from another page: scroll once the section exists.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id === "about" || id === "all-guides")
      document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  const content = useMemo(() => {
    if (!guides || !translations) return undefined;
    const items = localizeHomeGuides(guides, translations, DOMAINS, locale);
    const slugs = new Set(items.map((item) => item.guide.slug));
    // Money Quick Answers count only when their Guide is published in this
    // language (each locale's answers are checked against its own Guide).
    const answersPublished = items.some(
      (item) =>
        item.guide.slug === MONEY_QUICK_ANSWERS.guideSlug &&
        item.domain === MONEY_GUIDE_DOMAIN &&
        !item.fallback,
    );
    const quickAnswers = moneyQuickAnswersFor(locale);
    const counts = new Map<string, TopicCount>(
      LAUNCHED.map((topic) => {
        const inTopic = items.filter((item) => item.domain === topic.domain);
        return [
          topic.id,
          {
            guides: inTopic.length,
            translated: inTopic.filter((item) => !item.fallback).length,
            questions:
              topic.domain === MONEY_GUIDE_DOMAIN && answersPublished
                ? quickAnswers.answers.length
                : 0,
          },
        ];
      }),
    );
    const featured = selectFeatured(items, FEATURED_GUIDE_SLUGS, FEATURED_COUNT);
    const more = byRecentUpdate(items).filter((item) => !featured.includes(item));
    const label = (domainId: "health" | "money") => GUIDE_UI[locale].domain[domainId];
    const healthQuestions = translatedPage
      ? items
          .filter((item) => item.domain === HEALTH_GUIDE_DOMAIN && !item.fallback)
          .map((item) => ({ question: item.guide.title, href: item.href }))
      : HEALTH_QUICK_LINKS.filter((link) => slugs.has(link.slug)).map((link) => ({
          question: link.question,
          href: guidePath(HEALTH_GUIDE_DOMAIN, link.slug),
        }));
    const questionGroups: QuestionGroup[] = [
      {
        id: "health",
        title: label("health"),
        icon: "health",
        note: ui.questions.healthNote,
        questions: healthQuestions.slice(0, QUESTIONS_PER_GROUP),
        hub: { href: guideRoutePath(locale, "health"), label: ui.questions.enter(label("health")) },
      },
      {
        id: "money",
        title: label("money"),
        icon: "money",
        note: ui.questions.moneyNote,
        questions: answersPublished
          ? quickAnswers.answers
              .slice(0, QUESTIONS_PER_GROUP)
              .map((answer) => ({
                question: answer.question,
                href: guideRoutePath(locale, MONEY_GUIDE_DOMAIN.id),
              }))
          : [],
        hub: { href: guideRoutePath(locale, "money"), label: ui.questions.enter(label("money")) },
      },
    ];
    return {
      counts,
      featured,
      more,
      questionGroups,
      sections: LAUNCHED.filter((topic) => (topic.id !== UNIVERSITY_CATEGORY || universityAvailable) && (topic.id !== "education" || educationAvailable) && (topic.id !== HOUSEHOLD_CATEGORY || householdAvailable)).map((topic) => ({
        domain: topic.domain,
        total: counts.get(topic.id)?.guides ?? 0,
      })),
    };
  }, [guides, translations, locale, translatedPage, ui, universityAvailable, educationAvailable, householdAvailable]);

  return (
    <main
      id="main"
      className="home-page"
      lang={translatedPage ? GUIDE_LOCALE_LANG[locale] : undefined}
      dir={translatedPage ? textDirection(locale) : undefined}
    >
      <HomeHero locale={locale} index={searchIndex} />
      {/* Live Services sit directly under the search so they are reachable on a phone without scrolling far. */}
      <div className="home-container home-travel">
        <LiveServices locale={locale} />
      </div>
      <TopicGrid locale={locale} topics={availableHomeTopics(universityAvailable, educationAvailable, householdAvailable)} counts={content?.counts} />
      <div className="home-container home-practical">
        <BankHolidaySummary locale={locale} />
      </div>
      <FeaturedGuides locale={locale} status={status} guides={content?.featured ?? []} />
      {content && (
        <>
          <GuideIndex
            locale={locale}
            guides={content.more}
            sections={content.sections}
            limit={MORE_GUIDES_LIMIT}
          />
          <CommonQuestions locale={locale} groups={content.questionGroups} />
        </>
      )}
      <TrustSection locale={locale} />
    </main>
  );
}
