// schema.org JSON-LD for a published Guide page, shared by the prerendered
// HTML (staticPages.ts) and the app (GuidePage.tsx) so both describe the page
// identically. Only values the page itself shows or is built from:
//
// - Article: the published title (H1), summary (meta description), language,
//   the API's publishedAt / updatedAt (the page shows "Updated" from
//   updatedAt) and the canonical URL. No author, publisher, reviewer or
//   rating is claimed: the site states its Guides are not professionally
//   reviewed, and it names no organisation as author.
// - BreadcrumbList: the visible breadcrumb, Home › section › this Guide, with
//   canonical URLs (the zh-CN section link's short URL redirects to the same
//   /zh-CN/… page).
//
// Topic hubs get none: their only breadcrumb level is Home, and a
// CollectionPage would repeat the title and description already in the head.

import { GUIDE_LOCALE_LANG, GUIDE_UI, guideHomePath, localizedGuidePath, type GuideLocale } from "../guides/locales.ts";
import type { GuideDomainId } from "../guides/domains.ts";

export type GuideStructuredDataInput = {
  origin: string;
  locale: GuideLocale;
  domainId: GuideDomainId;
  guide: { slug: string; title: string; summary: string; publishedAt: string; updatedAt: string };
};

const absolute = (origin: string, path: string) => new URL(path, origin).href;

/** One JSON-LD graph: the Guide as an Article and its breadcrumb trail. */
export function guideStructuredData({ origin, locale, domainId, guide }: GuideStructuredDataInput) {
  const url = absolute(origin, localizedGuidePath(locale, domainId, guide.slug));
  const ui = GUIDE_UI[locale];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: guide.title,
        description: guide.summary,
        inLanguage: GUIDE_LOCALE_LANG[locale],
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt,
        url,
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: ui.home, item: absolute(origin, guideHomePath(locale)) },
          { "@type": "ListItem", position: 2, name: ui.domain[domainId], item: absolute(origin, localizedGuidePath(locale, domainId)) },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json"> element; "<" is escaped so the text can never close the script. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
