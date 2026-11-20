import { getLocalizedGuides } from "./guides/api";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { SiteHeader } from "./components/site/SiteHeader";
import { SiteFooter } from "./components/site/SiteFooter";
import { HomePage } from "./pages/HomePage";
import "./routeStyles";
import { HealthGuidePage } from "./components/health/HealthGuidePage";
import { NotFoundPage } from "./components/health/NotFoundPage";
import { FamilyVisaGuidePage } from "./components/family-visa/FamilyVisaGuidePage";
import { MoneyGuidePage } from "./components/money/MoneyGuidePage";
import { GuidePage } from "./components/guides/GuidePage";
import {
  FamilyVisaHub,
  FamilyVisaTopicPage,
  HealthHub,
  LocalizedGuideIndex,
  MoneyHub,
  OwnerEditorialPage,
  RentingHub,
  SettlementHub,
  TravelPage,
  WorkVisaHub,
} from "./routeChunks";
import { GUIDE_DOMAINS, UNIVERSITY_CATEGORY } from "./guides/domains";
import { HOUSEHOLD_CATEGORY } from "./guides/household";
import { applyGuideSeo, clearGuideSeo, homeAlternates, homeDescription } from "./guides/seo";
import { GUIDE_LOCALE_LANG, GUIDE_UI, guideHomePath, textDirection } from "./guides/locales";
import { currentPath, localeSwitchPath, matchRoute, pageRoute, routeLocale, subscribeToLocation } from "./router";
import type { GuideLocale } from "./guides/locales";
import { SITE_UI } from "./guides/siteUi";
import "./App.css";

