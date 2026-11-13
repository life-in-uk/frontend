import {
  GUIDE_LOCALES,
  GUIDE_LOCALE_HREFLANG,
  GUIDE_LOCALE_LANG,
  localizedGuidePath,
  textDirection,
  type GuideLocale,
} from "./locales.ts";

export type AlternatePage = { locale: GuideLocale; href: string };

/** Remove only metadata owned by the Guide SEO helper and restore the default document language. */
export function clearGuideSeo(locale: GuideLocale = "zh-CN"): void {
  document.head.querySelectorAll('[data-guide-seo="true"]').forEach((node) => node.remove());
  document.documentElement.lang = GUIDE_LOCALE_LANG[locale];
  document.documentElement.dir = textDirection(locale);
}

export function guideAlternates(
  origin: string,
  domain: string,
  slug: string,
  available: readonly GuideLocale[],
): AlternatePage[] {
  return GUIDE_LOCALES.filter((locale) => available.includes(locale)).map((locale) => ({
    locale,
    href: new URL(localizedGuidePath(locale, domain, slug), origin).href,
  }));
}

export function localizedIndexAlternates(
  origin: string,
  available: readonly GuideLocale[],
): AlternatePage[] {
  return GUIDE_LOCALES.filter((locale) => available.includes(locale)).map((locale) => ({
    locale,
    href: new URL(`/${locale}/guides`, origin).href,
  }));
}

/** Updates SPA SEO tags only after published content has been confirmed. */
export function applyGuideSeo(options: {
  locale: GuideLocale;
  canonical: string | null;
  title: string;
  description: string;
  alternates?: readonly AlternatePage[];
  noIndex?: boolean;
}): void {
  clearGuideSeo(options.locale);
  document.title = options.title;
  document.documentElement.lang = GUIDE_LOCALE_LANG[options.locale];
  document.documentElement.dir = textDirection(options.locale);
  const description = document.createElement("meta");
  description.name = "description";
  description.dataset.guideSeo = "true";
  document.head.append(description);
  description.content = options.description;
  if (options.canonical) {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = options.canonical;
    canonical.dataset.guideSeo = "true";
    document.head.append(canonical);
    for (const alternate of options.alternates ?? []) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = GUIDE_LOCALE_HREFLANG[alternate.locale];
      link.href = alternate.href;
      link.dataset.guideSeo = "true";
      document.head.append(link);
    }
    if (options.alternates?.some((row) => row.locale === "zh-CN")) {
      const fallback = document.createElement("link");
      fallback.rel = "alternate";
      fallback.hreflang = "x-default";
      fallback.href = options.alternates.find((row) => row.locale === "zh-CN")!.href;
      fallback.dataset.guideSeo = "true";
      document.head.append(fallback);
    }
  }
  if (options.noIndex) {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.dataset.guideSeo = "true";
    robots.content = "noindex, nofollow";
    document.head.append(robots);
  }
}
