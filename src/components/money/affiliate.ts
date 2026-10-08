// Optional commercial slot for the Money & Finance hub.
//
// Kept apart from Quick Answers and Guide evidence on purpose: nothing here
// can change which answers show, their wording or their evidence. The slot is
// disabled until a verified programme, a reviewed destination and the
// comparison content behind it are approved.

export type AffiliateOffer = {
  /** Commercial disclosure, always shown with the card. */
  disclosure: string;
  title: string;
  description: string;
  ctaLabel: string;
  /** A reviewed https destination, or null: the CTA is then not a link. */
  href: string | null;
};

/** The live card. null keeps the slot disabled: no card and no space. */
export const MONEY_AFFILIATE_OFFER: AffiliateOffer | null = null;

/**
 * Approved copy for a future card. Preview only, never published as is:
 * it has no destination, and the comparison it describes is not built yet.
 */
export const MONEY_AFFILIATE_DRAFT: AffiliateOffer = {
  disclosure: "商业合作 · 含推广链接",
  title: "英国热门个人银行账户精选",
  description:
    "了解不同账户的申请条件、主要功能和适用人群，找到值得进一步比较的选择。",
  ctaLabel: "查看账户选择",
  href: null,
};

const filled = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** The offer when it can be shown honestly (disclosure included), else null. */
export function displayableOffer(
  offer: AffiliateOffer | null | undefined,
): AffiliateOffer | null {
  if (
    !offer ||
    !filled(offer.disclosure) ||
    !filled(offer.title) ||
    !filled(offer.description) ||
    !filled(offer.ctaLabel)
  )
    return null;
  if (offer.href === null) return offer;
  try {
    return new URL(offer.href).protocol === "https:" ? offer : null;
  } catch {
    return null;
  }
}
