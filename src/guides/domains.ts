// Guide domains: each branded section of the site that renders API Guides.
// A domain fixes the route base and the one API category it may show, so a
// Guide can only ever appear (and be linked) inside its own section.

import { EDUCATION_ARRIVALS, EDUCATION_COPY } from "./education.ts";
import { HOUSEHOLD_CATEGORY, HOUSEHOLD_COPY } from "./household.ts";
import type { GuideMetadata, GuideSource } from "./api";
import { guideRoutePath, type GuideLocale } from "./locales.ts";
import {
  GUIDE_LOCALIZED_REFERENCES,
  GUIDE_TITLE_REFERENCES,
  HEALTH_CATEGORY,
  isExampleSource,
  RELATED_GUIDES,
} from "./catalog.ts";

export const EDUCATION_GUIDE_DOMAIN: GuideDomain = {
  id: "education",
  basePath: "/education",
  category: "education",
  label: EDUCATION_COPY["zh-CN"].title,
  backLabel: "回到教育与学习",
  titleReferences: {},
  relatedGuides: {
    [EDUCATION_ARRIVALS]: ["in-year-school-admissions-england", "joining-school-during-gcses-england", "sixth-form-or-fe-college-england"],
    "uk-school-stages-and-year-groups": [EDUCATION_ARRIVALS, "in-year-school-admissions-england"],
    "in-year-school-admissions-england": [EDUCATION_ARRIVALS, "joining-school-during-gcses-england", "choosing-a-school-and-admission-appeals-england"],
    "joining-school-during-gcses-england": ["in-year-school-admissions-england", "sixth-form-or-fe-college-england"],
    "sixth-form-or-fe-college-england": ["joining-school-during-gcses-england", EDUCATION_ARRIVALS],
    "primary-school-reception-applications-england": ["choosing-a-school-and-admission-appeals-england", "in-year-school-admissions-england", "school-meals-attendance-and-transport-england"],
    "secondary-school-year-7-applications-england": ["choosing-a-school-and-admission-appeals-england", "in-year-school-admissions-england", "english-language-support-at-school-england"],
    "choosing-a-school-and-admission-appeals-england": ["primary-school-reception-applications-england", "secondary-school-year-7-applications-england", "in-year-school-admissions-england"],
    "english-language-support-at-school-england": [EDUCATION_ARRIVALS, "send-school-support-england", "joining-school-during-gcses-england"],
    "send-school-support-england": ["english-language-support-at-school-england", "in-year-school-admissions-england", "school-meals-attendance-and-transport-england"],
    "school-meals-attendance-and-transport-england": [EDUCATION_ARRIVALS, "primary-school-reception-applications-england", "send-school-support-england"],
  },
};

export const HOUSEHOLD_GUIDE_DOMAIN: GuideDomain = {
  id: HOUSEHOLD_CATEGORY,
  basePath: "/household-services",
  category: HOUSEHOLD_CATEGORY,
  label: HOUSEHOLD_COPY["zh-CN"].title,
  backLabel: HOUSEHOLD_COPY["zh-CN"].title,
  titleReferences: {},
  relatedGuides: {},
};

export const UNIVERSITY_CATEGORY = "university-applications-student-visas";

export type GuideDomainId = typeof UNIVERSITY_CATEGORY | typeof HOUSEHOLD_CATEGORY | "education" | "health" | "family-visa" | "money" | "work-visa" | "settlement" | "renting";

export type GuideDomain = {
  id: GuideDomainId;
  /** Original zh-CN short route base, e.g. "/health" (still routed; links use guideRoutePath). */
  basePath: string;
  /** The only API category this domain renders. */
  category: string;
  /** Section name for breadcrumbs and article kickers. */
  label: string;
  /** Text of links back to the section hub. */
  backLabel: string;
  /** 《title》 references inside articles that link to Guides of this domain. */
  titleReferences: Readonly<Record<string, string>>;
  /**
   * Other locales: exact phrases in the published translations that refer to
   * one of the Guides above without quoting its full localized title.
   */
  localizedReferences?: Readonly<Partial<Record<GuideLocale, Readonly<Record<string, string>>>>>;
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
  localizedReferences: GUIDE_LOCALIZED_REFERENCES,
  relatedGuides: RELATED_GUIDES,
  isExampleSource,
};

