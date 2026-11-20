// Minimal client-side routing on the History API. Routes:
//   /                   existing home page
//   /health             Health & NHS hub
//   /health/:slug       Health Guide detail
//   /family-visa        Family & Visa hub
//   /family-visa/:slug  Family & Visa Guide detail
//   /family-visa/topics/:topic  Family & Visa special-circumstances topic
//   /money              Money & Finance hub
//   /money/:slug        Money & Finance Guide detail
//   /work-visa          Work Visa (Skilled Worker) hub
//   /work-visa/:slug    Work Visa Guide detail
//   /settlement         Settlement / ILR hub
//   /settlement/:slug   Settlement Guide detail
//   /renting            Renting & Moving In hub (journey + checklist)
//   /renting/:slug      Renting Guide detail
//   /travel             Travel tools (Underground, Roads, Rail); /{locale}/travel

import { UNIVERSITY_CATEGORY, type GuideDomainId } from "./guides/domains.ts";
import { HOUSEHOLD_CATEGORY } from "./guides/household.ts";
import { guideHomePath, guideRoutePath, isGuideLocale, type GuideLocale } from "./guides/locales.ts";

export type Route =
  | { name: "home" }
  | { name: "hub"; domain: GuideDomainId }
  | { name: "guide"; domain: GuideDomainId; slug: string }
  | { name: "localized-home"; locale: GuideLocale }
  | { name: "localized-index"; locale: GuideLocale }
  | { name: "localized-hub"; locale: GuideLocale; domain: GuideDomainId }
  | { name: "localized-guide"; locale: GuideLocale; domain: GuideDomainId; slug: string }
  | { name: "owner-editorial" }
  | { name: "travel"; locale?: GuideLocale }
  | { name: "topic"; domain: "family-visa"; topic: FamilyVisaTopicId; locale?: GuideLocale }
  | { name: "not-found"; locale?: GuideLocale };

/** Family & Visa special-circumstances topic pages that exist. */
export const FAMILY_VISA_TOPICS = [
  "children-from-previous-relationship",
] as const;
export type FamilyVisaTopicId = (typeof FAMILY_VISA_TOPICS)[number];

/** A topic page's canonical path in a locale (`/{locale}/family-visa/topics/{topic}`). */
export function familyVisaTopicPath(locale: GuideLocale, topic: FamilyVisaTopicId): string {
  return `${guideRoutePath(locale, "family-visa")}/topics/${topic}`;
}

// First path segment → Guide domain. A Map, so "/constructor" stays unknown.
const DOMAIN_BASES = new Map<string, GuideDomainId>([
  ["health", "health"],
  ["family-visa", "family-visa"],
  ["money", "money"],
  ["work-visa", "work-visa"],
  ["settlement", "settlement"],
  ["renting", "renting"],
  [UNIVERSITY_CATEGORY, UNIVERSITY_CATEGORY],
  ["education", "education"],
  [HOUSEHOLD_CATEGORY, HOUSEHOLD_CATEGORY],
]);

export function matchRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "home" };
  if (path === "/owner/editorial" || path.startsWith("/owner/editorial/")) return { name: "owner-editorial" };
  const localizedTopic = /^\/([^/]+)\/family-visa\/topics\/([a-z0-9-]+)$/.exec(path);
  if (localizedTopic && isGuideLocale(localizedTopic[1])) {
    const locale = localizedTopic[1];
    return (FAMILY_VISA_TOPICS as readonly string[]).includes(localizedTopic[2])
      ? { name: "topic", domain: "family-visa", topic: localizedTopic[2] as FamilyVisaTopicId, locale }
      : { name: "not-found", locale };
  }
  const localized = /^\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?$/.exec(path);
  if (localized && isGuideLocale(localized[1])) {
    const [, localeValue, section, rawSlug] = localized;
    const locale = localeValue;
    if (!section) return { name: "localized-home", locale };
    if (section === "guides" && !rawSlug) return { name: "localized-index", locale };
    if (section === "travel") return rawSlug ? { name: "not-found", locale } : { name: "travel", locale };
    const domain = DOMAIN_BASES.get(section);
    if (!domain) return { name: "not-found", locale };
    if (!rawSlug) return { name: "localized-hub", locale, domain };
    let slug: string;
    try { slug = decodeURIComponent(rawSlug); } catch { return { name: "not-found", locale }; }
    return { name: "localized-guide", locale, domain, slug };
  }
  if (path === "/travel") return { name: "travel" };
  const topic = /^\/family-visa\/topics\/([a-z0-9-]+)$/.exec(path);
  if (topic)
    return (FAMILY_VISA_TOPICS as readonly string[]).includes(topic[1])
      ? {
          name: "topic",
          domain: "family-visa",
          topic: topic[1] as FamilyVisaTopicId,
        }
      : { name: "not-found" };
  const match = /^\/([a-z-]+)(?:\/([^/]+))?$/.exec(path);
  const domain = match ? DOMAIN_BASES.get(match[1]) : undefined;
  if (!match || !domain) return { name: "not-found" };
  if (match[2] === undefined) return { name: "hub", domain };
  let slug: string;
  try {
    slug = decodeURIComponent(match[2]);
  } catch {
    return { name: "not-found" };
  }
  return { name: "guide", domain, slug };
}

const listeners = new Set<() => void>();

export function subscribeToLocation(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function currentPath(): string {
  return window.location.pathname;
}

export function navigate(to: string): void {
  const url = new URL(to, window.location.href);
  if (url.pathname === window.location.pathname && url.hash) {
    window.location.hash = url.hash;
    return;
  }
  window.history.pushState(null, "", url.pathname + url.search + url.hash);
  listeners.forEach((listener) => listener());
  window.scrollTo(0, 0);
}

/**
 * The page a route renders. `/zh-CN/<domain>` and `/zh-CN/<domain>/<slug>`
 * are the same pages as the original unprefixed editorial routes, so a
 * language switch back to Simplified Chinese never lands on a generic list.
 */
export function pageRoute(route: Route): Route {
  if (route.name === "localized-home" && route.locale === "zh-CN") return { name: "home" };
  if (route.name === "localized-hub" && route.locale === "zh-CN")
    return { name: "hub", domain: route.domain };
  if (route.name === "localized-guide" && route.locale === "zh-CN")
    return { name: "guide", domain: route.domain, slug: route.slug };
  if (route.name === "travel" && route.locale === "zh-CN") return { name: "travel" };
  if (route.name === "topic" && route.locale === "zh-CN")
    return { name: "topic", domain: route.domain, topic: route.topic };
  return route;
}

/** Locale shown by a route: the URL prefix, or Simplified Chinese for unprefixed pages. */
export function routeLocale(route: Route): GuideLocale {
  return "locale" in route && route.locale ? route.locale : "zh-CN";
}

/**
 * The same page in another language, so switching keeps the page type and
 * context: home → home, hub → hub, Guide → the same Guide, index → index.
 * Pages that exist in Simplified Chinese only (owner tools) have no switch
 * target.
 */
export function localeSwitchPath(route: Route, next: GuideLocale): string | undefined {
  switch (route.name) {
    case "home":
    case "localized-home":
    case "not-found":
      return guideHomePath(next);
    case "localized-index":
      return `/${next}/guides`;
    case "hub":
    case "localized-hub":
      return guideRoutePath(next, route.domain);
    case "guide":
    case "localized-guide":
      return guideRoutePath(next, route.domain, route.slug);
    case "topic":
      return familyVisaTopicPath(next, route.topic);
    case "travel":
      return guideRoutePath(next, "travel");
    default:
      return undefined;
  }
}
