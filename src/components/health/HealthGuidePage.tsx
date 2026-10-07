import { groupForSlug } from "../../guides/catalog";
import { HEALTH_GUIDE_DOMAIN } from "../../guides/domains";
import { GuidePage } from "../guides/GuidePage";
import type { GuidePresentation } from "../guides/GuidePage";
import { CategoryArt } from "./CategoryArt";
import "./Health.css";

/** Health's editorial look for a Guide: category tone, kicker and artwork. */
const healthPresentation: GuidePresentation = {
  pageClassName: "health-page",
  sectionTitle: (slug) => groupForSlug(slug)?.title,
  tone: (slug) => `tone-${groupForSlug(slug)?.tone ?? "neutral"}`,
  headerArt: (slug) => {
    const group = groupForSlug(slug);
    return group ? <CategoryArt id={group.id} /> : null;
  },
};

export function HealthGuidePage({ slug }: { slug: string }) {
  return (
    <GuidePage
      domain={HEALTH_GUIDE_DOMAIN}
      slug={slug}
      presentation={healthPresentation}
    />
  );
}
