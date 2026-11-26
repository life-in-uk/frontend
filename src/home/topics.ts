// Homepage topic structure. This is navigation configuration only: which
// sections exist, how they are described, and whether they are launched.
// Guide titles, summaries and counts always come from the Guide API.
//
// A topic is linked only when it is launched AND has a live route. Topics
// still in preparation render as "即将推出" without navigation, so the
// homepage never implies published content that does not exist.

import type { GuideDomain } from "../guides/domains";
import {
  FAMILY_VISA_GUIDE_DOMAIN,
  HEALTH_GUIDE_DOMAIN,
  HOUSEHOLD_GUIDE_DOMAIN,
  MONEY_GUIDE_DOMAIN,
  RENTING_GUIDE_DOMAIN,
  SETTLEMENT_GUIDE_DOMAIN,
  WORK_VISA_GUIDE_DOMAIN,
  EDUCATION_GUIDE_DOMAIN,
  UNIVERSITY_CATEGORY,
  UNIVERSITY_GUIDE_DOMAIN,
} from "../guides/domains.ts";
import { EDUCATION_COPY } from "../guides/education.ts";
import { HOUSEHOLD_CATEGORY, HOUSEHOLD_COPY } from "../guides/household.ts";
import { UNIVERSITY_COPY, guideRoutePath, type GuideLocale } from "../guides/locales.ts";

export type TopicTone =
  | "health"
  | "money"
  | "visa"
  | "education"
  | "daily"
  | "travel";

export type TopicIcon =
  | "heart"
  | "coins"
  | "id-card"
  | "graduation"
  | "house"
  | "bus";

/**
 * Header navigation category (owner-approved, November 2026). The header
 * shows one menu per category, so a new section joins a category here
 * instead of adding to the top bar. A category with no published section
 * is not shown; its future topics appear only once they are launched.
 */
export type NavGroupId = "visas" | "housing" | "health-education" | "work-finance" | "transport";

/** Header menu order. Labels live in SITE_UI[locale].navGroups. */
export const NAV_GROUPS: readonly NavGroupId[] = ["visas", "housing", "health-education", "work-finance", "transport"];

export type HomeTopic = {
  id: string;
  /** Header menu this section is listed under. */
  navGroup: NavGroupId;
  title: string;
  description: string;
  tone: TopicTone;
  icon: TopicIcon;
  /** Present only for launched sections; drives links, counts and search. */
  domain?: GuideDomain;
  /**
   * A launched section that is not a Guide domain (e.g. the Travel tools):
   * linked from navigation, but never counted or searched as Guides.
   */
  page?: "travel";
};

export const HOME_TOPICS: readonly HomeTopic[] = [
  {
    id: "health",
    navGroup: "health-education",
    title: "健康与 NHS",
    description: "看病、注册 GP、看牙、处方药等 NHS 实用信息。",
    tone: "health",
    icon: "heart",
    domain: HEALTH_GUIDE_DOMAIN,
  },
  {
    id: "money",
    navGroup: "work-finance",
    title: "金钱与财务",
    description: "开第一个银行账户、存款保障等常见问题。",
    tone: "money",
    icon: "coins",
    domain: MONEY_GUIDE_DOMAIN,
  },
  // Family & Visa: launched locally (Life in UK is local-only in 2026).
  {
    id: "family-visa",
    navGroup: "visas",
    title: "签证与家庭",
    description: "配偶/伴侣签证的路线、收入和关系要求，以及按你情况生成的材料清单。",
    tone: "visa",
    icon: "id-card",
    domain: FAMILY_VISA_GUIDE_DOMAIN,
  },
  // Work Visa (Skilled Worker): launched locally.
  {
    id: "work-visa",
    navGroup: "visas",
    title: "工作签证",
    description: "技术工人签证：雇主担保、职业和工资要求、家属、换工作和永居。",
    tone: "visa",
    icon: "id-card",
    domain: WORK_VISA_GUIDE_DOMAIN,
  },
  // Settlement / ILR: launched locally.
  {
    id: "settlement",
    navGroup: "visas",
    title: "永居与入籍",
    description: "永居（ILR）各路线的条件、离境天数、英语和材料，拿到永居以后，以及入籍；改革方案单独标明。",
    tone: "visa",
    icon: "id-card",
    domain: SETTLEMENT_GUIDE_DOMAIN,
  },
  // Renting & Moving In (England, letting-agency lets): launched locally.
  {
    id: "renting",
    navGroup: "housing",
    title: "租房与入住",
    description: "在英格兰通过中介租房：找房看房、审查和担保人、定金押金和费用、签约前检查，以及分步骤的租房清单。",
    tone: "daily",
    icon: "house",
    domain: RENTING_GUIDE_DOMAIN,
  },
  {
    id: UNIVERSITY_CATEGORY,
    navGroup: "health-education",
    ...UNIVERSITY_COPY["zh-CN"],
    tone: "education",
    icon: "graduation",
    domain: UNIVERSITY_GUIDE_DOMAIN,
  },
  {
    id: "education",
    navGroup: "health-education",
    ...EDUCATION_COPY["zh-CN"],
    domain: EDUCATION_GUIDE_DOMAIN,
    tone: "education",
    icon: "graduation",
  },
  {
    id: HOUSEHOLD_CATEGORY,
    navGroup: "housing",
    ...HOUSEHOLD_COPY["zh-CN"],
    domain: HOUSEHOLD_GUIDE_DOMAIN,
    tone: "daily",
    icon: "house",
  },
  {
    id: "travel",
    navGroup: "transport",
    title: "出行与交通",
    description: "伦敦地铁线路状态与附近道路异常查询，附运营方官方信息链接。",
    tone: "travel",
    icon: "bus",
    page: "travel",
  },
];

