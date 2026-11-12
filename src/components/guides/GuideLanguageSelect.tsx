import { navigate } from "../../router";
import { GUIDE_LOCALES, GUIDE_LOCALE_LABELS, GUIDE_UI, localizedGuidePath, type GuideLocale } from "../../guides/locales";

export function GuideLanguageSelect({
  locale,
  domain,
  slug,
  available,
}: {
  locale: GuideLocale;
  domain?: string;
  slug?: string;
  available?: readonly GuideLocale[];
}) {
  function change(next: GuideLocale) {
    navigate(domain ? localizedGuidePath(next, domain, slug) : `/${next}/guides`);
  }
  return (
    <label className="guide-language-select">
      <span>{GUIDE_UI[locale].language}</span>
      <select aria-label={GUIDE_UI[locale].language} value={locale} onChange={(event) => change(event.currentTarget.value as GuideLocale)}>
        {GUIDE_LOCALES.map((option) => (
          <option key={option} value={option} disabled={available !== undefined && !available.includes(option)}>
            {GUIDE_LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
