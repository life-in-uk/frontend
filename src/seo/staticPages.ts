// Static, crawlable HTML for published Guides and topic hubs.
//
// The React app stays the interactive experience. This module turns the SAME
// published Guide data (from the Guide API) and the SAME parser, path and
// title-reference helpers into plain HTML that is written into the built
// index.html for each route by scripts/prerender.mjs. Search engines and
// readers without JavaScript get the full article, headings, evidence and
// internal links in the first response; when the app starts, React replaces
// this markup with the normal page.
//
// Nothing here is a second copy of the content: there is no hand-written
// article text. Every heading, paragraph and statement comes from the
// published Guide or from the app's existing localized interface copy.

import { isSafeExternalUrl } from "../guides/api.ts";
import type { GuideDetail, GuideMetadata } from "../guides/api.ts";
import { EDUCATION_COPY, educationSections } from "../guides/education.ts";
import { studentPathwaysEntry } from "../guides/workVisaPlan.ts";
import { HOUSEHOLD_CATEGORY } from "../guides/household.ts";
import { UNIVERSITY_CATEGORY, domainGuides, GUIDE_DOMAINS } from "../guides/domains.ts";
import type { GuideDomain, GuideDomainId } from "../guides/domains.ts";
import { formatUkDateFor } from "../guides/format.ts";
import { GUIDE_INDEX_COPY } from "../guides/guideIndex.ts";
import { groupGuidesByDomain } from "../guides/indexGroups.ts";
import {
  GUIDE_LOCALE_HREFLANG,
  GUIDE_LOCALE_LABELS,
  GUIDE_LOCALE_LANG,
  GUIDE_LOCALES,
  GUIDE_UI,
  guideHomePath,
  guideRoutePath,
  localizedGuidePath,
  textDirection,
} from "../guides/locales.ts";
import type { GuideLocale } from "../guides/locales.ts";
import { EVIDENCE_PREFIX, inlineText, parseMarkdown, withoutRepeatedUpdatedLine } from "../guides/markdown.ts";
import type { Block, Inline, ListBlock } from "../guides/markdown.ts";
import { resolveQuickAnswers } from "../guides/moneyQuickAnswers.ts";
import { moneyQuickAnswersFor } from "../guides/moneyQuickAnswersLocales.ts";
import { RENTING_COPY, RENTING_MOVE_OUT_STEPS, RENTING_STEPS } from "../guides/rentingJourneyData.ts";
import { SITE_UI } from "../guides/siteUi.ts";
import { splitTitleReferences, titleReferencesFor } from "../guides/titleReferences.ts";
import { guideStructuredData, serializeJsonLd } from "./structuredData.ts";
import { guideNotice } from "../guides/guideNotice.ts";
import { CLUSTER_COPY, clusterGroupsFor, crossSectionLinksFor, CURATED_RELATED_SECTIONS, officialSourcesFor, relatedLinksFor, TOPIC_CLUSTERS } from "../guides/topicClusters.ts";
import type { ResolvedGroup } from "../guides/topicClusters.ts";
import type { TitleReferences } from "../guides/titleReferences.ts";
import { homeDescription } from "../guides/seo.ts";
import { FEATURED_GUIDE_SLUGS, HOME_TOPICS, launchedTopics, topicHref } from "../home/topics.ts";
import { byRecentUpdate, localizeHomeGuides, selectFeatured } from "../home/featured.ts";
import type { HomeGuide } from "../home/featured.ts";
import { resolveTopic } from "../components/family-visa/topics/topicContent.ts";
import type { ResolvedTopic } from "../components/family-visa/topics/topicContent.ts";
import { FAMILY_VISA_PUBLISHED_WORDING } from "../guides/familyVisaPublishedWording.ts";
import { FAMILY_VISA_PUBLISHED_STRINGS } from "../guides/familyVisaPublishedWordingLocales.ts";
import { JOURNEY_GUIDES } from "../guides/familyVisaJourney.ts";
import type { GuideAvailability, JourneyGuideId } from "../guides/familyVisaJourney.ts";
import type { LocalizedJourneyGuides } from "../components/family-visa/localizedJourney.ts";
import { FAMILY_VISA_STRINGS } from "../guides/familyVisaStringsLocales.ts";
import { familyVisaTopicPath } from "../router.ts";
import type { FamilyVisaTopicId } from "../router.ts";

/** Hubs that are crawlable topic pages, in navigation order. */
export const STATIC_HUB_DOMAINS: readonly GuideDomainId[] = ["family-visa", "work-visa", "settlement", "renting", "health", "money", "university-applications-student-visas", "education", HOUSEHOLD_CATEGORY];

type Localized = Readonly<Record<GuideLocale, string>>;

