import { useEffect, useRef, useState } from "react";
import { getLocalizedGuide, startupGuide } from "../../guides/api.ts";
import type {
  GuideDetail,
  GuideEvidence,
  GuideMetadata,
  GuideSource,
} from "../../guides/api";
import { JOURNEY_GUIDES } from "../../guides/familyVisaJourney.ts";
import type {
  GuideAvailability,
  JourneyGuideId,
  ResolvedStage,
} from "../../guides/familyVisaJourney";
import type { ResolvedSection } from "../../guides/familyVisaChecklist";
import type { GuideLocale } from "../../guides/locales";

export type LocalizedJourneyGuides = Partial<
  Record<JourneyGuideId, GuideDetail>
>;

/**
 * The published translations of the journey's Guides, fetched only for
 * Guides whose Simplified Chinese version is ready. Integrity is still
 * checked against the Simplified Chinese Guide; a translation is used only
 * for showing the same evidence (same keys) in the page language.
 */
export function useLocalizedJourneyGuides(
  locale: GuideLocale,
  availability: Readonly<Record<JourneyGuideId, GuideAvailability>>,
): LocalizedJourneyGuides {
  // Translations fetched before the first render (main.tsx), for the same Guide version.
  const [guides, setGuides] = useState<LocalizedJourneyGuides>(() => {
    if (locale === "zh-CN") return {};
    const ready: LocalizedJourneyGuides = {};
    for (const id of Object.keys(JOURNEY_GUIDES) as JourneyGuideId[]) {
      const slug = JOURNEY_GUIDES[id].slug;
      const source = startupGuide(slug, "zh-CN");
      const translated = startupGuide(slug, locale);
      if (source && translated && translated.updatedAt === source.updatedAt) ready[id] = translated;
    }
    return ready;
  });
  const requested = useRef(new Set<string>(Object.keys(guides).map((id) => `${locale}:${id}`)));

  useEffect(() => {
    if (locale === "zh-CN") return;
    const controller = new AbortController();
    for (const id of Object.keys(JOURNEY_GUIDES) as JourneyGuideId[]) {
      const state = availability[id];
      const key = `${locale}:${id}`;
      if (state.status !== "ready" || requested.current.has(key)) continue;
      requested.current.add(key);
      getLocalizedGuide(JOURNEY_GUIDES[id].slug, locale, controller.signal)
        .then((localized) => {
          if (localized.guide.updatedAt !== state.detail.updatedAt) return;
          setGuides((current) => ({ ...current, [id]: localized.guide }));
        })
        .catch(() => {
          // No translation: the Simplified Chinese evidence stays, labelled.
          if (controller.signal.aborted) requested.current.delete(key);
        });
    }
    return () => controller.abort();
  }, [locale, availability]);

  return locale === "zh-CN" ? {} : guides;
}

type Shown = {
  evidence: GuideEvidence[];
  sources: Map<string, GuideSource>;
  /** Set when the evidence is shown in Simplified Chinese as a fallback. */
  lang?: string;
};

function swapEvidence(
  evidence: GuideEvidence[],
  sources: Map<string, GuideSource>,
  guide: GuideDetail | undefined,
): Shown {
  if (!guide) return { evidence, sources, lang: "zh-CN" };
  const byKey = new Map(guide.evidence.map((item) => [item.key, item]));
  const translated = evidence.map((item) => byKey.get(item.key));
  if (translated.some((item) => item === undefined))
    return { evidence, sources, lang: "zh-CN" };
  return {
    evidence: translated as GuideEvidence[],
    sources: new Map(guide.sources.map((source) => [source.key, source])),
  };
}

const idForSlug = (slug: string) =>
  (Object.keys(JOURNEY_GUIDES) as JourneyGuideId[]).find(
    (id) => JOURNEY_GUIDES[id].slug === slug,
  );

export type ShownGuideLink = GuideMetadata & { lang?: string };

/** Stages with translated evidence and Guide titles where published. */
export function localizeStages(
  stages: ResolvedStage[],
  locale: GuideLocale,
  guides: LocalizedJourneyGuides,
): ResolvedStage[] {
  if (locale === "zh-CN") return stages;
  return stages.map((stage) => ({
    ...stage,
    summary:
      stage.summary?.map((passage) =>
        passage.state.status === "verified"
          ? {
              ...passage,
              state: {
                status: "verified" as const,
                ...swapEvidence(
                  passage.state.evidence,
                  passage.state.sources,
                  guides[passage.guide],
                ),
              },
            }
          : passage,
      ) ?? null,
    items: stage.items.map((item) => ({
      ...item,
      passages: item.passages.map((passage) =>
        passage.state.status === "verified"
          ? {
              ...passage,
              state: {
                status: "verified" as const,
                ...swapEvidence(
                  passage.state.evidence,
                  passage.state.sources,
                  guides[passage.guide],
                ),
              },
            }
          : passage,
      ),
    })),
    guides: stage.guides.map((meta): ShownGuideLink => {
      const id = idForSlug(meta.slug);
      const localized = id ? guides[id] : undefined;
      return localized
        ? { ...meta, title: localized.title }
        : { ...meta, lang: "zh-CN" };
    }),
  }));
}

/** Checklist sections with translated task evidence where published. */
export function localizeSections(
  sections: ResolvedSection[],
  locale: GuideLocale,
  guides: LocalizedJourneyGuides,
): ResolvedSection[] {
  if (locale === "zh-CN") return sections;
  return sections.map((section) => ({
    ...section,
    tasks: section.tasks.map((task) => {
      if (task.status !== "verified" || !task.sources || !task.basis)
        return task;
      const shown = swapEvidence(
        task.evidence,
        task.sources,
        guides[task.basis.guide],
      );
      return {
        ...task,
        evidence: shown.evidence,
        sources: shown.sources,
        evidenceLang: shown.lang,
      };
    }),
  }));
}
