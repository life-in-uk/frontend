import { useEffect } from "react";
import { ABOUT_CONTENT } from "../../about/aboutContent";
import { GUIDE_LOCALE_LANG, GUIDE_LOCALES, GUIDE_UI, guideHomePath, textDirection, type GuideLocale } from "../../guides/locales";
import { applyGuideSeo, clearGuideSeo } from "../../guides/seo";
import { aboutStructuredData } from "../../seo/structuredData";
import { Link } from "../Link";
import "../guides/Guide.css";

/**
 * About Life in UK and its editorial policy (F12), in the reader's language.
 * The copy is the editorial source in docs/editorial/about-page; the
 * prerendered page (seo/staticPages.ts) shows the same text and head tags.
 */
export function AboutPage({ locale }: { locale: GuideLocale }) {
  const copy = ABOUT_CONTENT[locale];
  useEffect(() => {
    const origin = window.location.origin;
    applyGuideSeo({
      locale,
      canonical: new URL(`/${locale}/about`, origin).href,
      title: `${copy.title} · Life in UK`,
      description: copy.description,
      alternates: GUIDE_LOCALES.map((candidate) => ({ locale: candidate, href: new URL(`/${candidate}/about`, origin).href })),
      structuredData: aboutStructuredData({ origin, locale, title: copy.title, description: copy.description }),
    });
    return () => clearGuideSeo(locale);
  }, [locale, copy]);
  // Arriving with a section anchor (#sources, …): the page is rendered now, so scroll to it.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [locale]);
  return (
    <main id="main" className="guide-page about-page" lang={GUIDE_LOCALE_LANG[locale]} dir={textDirection(locale)}>
      <article className="guide-article">
        <header className="guide-header">
          <div className="guide-header-text">
            <p className="guide-kicker">
              <Link to={guideHomePath(locale)}>{GUIDE_UI[locale].home}</Link>
            </p>
            <h1>{copy.title}</h1>
          </div>
        </header>
        <div className="guide-body">
          {copy.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {copy.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
