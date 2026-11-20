import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, GraduationCap } from "lucide-react";
import { getLocalizedGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import { EDUCATION_COPY, educationSections } from "../../guides/education";
import { formatUkDateFor } from "../../guides/format";
import { GUIDE_DOMAINS, UNIVERSITY_CATEGORY, type GuideDomainId } from "../../guides/domains";
import { GUIDE_LOCALES, GUIDE_LOCALE_LANG, GUIDE_UI, localizedGuidePath, UNIVERSITY_COPY, textDirection, type GuideLocale } from "../../guides/locales";
import { applyGuideSeo, clearGuideSeo, localizedIndexAlternates, hubAlternates } from "../../guides/seo";
import { Link } from "../Link";
import { GuideLanguageSelect } from "./GuideLanguageSelect";
import "./Guide.css";
import "../work-visa/WorkVisa.css";

const copy: Record<GuideLocale, { title: string; description: string; loading: string; failed: string; empty: string; updated: string }> = {
  "zh-CN": { title: "生活指南", description: "查看已发布的英国生活指南。", loading: "正在加载指南…", failed: "指南暂时无法加载，请稍后再试。", empty: "这个语言目前还没有已发布的指南。", updated: "更新于" },
  "zh-TW": { title: "生活指南", description: "查看已發布的英國生活指南。", loading: "正在載入指南…", failed: "指南暫時無法載入，請稍後再試。", empty: "此語言目前尚無已發布的指南。", updated: "更新於" },
  en: { title: "UK life guides", description: "Browse published guides to life in the UK.", loading: "Loading guides…", failed: "Guides are temporarily unavailable. Please try again later.", empty: "There are no published guides in this language yet.", updated: "Updated" },
  ur: { title: "برطانیہ میں زندگی کی رہنمائی", description: "برطانیہ میں زندگی سے متعلق شائع شدہ رہنمائی دیکھیں۔", loading: "رہنمائی لوڈ ہو رہی ہے…", failed: "رہنمائی عارضی طور پر دستیاب نہیں۔ دوبارہ کوشش کریں۔", empty: "اس زبان میں ابھی کوئی رہنمائی شائع نہیں ہوئی۔", updated: "تازہ کاری" },
  hi: { title: "यूके जीवन मार्गदर्शिकाएँ", description: "यूके में जीवन के बारे में प्रकाशित मार्गदर्शिकाएँ देखें।", loading: "मार्गदर्शिकाएँ लोड हो रही हैं…", failed: "मार्गदर्शिकाएँ अभी उपलब्ध नहीं हैं। कृपया बाद में प्रयास करें।", empty: "इस भाषा में अभी कोई मार्गदर्शिका प्रकाशित नहीं है।", updated: "अपडेट" },
};

export function LocalizedGuideIndex({ locale, domain }: { locale: GuideLocale; domain?: GuideDomainId }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; guides: GuideMetadata[]; universityAvailable: boolean }>({ status: "loading" });
  const strings = copy[locale];
  const title = domain ? GUIDE_UI[locale].domain[domain] : strings.title;
  const education = domain === "education" ? EDUCATION_COPY[locale] : undefined;
  const description = education?.description ?? (domain ? UNIVERSITY_COPY[locale].description : strings.description);
  const [available, setAvailable] = useState<GuideLocale[]>([locale]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getLocalizedGuides(locale, controller.signal)
      .then((guides) => { if (active) setState({ status: "ready", guides: domain ? guides.filter((item) => item.category === GUIDE_DOMAINS[domain].category) : guides, universityAvailable: guides.some((guide) => guide.category === UNIVERSITY_CATEGORY) }); })
      .catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; controller.abort(); };
  }, [locale, domain]);

  useEffect(() => {
    if (!domain || state.status !== "ready" || state.guides.length === 0) return;
    const controller = new AbortController();
    const other = GUIDE_LOCALES.filter((candidate) => candidate !== locale);
    Promise.allSettled(other.map(async (candidate) => {
      const list = await getLocalizedGuides(candidate, controller.signal);
      return list.some((guide) => guide.category === GUIDE_DOMAINS[domain].category) ? candidate : null;
    })).then((results) => {
      if (controller.signal.aborted) return;
      const locales = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
      setAvailable([locale, ...locales]);
    });
    return () => controller.abort();
  }, [domain, locale, state]);

  useEffect(() => {
    if (domain && state.status === "loading") return;
    const canonicalPath = domain ? localizedGuidePath(locale, domain) : `/${locale}/guides`;
    const origin = window.location.origin;
    const hasContent = !domain || (state.status === "ready" && state.guides.length > 0);
    applyGuideSeo({ locale, canonical: hasContent ? new URL(canonicalPath, origin).href : null,
      title: `${title} · Life in UK`,
      description,
      noIndex: !hasContent,
      alternates: !hasContent ? [] : domain
        ? hubAlternates(origin, domain).filter(({ locale: candidate }) => available.includes(candidate))
        : localizedIndexAlternates(origin, [locale]) });
    document.documentElement.lang = GUIDE_LOCALE_LANG[locale];
    document.documentElement.dir = textDirection(locale);
    return () => clearGuideSeo();
  }, [locale, domain, title, description, state, available]);

  if (education) {
    // Education uses the shared topic-hub layout (Renting, Settlement, Work
    // Visa): one left edge for hero, section headings and cards.
    const sections = state.status === "ready" ? educationSections(state.guides) : [];
    const order = sections.flatMap(({ guides }) => guides.map(({ slug }) => slug));
    return (
      <main id="main" className="work-visa-page work-hub education-hub" lang={GUIDE_LOCALE_LANG[locale]} dir={textDirection(locale)}>
        <div className="guide-toolbar"><GuideLanguageSelect locale={locale} domain={domain} available={available} /></div>
        <section className="work-hero" aria-labelledby="education-title">
          <span className="eyebrow work-eyebrow">
            <GraduationCap size={15} aria-hidden="true" />
            Life in UK
          </span>
          <h1 id="education-title">{title}</h1>
          <p className="work-hero-lead">{description}</p>
        </section>
        {state.status === "loading" && <p role="status" className="work-plan-status">{strings.loading}</p>}
        {state.status === "error" && <div className="guide-status-card" role="alert"><p>{strings.failed}</p></div>}
        {state.status === "ready" && state.guides.length === 0 && <p className="work-plan-status" role="status">{strings.empty}</p>}
        {sections.length > 0 && (
          <div className="work-plan">
            {sections.map(({ id, guides }) => (
              <section key={id} className="work-topic" aria-labelledby={`education-${id}`}>
                <header className="work-topic-head"><h2 id={`education-${id}`}>{education[id]}</h2></header>
                <ol className="work-guide-list">
                  {guides.map((guide) => (
                    <li key={guide.slug} className="work-guide-card" data-slug={guide.slug}>
                      <span className="work-guide-number" aria-hidden="true">{order.indexOf(guide.slug) + 1}</span>
                      <div className="work-guide-body">
                        <h3>
                          <Link to={localizedGuidePath(locale, "education", guide.slug)} className="work-guide-link">{guide.title}</Link>
                        </h3>
                        <p className="work-guide-covers">{guide.summary}</p>
                        <span className="work-guide-meta">
                          <CalendarDays size={13} aria-hidden="true" />
                          {strings.updated}{" "}
                          <time dateTime={guide.updatedAt}>{formatUkDateFor(guide.updatedAt, GUIDE_LOCALE_LANG[locale])}</time>
                          <ArrowRight size={14} aria-hidden="true" />
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
        {state.status === "ready" && state.universityAvailable && (
          <p className="education-university-link">
            <Link to={localizedGuidePath(locale, UNIVERSITY_CATEGORY)} className="work-official-link">
              {UNIVERSITY_COPY[locale].title}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>
        )}
      </main>
    );
  }

  return (
    <main id="main" className="guide-page localized-guide-index" lang={GUIDE_LOCALE_LANG[locale]} dir={textDirection(locale)}>
      <div className="guide-toolbar"><GuideLanguageSelect locale={locale} domain={domain} available={domain ? available : undefined} /></div>
      <header className="guide-index-header">
        <p className="guide-kicker">Life in UK</p>
        <h1>{title}</h1>
        <p className="guide-summary">{description}</p>
      </header>
      {state.status === "loading" && <p role="status" className="guide-status">{strings.loading}</p>}
      {state.status === "error" && <div className="guide-status-card" role="alert"><p>{strings.failed}</p></div>}
      {state.status === "ready" && state.guides.length === 0 && <p className="guide-status" role="status">{strings.empty}</p>}
      {state.status === "ready" && state.guides.length > 0 && guideList(state.guides, locale)}
    </main>
  );
}

function guideList(guides: readonly GuideMetadata[], locale: GuideLocale) {
  return (
    <ul className="localized-guide-list">
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link to={localizedGuidePath(locale, domainForCategory(guide.category) ?? "guides", guide.slug)}>
            <span><strong>{guide.title}</strong><span>{guide.summary}</span><time dateTime={guide.updatedAt}>{copy[locale].updated}: {new Intl.DateTimeFormat(GUIDE_LOCALE_LANG[locale], { dateStyle: "medium", timeZone: "Europe/London" }).format(new Date(guide.updatedAt))}</time></span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function domainForCategory(category: string): GuideDomainId | undefined {
  return (Object.keys(GUIDE_DOMAINS) as GuideDomainId[]).find((id) => GUIDE_DOMAINS[id].category === category);
}
