// Guide domains: each branded section of the site that renders API Guides.
// A domain fixes the route base and the one API category it may show, so a
// Guide can only ever appear (and be linked) inside its own section.

import type { GuideMetadata, GuideSource } from "./api";
import {
  GUIDE_TITLE_REFERENCES,
  HEALTH_CATEGORY,
  isExampleSource,
  RELATED_GUIDES,
} from "./catalog.ts";

export type GuideDomainId = "health" | "family-visa" | "money" | "work-visa" | "settlement";

export type GuideDomain = {
  id: GuideDomainId;
  /** Route base, e.g. "/health"; Guides live at `${basePath}/${slug}`. */
  basePath: string;
  /** The only API category this domain renders. */
  category: string;
  /** Section name for breadcrumbs and article kickers. */
  label: string;
  /** Text of links back to the section hub. */
  backLabel: string;
  /** 《title》 references inside articles that link to Guides of this domain. */
  titleReferences: Readonly<Record<string, string>>;
  /** Editorial further reading per Guide slug, within this domain. */
  relatedGuides: Readonly<Record<string, readonly string[]>>;
  /** Domain-specific labelling of non-official example sources, if any. */
  isExampleSource?: (source: GuideSource) => boolean;
};

export const HEALTH_GUIDE_DOMAIN: GuideDomain = {
  id: "health",
  basePath: "/health",
  category: HEALTH_CATEGORY,
  label: "健康与 NHS",
  backLabel: "回到健康与 NHS",
  titleReferences: GUIDE_TITLE_REFERENCES,
  relatedGuides: RELATED_GUIDES,
  isExampleSource,
};

export const FAMILY_VISA_CATEGORY = "family-visa";

/** No editorial cross-links until Family & Visa content is frozen. */
export const FAMILY_VISA_GUIDE_DOMAIN: GuideDomain = {
  id: "family-visa",
  basePath: "/family-visa",
  category: FAMILY_VISA_CATEGORY,
  label: "家庭与签证",
  backLabel: "回到家庭与签证",
  titleReferences: {},
  relatedGuides: {},
};

export const MONEY_CATEGORY = "money";

/** Money & Finance: no editorial cross-links until more Guides exist. */
export const MONEY_GUIDE_DOMAIN: GuideDomain = {
  id: "money",
  basePath: "/money",
  category: MONEY_CATEGORY,
  label: "金钱与财务",
  backLabel: "回到金钱与财务",
  titleReferences: {},
  relatedGuides: {},
};

export const WORK_VISA_CATEGORY = "work-visa";

/** Work Visa (Skilled Worker): published locally; no editorial cross-links yet. */
export const WORK_VISA_GUIDE_DOMAIN: GuideDomain = {
  id: "work-visa",
  basePath: "/work-visa",
  category: WORK_VISA_CATEGORY,
  label: "工作签证",
  backLabel: "回到工作签证",
  titleReferences: {},
  relatedGuides: {},
};

export const SETTLEMENT_CATEGORY = "settlement";

/**
 * Settlement / ILR: published locally. 《title》 references between the
 * Simplified Chinese Settlement Guides link within this section.
 */
export const SETTLEMENT_GUIDE_DOMAIN: GuideDomain = {
  id: "settlement",
  basePath: "/settlement",
  category: SETTLEMENT_CATEGORY,
  label: "永居与入籍",
  backLabel: "回到永居与入籍",
  titleReferences: {
    "英国永居（ILR）入门：它是什么、和入籍有什么不同、你可能走哪条路线": "settlement-ilr-overview",
    "配偶和伴侣申请永居：5 年路线和 10 年路线": "settlement-partner-ilr",
    "10 年长期居住（Long Residence）申请永居": "settlement-long-residence",
    "连续居住和离境天数：申请永居时怎么算": "settlement-continuous-residence-absences",
    "永居的英语要求和 Life in the UK 考试": "settlement-english-life-in-uk-test",
    "申请永居要准备哪些材料": "settlement-documents-evidence",
    "申请永居的流程：什么时候申请、费用、等待期间和被拒以后": "settlement-application-process",
    "孩子和家属怎么申请永居": "settlement-children-dependants",
    "其他永居路线：UK Ancestry、Global Talent、Innovator Founder、BN(O)、EUSS、难民和私人生活": "settlement-other-routes",
    "拿到永居以后：权利、eVisa 身份证明、出境和永居失效": "settlement-after-ilr",
    "积分式定居（Earned Settlement）改革追踪：现行规则和改革方案对照": "settlement-earned-settlement-tracker",
    "拿到永居以后怎么申请入籍": "settlement-british-citizenship",
  },
  relatedGuides: {},
};

export const GUIDE_DOMAINS: Readonly<Record<GuideDomainId, GuideDomain>> = {
  health: HEALTH_GUIDE_DOMAIN,
  "family-visa": FAMILY_VISA_GUIDE_DOMAIN,
  money: MONEY_GUIDE_DOMAIN,
  "work-visa": WORK_VISA_GUIDE_DOMAIN,
  settlement: SETTLEMENT_GUIDE_DOMAIN,
};

export function guidePath(domain: GuideDomain, slug: string): string {
  return `${domain.basePath}/${slug}`;
}

/** Whether a Guide may render (or be linked) inside the given domain. */
export function belongsToDomain(
  guide: Pick<GuideMetadata, "category">,
  domain: GuideDomain,
): boolean {
  return guide.category === domain.category;
}

/** This domain's Guides from the list endpoint, in backend order. */
export function domainGuides<T extends GuideMetadata>(
  guides: T[],
  domain: GuideDomain,
): T[] {
  return guides.filter((guide) => belongsToDomain(guide, domain));
}

/** Configured further reading that exists in the list and shares the domain. */
export function relatedGuidesFor(
  domain: GuideDomain,
  slug: string,
  guides: GuideMetadata[],
): GuideMetadata[] {
  const inDomain = domainGuides(guides, domain);
  return (domain.relatedGuides[slug] ?? [])
    .map((target) => inDomain.find((guide) => guide.slug === target))
    .filter((guide): guide is GuideMetadata => guide !== undefined);
}
