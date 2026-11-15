import type { MouseEvent } from "react";
import { Search } from "lucide-react";
import { HOME_TOPICS, topicHref } from "../../home/topics";
import { Link } from "../Link";
import { GUIDE_UI, guideHomePath, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";
import "./Site.css";

type SiteHeaderProps = {
  /** The launched section currently shown, for aria-current. */
  current: "home" | "health" | "money" | "family-visa" | "travel" | undefined;
  locale?: GuideLocale;
  /**
   * Same page in another language. Given only on pages without their own
   * language selector (home, not-found), so a page never shows two.
   */
  switchPath?: (next: GuideLocale) => string | undefined;
};

/** On the homepage, move to a section in place instead of navigating. */
function onHomeSection(home: string, id: string, focus: boolean) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname !== home) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (focus) target.focus();
    target.scrollIntoView({ block: focus ? "center" : "start" });
  };
}

/** Shared site header: brand, section navigation, search, language and About. */
export function SiteHeader({ current, locale = "zh-CN", switchPath }: SiteHeaderProps) {
  const ui = SITE_UI[locale];
  const home = guideHomePath(locale);
  const homeAnchor = (id: string) => (home === "/" ? `/#${id}` : `${home}#${id}`);
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <Link to={home} className="masthead-brand" aria-label={`Life in UK ${GUIDE_UI[locale].home}`}>
          <strong lang="en" dir="ltr">
            Life in UK<span className="brand-dot">.</span>
          </strong>
          <span className="brand-caption">{ui.tagline}</span>
        </Link>
        <nav className="masthead-nav" aria-label={ui.mainNav}>
          <ul>
            <li>
              <Link
                to={home}
                className="masthead-link"
                aria-current={current === "home" ? "page" : undefined}
              >
                {GUIDE_UI[locale].home}
              </Link>
            </li>
            {HOME_TOPICS.map((topic) => {
              const href = topicHref(topic, locale);
              return href ? (
                <li key={topic.id}>
                  <Link
                    to={href}
                    className="masthead-link"
                    aria-current={current === topic.id ? "page" : undefined}
                  >
                    {ui.topics[topic.id]?.title ?? topic.title}
                  </Link>
                </li>
              ) : (
                <li key={topic.id} className="masthead-upcoming">
                  <span>
                    {ui.topics[topic.id]?.title ?? topic.title}
                    <span className="sr-only">{ui.comingSoonSr}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="masthead-actions">
          {switchPath && (
            <GuideLanguageSelect locale={locale} pathFor={switchPath} className="guide-language-select masthead-language" />
          )}
          <Link
            to={homeAnchor("search")}
            className="masthead-search"
            aria-label={ui.searchLabel}
            onClick={onHomeSection(home, "home-search", true)}
          >
            <Search size={21} aria-hidden="true" />
          </Link>
          <Link
            to={homeAnchor("about")}
            className="masthead-about"
            onClick={onHomeSection(home, "about", false)}
          >
            {ui.about}
          </Link>
        </div>
      </div>
    </header>
  );
}
