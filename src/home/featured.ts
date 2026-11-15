// Pure homepage selection helpers over the published Guide list.

import type { GuideMetadata } from "../guides/api";
import type { GuideDomain } from "../guides/domains";
import { belongsToDomain } from "../guides/domains.ts";
import { shortGuideTitle, shortLocalizedTitle } from "../guides/format.ts";
import { GUIDE_LOCALE_LANG, guideRoutePath, type GuideLocale } from "../guides/locales.ts";

export type PlacedGuide = { guide: GuideMetadata; domain: GuideDomain };

/** A home-page Guide in the page language, or a labelled Simplified Chinese fallback. */
export type HomeGuide = PlacedGuide & {
  /** Language of the title/summary shown and of the page the link opens. */
  locale: GuideLocale;
  /** True when the page locale has no published translation of this Guide. */
  fallback: boolean;
  href: string;
};

/**
 * The home page's Guides for `locale`. The Simplified Chinese list decides
 * what exists; a Guide counts as translated only when it is present in the
 * locale's own published list for the same section. Everything else stays
 * visible as a fallback that links to the Chinese original.
 */
export function localizeHomeGuides(
  source: readonly GuideMetadata[],
  localized: readonly GuideMetadata[],
  domains: readonly GuideDomain[],
  locale: GuideLocale,
): HomeGuide[] {
  const placedSource = placeGuides(source, domains);
  const known = new Set(placedSource.map((item) => item.guide.slug));
  const translations = locale === "zh-CN" ? [] : placeGuides(localized, domains);
  const translationFor = (item: PlacedGuide) =>
    translations.find((t) => t.guide.slug === item.guide.slug && t.domain === item.domain);
  const items: HomeGuide[] = placedSource.map((item) => {
    const translated = translationFor(item);
    return translated
      ? { ...translated, locale, fallback: false, href: guideRoutePath(locale, item.domain.id, item.guide.slug) }
      : { ...item, locale: "zh-CN", fallback: locale !== "zh-CN", href: guideRoutePath("zh-CN", item.domain.id, item.guide.slug) };
  });
  for (const extra of translations.filter((t) => !known.has(t.guide.slug)))
    items.push({ ...extra, locale, fallback: false, href: guideRoutePath(locale, extra.domain.id, extra.guide.slug) });
  return items;
}

/** Published Guides that belong to a launched section, in backend order. */
export function placeGuides(
  guides: readonly GuideMetadata[],
  domains: readonly GuideDomain[],
): PlacedGuide[] {
  const placed: PlacedGuide[] = [];
  for (const guide of guides) {
    const domain = domains.find((d) => belongsToDomain(guide, d));
    if (domain) placed.push({ guide, domain });
  }
  return placed;
}

/** Most recently updated first; ties keep backend order. */
export function byRecentUpdate<T extends PlacedGuide>(guides: readonly T[]): T[] {
  return guides
    .map((item, position) => ({ item, position }))
    .sort(
      (a, b) =>
        Date.parse(b.item.guide.updatedAt) -
          Date.parse(a.item.guide.updatedAt) || a.position - b.position,
    )
    .map(({ item }) => item);
}

/**
 * Preferred slugs first (when published), then the most recently updated
 * remaining Guides, up to `count`.
 */
export function selectFeatured<T extends PlacedGuide>(
  guides: readonly T[],
  preferred: readonly string[],
  count: number,
): T[] {
  const chosen: T[] = [];
  for (const slug of preferred) {
    const found = guides.find((item) => item.guide.slug === slug);
    if (found && !chosen.includes(found)) chosen.push(found);
  }
  for (const item of byRecentUpdate(guides))
    if (!chosen.includes(item)) chosen.push(item);
  return chosen.slice(0, count);
}

/** Compact title in the item's own language style. */
export function homeGuideTitle(item: HomeGuide): string {
  return item.locale === "zh-CN" ? shortGuideTitle(item.guide.title) : shortLocalizedTitle(item.guide.title);
}

/** Language attribute for an item whose text differs from the page language. */
export function itemLang(item: HomeGuide, page: GuideLocale): string | undefined {
  return item.locale === page ? undefined : GUIDE_LOCALE_LANG[item.locale];
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/**
 * A validated calendar date ("2026-12-25") as "2026年12月25日（周五）".
 * Computed from the numeric parts in UTC, never parsed as a local instant.
 */
export function formatHolidayDateZh(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${year}年${month}月${day}日（${WEEKDAYS[weekday]}）`;
}