export const FAMILY_VISA_CATEGORY = "family-visa";

/**
 * Family & Visa (partner Guides' content frozen 2026-11-15): no in-text title
 * links; related Guides follow the order a partner applicant needs them. The
 * family-visit Guide (F2, Standard Visitor / ETA) sits in this section as a
 * separate subtopic and points to the partner routes overview, so a visit is
 * never presented as a way to join family.
 */
export const FAMILY_VISA_GUIDE_DOMAIN: GuideDomain = {
  id: "family-visa",
  basePath: "/family-visa",
  category: FAMILY_VISA_CATEGORY,
  label: "家庭与签证",
  backLabel: "回到家庭与签证",
  titleReferences: {},
  relatedGuides: {
    "partner-visa-routes-overview": ["partner-visa-financial-requirement", "partner-visa-relationship-evidence", "partner-visa-application-process"],
    "partner-visa-financial-requirement": ["partner-visa-relationship-evidence", "partner-visa-application-process"],
    "partner-visa-relationship-evidence": ["partner-visa-financial-requirement", "partner-visa-application-process"],
    "partner-visa-application-process": ["partner-visa-financial-requirement", "partner-visa-dependent-children"],
    "partner-visa-dependent-children": ["partner-visa-routes-overview", "partner-visa-application-process"],
    "visiting-family-uk-visitor-visa-eta": ["partner-visa-routes-overview"],
  },
};

export const MONEY_CATEGORY = "money";

/**
 * Money & Finance: no in-text title links. The first bank account Guide
 * mentions applying for a National Insurance number, so the two Guides are
 * each other's next step.
 */
export const MONEY_GUIDE_DOMAIN: GuideDomain = {
  id: "money",
  basePath: "/money",
  category: MONEY_CATEGORY,
  label: "金钱与财务",
  backLabel: "回到金钱与财务",
  titleReferences: {},
  relatedGuides: {
    "open-uk-bank-account-new-arrival": ["national-insurance-number-newcomers", "sending-money-abroad-safely"],
    "sending-money-abroad-safely": ["open-uk-bank-account-new-arrival"],
    "national-insurance-number-newcomers": ["open-uk-bank-account-new-arrival"],
  },
};

export const WORK_VISA_CATEGORY = "work-visa";

/**
 * Work Visa (Skilled Worker): published locally. Every Guide ends with a
 * "Related Guides" list of quoted titles; the 《title》 references below turn
 * those (and in-text references) into links within this section. Related
 * Guides follow the hub's reading order (workVisaPlan.ts).
 */
