// Optional commercial recommendation slots (affiliate-ready, INACTIVE).
//
// A small, configuration-only hook for future commercial partners in the few
// places where a comparison is genuinely useful: broadband and energy
// comparison in the Renting Journey. Nothing here is active: every slot is
// disabled and has no partners, so no link, label or empty container is ever
// shown. Guides and checklists never depend on these slots.
//
// Rules for turning a slot on later (enforced by activeRecommendations and
// tests/recommendations.test.mjs):
// - a real partner agreement exists; never invent providers, rankings,
//   prices or savings;
// - every partner has an https link and a disclosure in all five locales,
//   shown next to the link;
// - links are plain anchors with rel="sponsored noopener noreferrer"; no
//   tracking cookies, pixels or external scripts are added to the page.
//
// Contents insurance and moving services have no slot: no existing section
// covers them.

import type { GuideLocale } from "./locales.ts";
import { GUIDE_LOCALES } from "./locales.ts";

export type RecommendationContext = "broadband-comparison" | "energy-comparison";

type Localized = Readonly<Record<GuideLocale, string>>;

export type RecommendationPartner = {
  /** Stable id for tests and analytics-free bookkeeping. */
  id: string;
  /** The partner's own name, as it appears on its site. */
  name: string;
  /** Destination; must be https. No tracking parameters are added by the site. */
  url: string;
  /** What the partner offers, in plain words. Never a ranking or a price claim. */
  description: Localized;
  /** Commercial relationship, shown next to the link. */
  disclosure: Localized;
};

export type RecommendationSlot = {
  enabled: boolean;
  partners: readonly RecommendationPartner[];
};

/** Every slot is off. Turning one on is a deliberate, reviewed change. */
export const RECOMMENDATION_SLOTS: Readonly<Record<RecommendationContext, RecommendationSlot>> = {
  "broadband-comparison": { enabled: false, partners: [] },
  "energy-comparison": { enabled: false, partners: [] },
};

/** Which Renting Journey step may show which slot. */
export const RENTING_STEP_RECOMMENDATIONS: Readonly<Record<string, RecommendationContext>> = {
  broadband: "broadband-comparison",
  energy: "energy-comparison",
};

/** Heading shown above an active slot. */
export const RECOMMENDATION_LABEL: Localized = {
  "zh-CN": "商业合作链接",
  "zh-TW": "商業合作連結",
  en: "Commercial partner link",
  ur: "تجارتی شراکت دار لنک",
  hi: "व्यावसायिक साझेदार लिंक",
};

function isValidPartner(partner: RecommendationPartner): boolean {
  let url: URL;
  try {
    url = new URL(partner.url);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    partner.id.trim() !== "" &&
    partner.name.trim() !== "" &&
    GUIDE_LOCALES.every((locale) => partner.disclosure[locale]?.trim() && partner.description[locale]?.trim())
  );
}

/**
 * Partners to show for a context: none unless the slot is enabled, and only
 * partners with an https link and a complete disclosure in every locale.
 */
export function activeRecommendations(
  context: RecommendationContext,
  slots: Readonly<Record<RecommendationContext, RecommendationSlot>> = RECOMMENDATION_SLOTS,
): RecommendationPartner[] {
  const slot = slots[context];
  if (!slot?.enabled) return [];
  return slot.partners.filter(isValidPartner);
}
