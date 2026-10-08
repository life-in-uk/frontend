// Minimal client-side routing on the History API. Routes:
//   /                   existing home page
//   /health             Health & NHS hub
//   /health/:slug       Health Guide detail
//   /family-visa        Family & Visa hub (review surface, not linked yet)
//   /family-visa/:slug  Family & Visa Guide detail
//   /money              Money & Finance hub
//   /money/:slug        Money & Finance Guide detail

import type { GuideDomainId } from "./guides/domains";

export type Route =
  | { name: "home" }
  | { name: "hub"; domain: GuideDomainId }
  | { name: "guide"; domain: GuideDomainId; slug: string }
  | { name: "not-found" };

// First path segment → Guide domain. A Map, so "/constructor" stays unknown.
const DOMAIN_BASES = new Map<string, GuideDomainId>([
  ["health", "health"],
  ["family-visa", "family-visa"],
  ["money", "money"],
]);

export function matchRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "home" };
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
