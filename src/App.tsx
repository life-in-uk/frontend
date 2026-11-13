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
import { LocalizedGuideIndex } from "./components/guides/LocalizedGuideIndex";
import { GuidePage } from "./components/guides/GuidePage";
import { OwnerEditorialPage } from "./pages/OwnerEditorialPage";
import { GUIDE_DOMAINS } from "./guides/domains";
import { currentPath, matchRoute, subscribeToLocation } from "./router";
import "./App.css";

function App() {
  const path = useSyncExternalStore(subscribeToLocation, currentPath);
  const route = matchRoute(path);
  const section =
    route.name === "home"
      ? "home"
      : (route.name === "hub" || route.name === "guide" || route.name === "localized-hub" || route.name === "localized-guide") &&
          (route.domain === "health" || route.domain === "money")
        ? route.domain
        : undefined;
  const hubDomain = route.name === "hub" ? route.domain : undefined;
  const activeLocale = route.name === "localized-index" || route.name === "localized-hub" || route.name === "localized-guide"
    ? route.locale : "zh-CN";

  useEffect(() => {
    if (route.name === "home")
      document.title = "Life in UK · 在英国，把日子过明白。";
    else if (hubDomain === "health") document.title = "健康与 NHS · Life in UK";
    else if (hubDomain === "money") document.title = "金钱与财务 · Life in UK";
    else if (hubDomain === "family-visa")
      document.title = "家庭与签证 · Life in UK";
    else if (route.name === "not-found")
      document.title = "页面不存在 · Life in UK";
    else if (route.name === "owner-editorial")
      document.title = "Owner editorial · Life in UK";
  }, [route.name, hubDomain]);

  return (
    <>
      <a className="skip-link" href="#main">
        跳至主要内容
      </a>
      <SiteHeader current={section} locale={activeLocale} />
      {route.name === "home" && <HomePage />}
      {route.name === "owner-editorial" && <OwnerEditorialPage />}
      {hubDomain === "health" && <HealthHub />}
      {hubDomain === "family-visa" && <FamilyVisaHub />}
      {hubDomain === "money" && <MoneyHub />}
      {route.name === "guide" && route.domain === "health" && (
        <HealthGuidePage key={route.slug} slug={route.slug} />
      )}
      {route.name === "guide" && route.domain === "family-visa" && (
        <FamilyVisaGuidePage key={route.slug} slug={route.slug} />
      )}
      {route.name === "topic" && (
        <FamilyVisaTopicPage key={route.topic} topic={route.topic} />
      )}
      {route.name === "guide" && route.domain === "money" && (
        <MoneyGuidePage key={route.slug} slug={route.slug} />
      )}
      {route.name === "localized-index" && <LocalizedGuideIndex locale={route.locale} />}
      {route.name === "localized-hub" && <LocalizedGuideIndex locale={route.locale} domain={route.domain} />}
      {route.name === "localized-guide" && (
        <GuidePage key={`${route.locale}:${route.slug}`} domain={GUIDE_DOMAINS[route.domain]} slug={route.slug} locale={route.locale} />
      )}
      {route.name === "not-found" && <NotFoundPage />}
      <SiteFooter />
    </>
  );
}
export default App;
