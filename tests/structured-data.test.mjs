// Guide JSON-LD (src/seo/structuredData.ts): built only from published values
// and canonical URL helpers, no invented author/publisher/reviewer, breadcrumb
// equal to the visible one, and safe to embed in a <script> element.
import test from "node:test";
import assert from "node:assert/strict";
import { guideStructuredData, serializeJsonLd } from "../src/seo/structuredData.ts";
import { GUIDE_LOCALES, GUIDE_LOCALE_LANG, GUIDE_UI } from "../src/guides/locales.ts";

const guide = { slug: "renting-council-tax", title: "Council Tax </script> & you", summary: "Summary.", publishedAt: "2026-11-16T14:30:52Z", updatedAt: "2026-11-16T15:00:00Z" };

test("Article and BreadcrumbList use canonical /{locale}/ URLs and the published values in every locale", () => {
  for (const locale of GUIDE_LOCALES) {
    const data = guideStructuredData({ origin: "https://lifeinuk.info", locale, domainId: "renting", guide });
    assert.equal(data["@context"], "https://schema.org");
    const [article, crumbs] = data["@graph"];
    const url = `https://lifeinuk.info/${locale}/renting/renting-council-tax`;
    assert.deepEqual(
      { type: article["@type"], headline: article.headline, description: article.description, inLanguage: article.inLanguage, datePublished: article.datePublished, dateModified: article.dateModified, url: article.url, main: article.mainEntityOfPage },
      { type: "Article", headline: guide.title, description: guide.summary, inLanguage: GUIDE_LOCALE_LANG[locale], datePublished: guide.publishedAt, dateModified: guide.updatedAt, url, main: url },
    );
    for (const claim of ["author", "publisher", "reviewedBy", "aggregateRating", "review"]) assert.equal(article[claim], undefined, claim);
    assert.deepEqual(crumbs.itemListElement.map((row) => [row.position, row.name, row.item]), [
      [1, GUIDE_UI[locale].home, `https://lifeinuk.info${locale === "zh-CN" ? "/" : `/${locale}`}`],
      [2, GUIDE_UI[locale].domain.renting, `https://lifeinuk.info/${locale}/renting`],
      [3, guide.title, url],
    ]);
  }
});

test("serialized JSON-LD cannot close its script element and still parses to the same data", () => {
  const data = guideStructuredData({ origin: "https://lifeinuk.info", locale: "en", domainId: "renting", guide });
  const text = serializeJsonLd(data);
  assert.doesNotMatch(text, /<|>|&/);
  assert.deepEqual(JSON.parse(text), data);
});