export const WORK_VISA_GUIDE_DOMAIN: GuideDomain = {
  id: "work-visa",
  basePath: "/work-visa",
  category: WORK_VISA_CATEGORY,
  label: "工作签证",
  backLabel: "回到工作签证",
  titleReferences: {
    "英国技术工人签证（Skilled Worker）：整体要求和申请流程": "skilled-worker-overview",
    "雇主担保：担保执照、CoS 和雇主的责任": "skilled-worker-sponsorship-cos",
    "职业代码（SOC）和工资要求：这份工作够不够格": "skilled-worker-occupations-salary",
    "Skilled Worker 的英语要求和申请材料": "skilled-worker-english-documents",
    "转签、续签和换雇主": "skilled-worker-switch-extend-change-employer",
    "丢了工作或担保被撤销：对签证有什么影响": "skilled-worker-job-loss-sponsorship-ends",
    "带配偶和孩子：Skilled Worker 的家属签证": "skilled-worker-dependants",
    "Skilled Worker 永居（ILR）：现行 5 年规则和已公布的改革": "skilled-worker-settlement-ilr",
  },
  relatedGuides: {
    "skilled-worker-overview": ["skilled-worker-sponsorship-cos", "skilled-worker-occupations-salary", "skilled-worker-english-documents"],
    "skilled-worker-sponsorship-cos": ["skilled-worker-occupations-salary", "skilled-worker-job-loss-sponsorship-ends"],
    "skilled-worker-occupations-salary": ["skilled-worker-sponsorship-cos", "skilled-worker-english-documents"],
    "skilled-worker-english-documents": ["skilled-worker-switch-extend-change-employer", "skilled-worker-dependants"],
    "skilled-worker-switch-extend-change-employer": ["skilled-worker-english-documents", "skilled-worker-job-loss-sponsorship-ends", "graduate-visa-uk"],
    "uk-options-after-graduation": ["skilled-worker-switch-extend-change-employer"],
    "graduate-visa-uk": ["skilled-worker-switch-extend-change-employer"],
    "skilled-worker-job-loss-sponsorship-ends": ["skilled-worker-switch-extend-change-employer", "skilled-worker-settlement-ilr"],
    "skilled-worker-dependants": ["skilled-worker-occupations-salary", "skilled-worker-settlement-ilr"],
    "skilled-worker-settlement-ilr": ["skilled-worker-dependants", "skilled-worker-job-loss-sponsorship-ends"],
  },
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
  relatedGuides: {
    "settlement-ilr-overview": ["settlement-partner-ilr", "settlement-long-residence", "settlement-other-routes"],
    "settlement-partner-ilr": ["settlement-continuous-residence-absences", "settlement-english-life-in-uk-test", "settlement-documents-evidence"],
    "settlement-long-residence": ["settlement-continuous-residence-absences", "settlement-documents-evidence"],
    "settlement-other-routes": ["settlement-ilr-overview", "settlement-documents-evidence"],
    "settlement-continuous-residence-absences": ["settlement-documents-evidence", "settlement-application-process"],
    "settlement-english-life-in-uk-test": ["settlement-documents-evidence", "settlement-application-process"],
    "settlement-children-dependants": ["settlement-partner-ilr", "settlement-documents-evidence"],
    "settlement-documents-evidence": ["settlement-application-process", "settlement-continuous-residence-absences"],
    "settlement-application-process": ["settlement-documents-evidence", "settlement-after-ilr"],
    "settlement-after-ilr": ["settlement-british-citizenship", "settlement-continuous-residence-absences"],
    "settlement-british-citizenship": ["settlement-after-ilr", "settlement-english-life-in-uk-test"],
    "settlement-earned-settlement-tracker": ["settlement-ilr-overview", "settlement-continuous-residence-absences"],
  },
};

export const RENTING_CATEGORY = "renting";

/**
 * Renting & Moving In (England, letting-agency lets, tenant perspective):
 * published locally, from finding a home to moving out. 《title》 references between the Simplified Chinese
 * Renting Guides link within this section.
 */
