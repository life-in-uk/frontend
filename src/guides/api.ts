// Public Guide API: GET /api/guides and GET /api/guides/{slug}.
// The backend is the runtime source of published content; nothing here is a fallback copy.
import type { GuideLocale } from "./locales";

export type GuideMetadata = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
};

export type GuideSource = {
  key: string;
  organisation: string;
  title: string;
  url: string;
  accessedAt: string;
};

export type GuideEvidenceSupport = {
  sourceKey: string;
  locator: string | null;
  excerpt: string | null;
  note: string | null;
};

export type GuideEvidence = {
  key: string;
  statement: string;
  supports: GuideEvidenceSupport[];
};

export type GuideDetail = GuideMetadata & {
  content: string;
  sources: GuideSource[];
  evidence: GuideEvidence[];
};

export type LocalizedGuide = {
  locale: GuideLocale;
  guide: GuideDetail;
  sourceRevisionId: string | null;
  contentHash: string | null;
};

/** 404 from the detail endpoint: no published Guide with this slug. */
export class GuideNotFoundError extends Error {
  constructor() {
    super("Guide not found");
    this.name = "GuideNotFoundError";
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
function isInstant(value: unknown): value is string {
  return (
    typeof value === "string" &&
    INSTANT.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
export function isGuideSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG.test(value);
}
/** Only absolute http(s) URLs may become external source links. */
export function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isGuideMetadata(value: unknown): value is GuideMetadata {
  return (
    isRecord(value) &&
    isGuideSlug(value.slug) &&
    isText(value.category) &&
    isText(value.title) &&
    isText(value.summary) &&
    isInstant(value.publishedAt) &&
    isInstant(value.updatedAt)
  );
}

export function isGuideList(value: unknown): value is GuideMetadata[] {
  return Array.isArray(value) && value.every(isGuideMetadata);
}

function isSource(value: unknown): value is GuideSource {
  return (
    isRecord(value) &&
    isText(value.key) &&
    isText(value.organisation) &&
    isText(value.title) &&
    isSafeExternalUrl(value.url) &&
    isInstant(value.accessedAt)
  );
}

function isSupport(value: unknown): value is GuideEvidenceSupport {
  return (
    isRecord(value) &&
    isText(value.sourceKey) &&
    isOptionalText(value.locator) &&
    isOptionalText(value.excerpt) &&
    isOptionalText(value.note)
  );
}

function isEvidence(value: unknown): value is GuideEvidence {
  return (
    isRecord(value) &&
    isText(value.key) &&
    isText(value.statement) &&
    Array.isArray(value.supports) &&
    value.supports.every(isSupport)
  );
}

export function isGuideDetail(value: unknown): value is GuideDetail {
  if (!isGuideMetadata(value)) return false;
  const record: Record<string, unknown> = value;
  return (
    isText(record.content) &&
    Array.isArray(record.sources) &&
    record.sources.every(isSource) &&
    Array.isArray(record.evidence) &&
    record.evidence.every(isEvidence)
  );
}

// Startup data: on a prerendered Guide page, main.tsx fetches the Guide and
// its locale's list before the app's first render (primeStartupGuide), so that
// render already shows the article the static HTML showed: no loading state,
// no layout shift. The data is the live API response, as on any other load.
// It answers matching requests only until the first in-app navigation.
const startup = new Map<string, GuideDetail | GuideMetadata[] | LocalizedGuide>();
const listKey = (locale: GuideLocale) => `list:${locale}`;
const guideKey = (locale: GuideLocale, slug: string) => `guide:${locale}:${slug}`;

/**
 * What a prerendered page's startup request found: its data ("ready"), a definite
 * 404 ("not-found"), or no answer ("failed": rate limiting, a server or network
 * error, the startup deadline). On "failed" the prerendered page is kept as it is
 * (main.tsx), because the app could only replace it with an error state.
 */
export type StartupOutcome = "ready" | "not-found" | "failed";

/**
 * Whether to keep the prerendered page instead of starting the app: when its
 * startup data could not be fetched. Values that are not outcomes (route chunks,
 * a startup deadline that passed first) never keep it.
 */
export function keepPrerenderedPage(results: readonly PromiseSettledResult<unknown>[]): boolean {
  return results.some((result) => result.status === "fulfilled" && result.value === "failed");
}

function outcomeOf(result: PromiseSettledResult<unknown>): StartupOutcome {
  if (result.status === "fulfilled") return "ready";
  return result.reason instanceof GuideNotFoundError ? "not-found" : "failed";
}

export async function primeStartupGuide(slug: string, locale: GuideLocale, signal?: AbortSignal): Promise<StartupOutcome> {
  const [guide, list] = await Promise.allSettled([
    locale === "zh-CN" ? getGuide(slug, signal) : getLocalizedGuide(slug, locale, signal),
    locale === "zh-CN" ? getGuides(signal) : getLocalizedGuides(locale, signal),
  ]);
  if (guide.status === "fulfilled") startup.set(guideKey(locale, slug), guide.value);
  if (list.status === "fulfilled") startup.set(listKey(locale), list.value);
  return outcomeOf(guide);
}

/**
 * Startup data for a page built from several Guides (a Family & Visa topic
 * page): the Simplified Chinese list, the listed Guides' details and, for
 * another locale, their published translations. "failed" when the list or any
 * listed Guide could not be fetched for a reason other than a 404.
 */
export async function primeStartupGuides(slugs: readonly string[], locale: GuideLocale, signal?: AbortSignal): Promise<StartupOutcome> {
  let list: GuideMetadata[];
  try {
    list = await getGuides(signal);
  } catch {
    return "failed";
  }
  startup.set(listKey("zh-CN"), list);
  const published = slugs.filter((slug) => list.some((guide) => guide.slug === slug));
  const results = await Promise.allSettled(
    published.flatMap((slug) => [
      getGuide(slug, signal).then((guide) => { startup.set(guideKey("zh-CN", slug), guide); }),
      ...(locale === "zh-CN" ? [] : [getLocalizedGuide(slug, locale, signal).then((guide) => { startup.set(guideKey(locale, slug), guide); })]),
    ]),
  );
  return results.some((result) => outcomeOf(result) === "failed") ? "failed" : "ready";
}

/** The startup Guide for this page, if it was fetched before the first render. */
export function startupGuide(slug: string, locale: GuideLocale): GuideDetail | undefined {
  const value = startup.get(guideKey(locale, slug));
  if (!value || Array.isArray(value)) return undefined;
  return "guide" in value ? value.guide : value;
}

/** The startup Guide list for this locale, if it was fetched before the first render. */
export function startupGuides(locale: GuideLocale): GuideMetadata[] | undefined {
  const value = startup.get(listKey(locale));
  return Array.isArray(value) ? value : undefined;
}

export function clearStartupData(): void {
  startup.clear();
}

export async function getGuides(
  signal?: AbortSignal,
): Promise<GuideMetadata[]> {
  const ready = startupGuides("zh-CN");
  if (ready) return ready;
  const response = await fetch("/api/guides", { signal });
  if (!response.ok) throw new Error("Guides unavailable");
  const data: unknown = await response.json();
  if (!isGuideList(data)) throw new Error("Invalid Guides response");
  return data;
}

export async function getGuide(
  slug: string,
  signal?: AbortSignal,
): Promise<GuideDetail> {
  if (!isGuideSlug(slug)) throw new GuideNotFoundError();
  const ready = startup.get(guideKey("zh-CN", slug));
  if (ready && !Array.isArray(ready) && !("guide" in ready)) return ready;
  const response = await fetch(`/api/guides/${encodeURIComponent(slug)}`, {
    signal,
  });
  if (response.status === 404) throw new GuideNotFoundError();
  if (!response.ok) throw new Error("Guide unavailable");
  const data: unknown = await response.json();
  if (!isGuideDetail(data) || data.slug !== slug)
    throw new Error("Invalid Guide response");
  return data;
}

/** Published-only locale index. Missing translations are omitted by Spring. */
export async function getLocalizedGuides(
  locale: GuideLocale,
  signal?: AbortSignal,
): Promise<GuideMetadata[]> {
  // The zh-CN startup list comes from /api/guides, so only other locales match here.
  const ready = locale === "zh-CN" ? undefined : startupGuides(locale);
  if (ready) return ready;
  const response = await fetch(`/api/guides/locales/${encodeURIComponent(locale)}`, { signal });
  if (response.status === 404) throw new GuideNotFoundError();
  if (!response.ok) throw new Error("Guides unavailable");
  const data: unknown = await response.json();
  if (!isGuideList(data)) throw new Error("Invalid localized Guides response");
  return data;
}

/** Published-only localized detail. Spring returns 404 for absent/unpublished locales. */
export async function getLocalizedGuide(
  slug: string,
  locale: GuideLocale,
  signal?: AbortSignal,
): Promise<LocalizedGuide> {
  if (!isGuideSlug(slug)) throw new GuideNotFoundError();
  const ready = startup.get(guideKey(locale, slug));
  if (ready && !Array.isArray(ready) && "guide" in ready) return ready;
  const response = await fetch(`/api/guides/${encodeURIComponent(slug)}/locales/${encodeURIComponent(locale)}`, { signal });
  if (response.status === 404) throw new GuideNotFoundError();
  if (!response.ok) throw new Error("Guide unavailable");
  const data: unknown = await response.json();
  if (!isRecord(data) || data.locale !== locale || !isGuideDetail(data.guide)
    || data.guide.slug !== slug
    || !(data.sourceRevisionId === null || typeof data.sourceRevisionId === "string")
    || !(data.contentHash === null || typeof data.contentHash === "string")) {
    throw new Error("Invalid localized Guide response");
  }
  return { locale, guide: data.guide, sourceRevisionId: data.sourceRevisionId, contentHash: data.contentHash };
}
