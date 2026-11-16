// Topic clusters (Renting, Family Visa, Settlement): every Guide sits in one
// subtopic, related links are curated and stay small, unpublished Guides are
// never shown, cross-section next steps resolve, hub sources come from the
// Guides' own citations, and all copy exists in five locales.
import test from "node:test";
import assert from "node:assert/strict";
import { GUIDE_DOMAINS } from "../src/guides/domains.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";
import {
  CLUSTER_COPY,
  clusterGroupsFor,
  CROSS_SECTION_RELATED,
  officialSourcesFor,
  relatedLinksFor,
  TOPIC_CLUSTERS,
} from "../src/guides/topicClusters.ts";

const FAMILY_VISA_SLUGS = [
  "partner-visa-routes-overview", "partner-visa-financial-requirement", "partner-visa-relationship-evidence",
  "partner-visa-dependent-children", "partner-visa-application-process",
];
const SECTION_SLUGS = {
  renting: Object.values(GUIDE_DOMAINS.renting.titleReferences),
  settlement: Object.values(GUIDE_DOMAINS.settlement.titleReferences),
  "family-visa": FAMILY_VISA_SLUGS,
};
const KNOWN = new Set([...Object.values(SECTION_SLUGS).flat(), "skilled-worker-settlement-ilr"]);
const meta = (slug, category) => ({ slug, category, title: `${slug} title`, summary: "s", publishedAt: "", updatedAt: "" });
const publishedAll = Object.entries(SECTION_SLUGS).flatMap(([domain, slugs]) => slugs.map((slug) => meta(slug, GUIDE_DOMAINS[domain].category)));

test("the three clusters exist and every section Guide is in exactly one subtopic", () => {
  assert.deepEqual(Object.keys(TOPIC_CLUSTERS).sort(), ["family-visa", "renting", "settlement"]);
  for (const [domain, slugs] of Object.entries(SECTION_SLUGS)) {
    const inSection = TOPIC_CLUSTERS[domain].groups.flatMap((group) => group.guides).filter((ref) => ref.domain === domain).map((ref) => ref.slug);
    assert.deepEqual([...inSection].sort(), [...slugs].sort(), domain);
    assert.equal(new Set(inSection).size, inSection.length, `${domain}: a Guide in two subtopics`);
    for (const group of TOPIC_CLUSTERS[domain].groups)
      for (const ref of group.guides) assert.ok(KNOWN.has(ref.slug), `${domain}/${group.id}: unknown ${ref.slug}`);
  }
});

test("related Guides are curated: in-section, at most three, never the Guide itself", () => {
  for (const [domain, slugs] of Object.entries(SECTION_SLUGS)) {
    const related = GUIDE_DOMAINS[domain].relatedGuides;
    for (const slug of slugs) {
      const targets = related[slug] ?? [];
      assert.ok(targets.length >= 1 && targets.length <= 3, `${domain}/${slug}: ${targets.length} related`);
      assert.ok(!targets.includes(slug), `${slug} links to itself`);
      for (const target of targets) assert.ok(slugs.includes(target), `${slug} → ${target} leaves ${domain}`);
      assert.equal(new Set(targets).size, targets.length, `${slug}: repeated related link`);
    }
    for (const key of Object.keys(related)) assert.ok(slugs.includes(key), `${domain}: related for unknown ${key}`);
  }
  for (const [from, refs] of Object.entries(CROSS_SECTION_RELATED)) {
    assert.ok(KNOWN.has(from));
    for (const ref of refs) assert.ok(SECTION_SLUGS[ref.domain]?.includes(ref.slug), `${from} → ${ref.domain}/${ref.slug}`);
  }
});

test("related links: published only, in the target's own section, cross-section next steps included", () => {
  const fv = GUIDE_DOMAINS["family-visa"];
  const links = relatedLinksFor(fv, "partner-visa-application-process", publishedAll);
  assert.deepEqual(links.map((row) => `${row.domain}/${row.guide.slug}`), [
    "family-visa/partner-visa-financial-requirement",
    "family-visa/partner-visa-dependent-children",
    "settlement/settlement-partner-ilr",
  ]);
  // Unpublished in this locale: dropped, never shown as a link.
  const partial = publishedAll.filter((g) => g.slug !== "settlement-partner-ilr" && g.slug !== "partner-visa-dependent-children");
  assert.deepEqual(relatedLinksFor(fv, "partner-visa-application-process", partial).map((row) => row.guide.slug), ["partner-visa-financial-requirement"]);
  // A Guide listed under the wrong category is not trusted.
  const miscategorised = [meta("renting-guarantors", "health-nhs")];
  assert.deepEqual(relatedLinksFor(GUIDE_DOMAINS.renting, "renting-referencing-checks", miscategorised), []);
});

