import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { searchEntries } from "../../home/search";
import type { SearchEntry } from "../../home/search";
import { SEARCH_SUGGESTIONS } from "../../home/topics";
import { shortGuideTitle } from "../../guides/format";
import { Link } from "../Link";

type HomeHeroProps = {
  /** null while the published list is loading; "error" if it failed. */
  index: SearchEntry[] | null | "error";
};

const MAX_RESULTS = 8;

export function HomeHero({ index }: HomeHeroProps) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-eyebrow" lang="en">
            UK LIFE GUIDE FOR CHINESE SPEAKERS
          </p>
          <h1 id="home-title">
            <span>在英国生活、工作、</span>
            <span>学习的实用指南</span>
          </h1>
          <p className="home-hero-lead">
            真实、可靠、易懂的英国生活信息，帮助你解决实际问题。
            <br className="home-hero-break" />
            每篇指南都附上英国官方及一手来源，写明适用地区和更新日期。
          </p>
        </div>
        <HomeSearch index={index} />
      </div>
    </section>
  );
}

function HomeSearch({ index }: HomeHeroProps) {
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
    if (event.key === "Escape" && query) {
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
      ? "正在加载可搜索的内容…"
      : index === "error"
        ? "搜索暂时不可用，请直接浏览下面的主题。"
        : results.length === 0
          ? `没有找到与“${trimmed}”相关的已发布内容。`
          : `找到 ${results.length} 条相关内容`;

  return (
    <div className="home-search" id="search">
      <form
        role="search"
        aria-label="站内搜索"
        className="home-search-form"
        onSubmit={submit}
      >
        <label htmlFor="home-search" className="sr-only">
          搜索指南和常见问题
        </label>
        <Search className="home-search-icon" size={20} aria-hidden="true" />
        <input
          ref={inputRef}
          id="home-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="输入你关心的问题，例如：怎么注册 GP、银行开户"
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={trimmed ? resultsId : undefined}
        />
        <button type="submit" className="home-search-button">
          搜索
        </button>
      </form>
      <div className="home-search-suggestions">
        <span id={`${resultsId}-label`}>试试搜索：</span>
        <ul aria-labelledby={`${resultsId}-label`}>
          {SEARCH_SUGGESTIONS.map((text) => (
            <li key={text}>
              <button type="button" onClick={() => suggest(text)}>
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="home-search-results" hidden={!trimmed}>
        <p id={resultsId} role="status" className="home-search-status">
          {status}
        </p>
        {results.length > 0 && (
          <ul className="home-search-list">
            {results.slice(0, MAX_RESULTS).map((entry) => (
              <li key={entry.key}>
                <Link to={entry.href}>
                  <span className="home-search-kind">
                    {entry.sectionLabel} ·{" "}
                    {entry.kind === "guide" ? "指南" : "快速解答"}
                  </span>
                  <span className="home-search-title">
                    {entry.kind === "guide"
                      ? shortGuideTitle(entry.title)
                      : entry.title}
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {Array.isArray(index) && trimmed && results.length === 0 && (
          <p className="home-search-empty">
            换个说法试试，或浏览
            <Link to="/health">健康与 NHS</Link>、
            <Link to="/money">金钱与财务</Link>。
          </p>
        )}
      </div>
    </div>
  );
}
