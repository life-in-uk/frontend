// Family & Visa restated legal wording: types and loading.
//
// The navigator and checklist structure (ids, titles, conditions, evidence
// keys, fingerprints) lives in src/. The wording that restates unpublished
// Guide text does not: it lives in the gitignored, local-only file
// dev/familyVisaDraftContent.ts and is loaded only when the build-time flag
// __FAMILY_VISA_DRAFT_CONTENT__ is true, which vite.config.ts sets only for
// the opt-in `npm run dev:family-visa-preview` server. In a production build the
// flag is false, the import below is dead code, and the wording is not
// bundled at all. There is no production source for this wording yet: until
// a reviewed one exists, production shows the structure with "待核对".

import type { TextBlock } from "./familyVisaJourney.ts";
import type { JourneyGuideId } from "./familyVisaJourney.ts";

export type PassageContent = { text: readonly TextBlock[]; advice?: string };
export type TaskContent = {
  summary: string;
  steps?: readonly string[];
  examples?: readonly string[];
  advice?: string;
};

export type FamilyVisaContent = {
  /** The Guide versions this wording was reviewed against. */
  reviewedFor: Readonly<Record<JourneyGuideId, string>>;
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

/**
 * The restated wording, or null when none is available: always null in a
 * production build, on plain `npm run dev`, and in a clone without the
 * gitignored local file. Never derived from a person's answers.
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
    return load ? (await load()).FAMILY_VISA_DRAFT_CONTENT : null;
  }
  return null;
}
