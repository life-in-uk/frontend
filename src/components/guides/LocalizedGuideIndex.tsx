import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getLocalizedGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import { GUIDE_DOMAINS, type GuideDomainId } from "../../guides/domains";
import { GUIDE_LOCALES, GUIDE_LOCALE_LANG, GUIDE_UI, localizedGuidePath, textDirection, type GuideLocale } from "../../guides/locales";
import { applyGuideSeo, localizedIndexAlternates } from "../../guides/seo";
import { Link } from "../Link";
import { GuideLanguageSelect } from "./GuideLanguageSelect";
import "./Guide.css";

const copy: Record<GuideLocale, { title: string; description: string; loading: string; failed: string; empty: string; updated: string }> = {
  "zh-CN": { title: "生活指南", description: "查看已发布的英国生活指南。", loading: "正在加载指南…", failed: "指南暂时无法加载，请稍后再试。", empty: "这个语言目前还没有已发布的指南。", updated: "更新于" },
  "zh-TW": { title: "生活指南", description: "查看已發布的英國生活指南。", loading: "正在載入指南…", failed: "指南暫時無法載入，請稍後再試。", empty: "此語言目前尚無已發布的指南。", updated: "更新於" },
  en: { title: "UK life guides", description: "Browse published guides to life in the UK.", loading: "Loading guides…", failed: "Guides are temporarily unavailable. Please try again later.", empty: "There are no published guides in this language yet.", updated: "Updated" },
  ur: { title: "برطانیہ میں زندگی کی رہنمائی", description: "برطانیہ میں زندگی سے متعلق شائع شدہ رہنمائی دیکھیں۔", loading: "رہنمائی لوڈ ہو رہی ہے…", failed: "رہنمائی عارضی طور پر دستیاب نہیں۔ دوبارہ کوشش کریں۔", empty: "اس زبان میں ابھی کوئی رہنمائی شائع نہیں ہوئی۔", updated: "تازہ کاری" },
  hi: { title: "यूके जीवन मार्गदर्शिकाएँ", description: "यूके में जीवन के बारे में प्रकाशित मार्गदर्शिकाएँ देखें।", loading: "मार्गदर्शिकाएँ लोड हो रही हैं…", failed: "मार्गदर्शिकाएँ अभी उपलब्ध नहीं हैं। कृपया बाद में प्रयास करें।", empty: "इस भाषा में अभी कोई मार्गदर्शिका प्रकाशित नहीं है।", updated: "अपडेट" },
};

export function LocalizedGuideIndex({ locale, domain }: { locale: GuideLocale; domain?: GuideDomainId }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; guides: GuideMetadata[] }>({ status: "loading" });
  const strings = copy[locale];
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getLocalizedGuides(locale, controller.signal)
      .then((guides) => { if (active) setState({ status: "ready", guides: domain ? guides.filter((item) => item.category === GUIDE_DOMAINS[domain].category) : guides }); })
      .catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; controller.abort(); };
  }, [locale, domain]);

  useEffect(() => {
    const canonicalPath = domain ? localizedGuidePath(locale, domain) : `/${locale}/guides`;
    const candidates = GUIDE_LOCALES.filter((candidate) => candidate === locale);
    applyGuideSeo({ locale, canonical: new URL(canonicalPath, window.location.origin).href,
      title: `${domain ? GUIDE_UI[locale].domain[domain] : strings.title} · Life in UK`,
      description: strings.description,
      alternates: localizedIndexAlternates(window.location.origin, candidates) });
    document.documentElement.lang = GUIDE_LOCALE_LANG[locale];
    document.documentElement.dir = textDirection(locale);
  }, [locale, domain, strings]);

  return (
    <main id="main" className="guide-page localized-guide-index" lang={GUIDE_LOCALE_LANG[locale]} dir={textDirection(locale)}>
      <div className="guide-toolbar"><GuideLanguageSelect locale={locale} domain={domain} /></div>
      <header className="guide-index-header">
        <p className="guide-kicker">Life in UK</p>
        <h1>{domain ? GUIDE_UI[locale].domain[domain] : strings.title}</h1>
        <p className="guide-summary">{strings.description}</p>
      </header>
      {state.status === "loading" && <p role="status" className="guide-status">{strings.loading}</p>}
      {state.status === "error" && <div className="guide-status-card" role="alert"><p>{strings.failed}</p></div>}
      {state.status === "ready" && state.guides.length === 0 && <p className="guide-status" role="status">{strings.empty}</p>}
      {state.status === "ready" && state.guides.length > 0 && (
        <ul className="localized-guide-list">
          {state.guides.map((guide) => (
            <li key={guide.slug}>
              <Link to={localizedGuidePath(locale, domainForCategory(guide.category) ?? "guides", guide.slug)}>
                <span><strong>{guide.title}</strong><span>{guide.summary}</span><time dateTime={guide.updatedAt}>{strings.updated}: {new Intl.DateTimeFormat(GUIDE_LOCALE_LANG[locale], { dateStyle: "medium", timeZone: "Europe/London" }).format(new Date(guide.updatedAt))}</time></span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function domainForCategory(category: string): GuideDomainId | undefined {
  return (Object.keys(GUIDE_DOMAINS) as GuideDomainId[]).find((id) => GUIDE_DOMAINS[id].category === category);
}
