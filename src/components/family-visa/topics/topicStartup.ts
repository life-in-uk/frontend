// Startup data for a prerendered Family & Visa topic page (main.tsx): the
// journey Guides it is checked against, fetched before the first render. A
// separate small module so the entry chunk does not carry the journey data.
import { primeStartupGuides, type StartupOutcome } from "../../../guides/api";
import { JOURNEY_GUIDE_SLUGS } from "../../../guides/familyVisaJourney";
import type { GuideLocale } from "../../../guides/locales";

export function primeTopicStartup(locale: GuideLocale, signal: AbortSignal): Promise<StartupOutcome> {
  return primeStartupGuides(JOURNEY_GUIDE_SLUGS, locale, signal);
}
