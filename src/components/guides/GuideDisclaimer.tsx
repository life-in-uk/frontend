import type { GuideDomainId } from "../../guides/domains";
import type { GuideLocale } from "../../guides/locales";
import { guideNotice } from "../../guides/guideNotice";

/**
 * The section's disclaimer under a Guide (guideNotice.ts), or nothing when the Guide's own text already
 * says it is general information. The prerendered page renders the same element and text
 * (seo/staticPages.ts), so the app replaces it without a visible change.
 */
export function GuideDisclaimer({ domain, locale, content }: { domain: GuideDomainId; locale: GuideLocale; content: string }) {
  const notice = guideNotice(domain, locale, content);
  return notice ? <p className="guide-notice">{notice}</p> : null;
}
