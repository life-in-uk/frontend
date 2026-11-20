import { availableHomeTopics, topicHref } from "../../home/topics";
import { Link } from "../Link";
import { guideHomePath, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import "./Site.css";

/** Shared site footer: section navigation, About and the independence note. */
export function SiteFooter({ locale = "zh-CN", universityAvailable = false, educationAvailable = false, householdAvailable = false }: { locale?: GuideLocale; universityAvailable?: boolean; educationAvailable?: boolean; householdAvailable?: boolean }) {
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
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span dir="ltr">© 2026 Life in UK</span>
        <span>{ui.footer.independence}</span>
      </div>
    </footer>
  );
}
