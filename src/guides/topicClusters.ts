// Topic clusters for three sections: Renting & Moving In, Family Visa and
// Settlement & ILR. One configuration drives both the interactive hubs and
// the prerendered hub pages:
//
// - groups: subtopics, each listing existing Guides (a group may point to a
//   Guide in another section, as Settlement already does). Only Guides the
//   reader's published list contains are shown; empty groups are dropped, so
//   an unpublished topic is never implied.
// - seoTitle / seoDescription: hub metadata. Navigational wording only; no
//   rule is restated here and no review or service is claimed.
// - CROSS_SECTION_RELATED: the few "next step" links between sections that
//   the in-section `relatedGuides` (domains.ts) cannot express.
// - officialSourcesFor: the hub's official links are the GOV.UK pages the
//   section's published Guides cite most, so they come from the same
//   reviewed sources as the Guides themselves.

import type { GuideDetail, GuideMetadata, GuideSource } from "./api.ts";
import { domainGuides, GUIDE_DOMAINS } from "./domains.ts";
import type { GuideDomain, GuideDomainId } from "./domains.ts";
import type { GuideLocale } from "./locales.ts";
import { SETTLEMENT_TOPICS } from "./settlementPlan.ts";

type Localized = Readonly<Record<GuideLocale, string>>;
export type ClusterGuideRef = { slug: string; domain: GuideDomainId };
export type ClusterGroup = { id: string; title: Localized; guides: readonly ClusterGuideRef[] };
export type TopicCluster = {
  domain: GuideDomainId;
  seoTitle: Localized;
  seoDescription: Localized;
  groups: readonly ClusterGroup[];
};

const r = (slug: string): ClusterGuideRef => ({ slug, domain: "renting" });
const f = (slug: string): ClusterGuideRef => ({ slug, domain: "family-visa" });
const st = (slug: string): ClusterGuideRef => ({ slug, domain: "settlement" });