/** Entry points from a Guide to its section's interactive tool (only where one exists). */
export const JOURNEY_LINKS: Partial<Record<GuideDomainId, { anchor: string; label: Localized }>> = {
  renting: {
    anchor: "renting-journey-title",
    label: {
      "zh-CN": "打开分步骤的租房流程和清单",
      "zh-TW": "打開分步驟的租房流程和清單",
      en: "Open the step-by-step renting journey and checklist",
      ur: "کرایہ داری کے مرحلہ وار سفر اور چیک لسٹ کھولیں",
      hi: "किराए की चरण-दर-चरण यात्रा और चेकलिस्ट खोलें",
    },
  },
  "family-visa": {
    anchor: "main",
    label: {
      "zh-CN": "打开家庭签证的分步骤流程和材料清单",
      "zh-TW": "打開家庭簽證的分步驟流程和材料清單",
      en: "Open the step-by-step family visa journey and document checklist",
      ur: "فیملی ویزا کا مرحلہ وار سفر اور دستاویزات کی چیک لسٹ کھولیں",
      hi: "फ़ैमिली वीज़ा की चरण-दर-चरण यात्रा और दस्तावेज़ चेकलिस्ट खोलें",
    },
  },
  settlement: {
    anchor: "settlement-plan-title",
    label: {
      "zh-CN": "打开永居规划工具",
      "zh-TW": "打開永居規劃工具",
      en: "Open the settlement planner",
      ur: "مستقل رہائش کا منصوبہ ساز کھولیں",
      hi: "स्थायी निवास योजना टूल खोलें",
    },
  },
  "work-visa": {
    anchor: "work-plan-title",
    label: {
      "zh-CN": "打开工作签证规划工具",
      "zh-TW": "打開工作簽證規劃工具",
      en: "Open the work visa planner",
      ur: "ورک ویزا کا منصوبہ ساز کھولیں",
      hi: "वर्क वीज़ा योजना टूल खोलें",
    },
  },
};

const STATIC_COPY = {
  sources: { "zh-CN": "依据和来源", "zh-TW": "依據和來源", en: "Evidence and sources", ur: "حوالہ جات اور ماخذ", hi: "आधार और स्रोत" },
  guides: { "zh-CN": "本主题的指南", "zh-TW": "本主題的指南", en: "Guides in this section", ur: "اس حصے کی رہنمائیاں", hi: "इस हिस्से की मार्गदर्शिकाएँ" },
  breadcrumb: { "zh-CN": "页面位置", "zh-TW": "頁面位置", en: "Breadcrumb", ur: "صفحے کا مقام", hi: "पेज का स्थान" },
} as const satisfies Record<string, Localized>;

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Origin + path, for canonical and alternate links. */
function absolute(origin: string, path: string): string {
  return new URL(path, origin).href;
}

type RenderContext = {
  locale: GuideLocale;
  domain: GuideDomain;
  references: TitleReferences;
};

function renderText(value: string, context: RenderContext): string {
  return splitTitleReferences(value, context.references)
    .map((part) =>
      typeof part === "string"
        ? escapeHtml(part)
        : `<a href="${escapeHtml(guideRoutePath(context.locale, context.domain.id, part.slug))}">${escapeHtml(part.text)}</a>`,
    )
    .join("");
}

function renderInline(nodes: Inline[], context: RenderContext): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return renderText(node.value, context);
        case "code":
          return `<code>${escapeHtml(node.value)}</code>`;
        case "strong":
          return `<strong>${renderInline(node.children, context)}</strong>`;
        case "em":
          return `<em>${renderInline(node.children, context)}</em>`;
        case "link": {
          if (node.href.startsWith(EVIDENCE_PREFIX)) {
            const label = inlineText(node.children) || GUIDE_UI[context.locale].evidenceLink;
            return `<a class="evidence-ref" href="${escapeHtml(node.href)}">${escapeHtml(label)}</a>`;
          }
          const inner = renderInline(node.children, context);
          if (node.href.startsWith("/")) return `<a href="${escapeHtml(node.href)}">${inner}</a>`;
          if (isSafeExternalUrl(node.href)) return `<a href="${escapeHtml(node.href)}" rel="noopener noreferrer">${inner}</a>`;
          return inner;
        }
      }
    })
    .join("");
}

function renderList(block: ListBlock, context: RenderContext): string {
  const tag = block.ordered ? "ol" : "ul";
  const start = block.ordered && block.start !== 1 ? ` start="${block.start}"` : "";
  const items = block.items
    .map((item) => {
      const mark = item.task === "done" ? "☑ " : item.task === "open" ? "☐ " : "";
      const sub = item.sublist ? renderList(item.sublist, context) : "";
      return `<li>${mark}${renderInline(item.children, context)}${sub}</li>`;
    })
    .join("");
  return `<${tag}${start}>${items}</${tag}>`;
}

export function renderBlocks(blocks: Block[], context: RenderContext): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const level = Math.min(Math.max(block.level, 2), 6);
          return `<h${level}>${renderInline(block.children, context)}</h${level}>`;
        }
        case "paragraph":
          return `<p>${renderInline(block.children, context)}</p>`;
        case "list":
          return renderList(block, context);
        case "blockquote":
          return `<blockquote>${renderBlocks(block.children, context)}</blockquote>`;
        case "rule":
          return "<hr>";
      }
    })
    .join("\n");
}

/** The evidence statements behind the article, each an anchor target for its in-text link. */
function renderEvidence(guide: GuideDetail, locale: GuideLocale): string {
  const ui = GUIDE_UI[locale];
  const sources = new Map(guide.sources.map((source) => [source.key, source]));
  const items = guide.evidence
    .map((evidence) => {
      const cited = evidence.supports
        .map((support) => sources.get(support.sourceKey))
        .filter((source): source is NonNullable<typeof source> => source !== undefined && isSafeExternalUrl(source.url));
      const unique = [...new Map(cited.map((source) => [source.key, source])).values()];
      const links = unique
        .map((source) => `<a href="${escapeHtml(source.url)}" rel="noopener noreferrer" lang="en" dir="ltr">${escapeHtml(source.organisation)}: ${escapeHtml(source.title)}</a>`)
        .join("; ");
      return `<li id="guide-evidence-${escapeHtml(evidence.key)}"><p>${escapeHtml(evidence.statement)}</p>${links ? `<p>${escapeHtml(ui.evidenceLabel)}: ${links}</p>` : ""}</li>`;
    })
    .join("");
  return items ? `<section class="static-evidence" aria-labelledby="static-evidence-title"><h2 id="static-evidence-title">${escapeHtml(STATIC_COPY.sources[locale])}</h2><ol>${items}</ol></section>` : "";
}

