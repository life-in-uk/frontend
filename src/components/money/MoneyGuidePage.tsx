import { MONEY_GUIDE_DOMAIN } from "../../guides/domains";
import { GuidePage } from "../guides/GuidePage";
import type { GuidePresentation } from "../guides/GuidePage";
import "./Money.css";

/** Money & Finance's look for a Guide: its own tone, no grouping yet. */
const moneyPresentation: GuidePresentation = {
  pageClassName: "money-page",
  tone: () => "tone-money",
};

export function MoneyGuidePage({ slug }: { slug: string }) {
  return (
    <GuidePage
      domain={MONEY_GUIDE_DOMAIN}
      slug={slug}
      presentation={moneyPresentation}
    />
  );
}
