import type { GuideLocale } from "../guides/locales.ts";
import type { TravelToolId } from "./tools.ts";

/** The Travel page for a locale: /{locale}/travel (the original /travel still opens the Simplified Chinese page). */
export function travelPath(locale: GuideLocale, tool?: TravelToolId): string {
  return `/${locale}/travel${tool ? `#${tool}` : ""}`;
}
