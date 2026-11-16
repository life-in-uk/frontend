// Source review (scripts/sources): deterministic, offline. The inventory maps
// each source URL to the Guides and all locales that cite it; change detection
// tells an unavailable source from a changed one, and weak from strong
// signals; the review queue shows affected Guides × locales with evidence; and
// nothing in the tool can edit, translate or publish a Guide.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { assessSource, fetchSource, htmlToText, normalise, renderQueue, reviewQueue, SUMMARY_ONLY_CHARS, textHash } from "../scripts/sources/check.mjs";
import { buildSourceInventory, inventorySummary, loadPublishedDetails, LOCALES } from "../scripts/sources/inventory.mjs";
import { riskFor } from "../scripts/sources/risk.mjs";
import { ALLOWLIST, parseArgs, selectSources } from "../scripts/sources/run.mjs";

const GOV = "https://www.gov.uk/standard-visitor";
const SHELTER = "https://england.shelter.org.uk/housing_advice/x";
const BANK = "https://www.examplebank.co.uk/accounts";

function detail(slug, category, locale, { accessedAt = "2026-11-16T21:30:33Z", updatedAt = "2026-11-16T21:35:00Z" } = {}) {
  return {
    locale,
    sourceRevisionId: `rev-${slug}`,
    contentHash: `hash-${slug}-${locale}`,
    guide: {
      slug, category, title: `${slug} (${locale})`, summary: "s", content: "c", publishedAt: "2026-11-16T21:40:00Z", updatedAt,
      sources: [
        { key: "gov", organisation: "GOV.UK", title: "Visit the UK", url: GOV, accessedAt },
        { key: "sh", organisation: "Shelter England", title: "X", url: SHELTER, accessedAt },
        { key: "bank", organisation: "Bank", title: "Accounts", url: BANK, accessedAt },
      ],
      evidence: [
        { key: "fee", statement: "…", supports: [{ sourceKey: "gov", locator: "Fees", excerpt: "A Standard Visitor visa costs £135 for up to 6 months." }] },
        { key: "eta", statement: "…", supports: [{ sourceKey: "gov", locator: "ETA", excerpt: "You may be asked questions at the UK border." }] },
        { key: "rent", statement: "…", supports: [{ sourceKey: "sh", locator: null, excerpt: null }] },
      ],
    },
  };
}

// Visit Guide in all five locales; a renting Guide in three; both cite GOV.UK.
const DETAILS = Object.fromEntries(LOCALES.map((locale) => [locale, [
  detail("visiting-family-uk-visitor-visa-eta", "family-visa", locale),
  ...(["zh-CN", "en", "ur"].includes(locale) ? [detail("renting-water", "renting", locale, { accessedAt: "2026-11-01T00:00:00Z" })] : []),
]]));

test("inventory: each source maps to its Guides and every locale that cites it, from published records only", () => {
  const inventory = buildSourceInventory(DETAILS);
  const gov = inventory.sources.get(GOV);
  assert.deepEqual([...gov.guides.keys()].sort(), ["renting-water", "visiting-family-uk-visitor-visa-eta"]);
  assert.deepEqual(gov.guides.get("visiting-family-uk-visitor-visa-eta").locales, LOCALES);
  assert.deepEqual(gov.guides.get("renting-water").locales, ["zh-CN", "en", "ur"]);
  // Evidence is the same in every locale: recorded once, not five times.
  assert.equal(gov.guides.get("visiting-family-uk-visitor-visa-eta").citations.length, 2);
  assert.equal(gov.guides.get("renting-water").accessedAt, "2026-11-01T00:00:00Z");
  assert.equal(gov.risk, "high", "a source is as important as the most important Guide citing it");
  const guide = inventory.guides.get("visiting-family-uk-visitor-visa-eta");
  assert.deepEqual(guide.revisions, ["rev-visiting-family-uk-visitor-visa-eta"]);
  assert.equal(guide.publishedAt, "2026-11-16T21:40:00Z");
  assert.deepEqual(inventorySummary(inventory), { guides: 2, sources: 3, guidesByRisk: { high: 1, medium: 1, lower: 0 }, citations: 6, citationsWithExcerpt: 4 });
});