const RENTING: TopicCluster = {
  domain: "renting",
  seoTitle: {
    "zh-CN": "在英格兰通过中介租房：找房、审查、押金、签约、入住、账单和退租",
    "zh-TW": "在英格蘭通過中介租房：找房、審查、押金、簽約、入住、帳單和退租",
    en: "Renting through a letting agent in England: finding, checks, deposits, signing, moving in, bills and moving out",
    ur: "انگلینڈ میں لیٹنگ ایجنٹ کے ذریعے کرایہ داری: تلاش، جانچ، ڈپازٹ، دستخط، منتقلی، بل اور گھر چھوڑنا",
    hi: "इंग्लैंड में लेटिंग एजेंट के ज़रिए किराए पर घर: खोज, जाँच, डिपॉज़िट, हस्ताक्षर, रहने आना, बिल और घर छोड़ना",
  },
  seoDescription: {
    "zh-CN": "英格兰中介租房的分主题指南：找房看房、租客审查和担保人、押金费用和租约、入住清单，Council Tax、水电燃气、宽带和 TV Licence，以及退租和拿回押金，并附分步骤租房清单。一般信息，不是法律意见。",
    "zh-TW": "英格蘭中介租房的分主題指南：找房看房、租客審查和擔保人、押金費用和租約、入住清單，Council Tax、水電燃氣、寬頻和 TV Licence，以及退租和拿回押金，並附分步驟租房清單。一般資訊，不是法律意見。",
    en: "Guides by topic for renting through a letting agent in England: finding and viewing, referencing and guarantors, deposits, fees and agreements, the move-in inventory, Council Tax, energy, water, broadband and the TV Licence, and moving out and getting your deposit back, with a step-by-step renting checklist. General information, not legal advice.",
    ur: "انگلینڈ میں لیٹنگ ایجنٹ کے ذریعے کرایہ داری کی موضوع وار رہنمائیاں: تلاش اور دیکھنا، جانچ اور ضامن، ڈپازٹ، فیس اور معاہدے، منتقلی کی inventory، Council Tax، توانائی، پانی، براڈ بینڈ اور TV Licence، اور گھر چھوڑنا اور ڈپازٹ واپس لینا، ساتھ مرحلہ وار چیک لسٹ۔ عمومی معلومات، قانونی مشورہ نہیں۔",
    hi: "इंग्लैंड में लेटिंग एजेंट के ज़रिए किराए पर घर की विषय-वार मार्गदर्शिकाएँ: खोजना और देखना, जाँच और गारंटर, डिपॉज़िट, फ़ीस और अनुबंध, रहने आने की inventory, Council Tax, ऊर्जा, पानी, ब्रॉडबैंड और TV Licence, और घर छोड़ना और डिपॉज़िट वापस पाना, साथ में चरण-दर-चरण चेकलिस्ट। सामान्य जानकारी, क़ानूनी सलाह नहीं।",
  },
  groups: [
    {
      id: "finding",
      title: { "zh-CN": "找房和看房", "zh-TW": "找房和看房", en: "Finding and viewing a home", ur: "گھر تلاش کرنا اور دیکھنا", hi: "घर खोजना और देखना" },
      guides: [r("renting-letting-agent-overview"), r("renting-finding-viewing")],
    },
    {
      id: "checks",
      title: { "zh-CN": "租客审查和担保人", "zh-TW": "租客審查和擔保人", en: "Referencing and guarantors", ur: "کرایہ دار کی جانچ اور ضامن", hi: "किरायेदार जाँच और गारंटर" },
      guides: [r("renting-referencing-checks"), r("renting-guarantors")],
    },
    {
      id: "money-and-agreement",
      title: { "zh-CN": "押金、费用和租约", "zh-TW": "押金、費用和租約", en: "Deposits, fees and the tenancy agreement", ur: "ڈپازٹ، فیس اور معاہدہ کرایہ داری", hi: "डिपॉज़िट, फ़ीस और किरायेदारी अनुबंध" },
      guides: [r("renting-deposits-fees"), r("renting-tenancy-agreement")],
    },
    {
      id: "moving-in",
      title: { "zh-CN": "入住和房屋状况记录", "zh-TW": "入住和房屋狀況記錄", en: "Moving in and the inventory", ur: "منتقلی اور inventory", hi: "रहने आना और inventory" },
      guides: [r("renting-moving-in-inventory")],
    },
    {
      id: "bills",
      title: { "zh-CN": "Council Tax 和水电燃气", "zh-TW": "Council Tax 和水電燃氣", en: "Council Tax and utilities", ur: "Council Tax اور یوٹیلیٹیز", hi: "Council Tax और यूटिलिटी" },
      guides: [r("renting-council-tax"), r("renting-energy"), r("renting-water")],
    },
    {
      id: "home-services",
      title: { "zh-CN": "宽带和 TV Licence", "zh-TW": "寬頻和 TV Licence", en: "Broadband and the TV Licence", ur: "براڈ بینڈ اور TV Licence", hi: "ब्रॉडबैंड और TV Licence" },
      guides: [r("renting-broadband"), r("renting-tv-licence")],
    },
    {
      id: "moving-out",
      title: { "zh-CN": "退租和拿回押金", "zh-TW": "退租和拿回押金", en: "Moving out and your deposit", ur: "گھر چھوڑنا اور ڈپازٹ", hi: "घर छोड़ना और डिपॉज़िट" },
      guides: [r("renting-moving-out-deposit")],
    },
  ],
};

