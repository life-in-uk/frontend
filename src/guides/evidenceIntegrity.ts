// Evidence integrity shared by presentation layers that restate Guide text
// (Money Quick Answers, the Family & Visa navigator). Restated text may show
// only while the Guide is the reviewed version and the evidence it cites is
// unchanged since review.

import type { GuideDetail, GuideEvidence, GuideSource } from "./api";

/**
 * A short, stable fingerprint of cited evidence: each item's key and
 * statement, and each support's location, excerpt, note and source identity.
 * FNV-1a (32-bit) is enough to notice editorial change; it is not security.
 */
export function evidenceFingerprint(
  evidence: readonly GuideEvidence[],
  sources: ReadonlyMap<string, GuideSource>,
): string {
  const text = JSON.stringify(
    evidence.map((item) => [
      item.key,
      item.statement,
      item.supports.map((support) => {
        const source = sources.get(support.sourceKey);
        return [
          support.sourceKey,
          support.locator,
          support.excerpt,
          support.note,
          source?.organisation ?? null,
          source?.title ?? null,
          source?.url ?? null,
        ];
      }),
    ]),
  );
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * The cited evidence from a Guide when every key exists, has at least one
 * support, and every support's source exists; otherwise null.
 */
export function citedEvidence(
  guide: GuideDetail,
  keys: readonly string[],
): GuideEvidence[] | null {
  const evidence = new Map(guide.evidence.map((item) => [item.key, item]));
  const sources = new Set(guide.sources.map((source) => source.key));
  const cited = keys.map((key) => evidence.get(key));
  const resolved = cited.every(
    (item): item is GuideEvidence =>
      item !== undefined &&
      item.supports.length > 0 &&
      item.supports.every((support) => sources.has(support.sourceKey)),
  );
  return keys.length > 0 && resolved ? (cited as GuideEvidence[]) : null;
}

/** The Guide's sources by key, for fingerprints and evidence panels. */
export function sourceMap(guide: GuideDetail): Map<string, GuideSource> {
  return new Map(guide.sources.map((source) => [source.key, source]));
}
