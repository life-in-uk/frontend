// The published content inventory: the single source of truth for which
// static pages must exist. Loaded from the Guide API (published translations
// only; missing translations are omitted by the API, so a Simplified Chinese
// fallback can never be mistaken for a translation).
import { GUIDE_DOMAINS } from "../../src/guides/domains.ts";
import { GUIDE_LOCALES, localizedGuidePath } from "../../src/guides/locales.ts";
import { STATIC_HUB_DOMAINS } from "../../src/seo/staticPages.ts";

export const LOCALES = GUIDE_LOCALES;
export const HOME_PATHS = new Set(["/", "/zh-CN", "/zh-TW", "/en", "/ur", "/hi"]);

const domainByCategory = new Map(Object.values(GUIDE_DOMAINS).map((domain) => [domain.category, domain.id]));
export const domainIdFor = (category) => domainByCategory.get(category);

async function getJson(api, path) {
  let response;
  try {
    response = await fetch(api + path);
  } catch (error) {
    throw new Error(`Guide API unreachable at ${api} (${error.cause?.code ?? error.message}); start the backend or set API_BASE`);
  }
  if (!response.ok) throw new Error(`Guide API ${path}: HTTP ${response.status}`);
  return response.json();
}

/**
 * { lists: { locale: GuideMetadata[] }, details: { locale: Map<slug, GuideDetail> } }
 * Only Guides in a known section are kept.
 */
export async function loadInventory(apiBase) {
  const api = apiBase.replace(/\/$/, "");
  const lists = {};
  const details = {};
  for (const locale of LOCALES) {
    const list = await getJson(api, locale === "zh-CN" ? "/api/guides" : `/api/guides/locales/${locale}`);
    lists[locale] = list.filter((guide) => domainIdFor(guide.category));
    details[locale] = new Map();
    for (const meta of lists[locale]) {
      const detail = locale === "zh-CN"
        ? await getJson(api, `/api/guides/${encodeURIComponent(meta.slug)}`)
        : (await getJson(api, `/api/guides/${encodeURIComponent(meta.slug)}/locales/${locale}`)).guide;
      if (detail.slug !== meta.slug) throw new Error(`Guide API returned ${detail.slug} for ${meta.slug} (${locale})`);
      details[locale].set(meta.slug, detail);
    }
  }
  return { lists, details };
}

/**
 * Every canonical page the inventory requires, with its expected alternates:
 * one page per published Guide per published locale, and one hub per section
 * per locale in which that section has a published Guide.
 */
export function expectedPages(inventory) {
  const pages = [];
  const guideLocales = new Map();
  for (const locale of LOCALES)
    for (const guide of inventory.lists[locale]) guideLocales.set(guide.slug, [...(guideLocales.get(guide.slug) ?? []), locale]);
  for (const locale of LOCALES) {
    for (const guide of inventory.lists[locale]) {
      const domainId = domainIdFor(guide.category);
      const locales = guideLocales.get(guide.slug);
      pages.push({
        kind: "guide", locale, domainId, slug: guide.slug, title: guide.title, summary: guide.summary,
        path: localizedGuidePath(locale, domainId, guide.slug),
        alternates: locales.map((alt) => ({ locale: alt, path: localizedGuidePath(alt, domainId, guide.slug) })),
      });
    }
  }
  for (const domainId of STATIC_HUB_DOMAINS) {
    const category = GUIDE_DOMAINS[domainId].category;
    const locales = LOCALES.filter((locale) => inventory.lists[locale].some((guide) => guide.category === category));
    for (const locale of locales)
      pages.push({
        kind: "hub", locale, domainId, path: localizedGuidePath(locale, domainId),
        alternates: locales.map((alt) => ({ locale: alt, path: localizedGuidePath(alt, domainId) })),
      });
  }
  return pages;
}

/** zh-CN short URLs (/renting/…, /renting) for the /zh-CN/… canonical pages. */
export function aliasFor(page) {
  return page.locale === "zh-CN" ? page.path.replace(/^\/zh-CN/, "") : null;
}