const FAMILY_VISA: TopicCluster = {
  domain: "family-visa",
  seoTitle: {
    "zh-CN": "配偶和伴侣签证：路线、收入和关系要求、孩子和申请步骤",
    "zh-TW": "配偶和伴侶簽證：路線、收入和關係要求、孩子和申請步驟",
    en: "Spouse and partner visas: routes, income and relationship requirements, children and applying",
    ur: "شریکِ حیات اور پارٹنر ویزا: راستے، آمدنی اور رشتے کی شرائط، بچے اور درخواست",
    hi: "पति/पत्नी और पार्टनर वीज़ा: रास्ते, आय और रिश्ते की शर्तें, बच्चे और आवेदन",
  },
  seoDescription: {
    "zh-CN": "配偶和伴侣来英国的分主题指南：先弄清路线，再看收入要求和关系证据、孩子一起来的情况和申请步骤，以及以后怎样申请永居，并附按你情况生成的材料清单。一般信息，不是法律意见。",
    "zh-TW": "配偶和伴侶來英國的分主題指南：先弄清路線，再看收入要求和關係證據、孩子一起來的情況和申請步驟，以及以後怎樣申請永居，並附按你情況生成的材料清單。一般資訊，不是法律意見。",
    en: "Guides by topic for spouses and partners coming to the UK: choosing the route, the income requirement and relationship evidence, children coming too, the application steps and settling later, with a document checklist built for your situation. General information, not legal advice.",
    ur: "برطانیہ آنے والے شریکِ حیات اور پارٹنرز کے لیے موضوع وار رہنمائیاں: راستہ چننا، آمدنی کی شرط اور رشتے کا ثبوت، ساتھ آنے والے بچے، درخواست کے مراحل اور بعد میں مستقل رہائش، ساتھ آپ کی صورتحال کے مطابق دستاویزات کی چیک لسٹ۔ عمومی معلومات، قانونی مشورہ نہیں۔",
    hi: "ब्रिटेन आने वाले पति/पत्नी और पार्टनर के लिए विषय-वार मार्गदर्शिकाएँ: रास्ता चुनना, आय की शर्त और रिश्ते का सबूत, साथ आने वाले बच्चे, आवेदन के चरण और बाद में स्थायी निवास, साथ में आपकी स्थिति के अनुसार दस्तावेज़ चेकलिस्ट। सामान्य जानकारी, क़ानूनी सलाह नहीं।",
  },
  groups: [
    {
      id: "route",
      title: { "zh-CN": "选择合适的路线", "zh-TW": "選擇合適的路線", en: "Choosing the right route", ur: "درست راستہ چننا", hi: "सही रास्ता चुनना" },
      guides: [f("partner-visa-routes-overview")],
    },
    {
      id: "requirements",
      title: { "zh-CN": "收入要求和关系要求", "zh-TW": "收入要求和關係要求", en: "Income and relationship requirements", ur: "آمدنی اور رشتے کی شرائط", hi: "आय और रिश्ते की शर्तें" },
      guides: [f("partner-visa-financial-requirement"), f("partner-visa-relationship-evidence")],
    },
    {
      id: "children",
      title: { "zh-CN": "孩子一起来", "zh-TW": "孩子一起來", en: "Children coming too", ur: "ساتھ آنے والے بچے", hi: "साथ आने वाले बच्चे" },
      guides: [f("partner-visa-dependent-children")],
    },
    {
      id: "applying",
      title: { "zh-CN": "申请步骤和材料", "zh-TW": "申請步驟和材料", en: "Applying and evidence", ur: "درخواست اور ثبوت", hi: "आवेदन और सबूत" },
      guides: [f("partner-visa-application-process")],
    },
    {
      id: "settling",
      title: { "zh-CN": "以后：申请永居", "zh-TW": "以後：申請永居", en: "Later: settling in the UK", ur: "بعد میں: مستقل رہائش", hi: "बाद में: स्थायी निवास" },
      guides: [st("settlement-partner-ilr")],
    },
  ],
};

const SETTLEMENT: TopicCluster = {
  domain: "settlement",
  seoTitle: {
    "zh-CN": "英国永居（ILR）和入籍：路线、离境天数、英语和考试、材料和申请",
    "zh-TW": "英國永居（ILR）和入籍：路線、離境天數、英語和考試、材料和申請",
    en: "Indefinite leave to remain (ILR) and citizenship: routes, absences, English and the test, documents and applying",
    ur: "مستقل رہائش (ILR) اور شہریت: راستے، غیر حاضری، انگریزی اور ٹیسٹ، دستاویزات اور درخواست",
    hi: "स्थायी निवास (ILR) और नागरिकता: रास्ते, अनुपस्थिति, अंग्रेज़ी और टेस्ट, दस्तावेज़ और आवेदन",
  },
  seoDescription: {
    "zh-CN": "英国永居（ILR）的分主题指南：先看全貌，再按路线看条件，了解离境天数、英语和 Life in the UK 考试、要准备的材料和申请流程，以及拿到永居以后和入籍；改革方案单独标明。一般信息，不是法律意见。",
    "zh-TW": "英國永居（ILR）的分主題指南：先看全貌，再按路線看條件，了解離境天數、英語和 Life in the UK 考試、要準備的材料和申請流程，以及拿到永居以後和入籍；改革方案單獨標明。一般資訊，不是法律意見。",
    en: "Guides by topic on indefinite leave to remain: the big picture, route-by-route requirements, days outside the UK, English and the Life in the UK Test, documents and the application, and life after ILR and citizenship; reform proposals are marked separately. General information, not legal advice.",
    ur: "مستقل رہائش (ILR) پر موضوع وار رہنمائیاں: مجموعی تصویر، ہر راستے کی شرائط، برطانیہ سے باہر کے دن، انگریزی اور Life in the UK ٹیسٹ، دستاویزات اور درخواست، اور ILR کے بعد کی زندگی اور شہریت؛ اصلاحاتی تجاویز الگ نشان زد ہیں۔ عمومی معلومات، قانونی مشورہ نہیں۔",
    hi: "स्थायी निवास (ILR) पर विषय-वार मार्गदर्शिकाएँ: पूरी तस्वीर, हर रास्ते की शर्तें, ब्रिटेन से बाहर के दिन, अंग्रेज़ी और Life in the UK टेस्ट, दस्तावेज़ और आवेदन, और ILR के बाद का जीवन और नागरिकता; सुधार प्रस्ताव अलग से चिह्नित हैं। सामान्य जानकारी, क़ानूनी सलाह नहीं।",
  },
  // The Settlement hub's existing topics, shared rather than duplicated.
  groups: SETTLEMENT_TOPICS.map((topic) => ({ id: topic.id, title: topic.title, guides: topic.guides as readonly ClusterGuideRef[] })),
};

