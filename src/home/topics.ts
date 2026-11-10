// Homepage topic structure. This is navigation configuration only: which
// sections exist, how they are described, and whether they are launched.
// Guide titles, summaries and counts always come from the Guide API.
//
// A topic is linked only when it is launched AND has a live route. Topics
// still in preparation render as "即将推出" without navigation, so the
// homepage never implies published content that does not exist.

import type { GuideDomain } from "../guides/domains";
import { HEALTH_GUIDE_DOMAIN, MONEY_GUIDE_DOMAIN } from "../guides/domains.ts";

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
  // Family & Visa exists as an internal review surface only; it is not
  // launched and must not be linked or indexed from the homepage.
  {
    id: "family-visa",
    title: "签证与家庭",
    description: "配偶/伴侣签证、家人团聚等内容正在编写和核对。",
    tone: "visa",
    icon: "id-card",
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
    description: "火车、地铁与道路出行信息正在准备中。",
    tone: "travel",
    icon: "bus",
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

/** Suggested queries under the search box. Not a popularity ranking. */
export const SEARCH_SUGGESTIONS: readonly string[] = [
  "银行开户",
  "注册 GP",
  "牙疼",
  "处方药",
  "父母探亲",
];
