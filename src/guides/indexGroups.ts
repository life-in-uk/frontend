import type { GuideMetadata } from "./api.ts";
import { GUIDE_DOMAINS, UNIVERSITY_CATEGORY, type GuideDomainId } from "./domains.ts";
import { HOUSEHOLD_CATEGORY } from "./household.ts";

/** Index sections in the order of the site menu: visas, housing, health and education, money. */
export const INDEX_DOMAIN_ORDER: readonly GuideDomainId[] = [
  "family-visa", "work-visa", "settlement", "renting", HOUSEHOLD_CATEGORY, "health", "education", UNIVERSITY_CATEGORY, "money",
];

/** Published Guides grouped by section, in menu order; each section keeps the list's own order. */
export function groupGuidesByDomain<T extends Pick<GuideMetadata, "category">>(guides: readonly T[]): { domain: GuideDomainId; guides: T[] }[] {
  const known = INDEX_DOMAIN_ORDER.map((domain) => ({ domain, guides: guides.filter((guide) => guide.category === GUIDE_DOMAINS[domain].category) }));
  return known.filter((group) => group.guides.length > 0);
}