export const TOPIC_CLUSTERS: Readonly<Partial<Record<GuideDomainId, TopicCluster>>> = {
  renting: RENTING,
  "family-visa": FAMILY_VISA,
  settlement: SETTLEMENT,
};

const w = (slug: string): ClusterGuideRef => ({ slug, domain: "work-visa" });
const h = (slug: string): ClusterGuideRef => ({ slug, domain: "health" });
const m = (slug: string): ClusterGuideRef => ({ slug, domain: "money" });

/**
 * Next-step links between sections, shown with the in-section related Guides.
 * Each one is backed by the source Guide's published text: a visa Guide that
 * states the Immigration Health Surcharge links to the IHS Guide; Skilled
 * Worker and Settlement Guides that name each other by title link both ways;
 * tenant referencing ("no UK bank account yet") and the first bank account
 * Guide (tenancy agreements as proof of address) link both ways; the Skilled
 * Worker salary Guide (National Insurance contributions) links to the NI
 * number Guide, which links on to the Skilled Worker overview.
 */
export const CROSS_SECTION_RELATED: Readonly<Record<string, readonly ClusterGuideRef[]>> = {
  "partner-visa-application-process": [st("settlement-partner-ilr"), h("nhs-ihs-costs-england")],
  "settlement-partner-ilr": [f("partner-visa-routes-overview")],
  "skilled-worker-overview": [h("nhs-ihs-costs-england")],
  "skilled-worker-dependants": [st("settlement-children-dependants"), h("nhs-ihs-costs-england")],
  "skilled-worker-settlement-ilr": [st("settlement-ilr-overview"), st("settlement-continuous-residence-absences")],
  "settlement-ilr-overview": [w("skilled-worker-settlement-ilr")],
  "settlement-children-dependants": [w("skilled-worker-dependants")],
  "renting-referencing-checks": [m("open-uk-bank-account-new-arrival")],
  "open-uk-bank-account-new-arrival": [r("renting-referencing-checks")],
  "skilled-worker-occupations-salary": [m("national-insurance-number-newcomers")],
  "national-insurance-number-newcomers": [w("skilled-worker-overview")],
};

/**
 * Sections whose Guide pages show the curated related list (in the app and
 * in prerendered HTML) instead of every Guide in the section. Health keeps
 * its section-wide list in static pages.
 */
export const CURATED_RELATED_SECTIONS: ReadonlySet<GuideDomainId> = new Set<GuideDomainId>([
  "renting", "family-visa", "settlement", "work-visa", "money",
]);

export type ResolvedGuide = { guide: GuideMetadata; domain: GuideDomainId };
export type ResolvedGroup = { id: string; title: string; guides: ResolvedGuide[] };

/** A published Guide for a reference, from the reader's locale list, in the right section. */
function resolve(ref: ClusterGuideRef, published: readonly GuideMetadata[]): ResolvedGuide | null {
  const guide = published.find((item) => item.slug === ref.slug && item.category === GUIDE_DOMAINS[ref.domain].category);
  return guide ? { guide, domain: ref.domain } : null;
}

/**
 * The hub's groups for a locale: only published Guides, empty groups dropped.
 * Guides of the section not in any group are appended in a final group, so
 * nothing published is ever hidden.
 */
