// Minimal client-side routing on the History API. Routes:
//   /                 existing home page
//   /health           Health & NHS hub
//   /health/:slug     Guide detail

export type Route =
  | { name: "home" }
  | { name: "health" }
  | { name: "guide"; slug: string }
  | { name: "not-found" };

export function matchRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "home" };
  if (path === "/health") return { name: "health" };
  const guide = /^\/health\/([^/]+)$/.exec(path);
  if (guide) {
    let slug: string;
    try {
      slug = decodeURIComponent(guide[1]);
    } catch {
      return { name: "not-found" };
    }
    return { name: "guide", slug };
  }
  return { name: "not-found" };
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