function App() {
  const path = useSyncExternalStore(subscribeToLocation, currentPath);
  const route = pageRoute(matchRoute(path));
  const section =
    route.name === "home" || route.name === "localized-home"
      ? "home"
      : (route.name === "hub" || route.name === "guide" || route.name === "localized-hub" || route.name === "localized-guide")
        ? route.domain
        : route.name === "travel"
          ? "travel"
          : undefined;
  const hubDomain = route.name === "hub" ? route.domain : undefined;
  const familyVisaHub =
    hubDomain === "family-visa" || (route.name === "localized-hub" && route.domain === "family-visa");
  const workVisaHub =
    hubDomain === "work-visa" || (route.name === "localized-hub" && route.domain === "work-visa");
  const settlementHub =
    hubDomain === "settlement" || (route.name === "localized-hub" && route.domain === "settlement");
  const rentingHub =
    hubDomain === "renting" || (route.name === "localized-hub" && route.domain === "renting");
  const activeLocale = routeLocale(route);
  const [publishedSections, setPublishedSections] = useState<{ locale: GuideLocale; categories: Set<string> }>();
  useEffect(() => {
    const controller = new AbortController();
    getLocalizedGuides(activeLocale, controller.signal)
      .then((guides) => {
        if (!controller.signal.aborted)
          setPublishedSections({ locale: activeLocale, categories: new Set(guides.map((guide) => guide.category)) });
      })
      .catch(() => { if (!controller.signal.aborted) setPublishedSections(undefined); });
    return () => controller.abort();
  }, [activeLocale]);
  const categories = publishedSections?.locale === activeLocale ? publishedSections.categories : undefined;
  const universityAvailable = categories?.has(UNIVERSITY_CATEGORY) ?? false;
  const householdAvailable = categories?.has(HOUSEHOLD_CATEGORY) ?? false;
  const educationAvailable = categories?.has("education") ?? false;
  // Pages with their own language selector (hubs, Guides, the Guide index)
  // don't get a second one in the header.
  const headerSwitch =
    route.name === "home" || route.name === "localized-home" || route.name === "not-found" || route.name === "topic" || route.name === "travel"
      ? (next: GuideLocale) => localeSwitchPath(route, next)
      : undefined;

  useEffect(() => {
    document.documentElement.lang = GUIDE_LOCALE_LANG[activeLocale];
    document.documentElement.dir = textDirection(activeLocale);
  }, [activeLocale]);

  useEffect(() => {
    // Home pages set their title with their SEO tags below.
    if (route.name === "home" || route.name === "localized-home") return;
    else if (hubDomain === "health") document.title = "健康与 NHS · Life in UK";
    else if (hubDomain === "money") document.title = "金钱与财务 · Life in UK";
    else if (workVisaHub)
      document.title = `${GUIDE_UI[activeLocale].domain["work-visa"]} · Life in UK`;
    // Settlement, Renting and Family & Visa hubs set their own title and SEO (useClusterHubSeo).
    else if (settlementHub || rentingHub || familyVisaHub) return;
    else if (route.name === "not-found")
      document.title = `${SITE_UI[activeLocale].notFound.title} · Life in UK`;
    else if (route.name === "owner-editorial")
      document.title = "Owner editorial · Life in UK";
  }, [route.name, hubDomain, familyVisaHub, workVisaHub, settlementHub, rentingHub, activeLocale]);

  // Home pages: one canonical per locale (/zh-CN, not /), the same tags as the prerendered page.
  const isHome = route.name === "home" || route.name === "localized-home";
  useEffect(() => {
    if (!isHome) return;
    const origin = window.location.origin;
    applyGuideSeo({
      locale: activeLocale,
      canonical: new URL(guideHomePath(activeLocale), origin).href,
      title: SITE_UI[activeLocale].homeTitle,
      description: homeDescription(activeLocale),
      alternates: homeAlternates(origin),
    });
    return () => clearGuideSeo(activeLocale);
  }, [isHome, activeLocale]);

  // Unknown routes: never indexable (the host also answers them with 404, see docs/seo-hosting.md).
  useEffect(() => {
    if (route.name !== "not-found") return;
    applyGuideSeo({ locale: activeLocale, canonical: null, title: `${SITE_UI[activeLocale].notFound.title} · Life in UK`, description: "", noIndex: true });
    return () => clearGuideSeo(activeLocale);
  }, [route.name, activeLocale]);

  useEffect(() => {
    if (route.name !== "owner-editorial") return;
    applyGuideSeo({ locale: "zh-CN", canonical: null, title: "Owner editorial · Life in UK", description: "", noIndex: true });
    return () => clearGuideSeo();
  }, [route.name]);

  return (
    <>
      <a className="skip-link" href="#main">
        {SITE_UI[activeLocale].skipLink}
      </a>
      <SiteHeader current={section} locale={activeLocale} switchPath={headerSwitch} universityAvailable={universityAvailable} educationAvailable={educationAvailable} householdAvailable={householdAvailable} />
      {/* Only in-app navigation to a page whose chunk is not loaded yet shows the
          fallback; main.tsx loads the first page's chunk before rendering. Keyed
          by path so the previous page unmounts at once (its head tags and other
          effects cleaned up), rather than staying mounted, hidden, until the
          next page's chunk arrives. */}
      <Suspense key={path} fallback={<main id="main" className="route-loading" aria-busy="true" />}>
        {route.name === "home" && <HomePage />}
        {route.name === "localized-home" && <HomePage key={route.locale} locale={route.locale} />}
        {route.name === "owner-editorial" && <OwnerEditorialPage />}
        {hubDomain === "health" && <HealthHub />}
        {hubDomain === "family-visa" && <FamilyVisaHub />}
        {hubDomain === "money" && <MoneyHub />}
        {hubDomain === "work-visa" && <WorkVisaHub />}
        {hubDomain === "settlement" && <SettlementHub />}
        {(route.name === "hub" || route.name === "localized-hub") && (route.domain === UNIVERSITY_CATEGORY || route.domain === "education" || route.domain === HOUSEHOLD_CATEGORY) && (
          <LocalizedGuideIndex locale={activeLocale} domain={route.domain} />
        )}
        {route.name === "guide" && (route.domain === UNIVERSITY_CATEGORY || route.domain === "education" || route.domain === HOUSEHOLD_CATEGORY) && (
          <GuidePage key={route.slug} domain={GUIDE_DOMAINS[route.domain]} slug={route.slug} />
        )}
        {hubDomain === "renting" && <RentingHub />}
        {route.name === "guide" && route.domain === "health" && (
          <HealthGuidePage key={route.slug} slug={route.slug} />
        )}
        {route.name === "guide" && route.domain === "family-visa" && (
          <FamilyVisaGuidePage key={route.slug} slug={route.slug} />
        )}
        {route.name === "topic" && (
          <FamilyVisaTopicPage key={`${activeLocale}:${route.topic}`} topic={route.topic} locale={activeLocale} />
        )}
        {route.name === "guide" && route.domain === "money" && (
          <MoneyGuidePage key={route.slug} slug={route.slug} />
        )}
        {route.name === "guide" && route.domain === "work-visa" && (
          <GuidePage key={route.slug} domain={GUIDE_DOMAINS["work-visa"]} slug={route.slug} />
        )}
        {route.name === "guide" && route.domain === "settlement" && (
          <GuidePage key={route.slug} domain={GUIDE_DOMAINS.settlement} slug={route.slug} />
        )}
        {route.name === "guide" && route.domain === "renting" && (
          <GuidePage key={route.slug} domain={GUIDE_DOMAINS.renting} slug={route.slug} />
        )}
        {route.name === "localized-index" && <LocalizedGuideIndex locale={route.locale} />}
        {/* Health keeps its editorial landing page and Guide look in every locale. */}
        {route.name === "localized-hub" && route.domain === "health" && <HealthHub key={route.locale} locale={route.locale} />}
        {route.name === "localized-hub" && route.domain === "money" && <MoneyHub key={route.locale} locale={route.locale} />}
        {route.name === "localized-hub" && route.domain === "work-visa" && <WorkVisaHub key={route.locale} locale={route.locale} />}
        {route.name === "localized-hub" && route.domain === "settlement" && <SettlementHub key={route.locale} locale={route.locale} />}
        {route.name === "localized-hub" && route.domain === "renting" && <RentingHub key={route.locale} locale={route.locale} />}
        {route.name === "localized-hub" && route.domain === "family-visa" && <FamilyVisaHub key={route.locale} locale={route.locale} />}
        {route.name === "localized-guide" && route.domain === "health" && (
          <HealthGuidePage key={`${route.locale}:${route.slug}`} slug={route.slug} locale={route.locale} />
        )}
        {route.name === "localized-guide" && route.domain !== "health" && (
          <GuidePage key={`${route.locale}:${route.slug}`} domain={GUIDE_DOMAINS[route.domain]} slug={route.slug} locale={route.locale} />
        )}
        {route.name === "travel" && <TravelPage key={activeLocale} locale={activeLocale} />}
        {route.name === "not-found" && <NotFoundPage locale={activeLocale} />}
      </Suspense>
      <SiteFooter locale={activeLocale} universityAvailable={universityAvailable} educationAvailable={educationAvailable} householdAvailable={householdAvailable} />
    </>
  );
}
export default App;
