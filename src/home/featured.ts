// Pure homepage selection helpers over the published Guide list.

import type { GuideMetadata } from "../guides/api";
import type { GuideDomain } from "../guides/domains";
import { belongsToDomain } from "../guides/domains.ts";

export type PlacedGuide = { guide: GuideMetadata; domain: GuideDomain };

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
export function byRecentUpdate(guides: readonly PlacedGuide[]): PlacedGuide[] {
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
export function selectFeatured(
  guides: readonly PlacedGuide[],
  preferred: readonly string[],
  count: number,
): PlacedGuide[] {
  const chosen: PlacedGuide[] = [];
  for (const slug of preferred) {
    const found = guides.find((item) => item.guide.slug === slug);
    if (found && !chosen.includes(found)) chosen.push(found);
  }
  for (const item of byRecentUpdate(guides))
    if (!chosen.includes(item)) chosen.push(item);
  return chosen.slice(0, count);
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
