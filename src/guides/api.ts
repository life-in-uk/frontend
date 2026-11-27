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

/** The languages a prerendered page exists in (its hreflang links), for that path only. */
let startupLocales: { path: string; locales: GuideLocale[] } | undefined;

export function rememberStartupLocales(path: string, locales: GuideLocale[]): void {
  startupLocales = locales.length > 0 ? { path, locales } : undefined;
}

export function startupAlternateLocales(path: string): GuideLocale[] | undefined {
  return startupLocales?.path === path ? startupLocales.locales : undefined;
}

export function clearStartupData(): void {
  startup.clear();
  startupLocales = undefined;
}

/**
 * Published lists and Guides fetched in this session, shared by every page and
 * component: one request per URL at a time, reused for SESSION_TTL_MS, so a
 * page that shows the same list in several places, or a visit back to a page,
 * does not ask the API again. Failures are not kept: the next call retries.
 * A request still in flight is cancelled once every caller waiting for it has
 * aborted (a page that was left), as an unshared request would be.
 */
const SESSION_TTL_MS = 5 * 60_000;
type SessionEntry = { at: number; value: Promise<unknown>; settled: boolean; waiting: number; controller: AbortController };
const session = new Map<string, SessionEntry>();

function sessionRequest<T>(url: string, read: (response: Response) => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  let entry = session.get(url);
  if (!entry || (entry.settled && Date.now() - entry.at >= SESSION_TTL_MS)) {
    const controller = new AbortController();
    const created: SessionEntry = { at: Date.now(), value: Promise.resolve(), settled: false, waiting: 0, controller };
    created.value = fetch(url, { signal: controller.signal }).then(read).then(
      (value) => { created.settled = true; created.at = Date.now(); return value; },
      (error: unknown) => { if (session.get(url) === created) session.delete(url); throw error; },
    );
    session.set(url, created);
    entry = created;
  }
  const shared = entry;
  const value = shared.value as Promise<T>;
  if (shared.settled || !signal) {
    if (!shared.settled) shared.waiting = Infinity; // a caller that cannot abort keeps it alive
    return value;
  }
  shared.waiting += 1;
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      shared.waiting -= 1;
      if (shared.waiting <= 0 && !shared.settled) {
        if (session.get(url) === shared) session.delete(url);
        shared.controller.abort(signal.reason);
      }
    };
    signal.addEventListener("abort", abort, { once: true });
    value.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
      if (!signal.aborted) shared.waiting -= 1;
    });
  });
}

export function clearSessionCache(): void {
  session.clear();
}

/**
 * Catalogue consistency: the Guides the app may link are those whose page the
 * release that served this document has (its embedded, content-hashed page
 * list, named by <meta name="release-pages">) and that the live release still
 * serves (/release-pages.json, published in two phases around each deploy).
 * A Guide page is /{locale}/{section}/{slug}; slugs are unique across sections.
 *
 * - Live list missing, malformed or unreachable: the embedded list alone (still
 *   bound to this release, never the unfiltered API catalogue).
 * - Embedded list unreachable or malformed: Guide lists fail like an API error
 *   (the page shows its error state, never noindex); asked again next time.
 * - No meta (a dev server, not a release build): nothing to narrow.
 */
export class ReleaseInventoryError extends Error {
  constructor() {
    super("Release page list unavailable");
    this.name = "ReleaseInventoryError";
  }
}

const LIVE_TTL_MS = 60_000;
let embeddedGuides: Promise<ReadonlySet<string>> | undefined;
let liveGuides: { at: number; value: Promise<ReadonlySet<string> | null> } | undefined;

/** "locale/slug" of every Guide page in a page list, or null if it is not one. */
function guideKeys(data: unknown): ReadonlySet<string> | null {
  if (!isRecord(data) || !Array.isArray(data.pages) || data.pages.length === 0) return null;
  const keys = new Set<string>();
  for (const path of data.pages) {
    if (typeof path !== "string" || !path.startsWith("/")) return null;
    const parts = path.split("/");
    if (parts.length === 4) keys.add(`${parts[1]}/${parts[3]}`);
  }
  return keys;
}

