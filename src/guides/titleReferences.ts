// In-text references to other Guides of the same section, such as
// 《拿到永居以后怎么申请入籍》 (zh-CN, zh-TW) or "Applying for British citizenship
// after ILR" (en, ur, hi). The editorial table on each domain (zh-CN titles)
// decides WHICH Guides may be linked; the published Guide list for the page's
// locale supplies localized titles and confirms each target is published.

import type { GuideMetadata } from "./api.ts";
import { domainGuides, type GuideDomain } from "./domains.ts";
import type { GuideLocale } from "./locales.ts";

export type TitleReferences = {
  /** Quoted titles (《…》, "…", “…”) → slug. */
  readonly titles: Readonly<Record<string, string>>;
  /** Exact unquoted phrases → slug (domain.localizedReferences). */
  readonly phrases: Readonly<Record<string, string>>;
};

export const NO_REFERENCES: TitleReferences = { titles: {}, phrases: {} };

function onlyLive(table: Readonly<Record<string, string>> | undefined, live: ReadonlySet<string>): Record<string, string> {
  return Object.fromEntries(Object.entries(table ?? {}).filter(([, slug]) => live.has(slug)));
}

/**
 * The references a Guide page in `locale` may link. zh-CN starts from the
 * domain's editorial table, so links render before the list arrives; other
 * locales need the published list. With a list, only Guides it publishes in
 * this domain are linked, so an unpublished Guide is never a link target.
 */
export function titleReferencesFor(
  domain: GuideDomain,
  locale: GuideLocale,
  published?: readonly GuideMetadata[],
  /** The Guide being rendered: a descriptive phrase never links to itself. */
  currentSlug?: string,
): TitleReferences {
  const allowed = new Set(Object.values(domain.titleReferences));
  if (allowed.size === 0) return NO_REFERENCES;
  if (!published) return locale === "zh-CN" ? { titles: domain.titleReferences, phrases: {} } : NO_REFERENCES;
  const live = domainGuides([...published], domain).filter((guide) => allowed.has(guide.slug));
  const slugs = new Set(live.map((guide) => guide.slug));
  if (locale === "zh-CN") return { titles: onlyLive(domain.titleReferences, slugs), phrases: {} };
  return {
    titles: Object.fromEntries(live.map((guide) => [guide.title, guide.slug])),
    phrases: Object.fromEntries(
      Object.entries(onlyLive(domain.localizedReferences?.[locale], slugs)).filter(([, slug]) => slug !== currentSlug),
    ),
  };
}

export type TitleReferencePart = string | { text: string; slug: string };

const QUOTED = String.raw`《([^》\n]+)》|"([^"\n]+)"|“([^”\n]+)”`;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits text into plain strings and references. Quote marks stay as text
 * around a referenced title, so the visible wording is unchanged.
 */
export function splitTitleReferences(text: string, references: TitleReferences): TitleReferencePart[] {
  const phrases = Object.keys(references.phrases).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(phrases.length ? `${QUOTED}|(${phrases.map(escape).join("|")})` : QUOTED, "g");
  const parts: TitleReferencePart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const phrase = match[4];
    if (phrase !== undefined) {
      parts.push(text.slice(last, start), { text: phrase, slug: references.phrases[phrase] });
      last = start + phrase.length;
      continue;
    }
    const inner = match[1] ?? match[2] ?? match[3];
    const slug = Object.hasOwn(references.titles, inner)
      ? references.titles[inner]
      : Object.hasOwn(references.phrases, inner) ? references.phrases[inner] : undefined;
    if (slug === undefined) continue;
    const open = match[0][0];
    const close = match[0][match[0].length - 1];
    parts.push(text.slice(last, start) + open, { text: inner, slug }, close);
    last = start + match[0].length;
  }
  if (parts.length === 0) return [text];
  parts.push(text.slice(last));
  // Merge neighbouring strings so each run of plain text is one part.
  return parts.reduce<TitleReferencePart[]>((merged, part) => {
    const previous = merged[merged.length - 1];
    if (typeof part === "string" && typeof previous === "string") merged[merged.length - 1] = previous + part;
    else if (part !== "") merged.push(part);
    return merged;
  }, []);
}
