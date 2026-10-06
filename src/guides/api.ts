// Public Guide API: GET /api/guides and GET /api/guides/{slug}.
// The backend is the runtime source of published content; nothing here is a fallback copy.

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

export async function getGuides(
  signal?: AbortSignal,
): Promise<GuideMetadata[]> {
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