function readList(url: string, cache: RequestCache): Promise<ReadonlySet<string> | null> {
  return fetch(url, { cache })
    .then(async (response) => (response.ok ? guideKeys(await response.json()) : null))
    .catch(() => null);
}

function releaseMetaUrl(): string | null {
  if (typeof document === "undefined") return null; // not a page (tests, build tools)
  return document.querySelector<HTMLMetaElement>('meta[name="release-pages"]')?.content || null;
}

async function deployedGuides(): Promise<ReadonlySet<string> | null> {
  const url = releaseMetaUrl();
  if (!url) return null;
  embeddedGuides ??= readList(url, "force-cache").then((keys) => {
    if (keys === null) {
      embeddedGuides = undefined; // ask again next time
      throw new ReleaseInventoryError();
    }
    return keys;
  });
  if (!liveGuides || Date.now() - liveGuides.at > LIVE_TTL_MS)
    liveGuides = { at: Date.now(), value: readList("/release-pages.json", "no-cache") };
  const [embedded, live] = await Promise.all([embeddedGuides, liveGuides.value]);
  return live ? new Set([...embedded].filter((key) => live.has(key))) : embedded;
}

/** Only the Guides of `list` that this release has pages for and the live release still serves. */
export async function inRelease(list: GuideMetadata[], locale: GuideLocale): Promise<GuideMetadata[]> {
  const keys = await deployedGuides();
  return keys ? list.filter((guide) => keys.has(`${locale}/${guide.slug}`)) : list;
}

export function clearReleaseGuides(): void {
  embeddedGuides = undefined;
  liveGuides = undefined;
}

export async function getGuides(
  signal?: AbortSignal,
): Promise<GuideMetadata[]> {
  const ready = startupGuides("zh-CN");
  if (ready) return ready;
  const list = await sessionRequest("/api/guides", async (response) => {
    if (!response.ok) throw new Error("Guides unavailable");
    const data: unknown = await response.json();
    if (!isGuideList(data)) throw new Error("Invalid Guides response");
    return data;
  }, signal);
  return inRelease(list, "zh-CN");
}

export async function getGuide(
  slug: string,
  signal?: AbortSignal,
): Promise<GuideDetail> {
  if (!isGuideSlug(slug)) throw new GuideNotFoundError();
  const ready = startup.get(guideKey("zh-CN", slug));
  if (ready && !Array.isArray(ready) && !("guide" in ready)) return ready;
  return sessionRequest(`/api/guides/${encodeURIComponent(slug)}`, async (response) => {
    if (response.status === 404) throw new GuideNotFoundError();
    if (!response.ok) throw new Error("Guide unavailable");
    const data: unknown = await response.json();
    if (!isGuideDetail(data) || data.slug !== slug)
      throw new Error("Invalid Guide response");
    return data;
  }, signal);
}

/** Published-only locale index. Missing translations are omitted by Spring. */
export async function getLocalizedGuides(
  locale: GuideLocale,
  signal?: AbortSignal,
): Promise<GuideMetadata[]> {
  // The zh-CN startup list comes from /api/guides, so only other locales match here.
  const ready = locale === "zh-CN" ? undefined : startupGuides(locale);
  if (ready) return ready;
  const list = await sessionRequest(`/api/guides/locales/${encodeURIComponent(locale)}`, async (response) => {
    if (response.status === 404) throw new GuideNotFoundError();
    if (!response.ok) throw new Error("Guides unavailable");
    const data: unknown = await response.json();
    if (!isGuideList(data)) throw new Error("Invalid localized Guides response");
    return data;
  }, signal);
  return inRelease(list, locale);
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
  return sessionRequest(`/api/guides/${encodeURIComponent(slug)}/locales/${encodeURIComponent(locale)}`, async (response) => {
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
  }, signal);
}
