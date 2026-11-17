// What a Family & Visa special-circumstances topic page shows, as plain data.
// Used by the page (FamilyVisaTopicPage.tsx) and by the prerendered static
// page (src/seo/staticPages.ts), so both show the same verified content and
// agree on whether the page may be indexed.

import { buildChecklist, CHECKLIST_SECTIONS } from "../../../guides/familyVisaChecklist.ts";
import type { ResolvedSection } from "../../../guides/familyVisaChecklist.ts";
import type { FamilyVisaContent } from "../../../guides/familyVisaContent.ts";
import { familyVisaText, translateDeep } from "../../../guides/familyVisaI18n.ts";
import type { FamilyVisaText } from "../../../guides/familyVisaI18n.ts";
import { JOURNEY_GUIDES, reviewedWording } from "../../../guides/familyVisaJourney.ts";
import type { Answers, GuideAvailability, JourneyGuideId } from "../../../guides/familyVisaJourney.ts";
import type { GuideLocale } from "../../../guides/locales.ts";
import type { FamilyVisaTopicId } from "../../../router.ts";
import { localizeSections } from "../localizedJourney.ts";
import type { LocalizedJourneyGuides } from "../localizedJourney.ts";

type Topic = {
  title: string;
  description: string;
  /** The situation the topic's checklist content is built for. */
  answers: Answers;
};

export const TOPICS: Record<FamilyVisaTopicId, Topic> = {
  "children-from-previous-relationship": {
    title: "孩子来自上一段关系，如何准备英国签证材料？",
    description:
      "伴侣签证路线下，孩子来自上一段关系、英国伴侣不是孩子的父母时，要准备哪些材料，以及“单方负责”是什么意思。",
    answers: {
      relationship: "married",
      children: "yes",
      childRelations: ["not-parent"],
      location: "unsure",
    },
  },
};

export type ResolvedTopic = {
  t: FamilyVisaText;
  title: string;
  description: string;
  intro: string | null;
  section: ResolvedSection | undefined;
  /** The content may be shown (and the page indexed): the Guide behind it is verified and reviewed wording exists. */
  verified: boolean;
};

/** The topic for a locale, from the journey Guides' availability (loading states give verified: false). */
export function resolveTopic(
  topic: FamilyVisaTopicId,
  locale: GuideLocale,
  availability: Readonly<Record<JourneyGuideId, GuideAvailability>>,
  localized: LocalizedJourneyGuides,
  content: FamilyVisaContent | null,
  strings: Readonly<Record<string, string>> | null,
): ResolvedTopic {
  const config = TOPICS[topic];
  const t = familyVisaText(locale, strings);
  const section = localizeSections(
    translateDeep(buildChecklist(config.answers, availability, JOURNEY_GUIDES, CHECKLIST_SECTIONS, content), (text: string) => t(text)),
    locale,
    localized,
  ).find((s) => s.id === "children");
  const zhIntro = reviewedWording(content, "children", (c) => c.topics, topic)?.intro ?? null;
  const intro = zhIntro === null ? null : t(zhIntro);
  const verified = Boolean(section?.open) && intro !== null && Boolean(section?.tasks.some((task) => task.status === "verified"));
  return { t, title: t(config.title), description: t(config.description), intro, section, verified };
}
