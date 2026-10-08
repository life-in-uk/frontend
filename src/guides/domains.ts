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

export type GuideDomainId = "health" | "family-visa" | "money";

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

export const GUIDE_DOMAINS: Readonly<Record<GuideDomainId, GuideDomain>> = {
  health: HEALTH_GUIDE_DOMAIN,
  "family-visa": FAMILY_VISA_GUIDE_DOMAIN,
  money: MONEY_GUIDE_DOMAIN,
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
