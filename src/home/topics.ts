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
  MONEY_GUIDE_DOMAIN,
  WORK_VISA_GUIDE_DOMAIN,
} from "../guides/domains.ts";
import { guideRoutePath, type GuideLocale } from "../guides/locales.ts";

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

export type HomeTopic = {
  id: string;
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
    title: "健康与 NHS",
    description: "看病、注册 GP、看牙、处方药等 NHS 实用信息。",
    tone: "health",
    icon: "heart",
    domain: HEALTH_GUIDE_DOMAIN,
  },
  {
    id: "money",
    title: "金钱与财务",
    description: "开第一个银行账户、存款保障等常见问题。",
    tone: "money",
    icon: "coins",
    domain: MONEY_GUIDE_DOMAIN,
  },
  // Family & Visa: launched locally (Life in UK is local-only in 2026).
  {
    id: "family-visa",
    title: "签证与家庭",
    description: "配偶/伴侣签证的路线、收入和关系要求，以及按你情况生成的材料清单。",
    tone: "visa",
    icon: "id-card",
    domain: FAMILY_VISA_GUIDE_DOMAIN,
  },
  // Work Visa (Skilled Worker): launched locally.
  {
    id: "work-visa",
    title: "工作签证",
    description: "技术工人签证：雇主担保、职业和工资要求、家属、换工作和永居。",
    tone: "visa",
    icon: "id-card",
    domain: WORK_VISA_GUIDE_DOMAIN,
  },
  {
    id: "education",
    title: "教育与学习",
    description: "学校申请、大学与学生生活等内容正在规划中。",
    tone: "education",
    icon: "graduation",
  },
  {
    id: "daily-life",
    title: "日常生活",
    description: "住房、租房、账单与通信等内容正在规划中。",
    tone: "daily",
    icon: "house",
  },
  {
    id: "travel",
    title: "出行与交通",
    description: "伦敦地铁线路状态与附近道路异常查询，附运营方官方信息链接。",
    tone: "travel",
    icon: "bus",
    page: "travel",
  },
];

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

/** Where a topic links in a locale, or undefined while it has no live page. */
export function topicHref(topic: HomeTopic, locale: GuideLocale): string | undefined {
  if (topic.domain) return guideRoutePath(locale, topic.domain.id);
  if (topic.page) return guideRoutePath(locale, topic.page);
  return undefined;
}
