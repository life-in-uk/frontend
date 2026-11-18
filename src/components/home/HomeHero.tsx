import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { searchEntries } from "../../home/search";
import type { SearchEntry } from "../../home/search";
import { GUIDE_UI, guideRoutePath, type GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";
import { Link } from "../Link";

type HomeHeroProps = {
  /** null while the published list is loading; "error" if it failed. */
  index: SearchEntry[] | null | "error";
  locale?: GuideLocale;
};

export function HomeHero({ index, locale = "zh-CN" }: HomeHeroProps) {
  const ui = SITE_UI[locale];
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-eyebrow" lang={ui.hero.eyebrowLang === locale ? undefined : ui.hero.eyebrowLang}>
            {ui.hero.eyebrow}
          </p>
          <h1 id="home-title">
            <span>{ui.hero.title[0]}</span>
            <span>{ui.hero.title[1]}</span>
          </h1>
          <p className="home-hero-lead">
            {ui.hero.lead[0]}
            <br className="home-hero-break" />
            {ui.hero.lead[1]}
          </p>
          {ui.translationNotice && (
            <p className="home-translation-notice" role="note">{ui.translationNotice}</p>
          )}
        </div>
        <HomeSearch index={index} locale={locale} />
      </div>
    </section>
  );
}

function HomeSearch({ index, locale = "zh-CN" }: HomeHeroProps) {
  const ui = SITE_UI[locale];
  const copy = ui.search;
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsId = useId();
  const trimmed = query.trim();
  const results = useMemo(
    () => (Array.isArray(index) && trimmed ? searchEntries(index, trimmed) : []),
    [index, trimmed],
  );

  // Arriving from the header search link on another page.
  useEffect(() => {
    if (window.location.hash === "#search") inputRef.current?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    inputRef.current?.focus();
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && !event.nativeEvent.isComposing && query) {
      event.preventDefault();
      setQuery("");
    }
  }
  function suggest(text: string) {
    setQuery(text);
    inputRef.current?.focus();
  }

  const status = !trimmed
    ? ""
    : index === null
      ? copy.loading
      : index === "error"
        ? copy.error
        : results.length === 0
          ? copy.none(`\u2068${trimmed}\u2069`)
          : copy.found(results.length);

  return (
    <div className="home-search" id="search">
      <form
        role="search"
        aria-label={copy.form}
        className="home-search-form"
        onSubmit={submit}
      >
        <label htmlFor="home-search" className="sr-only">
          {copy.input}
        </label>
        <Search className="home-search-icon" size={20} aria-hidden="true" />
        <input
          ref={inputRef}
          id="home-search"
          type="search"
          dir="auto"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={copy.placeholder}
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={trimmed ? resultsId : undefined}
        />
        <button type="submit" className="home-search-button">
          {copy.button}
        </button>
      </form>
      <div className="home-search-suggestions">
        <span id={`${resultsId}-label`}>{copy.tryLabel}</span>
        <ul aria-labelledby={`${resultsId}-label`}>
          {copy.suggestions.map((text) => (
            <li key={text}>
              <button type="button" onClick={() => suggest(text)}>
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="home-search-results" hidden={!trimmed}>
        <p id={resultsId} role="status" aria-atomic="true" className="home-search-status">
          {status}
        </p>
        {results.length > 0 && (
          <ul className="home-search-list">
            {results.map((entry) => (
              <li key={entry.key}>
                <Link to={entry.href}>
                  <span className="home-search-kind">
                    {entry.sectionLabel} ·{" "}
                    {entry.kind === "guide" ? copy.guide : copy.answer}
                  </span>
                  <span className="home-search-result-copy">
                    <span className="home-search-title">{entry.title}</span>
                    {entry.text && <span className="home-search-summary">{entry.text}</span>}
                  </span>
                  <ArrowRight className="home-search-arrow" size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {Array.isArray(index) && trimmed && results.length === 0 && (
          <p className="home-search-empty">
            {copy.emptyBefore}
            <Link to={guideRoutePath(locale, "health")}>{GUIDE_UI[locale].domain.health}</Link>
            {copy.emptyBetween}
            <Link to={guideRoutePath(locale, "money")}>{GUIDE_UI[locale].domain.money}</Link>
            {copy.emptyAfter}
          </p>
        )}
      </div>
    </div>
  );
}
