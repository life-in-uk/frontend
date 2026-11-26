import { useEffect, useSyncExternalStore } from "react";
import type { GuideLocale } from "../../guides/locales";

// The one language selector lives in the site header on every page. A page that knows which
// languages it exists in (a Guide, a section hub) reports them here, and the header disables the
// others; a page that reports nothing leaves every language available. The target page per
// language comes from the route (router.ts localeSwitchPath), so a switch keeps the same page
// type: Guide → same Guide, hub → hub, index → index, Travel → Travel.

let available: readonly GuideLocale[] | undefined;
const listeners = new Set<() => void>();

function set(next: readonly GuideLocale[] | undefined): void {
  if (next === available) return;
  available = next;
  listeners.forEach((listener) => listener());
}

/** The languages the current page reports, or undefined when it reports none (all enabled). */
export function useAvailableLocales(): readonly GuideLocale[] | undefined {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => available,
    () => undefined,
  );
}

/** Reports the languages this page exists in while it is mounted. */
export function useReportAvailableLocales(locales: readonly GuideLocale[] | undefined): void {
  const key = locales?.join(",");
  useEffect(() => {
    set(locales);
    return () => set(undefined);
    // The list is identified by its content; a new array with the same languages changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