export type PageHead = {
  locale: GuideLocale;
  title: string;
  description: string;
  canonical: string;
  alternates: readonly { locale: GuideLocale; href: string }[];
  /** schema.org JSON-LD (structuredData.ts), Guide pages only. */
  structuredData?: unknown;
};

/** Head tags, marked so the app's SEO helper replaces them on the client. */
export function renderHead(head: PageHead): string {
  const tag = 'data-guide-seo="true" data-prerendered="true"';
  const lines = [
    `<meta name="description" content="${escapeHtml(head.description)}" ${tag}>`,
    `<link rel="canonical" href="${escapeHtml(head.canonical)}" ${tag}>`,
    ...head.alternates.map((row) => `<link rel="alternate" hreflang="${GUIDE_LOCALE_HREFLANG[row.locale]}" href="${escapeHtml(row.href)}" ${tag}>`),
  ];
  const fallback = head.alternates.find((row) => row.locale === "zh-CN");
  if (fallback) lines.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(fallback.href)}" ${tag}>`);
  if (head.structuredData) lines.push(`<script type="application/ld+json" ${tag}>${serializeJsonLd(head.structuredData)}</script>`);
  return lines.join("\n    ");
}

/** Site-wide navigation in the static page: home and every hub with a published Guide in this locale. */
function renderSiteNav(locale: GuideLocale, published: readonly GuideMetadata[]): string {
  const ui = SITE_UI[locale];
  const live = STATIC_HUB_DOMAINS.filter((id) => published.some((guide) => guide.category === GUIDE_DOMAINS[id].category));
  const hubs = live.map(
    (id) => `<li><a href="${escapeHtml(guideRoutePath(locale, id))}">${escapeHtml(ui.topics[id]?.title ?? id)}</a></li>`,
  ).join("");
  return `<header class="static-header"><a class="static-brand" href="${guideHomePath(locale)}" lang="en" dir="ltr">Life in UK</a><nav aria-label="${escapeHtml(ui.mainNav)}"><ul><li><a href="${guideHomePath(locale)}">${escapeHtml(GUIDE_UI[locale].home)}</a></li>${hubs}</ul></nav></header>`;
}

function renderGuideList(guides: readonly GuideMetadata[], locale: GuideLocale, domain: GuideDomain, headingLevel: 2 | 3 = 2): string {
  if (guides.length === 0) return "";
  const items = guides
    .map((guide) => `<li><a href="${escapeHtml(guideRoutePath(locale, domain.id, guide.slug))}">${escapeHtml(guide.title)}</a><p>${escapeHtml(guide.summary)}</p></li>`)
    .join("");
  return `<section class="static-guides" aria-labelledby="static-guides-title"><h${headingLevel} id="static-guides-title">${escapeHtml(STATIC_COPY.guides[locale])}</h${headingLevel}><ul>${items}</ul></section>`;
}

function journeyLink(locale: GuideLocale, domain: GuideDomain): string {
  const journey = JOURNEY_LINKS[domain.id];
  if (!journey) return "";
  const href = `${guideRoutePath(locale, domain.id)}#${journey.anchor}`;
  return `<p class="static-journey"><a href="${escapeHtml(href)}">${escapeHtml(journey.label[locale])}</a></p>`;
}

export type StaticGuideInput = {
  origin: string;
  locale: GuideLocale;
  domainId: GuideDomainId;
  guide: GuideDetail;
  /** Published Guides in this locale (all sections); used for links. */
  published: readonly GuideMetadata[];
  /** Locales in which this Guide is published (for hreflang). */
  availableLocales: readonly GuideLocale[];
};

export type StaticPage = { head: PageHead; body: string };

