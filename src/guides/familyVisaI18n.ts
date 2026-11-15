// Family & Visa display translation.
//
// The navigator, checklist and topic data stay in Simplified Chinese: their
// ids, conditions, evidence keys and fingerprints are checked against the
// Simplified Chinese Guides. Translation happens only at display time: a
// string that has a reviewed translation for the locale is swapped for it;
// anything else (ids, slugs, URLs) passes through untouched.

import { createContext, useContext } from "react";
import type { GuideLocale } from "./locales.ts";
import { FAMILY_VISA_STRINGS } from "./familyVisaStringsLocales.ts";

export type FamilyVisaText = (
  zh: string,
  vars?: Readonly<Record<string, string | number>>,
) => string;

const fill = (
  text: string,
  vars?: Readonly<Record<string, string | number>>,
) =>
  vars
    ? text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      )
    : text;

/**
 * A translator for `locale`. `extra` adds strings that are only available
 * locally (the draft wording map on the preview server).
 */
export function familyVisaText(
  locale: GuideLocale,
  extra?: Readonly<Record<string, string>> | null,
): FamilyVisaText {
  const table = locale === "zh-CN" ? undefined : FAMILY_VISA_STRINGS[locale];
  return (zh, vars) => fill(extra?.[zh] ?? table?.[zh] ?? zh, vars);
}

/** Every string inside `value` passed through `t`; functions are kept. */
export function translateDeep<T>(value: T, t: (text: string) => string): T {
  if (typeof value === "string") return t(value) as T;
  if (Array.isArray(value))
    return value.map((item) => translateDeep(item, t)) as T;
  if (value && typeof value === "object") {
    if (value instanceof Set || value instanceof Map) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, translateDeep(item, t)]),
    ) as T;
  }
  return value;
}

export type FamilyVisaLocaleValue = {
  locale: GuideLocale;
  t: FamilyVisaText;
};

export const FamilyVisaLocaleContext = createContext<FamilyVisaLocaleValue>({
  locale: "zh-CN",
  t: familyVisaText("zh-CN"),
});

export const useFamilyVisaLocale = () => useContext(FamilyVisaLocaleContext);
