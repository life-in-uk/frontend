// Serve the app with Vite on an isolated port. Guide responses are intercepted in Chromium.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EDUCATION_ARRIVALS, EDUCATION_COPY } from "../src/guides/education.ts";
import { GUIDE_LOCALES, GUIDE_LOCALE_LANG } from "../src/guides/locales.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const university = "university-applications-student-visas";
const timeline = "uk-undergraduate-application-timeline";
const stages = "uk-school-stages-and-year-groups";
const artifacts = [
  [process.env.EDUCATION_WAVE1_ARTIFACTS, 25],
  [process.env.EDUCATION_WAVE2_ARTIFACTS, 30],
];
const privateGuides = new Map();
for (const [artifactRoot, expected] of artifacts) {
  if (!artifactRoot) continue;
  assert.equal(new URL(baseURL).hostname, "127.0.0.1", "Private preview requires a loopback frontend");
  const manifest = JSON.parse(readFileSync(join(artifactRoot, "MANIFEST.json"), "utf8"));
  assert.equal(manifest.records.length, expected);
  for (const { locale, path } of manifest.records) {
    const draft = JSON.parse(readFileSync(join(artifactRoot, path), "utf8"));
    assert.equal(draft.status, "DRAFT");
    const items = privateGuides.get(locale) ?? [];
    items.push({ ...draft, publishedAt: draft.updatedAt });
    privateGuides.set(locale, items);
  }
}
const browser = await chromium.launch();

function rows(locale) {
  const list = [
    [stages, "education", EDUCATION_COPY[locale].primary],
    [EDUCATION_ARRIVALS, "education", EDUCATION_COPY[locale].arrivals],
    [timeline, university, "University fixture"],
  ];
  return list.filter(([slug]) => locale !== "hi" || slug === stages).map(([slug, category, title]) => ({
    slug, category, title, summary: "Fixture summary", updatedAt: "2026-11-19T16:00:00Z", publishedAt: "2026-11-19T16:00:00Z",
  }));
}

try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 920 } });
    let showPrivateFixtures = false;
    const list = (locale) => showPrivateFixtures ? privateGuides.get(locale) : rows(locale);
    await page.route("**/api/**", async (route) => {
      const [, , resource, first, segment, last] = new URL(route.request().url()).pathname.split("/");
      if (resource !== "guides") return route.fulfill({ status: 503, json: {} });
      if (!first || first === "locales") return route.fulfill({ json: list(segment || "zh-CN") });
      const guide = list(last || "zh-CN").find(({ slug }) => slug === first);
      if (!guide) return route.fulfill({ status: 404, json: {} });
      const detail = showPrivateFixtures ? guide : { ...guide, content: "## Fixture heading\n\nFixture article", sources: [], evidence: [] };
      return route.fulfill({ json: last ? { guide: detail, locale: last, sourceRevisionId: null, contentHash: null } : detail });
    });

    for (const locale of GUIDE_LOCALES) {
      await page.goto(`${baseURL}/${locale}/education`);
      await page.getByRole("heading", { level: 1, name: EDUCATION_COPY[locale].title, exact: true }).waitFor();
      await page.locator("#education-primary").waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"), GUIDE_LOCALE_LANG[locale]);
      assert.equal(await page.locator("html").getAttribute("dir"), locale === "ur" ? "rtl" : "ltr");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${baseURL}/${locale}/education`);
      assert.equal(await page.locator(`main a[href="/${locale}/${university}"]`).count(), locale === "hi" ? 0 : 1);
      if (locale !== "hi") {
        const sections = await page.locator("main section h2").allTextContents();
        assert.equal(sections[0], EDUCATION_COPY[locale].arrivals);
        await page.locator(`main a[href="/${locale}/education/${EDUCATION_ARRIVALS}"]`).click();
        await page.getByRole("heading", { level: 1, name: EDUCATION_COPY[locale].arrivals, exact: true }).waitFor();
        await page.locator('head link[hreflang="en-GB"]').waitFor({ state: "attached" });
        assert.equal(await page.locator('head link[hreflang="hi"]').count(), 0);
        if (locale === "ur") {
          await page.locator('main select option[value="en"]:enabled').waitFor({ state: "attached" });
          await page.locator("main select").selectOption("en");
          await page.waitForURL(`**/en/education/${EDUCATION_ARRIVALS}`);
          await page.getByRole("heading", { level: 1, name: EDUCATION_COPY.en.arrivals, exact: true }).waitFor();
          assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
        }
      }
    }
    if (privateGuides.size > 0) {
      showPrivateFixtures = true;
      for (const [locale, items] of privateGuides) {
        if (process.env.EDUCATION_WAVE2_ARTIFACTS) {
          await page.goto(`${baseURL}/${locale}/education`);
          await page.getByRole("heading", { level: 2, name: EDUCATION_COPY[locale].support }).waitFor();
          const support = page.locator("section[aria-labelledby=education-support]");
          const link = support.locator(`a[href="/${locale}/education/english-language-support-at-school-england"]`);
          await link.click();
          await page.locator(`main a[href="/${locale}/education/send-school-support-england"]`).waitFor();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
        for (const guide of items) {
          const url = `${baseURL}/${locale}/education/${guide.slug}`;
          await page.goto(url);
          await page.getByRole("heading", { level: 1, name: guide.title, exact: true }).waitFor();
          assert.equal(await page.locator("html").getAttribute("dir"), locale === "ur" ? "rtl" : "ltr");
          assert.equal(await page.locator('head link[rel="canonical"]').getAttribute("href"), url);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          const toggles = page.locator("main .evidence-toggle");
          assert.equal(await toggles.count(), guide.evidence.length);
          const reviewedKeys = new Set(["wales", "exam-years", "start-options", "attendance", "meal-types", "appeal", "inspection", "progression", "school-support", "moving"]);
          for (const [index, evidence] of guide.evidence.entries()) {
            if (!reviewedKeys.has(evidence.key)) continue;
            const toggle = toggles.nth(index);
            await toggle.click();
            const panel = page.locator(`[id="${await toggle.getAttribute("aria-controls")}"]`);
            await panel.waitFor();
            assert.equal(await panel.locator(".evidence-statement").textContent(), evidence.statement);
            const links = await panel.locator(".evidence-source-link").evaluateAll((items) =>
              items.map((item) => item.getAttribute("href")));
            assert.deepEqual(links, evidence.supports.map(({ sourceKey }) =>
              guide.sources.find(({ key }) => key === sourceKey).url));
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await toggle.click();
          }
        }
      }
      const count = [...privateGuides.values()].reduce((total, items) => total + items.length, 0);
      console.log(`Education: ${count} private articles rendered at ${width}px through browser-only API fixtures.`);
    }
    await page.close();
    console.log(`Education: five locales at ${width}px, arrival priority, University visibility, metadata and RTL passed.`);
  }
} finally {
  await browser.close();
}