/** A published Guide as a complete static page. */
export function staticGuidePage(input: StaticGuideInput): StaticPage {
  const { origin, locale, guide } = input;
  const domain = GUIDE_DOMAINS[input.domainId];
  const ui = GUIDE_UI[locale];
  const references = titleReferencesFor(domain, locale, input.published, guide.slug);
  const blocks = parseMarkdown(guide.content);
  // The page header shows the title; drop a leading H1 that repeats it (as the app does).
  const titled = blocks[0]?.type === "heading" && blocks[0].level === 1 ? blocks.slice(1) : blocks;
  // The header shows the update date; a leading line repeating it is not shown twice (as in the app).
  const body = withoutRepeatedUpdatedLine(titled, guide.updatedAt);
  const others = domainGuides([...input.published], domain).filter((item) => item.slug !== guide.slug);
  const curated = CURATED_RELATED_SECTIONS.has(domain.id);
  // The same section disclaimer as the app (components/guides/GuideDisclaimer.tsx).
  const notice = guideNotice(domain.id, locale, guide.content);
  const hubHref = guideRoutePath(locale, domain.id);
  const html = [
    renderSiteNav(locale, input.published),
    `<main id="main" class="static-page static-guide">`,
    // The same three levels as the app's breadcrumb and the BreadcrumbList.
    `<nav class="static-breadcrumb" aria-label="${escapeHtml(STATIC_COPY.breadcrumb[locale])}"><ol><li><a href="${guideHomePath(locale)}">${escapeHtml(ui.home)}</a></li><li><a href="${escapeHtml(hubHref)}">${escapeHtml(ui.domain[domain.id])}</a></li><li aria-current="page">${escapeHtml(guide.title)}</li></ol></nav>`,
    `<article>`,
    `<h1>${escapeHtml(guide.title)}</h1>`,
    `<p class="static-summary">${escapeHtml(guide.summary)}</p>`,
    `<p class="static-updated">${escapeHtml(ui.updated)} <time datetime="${escapeHtml(guide.updatedAt)}">${escapeHtml(formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale]))}</time></p>`,
    journeyLink(locale, domain),
    renderBlocks(body, { locale, domain, references }),
    notice ? `<p class="guide-notice">${escapeHtml(notice)}</p>` : "",
    renderEvidence(guide, locale),
    `</article>`,
    // Sections without a curated list keep their section-wide list; their few cross-section next steps are added after it.
    curated
      ? renderRelated(relatedLinksFor(domain, guide.slug, input.published), locale)
      : renderGuideList(others, locale, domain) + renderRelated(crossSectionLinksFor(guide.slug, input.published), locale),
    `</main>`,
  ].join("\n");
  const head: PageHead = {
    locale,
    title: `${guide.title} · Life in UK`,
    description: guide.summary,
    canonical: absolute(origin, localizedGuidePath(locale, domain.id, guide.slug)),
    structuredData: guideStructuredData({ origin, locale, domainId: domain.id, guide }),
    alternates: GUIDE_LOCALES.filter((candidate) => input.availableLocales.includes(candidate)).map((candidate) => ({
      locale: candidate,
      href: absolute(origin, localizedGuidePath(candidate, domain.id, guide.slug)),
    })),
  };
  return { head, body: html };
}

export type StaticHubInput = {
  origin: string;
  locale: GuideLocale;
  domainId: GuideDomainId;
  /** Published Guides in this locale (all sections). */
  published: readonly GuideMetadata[];
  /** Locales whose hub lists at least one published Guide (for hreflang). */
  availableLocales: readonly GuideLocale[];
  /** Full published Guides of this section in this locale, for hub content drawn from them. */
  details?: readonly GuideDetail[];
  /** Family Visa topic pages prerendered in this locale (their paths), linked from the hub as in the app. */
  topicPaths?: readonly string[];
};

/** The Family Visa hub's "special circumstances" links, with the app's wording (FamilyVisaHub.tsx). */
const FAMILY_VISA_TOPIC_LINKS: Readonly<Record<FamilyVisaTopicId, string>> = {
  "children-from-previous-relationship": "孩子来自上一段关系，如何准备英国签证材料？",
};

function familyVisaString(locale: GuideLocale, text: string): string {
  return locale === "zh-CN" ? text : FAMILY_VISA_STRINGS[locale]?.[text] ?? text;
}

/** Links to the prerendered topic pages, so the static hub reaches them as the app does. */
function renderFamilyVisaTopics(locale: GuideLocale, topicPaths: readonly string[]): string {
  const items = (Object.keys(FAMILY_VISA_TOPIC_LINKS) as FamilyVisaTopicId[])
    .filter((topic) => topicPaths.includes(familyVisaTopicPath(locale, topic)))
    .map((topic) => `<li><a href="${escapeHtml(familyVisaTopicPath(locale, topic))}">${escapeHtml(familyVisaString(locale, FAMILY_VISA_TOPIC_LINKS[topic]))}</a></li>`);
  if (items.length === 0) return "";
  return `<section class="static-topic" data-topic="special-circumstances"><h2>${escapeHtml(familyVisaString(locale, "特殊情况"))}</h2><ul>${items.join("")}</ul></section>`;
}

const QUICK_ANSWERS_TITLE: Localized = {
  "zh-CN": "常见问题的简短回答",
  "zh-TW": "常見問題的簡短回答",
  en: "Short answers to common questions",
  ur: "عام سوالات کے مختصر جوابات",
  hi: "आम सवालों के छोटे जवाब",
};

/**
 * Money quick answers, exactly as the hub shows them: only answers verified
 * against the published Guide version and its evidence are included.
 */
function renderMoneyAnswers(locale: GuideLocale, details: readonly GuideDetail[]): string {
  const set = moneyQuickAnswersFor(locale);
  const guide = details.find((item) => item.slug === set.guideSlug);
  if (!guide) return "";
  const verified = resolveQuickAnswers(set, guide, GUIDE_DOMAINS.money.category).filter((answer) => answer.evidence !== null);
  if (verified.length === 0) return "";
  const link = `<p><a href="${escapeHtml(guideRoutePath(locale, "money", guide.slug))}">${escapeHtml(guide.title)}</a></p>`;
  const items = verified
    .map((answer) => `<li><h3>${escapeHtml(answer.question)}</h3><p>${escapeHtml(answer.answer)}</p>${answer.nextStep ? `<p>${escapeHtml(answer.nextStep)}</p>` : ""}</li>`)
    .join("");
  return `<section class="static-answers" aria-labelledby="static-answers-title"><h2 id="static-answers-title">${escapeHtml(QUICK_ANSWERS_TITLE[locale])}</h2><ul>${items}</ul>${link}</section>`;
}

