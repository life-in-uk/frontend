import { navigate } from "../../router";
import { GUIDE_LOCALES, GUIDE_LOCALE_LABELS, GUIDE_LOCALE_LANG, GUIDE_UI, guideRoutePath, textDirection, type GuideLocale } from "../../guides/locales";

export function GuideLanguageSelect({
  locale,
  domain,
  slug,
  available,
  pathFor,
  className = "guide-language-select",
}: {
  locale: GuideLocale;
  domain?: string;
  slug?: string;
  available?: readonly GuideLocale[];
  /** Target page per locale; overrides `domain`/`slug` (used by the site header). */
  pathFor?: (next: GuideLocale) => string | undefined;
  className?: string;
}) {
  function change(next: GuideLocale) {
    // Same page type in the new locale: hub → hub, Guide → Guide, index → index.
    const target = pathFor ? pathFor(next) : domain ? guideRoutePath(next, domain, slug) : `/${next}/guides`;
    if (target) navigate(target);
  }
  return (
    <label className={className}>
      <span>{GUIDE_UI[locale].language}</span>
      <select aria-label={GUIDE_UI[locale].language} value={locale} onChange={(event) => change(event.currentTarget.value as GuideLocale)}>
        {GUIDE_LOCALES.map((option) => (
          <option key={option} value={option} lang={GUIDE_LOCALE_LANG[option]} dir={textDirection(option)} disabled={available !== undefined && !available.includes(option)}>
            {GUIDE_LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