test("hub groups show only published Guides, drop empty subtopics and never hide a published Guide", () => {
  const some = [meta("renting-council-tax", "renting"), meta("renting-energy", "renting"), meta("renting-new-topic", "renting")];
  const groups = clusterGroupsFor("renting", "en", some, CLUSTER_COPY.other.en);
  assert.deepEqual(groups.map((g) => [g.id, g.guides.map((x) => x.guide.slug)]), [
    ["bills", ["renting-council-tax", "renting-energy"]],
    ["other", ["renting-new-topic"]],
  ]);
  assert.equal(groups[0].title, "Council Tax and utilities");
  // Family Visa's "later" subtopic appears only when the Settlement Guide is published.
  const fvOnly = FAMILY_VISA_SLUGS.map((slug) => meta(slug, "family-visa"));
  assert.ok(!clusterGroupsFor("family-visa", "ur", fvOnly, "x").some((g) => g.id === "settling"));
  assert.ok(clusterGroupsFor("family-visa", "ur", publishedAll, "x").some((g) => g.id === "settling"));
  assert.deepEqual(clusterGroupsFor("health", "en", publishedAll, "x"), []);
});

test("hub official links are the GOV.UK pages the Guides cite most", () => {
  const src = (key, url) => ({ key, organisation: "o", title: key, url, accessedAt: "" });
  const detail = (sources, cited) => ({ ...meta("x", "renting"), content: "", sources, evidence: cited.map((key) => ({ key: `e-${key}`, statement: "s", supports: [{ sourceKey: key, locator: null, excerpt: null, note: null }] })) });
  const a = src("a", "https://www.gov.uk/a"), b = src("b", "https://www.gov.uk/b"), shelter = src("s", "https://england.shelter.org.uk/x"), unused = src("u", "https://www.gov.uk/u");
  const result = officialSourcesFor([detail([a, b, shelter, unused], ["a", "b", "s"]), detail([b], ["b"])]);
  assert.deepEqual(result.map((s) => s.key), ["b", "a"]);
  // Dated publications rank after guidance pages; Chinese editorial notes are stripped; Chinese-only titles are skipped.
  const dated = src("d", "https://www.gov.uk/government/publications/fees-table");
  const annotated = { ...src("n", "https://www.gov.uk/guidance/rules"), title: "Immigration Rules: Introduction（paragraph 6 definitions）" };
  const chinese = { ...src("c", "https://www.gov.uk/guidance/zh"), title: "中文标题" };
  const ranked = officialSourcesFor([detail([dated, annotated, chinese], ["d", "n", "c"]), detail([dated], ["d"])]);
  assert.deepEqual(ranked.map((s) => [s.key, s.title]), [["n", "Immigration Rules: Introduction"], ["d", "d"]]);
});

test("cluster copy exists in five locales, with no Chinese in en/ur/hi and no review claims", () => {
  for (const cluster of Object.values(TOPIC_CLUSTERS)) {
    const texts = [cluster.seoTitle, cluster.seoDescription, ...cluster.groups.map((g) => g.title)];
    for (const text of texts)
      for (const locale of GUIDE_LOCALES) {
        assert.ok(text[locale]?.trim(), `${cluster.domain} ${locale}`);
        if (["en", "ur", "hi"].includes(locale)) assert.doesNotMatch(text[locale], /[一-鿿]/u);
      }
    assert.doesNotMatch(cluster.seoDescription.en, /review|lawyer-approved|expert|guarantee|best/i);
    assert.match(cluster.seoDescription.en, /not legal advice/);
  }
  for (const text of Object.values(CLUSTER_COPY)) for (const locale of GUIDE_LOCALES) assert.ok(text[locale].trim());
});