/** Curated related Guides (the same list the app shows under the article). */
function renderRelated(links: ReturnType<typeof relatedLinksFor>, locale: GuideLocale): string {
  if (links.length === 0) return "";
  const items = links
    .map(({ guide, domain }) => `<li><a href="${escapeHtml(guideRoutePath(locale, domain, guide.slug))}">${escapeHtml(guide.title)}</a></li>`)
    .join("");
  return `<section class="static-related" aria-labelledby="static-related-title"><h2 id="static-related-title">${escapeHtml(GUIDE_UI[locale].related)}</h2><ul>${items}</ul></section>`;
}

/** A hub's Guides grouped by subtopic, with their published summaries. */
function renderClusterGroups(groups: readonly ResolvedGroup[], locale: GuideLocale): string {
  if (groups.length === 0) return "";
  const sections = groups
    .map((group) => {
      const items = group.guides
        .map(({ guide, domain }) => `<li><a href="${escapeHtml(guideRoutePath(locale, domain, guide.slug))}">${escapeHtml(guide.title)}</a><p>${escapeHtml(guide.summary)}</p></li>`)
        .join("");
      return `<section class="static-topic" data-topic="${escapeHtml(group.id)}"><h3>${escapeHtml(group.title)}</h3><ul>${items}</ul></section>`;
    })
    .join("");
  return `<section class="static-guides" aria-labelledby="static-guides-title"><h2 id="static-guides-title">${escapeHtml(CLUSTER_COPY.topics[locale])}</h2>${sections}</section>`;
}

/** The GOV.UK pages the section's published Guides cite most. */
function renderOfficialSources(details: readonly GuideDetail[], locale: GuideLocale): string {
  const sources = officialSourcesFor(details);
  if (sources.length === 0) return "";
  const items = sources
    .map((source) => `<li><a href="${escapeHtml(source.url)}" rel="noopener noreferrer" lang="en" dir="ltr">${escapeHtml(source.title)}</a></li>`)
    .join("");
  return `<section class="static-official" aria-labelledby="static-official-title"><h2 id="static-official-title">${escapeHtml(CLUSTER_COPY.official[locale])}</h2><ul>${items}</ul></section>`;
}

/** The Renting Journey's steps as crawlable text, each linked to its Guide; the later moving-out stage follows. */
function renderRentingSteps(locale: GuideLocale, live: ReadonlySet<string>, titles: ReadonlyMap<string, string>): string {
  const item = (step: (typeof RENTING_STEPS)[number] | (typeof RENTING_MOVE_OUT_STEPS)[number]) => {
    const link = live.has(step.guide)
      ? `<p><a href="${escapeHtml(guideRoutePath(locale, "renting", step.guide))}">${escapeHtml(titles.get(step.guide) ?? step.title[locale])}</a></p>`
      : "";
    return `<li><h3>${escapeHtml(step.title[locale])}</h3><p>${escapeHtml(step.action[locale])}</p>${link}</li>`;
  };
  const later = `<h2 id="renting-move-out-title">${escapeHtml(RENTING_COPY.moveOutTitle[locale])}</h2><p>${escapeHtml(RENTING_COPY.moveOutLead[locale])}</p>`
    + `<ol start="${RENTING_STEPS.length + 1}">${RENTING_MOVE_OUT_STEPS.map(item).join("")}</ol>`;
  return `<section id="renting-journey-title" class="static-journey-steps"><h2>${escapeHtml(RENTING_COPY.journeyTitle[locale])}</h2><ol>${RENTING_STEPS.map(item).join("")}</ol>${later}</section>`;
}

function renderEducationSections(guides: readonly GuideMetadata[], locale: GuideLocale,
  published: readonly GuideMetadata[], domain: GuideDomain): string {
  const sections = educationSections(guides).map(({ id, guides: items }) =>
    `<section><h2>${escapeHtml(EDUCATION_COPY[locale][id])}</h2>${renderGuideList(items, locale, domain, 3)}</section>`);
  if (published.some((guide) => guide.category === UNIVERSITY_CATEGORY)) {
    sections.push(`<p><a href="${guideRoutePath(locale, UNIVERSITY_CATEGORY)}">${escapeHtml(GUIDE_UI[locale].domain[UNIVERSITY_CATEGORY])}</a></p>`);
  }
  return sections.join("");
}

