import {
  GUIDE_LOCALES,
  GUIDE_LOCALE_LANG,
  localizedGuidePath,
  textDirection,
  type GuideLocale,
} from "./locales.ts";

export type AlternatePage = { locale: GuideLocale; href: string };

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
  document.title = options.title;
  document.documentElement.lang = GUIDE_LOCALE_LANG[options.locale];
  document.documentElement.dir = textDirection(options.locale);
  let description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!description) {
    description = document.createElement("meta");
    description.name = "description";
    document.head.append(description);
  }
  description.content = options.description;
  document.head.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]').forEach((node) => node.remove());
  if (options.canonical) {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = options.canonical;
    document.head.append(canonical);
    for (const alternate of options.alternates ?? []) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = GUIDE_LOCALE_LANG[alternate.locale];
      link.href = alternate.href;
      document.head.append(link);
    }
    if (options.alternates?.some((row) => row.locale === "zh-CN")) {
      const fallback = document.createElement("link");
      fallback.rel = "alternate";
      fallback.hreflang = "x-default";
      fallback.href = options.alternates.find((row) => row.locale === "zh-CN")!.href;
      document.head.append(fallback);
    }
  }
  let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (options.noIndex) {
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.append(robots);
    }
    robots.content = "noindex, nofollow";
  } else robots?.remove();
}
