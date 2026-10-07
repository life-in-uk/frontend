import { useEffect, useSyncExternalStore } from "react";
import { House } from "lucide-react";
import { Link } from "./components/Link";
import { HomePage } from "./pages/HomePage";
import { HealthHub } from "./components/health/HealthHub";
import { HealthGuidePage } from "./components/health/HealthGuidePage";
import { NotFoundPage } from "./components/health/NotFoundPage";
import { FamilyVisaHub } from "./components/family-visa/FamilyVisaHub";
import { FamilyVisaGuidePage } from "./components/family-visa/FamilyVisaGuidePage";
import { currentPath, matchRoute, subscribeToLocation } from "./router";
import "./App.css";

function App() {
  const path = useSyncExternalStore(subscribeToLocation, currentPath);
  const route = matchRoute(path);
  const inHealth =
    (route.name === "hub" || route.name === "guide") &&
    route.domain === "health";
  const hubDomain = route.name === "hub" ? route.domain : undefined;

  useEffect(() => {
    if (route.name === "home")
      document.title = "Life in UK · 在英国，把日子过明白。";
    else if (hubDomain === "health") document.title = "健康与 NHS · Life in UK";
    else if (hubDomain === "family-visa")
      document.title = "家庭与签证 · Life in UK";
    else if (route.name === "not-found")
      document.title = "页面不存在 · Life in UK";
  }, [route.name, hubDomain]);

  return (
    <>
      <a className="skip-link" href="#main">
        跳至主要内容
      </a>
      <header className="site-header site-header-product">
        <Link to="/" className="brand" aria-label="Life in UK 首页">
          <span className="brand-mark">
            <House size={23} aria-hidden="true" />
          </span>
          <div>
            <strong lang="en">
              Life in UK<span className="brand-dot">.</span>
            </strong>
            <span className="brand-caption">在英国，把日子过明白。</span>
          </div>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          <Link to="/health" aria-current={inHealth ? "page" : undefined}>
            健康与 NHS
          </Link>
        </nav>
      </header>
      {route.name === "home" && <HomePage />}
      {hubDomain === "health" && <HealthHub />}
      {hubDomain === "family-visa" && <FamilyVisaHub />}
      {route.name === "guide" && route.domain === "health" && (
        <HealthGuidePage key={route.slug} slug={route.slug} />
      )}
      {route.name === "guide" && route.domain === "family-visa" && (
        <FamilyVisaGuidePage key={route.slug} slug={route.slug} />
      )}
      {route.name === "not-found" && <NotFoundPage />}
      <footer className="showcase-footer product-footer">
        <span>Life in UK · 在英国，把日子过明白。</span>
        <span>独立的中文生活信息服务，与 NHS 及英国政府无隶属关系。</span>
      </footer>
    </>
  );
}
export default App;
