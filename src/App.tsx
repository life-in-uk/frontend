import { useEffect, useSyncExternalStore } from "react";
import { SiteHeader } from "./components/site/SiteHeader";
import { SiteFooter } from "./components/site/SiteFooter";
import { HomePage } from "./pages/HomePage";
import { HealthHub } from "./components/health/HealthHub";
import { HealthGuidePage } from "./components/health/HealthGuidePage";
import { NotFoundPage } from "./components/health/NotFoundPage";
import { FamilyVisaHub } from "./components/family-visa/FamilyVisaHub";
import { FamilyVisaGuidePage } from "./components/family-visa/FamilyVisaGuidePage";
import { FamilyVisaTopicPage } from "./components/family-visa/topics/FamilyVisaTopicPage";
import { MoneyHub } from "./components/money/MoneyHub";
import { MoneyGuidePage } from "./components/money/MoneyGuidePage";
import { WorkVisaHub } from "./components/work-visa/WorkVisaHub";
import { SettlementHub } from "./components/settlement/SettlementHub";
import { TravelPage } from "./components/travel/TravelPage";
import { LocalizedGuideIndex } from "./components/guides/LocalizedGuideIndex";
import { GuidePage } from "./components/guides/GuidePage";
import { OwnerEditorialPage } from "./pages/OwnerEditorialPage";
import { GUIDE_DOMAINS } from "./guides/domains";
import { applyGuideSeo, clearGuideSeo } from "./guides/seo";
import { GUIDE_LOCALE_LANG, GUIDE_UI, textDirection } from "./guides/locales";
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
      : (route.name === "hub" || route.name === "guide" || route.name === "localized-hub" || route.name === "localized-guide") &&
          (route.domain === "health" || route.domain === "money" || route.domain === "family-visa" || route.domain === "work-visa" || route.domain === "settlement")
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
  const activeLocale = routeLocale(route);
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
    if (route.name === "home" || route.name === "localized-home")
      document.title = SITE_UI[activeLocale].homeTitle;
    else if (hubDomain === "health") document.title = "健康与 NHS · Life in UK";
    else if (hubDomain === "money") document.title = "金钱与财务 · Life in UK";
    else if (workVisaHub)
      document.title = `${GUIDE_UI[activeLocale].domain["work-visa"]} · Life in UK`;
    else if (settlementHub)
      document.title = `${GUIDE_UI[activeLocale].domain.settlement} · Life in UK`;
    else if (familyVisaHub)
      document.title = `${GUIDE_UI[activeLocale].domain["family-visa"]} · Life in UK`;
    else if (route.name === "not-found")
      document.title = `${SITE_UI[activeLocale].notFound.title} · Life in UK`;
    else if (route.name === "owner-editorial")
      document.title = "Owner editorial · Life in UK";
  }, [route.name, hubDomain, familyVisaHub, workVisaHub, settlementHub, activeLocale]);

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
      <SiteHeader current={section} locale={activeLocale} switchPath={headerSwitch} />
      {route.name === "home" && <HomePage />}
      {route.name === "localized-home" && <HomePage key={route.locale} locale={route.locale} />}
      {route.name === "owner-editorial" && <OwnerEditorialPage />}
      {hubDomain === "health" && <HealthHub />}
      {hubDomain === "family-visa" && <FamilyVisaHub />}
      {hubDomain === "money" && <MoneyHub />}
      {hubDomain === "work-visa" && <WorkVisaHub />}
      {hubDomain === "settlement" && <SettlementHub />}
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
      {route.name === "localized-index" && <LocalizedGuideIndex locale={route.locale} />}
      {/* Health keeps its editorial landing page and Guide look in every locale. */}
      {route.name === "localized-hub" && route.domain === "health" && <HealthHub key={route.locale} locale={route.locale} />}
      {route.name === "localized-hub" && route.domain === "money" && <MoneyHub key={route.locale} locale={route.locale} />}
      {route.name === "localized-hub" && route.domain === "work-visa" && <WorkVisaHub key={route.locale} locale={route.locale} />}
      {route.name === "localized-hub" && route.domain === "settlement" && <SettlementHub key={route.locale} locale={route.locale} />}
      {route.name === "localized-hub" && route.domain === "family-visa" && <FamilyVisaHub key={route.locale} locale={route.locale} />}
      {route.name === "localized-guide" && route.domain === "health" && (
        <HealthGuidePage key={`${route.locale}:${route.slug}`} slug={route.slug} locale={route.locale} />
      )}
      {route.name === "localized-guide" && route.domain !== "health" && (
        <GuidePage key={`${route.locale}:${route.slug}`} domain={GUIDE_DOMAINS[route.domain]} slug={route.slug} locale={route.locale} />
      )}
      {route.name === "travel" && <TravelPage key={activeLocale} locale={activeLocale} />}
      {route.name === "not-found" && <NotFoundPage locale={activeLocale} />}
      <SiteFooter locale={activeLocale} />
    </>
  );
}
export default App;
