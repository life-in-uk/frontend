// Pages loaded as separate chunks (see lazyRoute.ts). The home page, Guide
// pages and the 404 page stay in the entry chunk: they are the usual landing
// pages, and Guides are most of the prerendered site.
import { lazyRoute } from "./lazyRoute";
import { UNIVERSITY_CATEGORY } from "./guides/domains";
import type { Route } from "./router";

export const HealthHub = lazyRoute(() => import("./components/health/HealthHub").then((m) => m.HealthHub));
export const FamilyVisaHub = lazyRoute(() => import("./components/family-visa/FamilyVisaHub").then((m) => m.FamilyVisaHub));
export const FamilyVisaTopicPage = lazyRoute(() =>
  import("./components/family-visa/topics/FamilyVisaTopicPage").then((m) => m.FamilyVisaTopicPage),
);
export const MoneyHub = lazyRoute(() => import("./components/money/MoneyHub").then((m) => m.MoneyHub));
export const WorkVisaHub = lazyRoute(() => import("./components/work-visa/WorkVisaHub").then((m) => m.WorkVisaHub));
export const SettlementHub = lazyRoute(() => import("./components/settlement/SettlementHub").then((m) => m.SettlementHub));
export const RentingHub = lazyRoute(() => import("./components/renting/RentingHub").then((m) => m.RentingHub));
export const TravelPage = lazyRoute(() => import("./components/travel/TravelPage").then((m) => m.TravelPage));
export const LocalizedGuideIndex = lazyRoute(() =>
  import("./components/guides/LocalizedGuideIndex").then((m) => m.LocalizedGuideIndex),
);
export const OwnerEditorialPage = lazyRoute(() => import("./pages/OwnerEditorialPage").then((m) => m.OwnerEditorialPage));

const HUBS = {
  health: HealthHub,
  "family-visa": FamilyVisaHub,
  money: MoneyHub,
  "work-visa": WorkVisaHub,
  settlement: SettlementHub,
  renting: RentingHub,
  [UNIVERSITY_CATEGORY]: LocalizedGuideIndex,
} as const;

/** Loads the chunk the page for `route` (as given by pageRoute) renders, if it has one. */
export function preloadRouteChunk(route: Route): Promise<void> {
  switch (route.name) {
    case "hub":
    case "localized-hub":
      return HUBS[route.domain].preload();
    case "topic":
      return FamilyVisaTopicPage.preload();
    case "travel":
      return TravelPage.preload();
    case "localized-index":
      return LocalizedGuideIndex.preload();
    case "owner-editorial":
      return OwnerEditorialPage.preload();
    default:
      return Promise.resolve();
  }
}