/**
 * The sections a visitor can open: content-gated sections only where this locale has published
 * Guides, and never a placeholder without a page ("coming soon" entries were removed from the home
 * page, header and footer).
 */
export function availableHomeTopics(universityAvailable: boolean, educationAvailable = false, householdAvailable = false): readonly HomeTopic[] {
  return HOME_TOPICS.filter((topic) => (topic.id !== UNIVERSITY_CATEGORY || universityAvailable)
    && (topic.id !== HOUSEHOLD_CATEGORY || householdAvailable)
    && (topic.id !== "education" || educationAvailable)
    && (topic.domain !== undefined || topic.page !== undefined));
}

/** Topics with a live section: the only ones linked, counted or searched. */
export function launchedTopics(
  topics: readonly HomeTopic[] = HOME_TOPICS,
): (HomeTopic & { domain: GuideDomain })[] {
  return topics.filter(
    (topic): topic is HomeTopic & { domain: GuideDomain } =>
      topic.domain !== undefined,
  );
}

/**
 * Featured Guide preference, in display order. Only slugs that are present
 * in the published list are used; remaining places are filled with the most
 * recently updated published Guides, so the section keeps working as the
 * catalogue grows or a Guide is withdrawn.
 */
export const FEATURED_GUIDE_SLUGS: readonly string[] = [
  "open-uk-bank-account-new-arrival",
  "registering-with-a-gp-england",
  "where-to-go-when-ill-england",
  "nhs-ihs-costs-england",
];

// Suggested search queries, per language, live in guides/siteUi.ts.

/**
 * Sections in a header menu: launched sections first (in HOME_TOPICS
 * order), then sections still in preparation, which are never linked.
 */
export function navGroupTopics(
  group: NavGroupId,
  topics: readonly HomeTopic[] = HOME_TOPICS,
): HomeTopic[] {
  const inGroup = topics.filter((topic) => topic.navGroup === group);
  const live = (topic: HomeTopic) => topic.domain !== undefined || topic.page !== undefined;
  return [...inGroup.filter(live), ...inGroup.filter((topic) => !live(topic))];
}

/** Categories shown in the header: those with at least one published section. */
export function visibleNavGroups(locale: GuideLocale, topics: readonly HomeTopic[] = HOME_TOPICS): NavGroupId[] {
  return NAV_GROUPS.filter((group) =>
    navGroupTopics(group, topics).some((topic) => topicHref(topic, locale) !== undefined),
  );
}

/** Where a topic links in a locale, or undefined while it has no live page. */
export function topicHref(topic: HomeTopic, locale: GuideLocale): string | undefined {
  if (topic.domain) return guideRoutePath(locale, topic.domain.id);
  if (topic.page) return guideRoutePath(locale, topic.page);
  return undefined;
}
