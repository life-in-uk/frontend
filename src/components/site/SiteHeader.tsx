import type { MouseEvent } from "react";
import { Search } from "lucide-react";
import { HOME_TOPICS } from "../../home/topics";
import { Link } from "../Link";
import { GUIDE_UI, localizedGuidePath, type GuideLocale } from "../../guides/locales";
import "./Site.css";

type SiteHeaderProps = {
  /** The launched section currently shown, for aria-current. */
  current: "home" | "health" | "money" | undefined;
  locale?: GuideLocale;
};

/** On the homepage, move to a section in place instead of navigating. */
function onHomeSection(id: string, focus: boolean) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname !== "/") return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (focus) target.focus();
    target.scrollIntoView({ block: focus ? "center" : "start" });
  };
}

/** Shared site header: brand, section navigation, search and About. */
export function SiteHeader({ current, locale = "zh-CN" }: SiteHeaderProps) {
  return (
    <header className="masthead">
      <div className="masthead-inner">
          <Link to={locale === "zh-CN" ? "/" : `/${locale}/guides`} className="masthead-brand" aria-label={`Life in UK ${GUIDE_UI[locale].home}`}>
          <strong lang="en">
            Life in UK<span className="brand-dot">.</span>
          </strong>
          <span className="brand-caption">在英国，把日子过明白。</span>
        </Link>
        <nav className="masthead-nav" aria-label="主导航">
          <ul>
            <li>
              <Link
                to={locale === "zh-CN" ? "/" : `/${locale}/guides`}
                className="masthead-link"
                aria-current={current === "home" ? "page" : undefined}
              >
                {GUIDE_UI[locale].home}
              </Link>
            </li>
            {HOME_TOPICS.map((topic) =>
              topic.domain ? (
                <li key={topic.id}>
                  <Link
                    to={locale === "zh-CN" ? topic.domain.basePath : localizedGuidePath(locale, topic.domain.id)}
                    className="masthead-link"
                    aria-current={current === topic.id ? "page" : undefined}
                  >
                    {locale !== "zh-CN" && (topic.domain.id === "health" || topic.domain.id === "money")
                      ? GUIDE_UI[locale].domain[topic.domain.id]
                      : topic.title}
                  </Link>
                </li>
              ) : (
                <li key={topic.id} className="masthead-upcoming">
                  <span>
                    {topic.title}
                    <span className="sr-only">（即将推出）</span>
                  </span>
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="masthead-actions">
          <Link
            to="/#search"
            className="masthead-search"
            aria-label="搜索指南和问题"
            onClick={onHomeSection("home-search", true)}
          >
            <Search size={21} aria-hidden="true" />
          </Link>
          <Link
            to="/#about"
            className="masthead-about"
            onClick={onHomeSection("about", false)}
          >
            关于我们
          </Link>
        </div>
      </div>
    </header>
  );
}
