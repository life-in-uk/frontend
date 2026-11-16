// Source-change detection for the review queue. For each recorded source URL:
//
// - unavailable: the request failed or returned an error status. This says
//   nothing about the rules; it is reported separately from changes.
// - GOV.UK pages are read through the GOV.UK Content API, which gives the
//   page text and `public_updated_at` (moved only for major changes), and
//   tells us when a page now redirects or is gone.
// - Other pages: the visible text of <main> (or <body>), scripts and
//   navigation removed.
//
// Signals, strongest first:
// - moved / gone: the page now redirects or has been withdrawn.
// - excerpt-missing: a verbatim excerpt a Guide quotes is no longer in the
//   page text, while other excerpts from the same page still are (so the
//   text was read correctly).
// - updated-since-accessed: GOV.UK records a major update after the date the
//   Guide recorded accessing the source.
// - text-changed: the normalised page text differs from the last run's
//   baseline. Weak: wording, layout and unrelated sections all change it.
//
// None of these proves a rule changed. Each becomes a review item for the
// owner, with the evidence; nothing is written to any Guide.

import { createHash } from "node:crypto";

export const USER_AGENT = "source-review-client/1.0";
export const REVIEW_SIGNALS = new Set(["moved", "gone", "excerpt-missing", "updated-since-accessed"]);

/** The same normalisation the Guide generators used when matching excerpts. */
export function normalise(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", pound: "£" };
function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

/** Visible text of an HTML document or fragment. */
export function htmlToText(html) {
  const cleaned = html.replace(/<(script|style|noscript|svg|nav|header|footer|template)\b[\s\S]*?<\/\1>/gi, " ");
  const main = /<main\b[\s\S]*?<\/main>/i.exec(cleaned)?.[0] ?? /<body\b[\s\S]*<\/body>/i.exec(cleaned)?.[0] ?? cleaned;
  // Block-level tags separate words; inline tags (span, a, strong…) do not, as in a browser.
  const BLOCK = /<\/?(?:p|li|ul|ol|h[1-6]|div|section|article|aside|main|body|table|thead|tbody|tr|td|th|dl|dt|dd|blockquote|figure|figcaption|details|summary|pre|form|fieldset|legend|label|button|hr|br)\b[^>]*>/gi;
  return normalise(decodeEntities(main.replace(BLOCK, " ").replace(/<[^>]+>/g, "")));
}

/** Text and metadata of a GOV.UK Content API document. */
export function govukContentText(doc) {
  const details = doc.details ?? {};
  const parts = [doc.title ?? "", doc.description ?? ""];
  for (const part of details.parts ?? []) parts.push(part.title ?? "", part.body ?? "");
  for (const key of ["introductory_paragraph", "body", "more_information", "other_ways_to_apply", "what_you_need_to_know", "need_to_know", "introduction"]) {
    const value = details[key];
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) for (const item of value) if (item && typeof item.content === "string") parts.push(item.content);
  }
  return htmlToText(`<main>${parts.join("\n")}</main>`);
}

/** Below this much text, a GOV.UK page is a summary of an attachment (a publication) rather than the guidance itself. */
export const SUMMARY_ONLY_CHARS = 1500;
export const isGovUk = (url) => new URL(url).hostname === "www.gov.uk";
export const contentApiUrl = (url) => `https://www.gov.uk/api/content${new URL(url).pathname.replace(/\/$/, "")}`;