export function clusterGroupsFor(
  domainId: GuideDomainId,
  locale: GuideLocale,
  published: readonly GuideMetadata[],
  otherLabel: string,
): ResolvedGroup[] {
  const cluster = TOPIC_CLUSTERS[domainId];
  if (!cluster) return [];
  const groups = cluster.groups
    .map((group) => ({
      id: group.id,
      title: group.title[locale],
      guides: group.guides.map((ref) => resolve(ref, published)).filter((item): item is ResolvedGuide => item !== null),
    }))
    .filter((group) => group.guides.length > 0);
  const listed = new Set(groups.flatMap((group) => group.guides.map((item) => item.guide.slug)));
  const rest = domainGuides([...published], GUIDE_DOMAINS[domainId]).filter((guide) => !listed.has(guide.slug));
  if (rest.length > 0) groups.push({ id: "other", title: otherLabel, guides: rest.map((guide) => ({ guide, domain: domainId })) });
  return groups;
}

/** Related links for a Guide: the curated in-section list, then any cross-section next step. */
export function relatedLinksFor(domain: GuideDomain, slug: string, published: readonly GuideMetadata[]): ResolvedGuide[] {
  const inSection = (domain.relatedGuides[slug] ?? []).map((target) => resolve({ slug: target, domain: domain.id }, published));
  const across = (CROSS_SECTION_RELATED[slug] ?? []).map((ref) => resolve(ref, published));
  return [...inSection, ...across].filter((item): item is ResolvedGuide => item !== null && item.guide.slug !== slug);
}

const HAN = /[\u3400-\u9fff]/;
/** Dated publications and consultations change often; stable guidance and service pages come first. */
const isDatedDocument = (url: string) => /^https:\/\/www\.gov\.uk\/government\/(publications|consultations)\//.test(url);

/**
 * The source title for display in any locale: editorial notes in full-width
 * brackets, or containing Chinese, are removed; null if the title is still
 * not English.
 */
function displayTitle(title: string): string | null {
  const clean = title
    .replace(/（[^（）]*）/g, "") // full-width brackets: always an editorial note
    .replace(/\([^()]*[\u3400-\u9fff][^()]*\)/g, "")
    .trim();
  return clean && !HAN.test(clean) ? clean : null;
}

/**
 * The GOV.UK pages the given published Guides cite most often: stable
 * guidance and service pages before dated publications, then by how many
 * Guides cite them (ties: first seen).
 */
export function officialSourcesFor(details: readonly GuideDetail[], limit = 4): GuideSource[] {
  const counts = new Map<string, { source: GuideSource; count: number; order: number }>();
  for (const detail of details) {
    const cited = new Set(detail.evidence.flatMap((evidence) => evidence.supports.map((support) => support.sourceKey)));
    for (const source of detail.sources) {
      if (!cited.has(source.key) || !/^https:\/\/www\.gov\.uk\//.test(source.url)) continue;
      const title = displayTitle(source.title);
      if (!title) continue;
      const entry = counts.get(source.url) ?? { source: { ...source, title }, count: 0, order: counts.size };
      entry.count++;
      counts.set(source.url, entry);
    }
  }
  return [...counts.values()]
    .sort((a, b) => Number(isDatedDocument(a.source.url)) - Number(isDatedDocument(b.source.url)) || b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.source);
}

/** Interface labels for the cluster sections, in all five locales. */
export const CLUSTER_COPY = {
  topics: { "zh-CN": "按主题看指南", "zh-TW": "按主題看指南", en: "Guides by topic", ur: "موضوع وار رہنمائیاں", hi: "विषय-वार मार्गदर्शिकाएँ" },
  other: { "zh-CN": "其他指南", "zh-TW": "其他指南", en: "Other guides", ur: "دیگر رہنمائیاں", hi: "अन्य मार्गदर्शिकाएँ" },
  official: { "zh-CN": "这些指南引用的 GOV.UK 官方页面", "zh-TW": "這些指南引用的 GOV.UK 官方頁面", en: "GOV.UK pages these guides cite", ur: "یہ رہنمائیاں جن GOV.UK صفحات کا حوالہ دیتی ہیں", hi: "ये मार्गदर्शिकाएँ जिन GOV.UK पेजों का हवाला देती हैं" },
} as const satisfies Record<string, Localized>;