export const RENTING_GUIDE_DOMAIN: GuideDomain = {
  id: "renting",
  basePath: "/renting",
  category: RENTING_CATEGORY,
  label: "租房与入住",
  backLabel: "回到租房与入住",
  titleReferences: {
    "在英格兰通过中介租房：从找房到签约的完整流程": "renting-letting-agent-overview",
    "找房、联系中介和看房：英格兰租房第一步": "renting-finding-viewing",
    "租客审查：身份、收入、信用和租房记录": "renting-referencing-checks",
    "担保人：学生、刚到英国和没有英国信用记录的人怎么办": "renting-guarantors",
    "定金、押金和允许收取的费用：英格兰租房要付哪些钱": "renting-deposits-fees",
    "签租约前要检查什么：英格兰租约和书面信息": "renting-tenancy-agreement",
    "入住当天：拿钥匙、清单（inventory）和房屋状况记录": "renting-moving-in-inventory",
    "入住后的 Council Tax：谁要付、学生免除、单人折扣和账单问题": "renting-council-tax",
    "电和燃气：入住时找到供应商、抄表、开账户和付款方式": "renting-energy",
    "水费和污水费：找到供水公司、登记新住户、水表和账单": "renting-water",
    "宽带和上网：查可用性、速度保证、合约期、安装和搬家": "renting-broadband",
    "TV Licence（电视许可证）：什么时候需要、合租和学生怎么办": "renting-tv-licence",
    "退租和拿回押金：通知、退房检查、交钥匙和结清账单": "renting-moving-out-deposit",
    "英格兰租房搬家清单：能源、水费、宽带与市政税": "renting-moving-home-utilities-checklist",
    "英格兰私人租房：维修、渗潮和霉菌": "renting-repairs-damp-mould-england",
  },
  relatedGuides: {
    "renting-letting-agent-overview": ["renting-finding-viewing", "renting-deposits-fees", "renting-tenancy-agreement"],
    "renting-finding-viewing": ["renting-referencing-checks", "renting-letting-agent-overview"],
    "renting-referencing-checks": ["renting-guarantors", "renting-deposits-fees"],
    "renting-guarantors": ["renting-referencing-checks", "renting-tenancy-agreement"],
    "renting-deposits-fees": ["renting-tenancy-agreement", "renting-moving-in-inventory", "renting-moving-out-deposit"],
    "renting-tenancy-agreement": ["renting-deposits-fees", "renting-moving-in-inventory"],
    "renting-moving-in-inventory": ["renting-council-tax", "renting-energy", "renting-moving-out-deposit"],
    "renting-council-tax": ["renting-energy", "renting-water"],
    "renting-energy": ["renting-water", "renting-council-tax"],
    "renting-water": ["renting-energy", "renting-council-tax"],
    "renting-broadband": ["renting-tv-licence", "renting-energy"],
    "renting-tv-licence": ["renting-broadband", "renting-council-tax"],
    "renting-moving-out-deposit": ["renting-deposits-fees", "renting-moving-in-inventory", "renting-tenancy-agreement"],
    "renting-moving-home-utilities-checklist": ["renting-moving-out-deposit", "renting-moving-in-inventory", "renting-council-tax"],
    "renting-repairs-damp-mould-england": ["renting-moving-in-inventory", "renting-moving-out-deposit"],
  },
};

export const UNIVERSITY_GUIDE_DOMAIN: GuideDomain = {
  id: UNIVERSITY_CATEGORY,
  basePath: `/${UNIVERSITY_CATEGORY}`,
  category: UNIVERSITY_CATEGORY,
  label: "大学申请与学生签证",
  backLabel: "回到大学申请与学生签证",
  titleReferences: {},
  relatedGuides: {},
};

export const GUIDE_DOMAINS: Readonly<Record<GuideDomainId, GuideDomain>> = {
  health: HEALTH_GUIDE_DOMAIN,
  "family-visa": FAMILY_VISA_GUIDE_DOMAIN,
  money: MONEY_GUIDE_DOMAIN,
  "work-visa": WORK_VISA_GUIDE_DOMAIN,
  settlement: SETTLEMENT_GUIDE_DOMAIN,
  renting: RENTING_GUIDE_DOMAIN,
  [UNIVERSITY_CATEGORY]: UNIVERSITY_GUIDE_DOMAIN,
  education: EDUCATION_GUIDE_DOMAIN,
  [HOUSEHOLD_CATEGORY]: HOUSEHOLD_GUIDE_DOMAIN,
};

/** A Simplified Chinese Guide's canonical path (`/zh-CN/health/:slug`). */
export function guidePath(domain: GuideDomain, slug: string): string {
  return guideRoutePath("zh-CN", domain.id, slug);
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
