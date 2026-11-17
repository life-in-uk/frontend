// Family & Visa restated legal wording: types and loading.
//
// The navigator and checklist structure (ids, titles, conditions, evidence
// keys, fingerprints) lives in src/. The wording that restates a PUBLISHED
// Guide lives in src/guides/familyVisaPublishedWording.ts and is served by
// every build. The wording that restates an UNPUBLISHED draft Guide lives in
// the gitignored, local-only file dev/familyVisaDraftContent.ts and is loaded
// only when the build-time flag __FAMILY_VISA_DRAFT_CONTENT__ is true, which
// vite.config.ts sets only for the opt-in `npm run dev:family-visa-preview`
// server. In a production build that import is dead code and the draft
// wording is not bundled at all; stages without wording show "待核对".

import type { TextBlock } from "./familyVisaJourney.ts";
import type { JourneyGuideId } from "./familyVisaJourney.ts";
import type { GuideLocale } from "./locales.ts";
import { FAMILY_VISA_PUBLISHED_WORDING } from "./familyVisaPublishedWording.ts";
import { FAMILY_VISA_PUBLISHED_STRINGS } from "./familyVisaPublishedWordingLocales.ts";

export type PassageContent = { text: readonly TextBlock[]; advice?: string };
export type TaskContent = {
  summary: string;
  steps?: readonly string[];
  examples?: readonly string[];
  advice?: string;
};

export type FamilyVisaContent = {
  /** The Guide versions this wording was reviewed against (absent: none). */
  reviewedFor: Readonly<Partial<Record<JourneyGuideId, string>>>;
  passages: Readonly<Record<string, PassageContent>>;
  tasks: Readonly<Record<string, TaskContent>>;
  sections: Readonly<Record<string, { intro: string }>>;
  topics: Readonly<Record<string, { intro: string }>>;
};

declare const __FAMILY_VISA_DRAFT_CONTENT__: boolean | undefined;

/** True only on the dev server (see vite.config.ts); false in every build. */
export const DRAFT_CONTENT_ENABLED: boolean =
  typeof __FAMILY_VISA_DRAFT_CONTENT__ !== "undefined" &&
  __FAMILY_VISA_DRAFT_CONTENT__ === true;

/** Draft wording merged under the published wording (published wins). */
function withDrafts(
  published: FamilyVisaContent,
  draft: FamilyVisaContent | undefined,
): FamilyVisaContent {
  if (!draft) return published;
  return {
    reviewedFor: { ...draft.reviewedFor, ...published.reviewedFor },
    passages: { ...draft.passages, ...published.passages },
    tasks: { ...draft.tasks, ...published.tasks },
    sections: { ...draft.sections, ...published.sections },
    topics: { ...draft.topics, ...published.topics },
  };
}

/**
 * The restated wording: the published wording everywhere, plus the local
 * draft wording on the opt-in preview server only. Never derived from a
 * person's answers.
 */
export async function loadFamilyVisaContent(): Promise<FamilyVisaContent | null> {
  if (
    typeof __FAMILY_VISA_DRAFT_CONTENT__ !== "undefined" &&
    __FAMILY_VISA_DRAFT_CONTENT__
  ) {
    // A glob, so a checkout without the local file still type-checks and
    // builds: the map is simply empty.
    const local = import.meta.glob<{
      FAMILY_VISA_DRAFT_CONTENT: FamilyVisaContent;
    }>("../../dev/familyVisaDraftContent.ts");
    const load = Object.values(local)[0];
    return withDrafts(
      FAMILY_VISA_PUBLISHED_WORDING,
      load ? (await load()).FAMILY_VISA_DRAFT_CONTENT : undefined,
    );
  }
  return FAMILY_VISA_PUBLISHED_WORDING;
}

/**
 * The wording a production build loads, available synchronously (null on the
 * preview server, where draft wording loads asynchronously), so a page can
 * render its content in its first render.
 */
export function initialFamilyVisaContent(locale: GuideLocale): {
  content: FamilyVisaContent;
  strings: Readonly<Record<string, string>> | null;
} | null {
  if (DRAFT_CONTENT_ENABLED) return null;
  return {
    content: FAMILY_VISA_PUBLISHED_WORDING,
    strings: locale === "zh-CN" ? null : (FAMILY_VISA_PUBLISHED_STRINGS[locale] ?? {}),
  };
}

/**
 * Translations of the restated wording for `locale`, keyed by the Simplified
 * Chinese text: the published translations everywhere, plus the local draft
 * translations (gitignored dev/familyVisaDraftContentLocales.ts) on the
 * preview server only. Null for zh-CN, the source language.
 */
export async function loadFamilyVisaContentStrings(
  locale: GuideLocale,
): Promise<Readonly<Record<string, string>> | null> {
  if (locale === "zh-CN") return null;
  const published = FAMILY_VISA_PUBLISHED_STRINGS[locale] ?? {};
  if (
    typeof __FAMILY_VISA_DRAFT_CONTENT__ !== "undefined" &&
    __FAMILY_VISA_DRAFT_CONTENT__
  ) {
    const local = import.meta.glob<{
      FAMILY_VISA_DRAFT_STRINGS: Partial<
        Record<GuideLocale, Readonly<Record<string, string>>>
      >;
    }>("../../dev/familyVisaDraftContentLocales.ts");
    const load = Object.values(local)[0];
    const draft = load
      ? ((await load()).FAMILY_VISA_DRAFT_STRINGS[locale] ?? {})
      : {};
    return { ...draft, ...published };
  }
  return published;
}
