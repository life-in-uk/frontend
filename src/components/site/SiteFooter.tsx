import { availableHomeTopics, topicHref } from "../../home/topics";
import { Link } from "../Link";
import { GUIDE_LOCALE_HREFLANG, GUIDE_LOCALE_LABELS, GUIDE_LOCALE_LANG, GUIDE_UI, guideHomePath, textDirection, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import "./Site.css";

/** This page in another language: a plain link, so every language version is reachable by links. */
export type LanguageLink = { locale: GuideLocale; href: string };

/** Shared site footer: section navigation, About, this page's languages and the independence note. */
export function SiteFooter({ locale = "zh-CN", universityAvailable = false, educationAvailable = false, householdAvailable = false, languages = [] }: { locale?: GuideLocale; universityAvailable?: boolean; educationAvailable?: boolean; householdAvailable?: boolean; languages?: readonly LanguageLink[] }) {
  const ui = SITE_UI[locale];
  const home = guideHomePath(locale);
  const about = home === "/" ? "/#about" : `${home}#about`;
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <strong lang="en" dir="ltr">
            Life in UK<span className="brand-dot">.</span>
          </strong>
          <p>{ui.tagline}</p>
          <p className="site-footer-note">{ui.footer.note}</p>
          {ui.translationNotice && <p className="site-footer-note">{ui.translationNotice}</p>}
        </div>
        <nav className="site-footer-nav" aria-label={ui.footer.nav}>
          <div>
            <h2>{ui.footer.topics}</h2>
            <ul>
              {availableHomeTopics(universityAvailable, educationAvailable, householdAvailable).map((topic) => (
                <li key={topic.id}>
                  {topicHref(topic, locale) ? (
                    <Link to={topicHref(topic, locale)!}>{ui.topics[topic.id]?.title ?? topic.title}</Link>
                  ) : (
                    <span className="site-footer-upcoming">
                      {ui.topics[topic.id]?.title ?? topic.title}
                      <small>{ui.comingSoon}</small>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{ui.footer.about}</h2>
            <ul>
              <li>
                <Link to={about}>{ui.about}</Link>
              </li>
              <li>
                <Link to={about}>{ui.footer.sources}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>{ui.footer.official}</h2>
            <ul>
              <li>
                <a href="https://www.gov.uk/" lang="en">
                  GOV.UK
                </a>
              </li>
              <li>
                <a href="https://www.nhs.uk/" lang="en">
                  NHS.uk
                </a>
              </li>
              <li>
                <a href="https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/">
                  <span lang="en" dir="ltr">NHS 111</span>{ui.footer.nhs111Note}
                </a>
              </li>
            </ul>
          </div>
          {languages.length > 1 && (
            <div>
              <h2>{GUIDE_UI[locale].language}</h2>
              <ul>
                {languages.map((language) => (
                  <li key={language.locale}>
                    {language.locale === locale ? (
                      <span aria-current="page" lang={GUIDE_LOCALE_LANG[language.locale]} dir={textDirection(language.locale)}>
                        {GUIDE_LOCALE_LABELS[language.locale]}
                      </span>
                    ) : (
                      <Link to={language.href} hrefLang={GUIDE_LOCALE_HREFLANG[language.locale]} lang={GUIDE_LOCALE_LANG[language.locale]} dir={textDirection(language.locale)}>
                        {GUIDE_LOCALE_LABELS[language.locale]}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span dir="ltr">© 2026 Life in UK</span>
        <span>{ui.footer.independence}</span>
      </div>
    </footer>
  );
}
