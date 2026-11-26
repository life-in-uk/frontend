// Exercise the real client UI against loopback-only Guide fixtures. The optional
// private handoff stays outside this checkout and is intercepted in Chromium.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOUSEHOLD_CATEGORY, HOUSEHOLD_COPY, HOUSEHOLD_SECTIONS, householdSections } from "../src/guides/household.ts";
import { GUIDE_LOCALE_LANG, GUIDE_LOCALES, GUIDE_UI } from "../src/guides/locales.ts";
import { availableHomeTopics } from "../src/home/topics.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.FRONTEND_URL || "http://127.0.0.1:5179");
assert.equal(base.hostname, "127.0.0.1");
const root = process.env.HOUSEHOLD_EDITORIAL_ROOT;
const manifest = root ? JSON.parse(readFileSync(join(root, "EDITORIAL-MANIFEST.json"), "utf8")) : null;
const fallback = (locale) => ({
  slug: "household-fixture",
  category: HOUSEHOLD_CATEGORY,
  title: `Fixture ${locale}`,
  summary: "Fixture summary",
  content: "## Fixture heading\n\nFixture article",
  sources: [],
  evidence: [],
  updatedAt: "2026-11-20T21:28:14Z",
});
const data = Object.fromEntries(GUIDE_LOCALES.map((locale) => [locale, manifest
  ? manifest.articles.map((article) => {
    const draft = JSON.parse(readFileSync(join(root, article.locales[locale].file), "utf8"));
    assert.equal(draft.status, "DRAFT");
    return draft;
  })
  : [fallback(locale)]]));
if (manifest) assert.equal(Object.values(data).flat().length, 35);
assert.equal(availableHomeTopics(true, true).some((topic) => topic.id === HOUSEHOLD_CATEGORY), false);
assert.equal(availableHomeTopics(false, false, true).find((topic) => topic.id === HOUSEHOLD_CATEGORY).navGroup, "housing");

const browser = await chromium.launch();
let details = 0;
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    let visible = true;
    let apiError = false;
    await page.route("**/api/**", async (route) => {
      const [, , resource, first, segment, last] = new URL(route.request().url()).pathname.split("/");
      if (resource !== "guides" || apiError) return route.fulfill({ status: 503, json: {} });
      const locale = first === "locales" ? segment : last || "zh-CN";
      const records = visible ? (data[locale] ?? []).map((draft) => ({ ...draft, publishedAt: draft.updatedAt })) : [];
      if (!first || first === "locales") return route.fulfill({ json: records.map(({ slug, category, title, summary, updatedAt, publishedAt }) => ({ slug, category, title, summary, updatedAt, publishedAt })) });
      const guide = records.find(({ slug }) => slug === first);
      if (!guide) return route.fulfill({ status: 404, json: {} });
      return route.fulfill({ json: last ? { guide, locale, sourceRevisionId: null, contentHash: null } : guide });
    });

    for (const locale of GUIDE_LOCALES) {
      const hub = `/${locale}/${HOUSEHOLD_CATEGORY}`;
      await page.goto(new URL(`/${locale}`, base).href);
      await page.locator(`main a[href="${hub}"]`).first().click();
      await page.getByRole("heading", { level: 1, name: HOUSEHOLD_COPY[locale].title }).waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"), GUIDE_LOCALE_LANG[locale]);
      assert.equal(await page.locator("html").getAttribute("dir"), locale === "ur" ? "rtl" : "ltr");
      // Shared topic-hub layout (as Education, Renting, Work Visa): numbered cards grouped into sections.
      const cards = page.locator("main .work-guide-card");
      await cards.last().waitFor();
      assert.equal(await cards.count(), data[locale].length);
      const sectionHeadings = await page.locator("main .work-topic h2").allInnerTexts();
      const expectedSections = householdSections(data[locale]).map(({ id }) => HOUSEHOLD_SECTIONS[locale][id]);
      assert.deepEqual(sectionHeadings, expectedSections, `${locale}: hub sections`);
      assert.deepEqual(await cards.evaluateAll((els) => els.map((el) => el.dataset.slug)),
        householdSections(data[locale]).flatMap(({ guides }) => guides.map(({ slug }) => slug)), `${locale}: card order`);
      assert.equal(await page.locator('head link[rel="canonical"]').getAttribute("href"), new URL(hub, base).href);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `hub overflow at ${width} / ${locale}`);
      for (const [index, guide] of data[locale].entries()) {
        const path = `${hub}/${guide.slug}`;
        if (index === 0) await page.locator(`main a[href="${path}"]`).click();
        else await page.goto(new URL(path, base).href);
        await page.getByRole("heading", { level: 1, name: guide.title, exact: true }).waitFor();
        assert.equal(await page.locator('head link[rel="canonical"]').getAttribute("href"), new URL(path, base).href);
        await page.locator('head link[hreflang="en-GB"]').waitFor({ state: "attached" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `detail overflow at ${width} / ${locale} / ${guide.slug}`);
        assert.equal(await page.locator("main .evidence-toggle").count(), guide.evidence.length);
        details++;
        if (locale === "ur" && index === 0) {
          // The site's one language selector is in the header (none in the page).
          assert.equal(await page.locator("main select").count(), 0, "no second language selector in the page");
          await page.locator('.masthead-language select option[value="en"]:enabled').waitFor({ state: "attached" });
          await page.locator(".masthead-language select").selectOption("en");
          await page.waitForURL(`**/en/${HOUSEHOLD_CATEGORY}/${guide.slug}`);
          await page.getByRole("heading", { level: 1, name: data.en[0].title }).waitFor();
          assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
        }
      }
    }

    visible = false;
    await page.goto(new URL(`/en/${HOUSEHOLD_CATEGORY}`, base).href);
    await page.getByRole("status").filter({ hasText: "There are no published guides" }).waitFor();
    assert.equal(await page.locator(`header a[href="/en/${HOUSEHOLD_CATEGORY}"], footer a[href="/en/${HOUSEHOLD_CATEGORY}"]`).count(), 0);
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
    await page.goto(new URL(`/en/${HOUSEHOLD_CATEGORY}/${data.en[0].slug}`, base).href);
    await page.getByText(GUIDE_UI.en.notFound, { exact: true }).waitFor();
    apiError = true;
    await page.goto(new URL(`/en/${HOUSEHOLD_CATEGORY}`, base).href);
    await page.getByRole("alert").filter({ hasText: "Guides are temporarily unavailable" }).waitFor();
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`Household browser checks passed for ${details} detail visits across five locales and two widths.`);