/** A topic hub as a static page: what the section covers and its published Guides. */
export function staticHubPage(input: StaticHubInput): StaticPage | null {
  const { origin, locale } = input;
  const domain = GUIDE_DOMAINS[input.domainId];
  const guides = domainGuides([...input.published], domain);
  if (guides.length === 0) return null;
  const topic = SITE_UI[locale].topics[domain.id];
  const cluster = TOPIC_CLUSTERS[domain.id];
  const title = domain.id === "renting" ? RENTING_COPY.title[locale] : topic?.title ?? GUIDE_UI[locale].domain[domain.id];
  const lead = domain.id === "renting" ? RENTING_COPY.lead[locale] : topic?.description ?? "";
  const live = new Set(guides.map((guide) => guide.slug));
  const titles = new Map(guides.map((guide) => [guide.slug, guide.title]));
  const sectionDetails = (input.details ?? []).filter((detail) => live.has(detail.slug) && detail.category === domain.category);
  const pathways = domain.id === "education" || domain.id === UNIVERSITY_CATEGORY ? studentPathwaysEntry(input.published) : undefined;
  const html = [
    renderSiteNav(locale, input.published),
    `<main id="main" class="static-page static-hub">`,
    `<nav class="static-breadcrumb" aria-label="${escapeHtml(STATIC_COPY.breadcrumb[locale])}"><a href="${guideHomePath(locale)}">${escapeHtml(GUIDE_UI[locale].home)}</a></nav>`,
    `<h1>${escapeHtml(title)}</h1>`,
    lead ? `<p class="static-summary">${escapeHtml(lead)}</p>` : "",
    cluster ? journeyLink(locale, domain) : "",
    domain.id === "renting" ? renderRentingSteps(locale, live, titles) : "",
    domain.id === "money" ? renderMoneyAnswers(locale, input.details ?? []) : "",
    cluster
      ? renderClusterGroups(clusterGroupsFor(domain.id, locale, input.published, CLUSTER_COPY.other[locale]), locale) + renderOfficialSources(sectionDetails, locale)
      : domain.id === "education"
        ? renderEducationSections(guides, locale, input.published, domain)
        : renderGuideList(guides, locale, domain),
    pathways ? `<p><a href="${guideRoutePath(locale, "work-visa", pathways.slug)}">${escapeHtml(pathways.title)}</a></p>` : "",
    domain.id === "family-visa" ? renderFamilyVisaTopics(locale, input.topicPaths ?? []) : "",
    `</main>`,
  ].join("\n");
  const head: PageHead = {
    locale,
    title: `${cluster ? cluster.seoTitle[locale] : title} · Life in UK`,
    description: cluster ? cluster.seoDescription[locale] : lead || title,
    canonical: absolute(origin, localizedGuidePath(locale, domain.id)),
    alternates: GUIDE_LOCALES.filter((candidate) => input.availableLocales.includes(candidate)).map((candidate) => ({
      locale: candidate,
      href: absolute(origin, localizedGuidePath(candidate, domain.id)),
    })),
  };
  return { head, body: html };
}

export type StaticIndexInput = {
  origin: string;
  locale: GuideLocale;
  /** Published Guides in this locale (all sections). */
  published: readonly GuideMetadata[];
  /** Locales with at least one published Guide (for hreflang). */
  availableLocales: readonly GuideLocale[];
};

/** The all-Guides index as a static page: every published Guide of the locale, grouped by section as in the app. */
export function staticIndexPage(input: StaticIndexInput): StaticPage | null {
  const { origin, locale, published } = input;
  if (published.length === 0) return null;
  const copy = GUIDE_INDEX_COPY[locale];
  const groups = groupGuidesByDomain(published);
  const jump = groups
    .map(({ domain }) => `<li><a href="#guides-${escapeHtml(domain)}">${escapeHtml(GUIDE_UI[locale].domain[domain])}</a></li>`)
    .join("");
  const sections = groups.map(({ domain, guides }) => {
    const items = guides
      .map((guide) => `<li><a href="${escapeHtml(guideRoutePath(locale, domain, guide.slug))}">${escapeHtml(guide.title)}</a><p>${escapeHtml(guide.summary)}</p></li>`)
      .join("");
    return `<section class="static-topic" id="guides-${escapeHtml(domain)}"><h2>${escapeHtml(GUIDE_UI[locale].domain[domain])}</h2>`
      + `<p><a href="${escapeHtml(localizedGuidePath(locale, domain))}">${escapeHtml(copy.open)}</a></p><ul>${items}</ul></section>`;
  }).join("");
  const html = [
    renderSiteNav(locale, published),
    `<main id="main" class="static-page static-index">`,
    `<nav class="static-breadcrumb" aria-label="${escapeHtml(STATIC_COPY.breadcrumb[locale])}"><a href="${guideHomePath(locale)}">${escapeHtml(GUIDE_UI[locale].home)}</a></nav>`,
    `<h1>${escapeHtml(copy.title)}</h1>`,
    `<p class="static-summary">${escapeHtml(copy.description)}</p>`,
    `<nav aria-label="${escapeHtml(copy.topics)}"><h2>${escapeHtml(copy.topics)}</h2><ul>${jump}</ul></nav>`,
    sections,
    `</main>`,
  ].join("\n");
  const head: PageHead = {
    locale,
    title: `${copy.title} · Life in UK`,
    description: copy.description,
    canonical: absolute(origin, `/${locale}/guides`),
    alternates: GUIDE_LOCALES.filter((candidate) => input.availableLocales.includes(candidate))
      .map((candidate) => ({ locale: candidate, href: absolute(origin, `/${candidate}/guides`) })),
  };
  return { head, body: html };
}

/** Joins a two-part hero line the way the page shows it on one line. */
function joinParts(parts: readonly string[], locale: GuideLocale): string {
  return parts.join(locale === "zh-CN" || locale === "zh-TW" ? "" : " ");
}

const HOME_FEATURED_COUNT = 4;
const HOME_MORE_LIMIT = 8;

