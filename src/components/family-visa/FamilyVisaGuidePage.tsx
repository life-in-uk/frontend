import { FAMILY_VISA_GUIDE_DOMAIN } from "../../guides/domains";
import { GuidePage } from "../guides/GuidePage";
import type { GuidePresentation } from "../guides/GuidePage";
import "./FamilyVisa.css";

/** Family & Visa's look for a Guide: its own tone, no editorial grouping yet. */
const familyVisaPresentation: GuidePresentation = {
  pageClassName: "family-visa-page",
  tone: () => "tone-family",
};

export function FamilyVisaGuidePage({ slug }: { slug: string }) {
  return (
    <GuidePage
      domain={FAMILY_VISA_GUIDE_DOMAIN}
      slug={slug}
      presentation={familyVisaPresentation}
    />
  );
}