test("risk: explicit category defaults and named exceptions; never derived from elapsed time", () => {
  assert.equal(riskFor("skilled-worker-overview", "work-visa").risk, "high");
  assert.equal(riskFor("renting-deposits-fees", "renting").risk, "high");
  assert.equal(riskFor("renting-water", "renting").risk, "medium");
  assert.equal(riskFor("nhs-ihs-costs-england", "health-nhs").risk, "high");
  assert.equal(riskFor("where-to-go-when-ill-england", "health-nhs").risk, "lower");
  assert.equal(riskFor("national-insurance-number-newcomers", "money").risk, "medium");
  assert.doesNotMatch(readFileSync(new URL("../scripts/sources/risk.mjs", import.meta.url), "utf8"), /Date|days|now\(/);
});

const response = (status, body, type = "text/html; charset=utf-8") => ({
  ok: status >= 200 && status < 300, status, url: "x",
  headers: new Headers({ "content-type": type }),
  text: async () => body, json: async () => JSON.parse(body),
});

test("fetching: network failure and error status are 'unavailable', never a change; GOV.UK redirect and withdrawal are detected", async () => {
  const refused = await fetchSource(SHELTER, async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } }); });
  assert.deepEqual(refused, { status: "unavailable", error: "ECONNREFUSED" });
  assert.equal((await fetchSource(SHELTER, async () => response(503, ""))).status, "unavailable");
  const inventory = buildSourceInventory(DETAILS);
  const unavailable = assessSource(inventory.sources.get(SHELTER), { status: "unavailable", httpStatus: 503 }, { hash: "old" });
  assert.deepEqual(unavailable, { status: "unavailable", signals: [], detail: "HTTP 503" });

  let asked;
  const moved = await fetchSource(GOV, async (url) => { asked = url; return response(200, JSON.stringify({ document_type: "redirect", redirects: [{ path: "/standard-visitor", destination: "/visit-uk" }] }), "application/json"); });
  assert.equal(asked, "https://www.gov.uk/api/content/standard-visitor", "GOV.UK pages are read through the Content API");
  assert.deepEqual(assessSource(inventory.sources.get(GOV), moved).signals.map((s) => s.type), ["moved"]);
  const gone = await fetchSource(GOV, async () => response(410, ""));
  assert.deepEqual(assessSource(inventory.sources.get(GOV), gone).signals.map((s) => s.type), ["gone"]);
  const pdf = await fetchSource(SHELTER, async () => response(200, "%PDF", "application/pdf"));
  assert.deepEqual(assessSource(inventory.sources.get(SHELTER), pdf).signals.map((s) => s.type), ["not-readable"]);
});

const LONG = " Other guidance text.".repeat(100);
const govDoc = (body, updated = "2026-11-10T09:00:00+00:00") => ({ status: "ok", documentType: "guide", publicUpdatedAt: updated, text: htmlToText(`<main><p>${body}</p></main>`) });

