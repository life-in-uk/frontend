// Route-level code splitting without a loading flash on prerendered pages.
//
// A lazy route component loads its chunk on first render (suspending until
// then). main.tsx calls `preload()` for the current route before the first
// render, so that render is synchronous: React swaps the prerendered static
// HTML for the full page in one commit, never for an empty fallback.
import { createElement, use } from "react";
import type { ComponentType } from "react";

export type LazyRoute<P extends object> = ComponentType<P> & { preload: () => Promise<void> };

const RELOAD_KEY = "life-in-uk:chunk-reload";

/** After a deploy, an open tab may ask for a chunk that no longer exists: load the page afresh once. */
function recoverFromMissingChunk(error: unknown): Promise<never> {
  let reloadedRecently: boolean;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY));
    reloadedRecently = Date.now() - last < 10_000;
    if (!reloadedRecently) window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    reloadedRecently = true; // No storage: never risk a reload loop.
  }
  if (reloadedRecently) return Promise.reject(error);
  window.location.reload();
  return new Promise<never>(() => {});
}

/** A promise React's use() reads synchronously once it is marked fulfilled. */
type TrackedPromise = Promise<void> & { status?: "fulfilled"; value?: undefined };

export function lazyRoute<P extends object>(load: () => Promise<ComponentType<P>>): LazyRoute<P> {
  let component: ComponentType<P> | undefined;
  let pending: TrackedPromise | undefined;
  const preload = (): Promise<void> => {
    if (!pending) {
      const promise: TrackedPromise = load().then((loaded) => {
        component = loaded;
        // React's convention for settled thenables: after preload(), use()
        // returns at once instead of suspending for a microtask.
        promise.status = "fulfilled";
        promise.value = undefined;
      }, recoverFromMissingChunk);
      pending = promise;
    }
    return pending;
  };
  function Route(props: P) {
    use(preload());
    return createElement(component as ComponentType<P>, props);
  }
  return Object.assign(Route, { preload });
}
