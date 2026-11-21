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
  crossSectionLinksFor,
  officialSourcesFor,
  relatedLinksFor,
  TOPIC_CLUSTERS,
} from "../src/guides/topicClusters.ts";

const FAMILY_VISA_SLUGS = [
  "partner-visa-routes-overview", "partner-visa-financial-requirement", "partner-visa-relationship-evidence",
  "partner-visa-dependent-children", "partner-visa-application-process",
  "visiting-family-uk-visitor-visa-eta",
];
const SECTION_SLUGS = {
  education: Object.keys(GUIDE_DOMAINS.education.relatedGuides),
  renting: Object.values(GUIDE_DOMAINS.renting.titleReferences),
  settlement: Object.values(GUIDE_DOMAINS.settlement.titleReferences),
  "family-visa": FAMILY_VISA_SLUGS,
  "work-visa": Object.values(GUIDE_DOMAINS["work-visa"].titleReferences),
};
// Cross-section targets outside the curated sections: published Guides only.
const OTHER_TARGETS = { "university-applications-student-visas": ["uk-undergraduate-application-timeline"], health: ["nhs-ihs-costs-england", "visiting-parents-healthcare-england"], money: ["open-uk-bank-account-new-arrival", "national-insurance-number-newcomers", "uk-credit-history-and-credit-score"], "household-services": ["uk-mobile-plans-sim-only-payg"] };
const TARGETS = { ...SECTION_SLUGS, ...OTHER_TARGETS };
const KNOWN = new Set(Object.values(TARGETS).flat());
const meta = (slug, category) => ({ slug, category, title: `${slug} title`, summary: "s", publishedAt: "", updatedAt: "" });
const publishedAll = Object.entries({ renting: SECTION_SLUGS.renting, settlement: SECTION_SLUGS.settlement, "family-visa": FAMILY_VISA_SLUGS }).flatMap(([domain, slugs]) => slugs.map((slug) => meta(slug, GUIDE_DOMAINS[domain].category)));

test("the three clusters exist and every section Guide is in exactly one subtopic", () => {
  assert.deepEqual(Object.keys(TOPIC_CLUSTERS).sort(), ["family-visa", "renting", "settlement"]);
  for (const [domain, slugs] of Object.entries(SECTION_SLUGS).filter(([domain]) => TOPIC_CLUSTERS[domain])) {
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
    assert.ok(KNOWN.has(from), `cross-section links from unknown ${from}`);
    const own = Object.entries(TARGETS).find(([, slugs]) => slugs.includes(from))[0];
    for (const ref of refs) {
      assert.ok(TARGETS[ref.domain]?.includes(ref.slug), `${from} → ${ref.domain}/${ref.slug}`);
      assert.notEqual(ref.domain, own, `${from} → ${ref.slug} is not cross-section`);
    }
    // Small lists: curated in-section plus cross-section next steps stay at four or fewer.
    const inSection = GUIDE_DOMAINS[own].relatedGuides[from] ?? [];
    assert.ok(inSection.length + refs.length <= 4, `${from}: ${inSection.length + refs.length} related links`);
    assert.equal(new Set(refs.map((ref) => ref.slug)).size, refs.length, `${from}: repeated cross-section link`);
  }
});

test("Work Visa and newcomer cross-links (W1, X1) resolve per locale to published Guides", () => {
  const all = Object.entries(TARGETS).flatMap(([domain, slugs]) => slugs.map((slug) => meta(slug, GUIDE_DOMAINS[domain].category)));
  const links = (domain, slug, list = all) => relatedLinksFor(GUIDE_DOMAINS[domain], slug, list).map((row) => `${row.domain}/${row.guide.slug}`);
  assert.deepEqual(links("work-visa", "skilled-worker-overview"), [
    "work-visa/skilled-worker-sponsorship-cos", "work-visa/skilled-worker-occupations-salary",
    "work-visa/skilled-worker-english-documents", "health/nhs-ihs-costs-england",
  ]);
  assert.deepEqual(links("work-visa", "skilled-worker-settlement-ilr"), [
    "work-visa/skilled-worker-dependants", "work-visa/skilled-worker-job-loss-sponsorship-ends",
    "settlement/settlement-ilr-overview", "settlement/settlement-continuous-residence-absences",
  ]);
  assert.ok(links("settlement", "settlement-children-dependants").includes("work-visa/skilled-worker-dependants"));
  assert.ok(links("family-visa", "partner-visa-application-process").includes("health/nhs-ihs-costs-england"));
  assert.deepEqual(links("money", "open-uk-bank-account-new-arrival"), ["money/national-insurance-number-newcomers", "renting/renting-referencing-checks"]);
  assert.ok(links("renting", "renting-referencing-checks").includes("money/open-uk-bank-account-new-arrival"));
  // M1: the NI number Guide links the bank account Guide and the Skilled Worker overview; the salary Guide links to it.
  assert.deepEqual(links("money", "national-insurance-number-newcomers"), ["money/open-uk-bank-account-new-arrival", "work-visa/skilled-worker-overview"]);
  assert.ok(links("money", "open-uk-bank-account-new-arrival").includes("money/national-insurance-number-newcomers"));
  assert.ok(links("work-visa", "skilled-worker-occupations-salary").includes("money/national-insurance-number-newcomers"));
  // F2: the family-visit Guide sits in its own "visits" subtopic, points to the partner routes overview and the visiting-parents
  // Health Guide, which points back.
  assert.deepEqual(links("family-visa", "visiting-family-uk-visitor-visa-eta"), ["family-visa/partner-visa-routes-overview", "health/visiting-parents-healthcare-england"]);
  assert.ok(links("health", "visiting-parents-healthcare-england").includes("family-visa/visiting-family-uk-visitor-visa-eta"));
  const visits = TOPIC_CLUSTERS["family-visa"].groups.find((group) => group.id === "visits");
  assert.deepEqual(visits.guides.map((ref) => ref.slug), ["visiting-family-uk-visitor-visa-eta"]);
  for (const locale of Object.keys(visits.title)) assert.match(visits.title[locale], /家庭簽證|家庭签证|not a family visa|فیملی ویزا نہیں|फ़ैमिली वीज़ा नहीं/u, `${locale}: visits are labelled as not a family visa`);
  // The IHS Guide unpublished in a locale: the link is dropped, not broken.
  const noIhs = all.filter((g) => g.slug !== "nhs-ihs-costs-england");
  assert.deepEqual(links("work-visa", "skilled-worker-overview", noIhs).filter((x) => x.startsWith("health/")), []);
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


test("catalogue expansion links appear only if the target exists in the reading locale", () => {
  const repair = meta("renting-repairs-damp-mould-england", "renting");
  const move = meta("renting-moving-home-utilities-checklist", "renting");
  const mobile = meta("uk-mobile-plans-sim-only-payg", "household-services");
  assert.deepEqual(clusterGroupsFor("renting", "ur", [], "Other"), []);
  const groups = clusterGroupsFor("renting", "ur", [repair, move], "Other");
  assert.deepEqual(groups.map((group) => group.id), ["moving-in", "bills"]);
  assert.deepEqual(groups.flatMap((group) => group.guides.map(({ guide }) => guide.slug)), [repair.slug, move.slug]);
  const credit = "uk-credit-history-and-credit-score";
  assert.deepEqual(crossSectionLinksFor(credit, []), []);
  assert.deepEqual(crossSectionLinksFor(credit, [mobile]).map(({ guide }) => guide.slug), [mobile.slug]);
});