test("signals: a missing cited excerpt and a GOV.UK update after the recorded access need review; text changes alone are notes", () => {
  const inventory = buildSourceInventory(DETAILS);
  const gov = inventory.sources.get(GOV);
  const unchanged = assessSource(gov, govDoc(`A Standard Visitor visa costs £135 for up to 6 months. You may be asked questions at the UK border.${LONG}`, "2026-10-01T00:00:00+00:00"));
  assert.equal(unchanged.status, "ok");
  // The fee sentence changed; the other excerpt still matches, so the page was read correctly.
  const feeChanged = assessSource(gov, govDoc(`A Standard Visitor visa costs £150 for up to 6 months. You may be asked questions at the UK border.${LONG}`, "2026-10-01T00:00:00+00:00"));
  assert.equal(feeChanged.status, "review");
  assert.equal(feeChanged.signals.filter((s) => s.type === "excerpt-missing").length, 2, "both Guides citing the fee sentence");
  assert.match(feeChanged.signals[0].evidence, /£135 for up to 6 months.*not found \(2 of 4 excerpts/);
  // GOV.UK major update after one Guide's recorded access (1 Nov) but before the other's (16 Nov).
  const updated = assessSource(gov, govDoc(`A Standard Visitor visa costs £135 for up to 6 months. You may be asked questions at the UK border.${LONG}`));
  assert.deepEqual(updated.signals.map((s) => s.type), ["updated-since-accessed"]);
  assert.match(updated.signals[0].evidence, /renting-water's recorded access 2026-11-01/);
  // Weak signal: only the text hash moved.
  const text = htmlToText(`<main><p>A Standard Visitor visa costs £135 for up to 6 months. You may be asked questions at the UK border.${LONG} New paragraph.</p></main>`);
  const note = assessSource(gov, { status: "ok", publicUpdatedAt: "2026-10-01T00:00:00Z", text }, { hash: textHash("old"), checkedAt: "2026-11-16" });
  assert.deepEqual([note.status, note.signals.map((s) => s.type)], ["note", ["text-changed"]]);
  // Nothing matching at all: either read differently or a GOV.UK summary page of an attachment, never "missing".
  assert.deepEqual(assessSource(gov, govDoc(`Rewritten.${LONG}`, "2026-10-01T00:00:00Z")).signals.map((s) => s.type), ["excerpts-unverifiable"]);
  assert.deepEqual(assessSource(gov, govDoc("Short summary of a PDF.", "2026-10-01T00:00:00Z")).signals.map((s) => s.type), ["not-readable"]);
  assert.ok("Short summary of a PDF.".length < SUMMARY_ONLY_CHARS);
});

test("text extraction joins inline tags like a browser and normalises quotes as the Guide generators did", () => {
  assert.equal(htmlToText('<nav>menu</nav><main><p>Make sure you e<span>nd</span> your <a href="#">tenancy</a> properly.</p><p>Next</p></main>'), "Make sure you end your tenancy properly. Next");
  assert.equal(normalise("you’ll “pay” now"), `you'll "pay" now`);
  assert.equal(htmlToText("<main>£135 &amp; it&#8217;s</main>"), "£135 & it's");
});

test("review queue: affected Guides × locales with evidence, unavailable kept apart, worst first", () => {
  const inventory = buildSourceInventory(DETAILS);
  const results = new Map([
    [GOV, assessSource(inventory.sources.get(GOV), govDoc(`A Standard Visitor visa costs £150 for up to 6 months. You may be asked questions at the UK border.${LONG}`, "2026-10-01T00:00:00Z"))],
    [SHELTER, assessSource(inventory.sources.get(SHELTER), { status: "unavailable", httpStatus: 503 })],
  ]);
  const items = reviewQueue(inventory, results);
  assert.deepEqual(items.map((item) => [item.status, item.url]), [["review", GOV], ["unavailable", SHELTER]]);
  const visit = items[0].affected.find((row) => row.slug === "visiting-family-uk-visitor-visa-eta");
  assert.deepEqual(visit.locales, LOCALES);
  assert.deepEqual(items[0].affected.find((row) => row.slug === "renting-water").locales, ["zh-CN", "en", "ur"]);
  const md = renderQueue(items, { checkedAt: "2026-11-16T22:00:00Z", summary: inventorySummary(inventory), checked: 2, skipped: [{ url: BANK, reason: "allowlist" }] });
  assert.match(md, /Nothing here changes a Guide, a translation or a publication/);
  assert.match(md, /not proof that a rule changed/);
  assert.match(md, /\| visiting-family-uk-visitor-visa-eta \| high \| zh-CN, zh-TW, en, ur, hi \| 2026-11-16 \| 2 \| rev-visiting-family-uk-visitor-visa-eta \|/);
  assert.match(md, /Unavailable: HTTP 503 \(the source could not be read; this is not a detected change\)/);
});

test("runs are polite and scoped: allowlisted sources only by default, priority filter, minimum delay", () => {
  const inventory = buildSourceInventory(DETAILS);
  const { chosen, skipped } = selectSources(inventory, parseArgs(["check"]));
  assert.deepEqual(chosen.map((s) => s.url), [SHELTER, GOV], "high priority first, then by URL");
  assert.deepEqual(skipped, [{ url: BANK, reason: "not on the official/advice allowlist" }]);
  assert.ok(!ALLOWLIST.includes("www.examplebank.co.uk"));
  assert.equal(selectSources(inventory, parseArgs(["check", "--all"])).chosen.length, 3);
  assert.deepEqual(selectSources(inventory, parseArgs(["check", "--limit", "1"])).chosen.map((s) => s.url), [SHELTER]);
  assert.throws(() => parseArgs(["check", "--delay", "100"]), /at least 500/);
});

test("editorial safety: read-only API access, no inventory mutation, no write endpoints or methods anywhere in the tool", async () => {
  const calls = [];
  const fake = async (url, init) => {
    calls.push([init?.method ?? "GET", url]);
    if (url.endsWith("/api/guides/locales/en")) return response(200, JSON.stringify([{ slug: "a" }]), "application/json");
    if (/\/api\/guides\/locales\//.test(url)) return response(200, "[]", "application/json");
    return response(200, JSON.stringify(detail("a", "money", "en")), "application/json");
  };
  await loadPublishedDetails("http://127.0.0.1:8188", fake);
  assert.ok(calls.every(([method, url]) => method === "GET" && url.startsWith("http://127.0.0.1:8188/api/guides/")), JSON.stringify(calls));

  const deepFreeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of value instanceof Map ? [...value.values()] : Object.values(value)) deepFreeze(child);
    }
    return value;
  };
  const inventory = buildSourceInventory(DETAILS);
  const before = JSON.stringify([...inventory.sources.values()].map((s) => [s.url, [...s.guides.values()]]));
  deepFreeze(inventory);
  const results = new Map([[GOV, assessSource(inventory.sources.get(GOV), govDoc("changed"))]]);
  renderQueue(reviewQueue(inventory, results), { checkedAt: "x", summary: inventorySummary(inventory), checked: 1, skipped: [] });
  assert.equal(JSON.stringify([...inventory.sources.values()].map((s) => [s.url, [...s.guides.values()]])), before);

  const dir = new URL("../scripts/sources/", import.meta.url);
  for (const file of readdirSync(dir)) {
    const code = readFileSync(new URL(file, dir), "utf8");
    assert.doesNotMatch(code, /\/api\/owner|\/api\/editorial|guide-batches|\/publish|\/approve/, `${file}: no editorial or owner endpoint`);
    assert.doesNotMatch(code, /method:\s*"(POST|PUT|PATCH|DELETE)"/, `${file}: GET only`);
    for (const [, target] of code.matchAll(/writeFile\(([^,]+),/g)) assert.match(target, /join\(outDir|baselineFile/, `${file}: writes only to the review folder`);
  }
});