/** Fetches one source: { status: "ok" | "unavailable", text?, publicUpdatedAt?, documentType?, redirectTo?, httpStatus?, error? }. */
export async function fetchSource(url, fetchImpl = fetch, timeoutMs = 20000) {
  const govuk = isGovUk(url);
  const target = govuk ? contentApiUrl(url) : url;
  let response;
  try {
    response = await fetchImpl(target, { method: "GET", redirect: "follow", headers: { "User-Agent": USER_AGENT, Accept: govuk ? "application/json" : "text/html" }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    return { status: "unavailable", error: String(error?.cause?.code ?? error?.name ?? error) };
  }
  if (govuk && response.status === 410) return { status: "ok", documentType: "gone", httpStatus: 410, text: "" };
  if (!response.ok) return { status: "unavailable", httpStatus: response.status };
  if (!govuk) {
    const type = response.headers.get("content-type") ?? "";
    if (!/html/i.test(type)) return { status: "ok", httpStatus: response.status, unreadable: type || "unknown type", text: "" };
    return { status: "ok", httpStatus: response.status, finalUrl: response.url, text: htmlToText(await response.text()) };
  }
  const doc = await response.json();
  const redirect = doc.redirects?.find((row) => row.path === new URL(url).pathname)?.destination ?? doc.redirects?.[0]?.destination;
  return {
    status: "ok",
    httpStatus: response.status,
    documentType: doc.document_type,
    publicUpdatedAt: doc.public_updated_at ?? null,
    redirectTo: doc.document_type === "redirect" ? redirect ?? null : null,
    text: doc.document_type === "redirect" || doc.document_type === "gone" ? "" : govukContentText(doc),
  };
}

export const textHash = (text) => createHash("sha256").update(text).digest("hex");

/**
 * Pure: signals for one inventory source given a fetch result and the previous
 * baseline entry (or undefined). Returns { status, signals, hash }.
 */
export function assessSource(source, fetched, baseline) {
  if (fetched.status !== "ok") return { status: "unavailable", signals: [], detail: fetched.httpStatus ? `HTTP ${fetched.httpStatus}` : fetched.error ?? "request failed" };
  const signals = [];
  if (fetched.documentType === "redirect") signals.push({ type: "moved", evidence: `GOV.UK Content API: document_type redirect → ${fetched.redirectTo ?? "unknown destination"}` });
  if (fetched.documentType === "gone") signals.push({ type: "gone", evidence: "GOV.UK Content API: page withdrawn (gone / HTTP 410)" });
  const text = fetched.text ?? "";
  const cites = [...source.guides.values()];
  if (fetched.unreadable) signals.push({ type: "not-readable", evidence: `${fetched.unreadable}: available, but its text cannot be compared automatically; check it by hand if a dependent Guide is reviewed` });
  if (text && fetched.documentType !== "redirect") {
    const excerpts = [];
    for (const cite of cites)
      for (const row of cite.citations)
        if (row.excerpt) excerpts.push({ ...row, slug: cite.slug, found: text.includes(normalise(row.excerpt).replace(/\.$/, "")) });
    const found = excerpts.filter((row) => row.found).length;
    // A GOV.UK publication page carries only a summary; the cited wording is in an attachment.
    const summaryOnly = isGovUk(source.url) && text.length < SUMMARY_ONLY_CHARS;
    if (excerpts.length && found === 0 && summaryOnly)
      signals.push({ type: "not-readable", evidence: `GOV.UK ${fetched.documentType ?? "page"} with only ${text.length} characters of text: the cited wording is in an attachment, which is not compared automatically` });
    else if (excerpts.length && found === 0)
      signals.push({ type: "excerpts-unverifiable", evidence: `none of ${excerpts.length} recorded excerpts was found; the page text may be read differently from when the Guide was written, or the page was rewritten` });
    else
      for (const row of excerpts.filter((item) => !item.found))
        signals.push({ type: "excerpt-missing", evidence: `${row.slug} · ${row.evidenceKey}${row.locator ? ` (${row.locator})` : ""}: "${row.excerpt}" not found (${found} of ${excerpts.length} excerpts on this page still match)` });
  }
  if (fetched.publicUpdatedAt) {
    for (const cite of cites)
      if (Date.parse(fetched.publicUpdatedAt) > Date.parse(cite.accessedAt))
        signals.push({ type: "updated-since-accessed", evidence: `GOV.UK public_updated_at ${fetched.publicUpdatedAt} is after ${cite.slug}'s recorded access ${cite.accessedAt}` });
  }
  const hash = text ? textHash(text) : null;
  if (baseline?.hash && hash && baseline.hash !== hash)
    signals.push({ type: "text-changed", evidence: `normalised page text differs from the baseline of ${baseline.checkedAt} (weak signal: layout or unrelated wording also changes it)` });
  return { status: signals.some((s) => REVIEW_SIGNALS.has(s.type)) ? "review" : signals.length ? "note" : "ok", signals, hash, publicUpdatedAt: fetched.publicUpdatedAt ?? null };
}

/** Review queue items (never edits): one per source with signals, worst first, with every affected Guide and locale. */
export function reviewQueue(inventory, results) {
  const rank = { review: 0, note: 1, unavailable: 2, ok: 3 };
  const riskRank = { high: 0, medium: 1, lower: 2 };
  const items = [];
  for (const [url, result] of results) {
    if (result.status === "ok") continue;
    const source = inventory.sources.get(url);
    items.push({
      url,
      organisation: source.organisation,
      title: source.title,
      status: result.status,
      risk: source.risk,
      detail: result.detail ?? null,
      signals: result.signals,
      affected: [...source.guides.values()].map((cite) => {
        const guide = inventory.guides.get(cite.slug);
        return { slug: cite.slug, category: cite.category, risk: cite.risk, locales: [...cite.locales], accessedAt: cite.accessedAt, revisions: guide.revisions, updatedAt: guide.updatedAt, title: guide.titles.en ?? guide.titles["zh-CN"], citations: cite.citations.length };
      }).sort((a, b) => riskRank[a.risk] - riskRank[b.risk] || a.slug.localeCompare(b.slug)),
    });
  }
  return items.sort((a, b) => rank[a.status] - rank[b.status] || riskRank[a.risk] - riskRank[b.risk] || a.url.localeCompare(b.url));
}

/** Human-readable review queue. */
export function renderQueue(items, { checkedAt, summary, checked, skipped }) {
  const lines = [
    `# Source review queue — ${checkedAt}`,
    "",
    "Review items only. Nothing here changes a Guide, a translation or a publication: the owner decides whether a Guide needs a new revision.",
    "A signal is a reason to look at the source, not proof that a rule changed.",
    "",
    `Inventory: ${summary.guides} Guides (high ${summary.guidesByRisk.high}, medium ${summary.guidesByRisk.medium}, lower ${summary.guidesByRisk.lower}), ${summary.sources} source URLs, ${summary.citations} citations (${summary.citationsWithExcerpt} with a verbatim excerpt).`,
    `This run: ${checked} sources checked, ${skipped.length} not checked (outside the official/advice allowlist or the run's filters).`,
    "",
    `Review: ${items.filter((i) => i.status === "review").length} · Notes: ${items.filter((i) => i.status === "note").length} · Unavailable: ${items.filter((i) => i.status === "unavailable").length}`,
  ];
  for (const item of items) {
    lines.push("", `## [${item.status.toUpperCase()}] ${item.organisation} — ${item.title}`, "", `- URL: ${item.url}`, `- Maintenance priority: ${item.risk}`);
    if (item.detail) lines.push(`- Unavailable: ${item.detail} (the source could not be read; this is not a detected change)`);
    for (const signal of item.signals) lines.push(`- Signal \`${signal.type}\`: ${signal.evidence}`);
    lines.push("", "| Guide | Priority | Locales | Recorded access | Citations | Revision |", "|---|---|---|---|---|---|");
    for (const row of item.affected)
      lines.push(`| ${row.slug} | ${row.risk} | ${row.locales.join(", ")} | ${row.accessedAt.slice(0, 10)} | ${row.citations} | ${row.revisions.join(", ")} |`);
  }
  return lines.join("\n") + "\n";
}