function renderHomeGuides(id: string, title: string, items: readonly HomeGuide[]): string {
  if (items.length === 0) return "";
  const rows = items
    .map((item) => {
      // A Simplified Chinese fallback on a translated home page is marked as such, as the app does.
      const lang = item.fallback ? ` lang="${GUIDE_LOCALE_LANG[item.locale]}"` : "";
      return `<li${lang}><a href="${escapeHtml(item.href)}">${escapeHtml(item.guide.title)}</a><p>${escapeHtml(item.guide.summary)}</p></li>`;
    })
    .join("");
  return `<section aria-labelledby="${id}"><h2 id="${id}">${escapeHtml(title)}</h2><ul>${rows}</ul></section>`;
}

export type StaticHomeInput = {
  origin: string;
  locale: GuideLocale;
  /** Published Simplified Chinese Guides (they decide what exists, as on the app's home page). */
  source: readonly GuideMetadata[];
  /** Published Guides in this locale. */
  published: readonly GuideMetadata[];
};

/** A home page (/{locale}): what the site is, its sections, featured and recent Guides, and how content is sourced. */
export function staticHomePage(input: StaticHomeInput): StaticPage {
  const { origin, locale } = input;
  const ui = SITE_UI[locale];
  const domains = launchedTopics().map((topic) => topic.domain);
  const items = localizeHomeGuides(input.source, locale === "zh-CN" ? [] : input.published, domains, locale);
  const featured = selectFeatured(items, FEATURED_GUIDE_SLUGS, HOME_FEATURED_COUNT);
  const more = byRecentUpdate(items).filter((item) => !featured.includes(item)).slice(0, HOME_MORE_LIMIT);
  // Linked sections: a hub only where it is a page (a published Guide in this locale), as in the site navigation.
  const live = (topic: (typeof HOME_TOPICS)[number]) =>
    !topic.domain || input.published.some((guide) => guide.category === topic.domain!.category);
  const topics = HOME_TOPICS.filter(live)
    .map((topic) => ({ topic, href: topicHref(topic, locale), text: ui.topics[topic.id] ?? topic }))
    .filter((row): row is typeof row & { href: string } => row.href !== undefined)
    .map(({ href, text }) => `<li><h3><a href="${escapeHtml(href)}">${escapeHtml(text.title)}</a></h3><p>${escapeHtml(text.description)}</p></li>`)
    .join("");
  const trust = ui.trust.points.map((point) => `<li><h3>${escapeHtml(point.title)}</h3><p>${escapeHtml(point.text)}</p></li>`).join("");
  const html = [
    renderSiteNav(locale, input.published),
    `<main id="main" class="static-page static-home">`,
    `<h1>${escapeHtml(joinParts(ui.hero.title, locale))}</h1>`,
    `<p class="static-summary">${escapeHtml(homeDescription(locale))}</p>`,
    // Only while some home Guides are still shown as Simplified Chinese originals.
    ui.translationNotice && items.some((item) => item.fallback) ? `<p>${escapeHtml(ui.translationNotice)}</p>` : "",
    `<section aria-labelledby="static-topics-title"><h2 id="static-topics-title">${escapeHtml(ui.topicGrid.heading)}</h2><ul>${topics}</ul></section>`,
    renderHomeGuides("static-featured-title", ui.featured.title, featured),
    renderHomeGuides("static-more-title", ui.index.title, more),
    `<section id="about" aria-labelledby="static-about-title"><h2 id="static-about-title">${escapeHtml(ui.trust.title)}</h2><p>${escapeHtml(ui.trust.intro)}</p><ul>${trust}</ul></section>`,
    `</main>`,
  ].join("\n");
  const head: PageHead = {
    locale,
    title: ui.homeTitle,
    description: homeDescription(locale),
    canonical: absolute(origin, guideHomePath(locale)),
    alternates: GUIDE_LOCALES.map((candidate) => ({ locale: candidate, href: absolute(origin, guideHomePath(candidate)) })),
  };
  return { head, body: html };
}

export type TopicInput = {
  topic: FamilyVisaTopicId;
  locale: GuideLocale;
  /** Published Simplified Chinese Guides and their details (the journey is checked against these). */
  source: readonly GuideMetadata[];
  sourceDetails: ReadonlyMap<string, GuideDetail>;
  /** Published Guide details in this locale (translated evidence, same version only). */
  localeDetails: ReadonlyMap<string, GuideDetail>;
};

/**
 * A Family & Visa topic exactly as the production app resolves it: the
 * published wording and translations, checked against the published Guides.
 */
export function staticTopic(input: TopicInput): ResolvedTopic {
  const published = new Map(domainGuides([...input.source], GUIDE_DOMAINS["family-visa"]).map((guide) => [guide.slug, guide]));
  const ids = Object.keys(JOURNEY_GUIDES) as JourneyGuideId[];
  const availability = Object.fromEntries(
    ids.map((id): [JourneyGuideId, GuideAvailability] => {
      const meta = published.get(JOURNEY_GUIDES[id].slug);
      const detail = meta && input.sourceDetails.get(meta.slug);
      return [id, meta && detail ? { status: "ready", meta, detail } : { status: "unpublished" }];
    }),
  ) as Record<JourneyGuideId, GuideAvailability>;
  const localized: LocalizedJourneyGuides = {};
  if (input.locale !== "zh-CN")
    for (const id of ids) {
      const state = availability[id];
      const translated = input.localeDetails.get(JOURNEY_GUIDES[id].slug);
      if (state.status === "ready" && translated && translated.updatedAt === state.detail.updatedAt) localized[id] = translated;
    }
  const strings = input.locale === "zh-CN" ? null : (FAMILY_VISA_PUBLISHED_STRINGS[input.locale] ?? {});
  return resolveTopic(input.topic, input.locale, availability, localized, FAMILY_VISA_PUBLISHED_WORDING, strings);
}

