// Source inventory, built only from the published Guide API (the same records
// the pages show): which Guides and locales cite each source URL, when each
// Guide recorded accessing it, which evidence items and verbatim excerpts rely
// on it, and each Guide's publication revision and dates. Read-only: GET
// requests to the public /api/guides endpoints only.
import { riskFor, higherRisk } from "./risk.mjs";

export const LOCALES = ["zh-CN", "zh-TW", "en", "ur", "hi"];

async function getJson(fetchImpl, url) {
  const response = await fetchImpl(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GET ${url} → HTTP ${response.status}`);
  return response.json();
}

/** { [locale]: [{ locale, guide, sourceRevisionId, contentHash }] } from the public API. */
export async function loadPublishedDetails(apiBase, fetchImpl = fetch) {
  const base = apiBase.replace(/\/$/, "");
  const out = {};
  for (const locale of LOCALES) {
    const list = await getJson(fetchImpl, `${base}/api/guides/locales/${encodeURIComponent(locale)}`);
    out[locale] = [];
    for (const meta of list)
      out[locale].push(await getJson(fetchImpl, `${base}/api/guides/${encodeURIComponent(meta.slug)}/locales/${encodeURIComponent(locale)}`));
  }
  return out;
}

/**
 * Pure: published localized details → { sources, guides }.
 * sources: url → { url, organisation, title, risk, guides: slug → { slug, category,
 *   title, risk, riskReason, locales[], accessedAt, publishedAt, updatedAt{locale},
 *   revisions[], citations[{ evidenceKey, locator, excerpt }] } }
 */
export function buildSourceInventory(detailsByLocale) {
  const sources = new Map();
  const guides = new Map();
  for (const locale of LOCALES) {
    for (const row of detailsByLocale[locale] ?? []) {
      const g = row.guide;
      const { risk, reason } = riskFor(g.slug, g.category);
      const guideEntry = guides.get(g.slug) ?? { slug: g.slug, category: g.category, risk, riskReason: reason, titles: {}, locales: [], revisions: new Set(), publishedAt: g.publishedAt, updatedAt: {} };
      guideEntry.titles[locale] = g.title;
      guideEntry.locales.push(locale);
      guideEntry.revisions.add(row.sourceRevisionId);
      guideEntry.updatedAt[locale] = g.updatedAt;
      guides.set(g.slug, guideEntry);
      const byKey = new Map(g.sources.map((source) => [source.key, source]));
      for (const source of g.sources) {
        const entry = sources.get(source.url) ?? { url: source.url, organisation: source.organisation, title: source.title, risk: "lower", guides: new Map() };
        entry.risk = higherRisk(entry.risk, risk);
        const cite = entry.guides.get(g.slug) ?? { slug: g.slug, category: g.category, risk, accessedAt: source.accessedAt, locales: [], citations: [] };
        if (!cite.locales.includes(locale)) cite.locales.push(locale);
        if (source.accessedAt < cite.accessedAt) cite.accessedAt = source.accessedAt;
        // Evidence and excerpts are identical in every locale; record them once.
        if (cite.locales.length === 1)
          for (const evidence of g.evidence)
            for (const support of evidence.supports)
              if (byKey.get(support.sourceKey)?.url === source.url)
                cite.citations.push({ evidenceKey: evidence.key, locator: support.locator, excerpt: support.excerpt });
        entry.guides.set(g.slug, cite);
        sources.set(source.url, entry);
      }
    }
  }
  for (const guide of guides.values()) guide.revisions = [...guide.revisions];
  return { sources, guides };
}

/** Plain summary for the report header. */
export function inventorySummary({ sources, guides }) {
  const byRisk = { high: 0, medium: 0, lower: 0 };
  for (const guide of guides.values()) byRisk[guide.risk]++;
  let citations = 0;
  let excerpts = 0;
  for (const source of sources.values())
    for (const cite of source.guides.values()) {
      citations += cite.citations.length;
      excerpts += cite.citations.filter((row) => row.excerpt).length;
    }
  return { guides: guides.size, sources: sources.size, guidesByRisk: byRisk, citations, citationsWithExcerpt: excerpts };
}
