import type { GuideLocale } from "../guides/locales.ts";
import type { TravelToolId } from "./tools.ts";

/** The Travel page for a locale: /travel for Simplified Chinese, /{locale}/travel otherwise. */
export function travelPath(locale: GuideLocale, tool?: TravelToolId): string {
  return `${locale === "zh-CN" ? "" : `/${locale}`}/travel${tool ? `#${tool}` : ""}`;
}