/** "**x**" → <strong>, the rest escaped (as the app's emphasis()). */
function emphasisHtml(text: string): string {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 === 1 ? `<strong>${escapeHtml(part)}</strong>` : escapeHtml(part))).join("");
}

/** A verified Family & Visa topic page as static HTML, or null when the app would not show (or index) its content. */
export function staticTopicPage(input: TopicInput & { origin: string; published: readonly GuideMetadata[] }): StaticPage | null {
  const { origin, locale, topic } = input;
  const resolved = staticTopic(input);
  const { t, section } = resolved;
  if (!resolved.verified || !section) return null;
  const hubHref = guideRoutePath(locale, "family-visa");
  const tasks = section.tasks
    .map((task) => {
      const wording = task.status !== "pending" ? task.wording : null;
      const parts = [
        `<h2>${escapeHtml(task.title)}</h2>`,
        task.label ? `<p>${escapeHtml(task.label)}</p>` : "",
        wording ? `<p>${emphasisHtml(wording.summary)}</p>` : `<p>${escapeHtml(t("这一项的具体说明还在核对，请先看官方说明。"))}</p>`,
        wording?.steps?.length ? `<ol>${wording.steps.map((step) => `<li>${emphasisHtml(step)}</li>`).join("")}</ol>` : "",
        wording?.examples?.length
          ? `<p>${escapeHtml(t("常见的准备材料（举例，待核对；以官方清单为准）"))}</p><ul>${wording.examples.map((example) => `<li>${escapeHtml(example)}</li>`).join("")}</ul>`
          : "",
        wording?.advice ? `<p>${escapeHtml(wording.advice)}</p>` : "",
        task.official.length
          ? `<ul>${task.official.filter((link) => isSafeExternalUrl(link.url)).map((link) => `<li><a href="${escapeHtml(link.url)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`).join("")}</ul>`
          : "",
      ];
      return `<li>${parts.join("")}</li>`;
    })
    .join("");
  const html = [
    renderSiteNav(locale, input.published),
    `<main id="main" class="static-page static-topic">`,
    `<nav class="static-breadcrumb" aria-label="${escapeHtml(STATIC_COPY.breadcrumb[locale])}"><ol><li><a href="${guideHomePath(locale)}">${escapeHtml(GUIDE_UI[locale].home)}</a></li><li><a href="${escapeHtml(hubHref)}">${escapeHtml(GUIDE_UI[locale].domain["family-visa"])}</a></li></ol></nav>`,
    `<article>`,
    `<h1>${escapeHtml(resolved.title)}</h1>`,
    `<p class="static-summary">${escapeHtml(resolved.intro ?? "")}</p>`,
    `<p>${escapeHtml(t("这是一般信息，不是签证资格判断，也不是法律意见。"))}</p>`,
    `<ol>${tasks}</ol>`,
    `<p>${escapeHtml(t("想按你的情况生成完整的材料清单？"))} <a href="${escapeHtml(hubHref)}">${escapeHtml(t("生成我的材料清单"))}</a></p>`,
    `</article>`,
    `</main>`,
  ].join("\n");
  const head: PageHead = {
    locale,
    title: `${resolved.title} · Life in UK`,
    description: resolved.description,
    canonical: absolute(origin, familyVisaTopicPath(locale, topic)),
    alternates: GUIDE_LOCALES.map((candidate) => ({ locale: candidate, href: absolute(origin, familyVisaTopicPath(candidate, topic)) })),
  };
  return { head, body: html };
}

/**
 * Fills the built index.html with a static page: document language and
 * direction, title, head tags, and the page markup inside #root (React
 * replaces it when the app starts).
 */
/**
 * The page in each of its languages as plain links (the app footer has the same
 * list), so every language version is reachable by a link, not only by hreflang.
 */
export function renderLanguageLinks(head: PageHead): string {
  if (head.alternates.length < 2) return "";
  const items = head.alternates.map(({ locale, href }) => {
    const attrs = `lang="${GUIDE_LOCALE_LANG[locale]}" dir="${textDirection(locale)}"`;
    return locale === head.locale
      ? `<li><span aria-current="page" ${attrs}>${escapeHtml(GUIDE_LOCALE_LABELS[locale])}</span></li>`
      : `<li><a href="${escapeHtml(new URL(href).pathname)}" hreflang="${GUIDE_LOCALE_HREFLANG[locale]}" ${attrs}>${escapeHtml(GUIDE_LOCALE_LABELS[locale])}</a></li>`;
  }).join("");
  const label = escapeHtml(GUIDE_UI[head.locale].language);
  return `<footer class="static-footer"><nav aria-label="${label}"><h2>${label}</h2><ul>${items}</ul></nav></footer>`;
}

export function fillTemplate(template: string, page: StaticPage): string {
  const { locale } = page.head;
  const body = page.body + renderLanguageLinks(page.head);
  const html = template
    .replace(/<html lang="[^"]*"( dir="[^"]*")?>/, `<html lang="${GUIDE_LOCALE_LANG[locale]}" dir="${textDirection(locale)}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.head.title)}</title>\n    ${renderHead(page.head)}`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (!html.includes(`<div id="root">${body}`)) throw new Error("index.html template has no empty #root");
  return html;
}
