// Small deterministic site search over published content.
//
// Indexed: published Guide titles and summaries from GET /api/guides (only
// for launched sections), and reviewed Money Quick Answer questions when
// their Guide is published. Nothing is generated, ranked by popularity or
// fetched from an external service.
//
// Chinese has no word boundaries, so matching combines character coverage
// (are the query's meaningful characters present?) with at least one
// two-character or Latin-word hit, then ranks title hits above body hits.

import type { GuideMetadata } from "../guides/api";
import type { GuideDomain } from "../guides/domains";
import { belongsToDomain, guidePath } from "../guides/domains.ts";
import type { QuickAnswerSet } from "../guides/moneyQuickAnswers";

export type SearchEntry = {
  kind: "guide" | "answer";
  key: string;
  title: string;
  /** Additional searchable text (Guide summary); not shown for answers. */
  text: string;
  href: string;
  sectionLabel: string;
};

export type QuickAnswerSource = {
  set: QuickAnswerSet;
  domain: GuideDomain;
};

export function buildSearchIndex(
  guides: readonly GuideMetadata[],
  domains: readonly GuideDomain[],
  answers: readonly QuickAnswerSource[] = [],
): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const guide of guides) {
    const domain = domains.find((d) => belongsToDomain(guide, d));
    if (!domain) continue;
    entries.push({
      kind: "guide",
      key: `guide:${guide.slug}`,
      title: guide.title,
      text: guide.summary,
      href: guidePath(domain, guide.slug),
      sectionLabel: domain.label,
    });
  }
  for (const { set, domain } of answers) {
    const published = guides.some(
      (guide) =>
        guide.slug === set.guideSlug && belongsToDomain(guide, domain),
    );
    if (!published || !domains.includes(domain)) continue;
    for (const answer of set.answers)
      entries.push({
        kind: "answer",
        key: `answer:${answer.id}`,
        title: answer.question,
        text: "",
        href: domain.basePath,
        sectionLabel: domain.label,
      });
  }
  return entries;
}

const CJK = /[㐀-䶿一-鿿]/;
// Very common characters that would otherwise match almost every entry.
const STOP_CHARS = new Set(
  "的了吗呢吧啊么怎如何什是在我你能会要去和与或有没不也都就还该个一这那些英国".split(
    "",
  ),
);

export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}&\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type QueryUnits = { chars: string[]; words: string[] };

/** Meaningful single characters plus multi-character units (bigrams/words). */
function queryUnits(query: string): QueryUnits {
  const chars: string[] = [];
  const words: string[] = [];
  for (const token of normalize(query).split(" ")) {
    if (!token) continue;
    for (const run of token.match(/[㐀-䶿一-鿿]+|[^㐀-䶿一-鿿]+/g) ??
      []) {
      if (CJK.test(run)) {
        for (const ch of run) chars.push(ch);
        for (let i = 0; i < run.length - 1; i++) words.push(run.slice(i, i + 2));
        if (run.length === 1) words.push(run);
      } else {
        chars.push(run);
        words.push(run);
      }
    }
  }
  const meaningful = chars.filter((ch) => !STOP_CHARS.has(ch));
  const meaningfulWords = words.filter(
    (w) => ![...w].every((ch) => STOP_CHARS.has(ch)),
  );
  // A query made only of common characters still searches literally.
  return meaningful.length > 0
    ? { chars: meaningful, words: meaningfulWords }
    : { chars, words };
}

const MIN_COVERAGE = 0.6;

/** Matching entries, best first; stable for equal scores. Empty query → []. */
export function searchEntries(
  index: readonly SearchEntry[],
  query: string,
): SearchEntry[] {
  const units = queryUnits(query);
  if (units.chars.length === 0) return [];
  const scored: { entry: SearchEntry; score: number; position: number }[] = [];
  index.forEach((entry, position) => {
    const title = normalize(entry.title);
    const body = `${title} ${normalize(entry.text)}`;
    const covered = units.chars.filter((ch) => body.includes(ch)).length;
    const coverage = covered / units.chars.length;
    let wordHits = 0;
    let score = coverage * 2;
    for (const word of units.words) {
      if (title.includes(word)) {
        wordHits++;
        score += 4;
      } else if (body.includes(word)) {
        wordHits++;
        score += 1;
      }
    }
    if (coverage >= MIN_COVERAGE && wordHits > 0)
      scored.push({ entry, score, position });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .map((item) => item.entry);
}
