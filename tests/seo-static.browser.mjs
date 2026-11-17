// Crawlable static pages on the built site (`npm run build:static`, then
// `vite preview`). Three parts:
//  1. Raw HTTP, no JavaScript: every sitemap URL (Guides, topic hubs, home
//     pages and Family Visa topic pages, five locales) returns its HTML with
//     one H1, real text, the sitemap's own canonical and exactly the sitemap's
//     hreflang set, correct lang/dir, and internal links that go straight to
//     canonical pages (never a zh-CN short URL, which redirects); the short
//     URLs still serve their page with the /zh-CN/… canonical; Guides link to
//     their section's Journey.
//  2. With JavaScript: the app replaces the static markup without errors or
//     duplicate head tags, the Renting Journey still works from a prerendered
//     hub, and Journey → Guide navigation leaves no stale prerendered tags.
//  3. Without JavaScript at 320px: Urdu RTL pages do not overflow.
//
//   PLAYWRIGHT_MODULE=… FRONTEND_URL=http://127.0.0.1:4173 API_BASE=http://127.0.0.1:8188 npm run test:seo:browser
import assert from "node:assert/strict";
import { CURATED_RELATED_SECTIONS, TOPIC_CLUSTERS } from "../src/guides/topicClusters.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const FRONTEND = (process.env.FRONTEND_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const API = (process.env.API_BASE || "http://127.0.0.1:8188").replace(/\/$/, "");
const JOURNEY_SECTIONS = new Set(["renting", "family-visa", "settlement", "work-visa"]);
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const attr = (html, re) => re.exec(html)?.[1];

// ---- 1. Raw HTTP against the sitemap ----
const sitemap = await (await fetch(`${API}/sitemap.xml`)).text();
const entries = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g)].map(([, loc, links]) => ({
  loc,
  alternates: [...links.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => `${lang} ${href}`).sort(),
}));
ok(entries.length > 0, "sitemap has entries");
const origin = new URL(entries[0].loc).origin;
const sitemapPaths = new Set(entries.map((entry) => new URL(entry.loc).pathname));
const hubs = entries.filter((entry) => new URL(entry.loc).pathname.split("/").length === 3);
ok(hubs.length >= 6 && hubs.length < entries.length, `sitemap lists Guides and hubs (${entries.length - hubs.length} + ${hubs.length})`);

const LANG = { "zh-CN": "zh-CN", "zh-TW": "zh-TW", en: "en-GB", ur: "ur", hi: "hi" };
const LOCALES = Object.keys(LANG);
const homes = entries.filter((entry) => new URL(entry.loc).pathname.split("/").length === 2);
const topics = entries.filter((entry) => new URL(entry.loc).pathname.includes("/family-visa/topics/"));
ok(homes.length === 5 && homes.every((entry) => entry.alternates.length === 6), "sitemap lists the five home pages with their hreflang set");
ok(!sitemapPaths.has("/"), "the root (a redirect to /zh-CN) is not a sitemap URL");
ok(topics.length === 5, `sitemap lists the Family Visa topic page in five locales (${topics.length})`);
// App-only routes a page may link to (the travel tools): 200 with the app shell.
const appRoutes = new Set(LOCALES.map((locale) => `/${locale}/travel`));
const redirects = (await (await fetch(`${FRONTEND}/seo-redirects.json`)).json()).redirects;
const shortUrls = new Set(redirects.map((row) => row.from));
for (const entry of entries) {
  const path = new URL(entry.loc).pathname;
  const isTopic = path.includes("/family-visa/topics/");
  const [, locale, section, guideSlug] = path.split("/");
  const slug = isTopic ? undefined : guideSlug;
  const response = await fetch(FRONTEND + path);
  ok(response.status === 200, `${path} 200`);
  const html = await response.text();
  const root = html.split('<div id="root">')[1] ?? "";
  ok(root.startsWith('<header class="static-header">'), `${path} prerendered markup in the first response`);
  ok((root.match(/<h1>/g) ?? []).length === 1, `${path} exactly one H1`);
  const text = root.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  ok(text.length > (slug || isTopic ? 1200 : 300), `${path} meaningful text (${text.length})`);
  ok(attr(html, /rel="canonical" href="([^"]+)"/) === entry.loc, `${path} canonical = sitemap loc`);
  const pageAlternates = [...html.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(([, l, h]) => `${l} ${h}`).sort();
  ok(JSON.stringify(pageAlternates) === JSON.stringify(entry.alternates), `${path} hreflang matches sitemap`);
  ok(html.includes(`<html lang="${LANG[locale]}" dir="${locale === "ur" ? "rtl" : "ltr"}">`), `${path} lang/dir`);
  // Home pages keep the app's "Life in UK · <tagline>" title; every other page is "<title> · Life in UK".
  ok((section ? /<title>[^<]+ · Life in UK<\/title>/ : /<title>Life in UK · [^<]+<\/title>/).test(html) && /<meta name="description" content="[^"]{10,}"/.test(html), `${path} title and description`);
  ok(html.includes('<script type="module"'), `${path} app still loads`);
  if (slug && JOURNEY_SECTIONS.has(section)) ok(root.includes('class="static-journey"'), `${path} links to its section's Journey`);
  // Topic clusters: grouped hubs with official sources and their own title; curated related links on Guides.
  const cluster = TOPIC_CLUSTERS[section];
  if (cluster && !slug && !isTopic) {
    ok((root.match(/class="static-topic"/g) ?? []).length >= 4, `${path} Guides grouped by subtopic`);
    ok(root.includes('class="static-official"') && !/[\u3400-\u9fff]/.test(locale === "en" || locale === "ur" || locale === "hi" ? root.split('class="static-official"')[1].split("</section>")[0] : ""), `${path} official sources`);
    ok(html.includes(`<title>${cluster.seoTitle[locale].replace(/&/g, "&amp;")} · Life in UK</title>`), `${path} cluster title`);
    ok(root.includes('class="static-journey"'), `${path} Journey entry point`);
  }
  if (section === "renting" && !slug) {
    const later = root.split('id="renting-move-out-title"')[1] ?? "";
    ok(later.includes(`/renting/renting-moving-out-deposit"`), `${path} moving-out stage as crawlable text, linked to its Guide`);
  }
  if (slug && CURATED_RELATED_SECTIONS.has(section)) {
    const related = root.split('class="static-related"')[1]?.split("</section>")[0] ?? "";
    ok((related.match(/<a href="/g) ?? []).length >= 1, `${path} curated related Guides`);
    ok(!root.includes('class="static-guides"'), `${path} no section-wide link list`);
  }
  // Trust signals (Phase 4B): every English Guide says it is general information, in its own text or the notice.
  if (slug && locale === "en") ok(/general information/i.test(text), `${path} general-information disclaimer`);
  // Internal links go straight to a canonical page (or an app-only route), never through a 301.
  for (const [, href] of root.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = href.replace(/(.)\/$/, "$1") || "/";
    ok(!shortUrls.has(target), `${path} link ${href} is not a redirecting short URL`);
    ok(sitemapPaths.has(target) || appRoutes.has(target), `${path} link ${href} resolves`);
  }
}

// zh-CN short URLs (/renting/…): every one is a 301 on the public host (seo-redirects.json); without the
// redirect (vite preview) they still serve the same page with the /zh-CN/… canonical, and / serves the app shell.
ok(redirects.length === entries.filter((entry) => entry.loc.startsWith(`${origin}/zh-CN`)).length, `one redirect per zh-CN page (${redirects.length})`);
for (const row of redirects) {
  ok(row.status === 301 && sitemapPaths.has(row.to) && row.to === (row.from === "/" ? "/zh-CN" : `/zh-CN${row.from}`), `${row.from} → 301 ${row.to}`);
  if (row.from === "/") continue;
  const html = await (await fetch(FRONTEND + row.from)).text();
  ok(attr(html, /rel="canonical" href="([^"]+)"/) === `${origin}${row.to}`, `${row.from} canonical → ${row.to}`);
}
console.log(`PASS raw HTML: ${entries.length} sitemap URLs (${hubs.length} hubs, ${homes.length} homes, ${topics.length} topic pages), ${redirects.length} zh-CN short URLs`);

// ---- 2. With JavaScript ----
const browser = await chromium.launch({ headless: true });
try {
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const path of ["/en/renting/renting-council-tax", "/ur/family-visa/partner-visa-routes-overview", "/renting/renting-referencing-checks"]) {
      await page.goto(FRONTEND + path);
      await page.waitForSelector("article.guide-article");
      ok((await page.locator(".static-page").count()) === 0, `${path} app replaced the static markup`);
      ok((await page.locator('link[rel="canonical"]').count()) === 1, `${path} one canonical after the app loads`);
      ok((await page.locator('meta[name="description"]').count()) === 1, `${path} one description after the app loads`);
    }
    // Cluster hubs in the app: same groups, sources and title as the static page.
    for (const [path, groups, title] of [
      ["/hi/renting", ".renting-topic", TOPIC_CLUSTERS.renting.seoTitle.hi],
      ["/ur/family-visa", ".family-guide-group", TOPIC_CLUSTERS["family-visa"].seoTitle.ur],
      ["/en/settlement", ".work-plan .work-guide-list", TOPIC_CLUSTERS.settlement.seoTitle.en],
    ]) {
      await page.goto(FRONTEND + path);
      await page.waitForSelector(".cluster-official li", { timeout: 15000 });
      ok((await page.locator(groups).count()) >= 4, `${path} app groups Guides by subtopic`);
      ok((await page.title()) === `${title} · Life in UK`, `${path} app title = cluster title`);
      ok((await page.locator('link[rel="canonical"]').count()) === 1, `${path} one canonical`);
      ok((await page.locator('link[rel="alternate"][hreflang]').count()) === 6, `${path} hub hreflang (5 + x-default)`);
    }
    // Guide → related next step in another section, locale kept.
    await page.goto(`${FRONTEND}/ur/family-visa/partner-visa-application-process`);
    await page.locator('.related-guides a[href="/ur/settlement/settlement-partner-ilr"]').click();
    await page.waitForSelector("article.guide-article");
    ok(page.url().endsWith("/ur/settlement/settlement-partner-ilr"), "cross-section related link keeps the locale");
    await page.waitForSelector('.related-guides a[href="/ur/family-visa/partner-visa-routes-overview"]', { timeout: 10000 });
    ok(true, "and links back");

    // Work Visa (W1, X1): an in-text "Related Guides" title link and a cross-section next step, locale kept.
    await page.goto(`${FRONTEND}/hi/work-visa/skilled-worker-overview`);
    await page.locator('article.guide-article a[href="/hi/work-visa/skilled-worker-sponsorship-cos"]').first().click();
    await page.waitForSelector("article.guide-article");
    ok(page.url().endsWith("/hi/work-visa/skilled-worker-sponsorship-cos"), "Work Visa in-text title link keeps the locale");
    await page.goto(`${FRONTEND}/ur/work-visa/skilled-worker-overview`);
    await page.locator('.related-guides a[href="/ur/health/nhs-ihs-costs-england"]').click();
    await page.waitForSelector("article.guide-article");
    ok(page.url().endsWith("/ur/health/nhs-ihs-costs-england"), "Work Visa → IHS Guide keeps the locale");
    await page.goto(`${FRONTEND}/zh-TW/money/open-uk-bank-account-new-arrival`);
    await page.locator('.related-guides a[href="/zh-TW/renting/renting-referencing-checks"]').click();
    await page.waitForSelector('.related-guides a[href="/zh-TW/money/open-uk-bank-account-new-arrival"]', { timeout: 10000 });
    ok(true, "bank account ↔ tenant referencing both ways");

    // Renting hub: the Journey works from the prerendered page; Journey → Guide → no stale tags.
    await page.goto(`${FRONTEND}/en/renting`);
    await page.locator('input[name="renting-scope"][value="england-agent"]').check();
    await page.locator('input[name="renting-branch"][value="student-newcomer"]').check();
    await page.waitForSelector('[data-step="tv-licence"]');
    ok((await page.locator(".renting-steps > .renting-step-list > .renting-step").count()) === 16, "Journey shows 16 move-in steps on the prerendered hub");
    ok((await page.locator('.renting-move-out [data-step="moving-out"]').count()) === 1, "and the later moving-out stage");
    await page.locator('[data-step="council-tax"] .renting-guide-link').click();
    await page.waitForSelector("article.guide-article");
    ok(page.url().endsWith("/en/renting/renting-council-tax"), "Journey → Guide link");
    ok((await page.locator('link[rel="canonical"]').getAttribute("href")) === `${origin}/en/renting/renting-council-tax` ||
      (await page.locator('link[rel="canonical"]').getAttribute("href")).endsWith("/en/renting/renting-council-tax"), "Guide canonical after in-app navigation");
    ok((await page.locator('[data-prerendered="true"]').count()) === 0, "no prerendered head tags remain after navigation");
    // Structured data parity (Phase 4A): one JSON-LD graph that follows the page through in-app navigation.
    const jsonLd = () => page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((el) => JSON.parse(el.textContent)));
    const raw = await (await fetch(`${FRONTEND}/hi/money/national-insurance-number-newcomers`)).text();
    const rawGraph = JSON.parse(/<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/.exec(raw)[1])["@graph"];
    await page.goto(`${FRONTEND}/hi/money/national-insurance-number-newcomers`);
    await page.waitForSelector("article.guide-article");
    await page.waitForFunction(() => document.querySelectorAll('script[type="application/ld+json"]:not([data-prerendered])').length === 1, null, { timeout: 10000 });
    let graphs = await jsonLd();
    ok(graphs.length === 1, "one JSON-LD script after the app loads");
    const [appArticle, appCrumbs] = graphs[0]["@graph"];
    ok(appArticle.headline === rawGraph[0].headline && appArticle.headline === (await page.locator("h1").innerText()).trim(), "app Article headline = raw = visible H1");
    ok(appArticle.dateModified === rawGraph[0].dateModified && appArticle.inLanguage === "hi", "app Article dates and language = raw");
    ok(appArticle.url === (await page.locator('link[rel="canonical"]').getAttribute("href")), "app Article url = app canonical");
    ok(JSON.stringify(appCrumbs.itemListElement.map((row) => row.name)) === JSON.stringify(await page.locator("nav.breadcrumb li").allInnerTexts()), "BreadcrumbList = visible breadcrumb");
    // Five locales: the app's JSON-LD language, headline and breadcrumb follow the page.
    for (const locale of ["zh-CN", "zh-TW", "en", "ur", "hi"]) {
      const path = `/${locale}/family-visa/visiting-family-uk-visitor-visa-eta`;
      await page.goto(FRONTEND + path);
      await page.waitForFunction(() => document.querySelectorAll('script[type="application/ld+json"]:not([data-prerendered])').length === 1, null, { timeout: 10000 });
      const [graph] = await jsonLd();
      ok(graph["@graph"][0].inLanguage === (await page.locator("html").getAttribute("lang")), `${locale} JSON-LD language = html lang`);
      ok(graph["@graph"][0].headline === (await page.locator("h1").innerText()).trim(), `${locale} JSON-LD headline = H1`);
      ok(JSON.stringify(graph["@graph"][1].itemListElement.map((row) => row.name)) === JSON.stringify(await page.locator("nav.breadcrumb li").allInnerTexts()), `${locale} BreadcrumbList = visible breadcrumb`);
    }
    await page.goto(`${FRONTEND}/hi/money/national-insurance-number-newcomers`);
    await page.waitForFunction(() => document.querySelectorAll('script[type="application/ld+json"]:not([data-prerendered])').length === 1, null, { timeout: 10000 });
    // The notice is the same in the app as in the raw HTML.
    for (const path of ["/ur/health/registering-with-a-gp-england", "/zh-TW/money/open-uk-bank-account-new-arrival"]) {
      const rawNotice = /<p class="guide-notice">([^<]*)<\/p>/.exec(await (await fetch(FRONTEND + path)).text())?.[1];
      await page.goto(FRONTEND + path);
      await page.waitForSelector("article.guide-article .guide-notice");
      ok(rawNotice && (await page.locator("article.guide-article .guide-notice").innerText()).trim() === rawNotice, `${path} notice: app = raw HTML`);
    }
    await page.goto(`${FRONTEND}/hi/money/national-insurance-number-newcomers`);
    await page.waitForFunction(() => document.querySelectorAll('script[type="application/ld+json"]:not([data-prerendered])').length === 1, null, { timeout: 10000 });
    ok((await page.locator(".guide-notice").count()) === 0, "a Guide with its own disclaimer gets no notice");
    // Guide → Guide (cross-section) → hub: never stale or duplicated.
    await page.locator('.related-guides a[href="/hi/work-visa/skilled-worker-overview"]').click();
    await page.waitForFunction(() => document.querySelector('script[type="application/ld+json"]')?.textContent.includes("skilled-worker-overview"), null, { timeout: 10000 });
    graphs = await jsonLd();
    ok(graphs.length === 1 && graphs[0]["@graph"][0].url.endsWith("/hi/work-visa/skilled-worker-overview"), "after Guide → Guide navigation: one JSON-LD for the new Guide");
    ok((await page.locator('link[rel="canonical"]').count()) === 1 && (await page.locator('[data-prerendered="true"]').count()) === 0, "one canonical, no prerendered tags left");
    await page.locator("nav.breadcrumb li:nth-child(2) a").click();
    await page.waitForFunction(() => location.pathname === "/hi/work-visa", null, { timeout: 10000 });
    await page.waitForTimeout(500);
    ok((await jsonLd()).length === 0, "hub after a Guide: no JSON-LD left");

    // Home pages: the app keeps one canonical per locale; the root shows the zh-CN home with the /zh-CN canonical.
    for (const [path, locale] of [["/en", "en"], ["/ur", "ur"], ["/", "zh-CN"], ["/zh-CN", "zh-CN"]]) {
      await page.goto(FRONTEND + path);
      await page.waitForSelector(".home-page .topic-grid");
      await page.waitForTimeout(300);
      ok((await page.locator(".static-page").count()) === 0, `${path} app replaced the static home`);
      ok((await page.locator('link[rel="canonical"]').count()) === 1 && (await page.locator('link[rel="canonical"]').getAttribute("href")).endsWith(`/${locale}`), `${path} app canonical /${locale}`);
      ok((await page.locator('link[rel="alternate"][hreflang]').count()) === 6 && (await page.locator('meta[name="description"]').count()) === 1, `${path} app hreflang (5 + x-default) and one description`);
      ok((await page.locator('meta[name="robots"]').count()) === 0 && (await jsonLd()).length === 0, `${path} indexable, no JSON-LD`);
    }
    // Family Visa topic page: verified content, canonical and five-language hreflang in the app too.
    for (const locale of ["ur", "zh-CN"]) {
      const path = `/${locale}/family-visa/topics/children-from-previous-relationship`;
      await page.goto(FRONTEND + path);
      await page.waitForSelector(".family-topic-tasks");
      await page.waitForFunction(() => document.querySelectorAll('link[rel="canonical"]:not([data-prerendered])').length === 1, null, { timeout: 10000 });
      ok((await page.locator('link[rel="canonical"]').getAttribute("href")) === `${origin}${path}` || (await page.locator('link[rel="canonical"]').getAttribute("href")).endsWith(path), `${path} app canonical`);
      ok((await page.locator('link[rel="alternate"][hreflang]').count()) === 6 && (await page.locator('meta[name="robots"]').count()) === 0, `${path} hreflang, indexable`);
      ok((await page.locator('meta[name="description"]').count()) === 1, `${path} one description`);
    }
    // React navigation: every internal link on zh-CN pages goes straight to /zh-CN/… (no short URL).
    for (const path of ["/zh-CN", "/zh-CN/renting", "/zh-CN/health", "/zh-CN/money", "/zh-CN/family-visa", "/zh-CN/settlement", "/zh-CN/health/registering-with-a-gp-england", "/zh-CN/renting/renting-council-tax", "/zh-CN/family-visa/topics/children-from-previous-relationship", "/zh-CN/travel"]) {
      await page.goto(FRONTEND + path);
      await page.waitForSelector("main#main:not(.route-loading):not(.static-page)");
      await page.waitForTimeout(1500);
      const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href^='/']")].map((a) => a.getAttribute("href")));
      const short = hrefs.filter((href) => shortUrls.has(href.split(/[?#]/)[0].replace(/(.)\/$/, "$1") || "/"));
      ok(hrefs.length > 5 && short.length === 0, `${path} app links: ${hrefs.length}, none through a redirect ${short.join(" ")}`);
    }
    // Renting Journey (zh-CN): step → Guide stays on /zh-CN.
    await page.goto(`${FRONTEND}/zh-CN/renting`);
    await page.locator('input[name="renting-scope"][value="england-agent"]').check();
    await page.locator('input[name="renting-branch"][value="student-newcomer"]').check();
    await page.locator('[data-step="council-tax"] .renting-guide-link').click();
    await page.waitForSelector("article.guide-article");
    ok(page.url().endsWith("/zh-CN/renting/renting-council-tax"), "zh-CN Journey → Guide link is canonical");
    // Language switch back to Simplified Chinese lands on the canonical URL.
    await page.goto(`${FRONTEND}/en/renting/renting-council-tax`);
    await page.waitForSelector("article.guide-article");
    await page.locator("select").first().selectOption("zh-CN");
    await page.waitForFunction(() => location.pathname === "/zh-CN/renting/renting-council-tax", null, { timeout: 10000 });
    ok(true, "language switch to zh-CN keeps the Guide on its canonical URL");

    // Unknown Guide slug and unknown path: 404 status, noindex, no canonical or JSON-LD; leaving the 404 removes noindex.
    for (const path of ["/en/renting/no-such-guide", "/ur/no-such-section", "/hi/renting/no-such-guide"]) {
      const response = await page.goto(FRONTEND + path);
      ok(response.status() === 404, `${path} answers 404 (${response.status()})`);
      await page.waitForSelector('meta[name="robots"][content*="noindex"]', { state: "attached", timeout: 10000 });
      await page.waitForSelector("h1");
      ok((await page.locator('link[rel="canonical"]').count()) === 0 && (await jsonLd()).length === 0, `${path} no canonical or JSON-LD`);
      ok((await page.locator('meta[name="robots"]').count()) === 1, `${path} one robots tag`);
    }
    await page.locator('a[href="/hi"]').first().click();
    await page.waitForFunction(() => location.pathname === "/hi", null, { timeout: 10000 });
    await page.waitForTimeout(500);
    ok((await page.locator('meta[name="robots"]').count()) === 0, "a real page after a 404 is not noindex");
    ok(errors.length === 0, `no page errors ${errors}`);
    await context.close();
  }

  // ---- 3. Without JavaScript, phones, Urdu RTL ----
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, javaScriptEnabled: false });
    const page = await context.newPage();
    for (const path of ["/ur", "/hi", "/zh-CN", "/ur/family-visa/topics/children-from-previous-relationship", "/en/family-visa/topics/children-from-previous-relationship", "/ur/renting/renting-council-tax", "/ur/renting", "/ur/family-visa", "/ur/settlement", "/hi/family-visa/partner-visa-routes-overview", "/en/renting/renting-referencing-checks", "/ur/work-visa/skilled-worker-settlement-ilr", "/ur/renting/renting-moving-out-deposit", "/hi/renting/renting-moving-out-deposit", "/ur/money/national-insurance-number-newcomers", "/zh-CN/money/national-insurance-number-newcomers", "/ur/family-visa/visiting-family-uk-visitor-visa-eta", "/hi/family-visa/visiting-family-uk-visitor-visa-eta"]) {
      await page.goto(FRONTEND + path);
      ok((await page.locator(".static-page h1").count()) === 1, `${width}px no-JS ${path} article visible`);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no-JS ${path} no horizontal overflow`);
      if (path.startsWith("/ur")) ok((await page.evaluate(() => getComputedStyle(document.querySelector(".static-page")).direction)) === "rtl", `${width}px ${path} RTL`);
    }
    await context.close();
  }
  // With JavaScript on phones: the grouped app hubs in Urdu RTL do not overflow.
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    for (const path of ["/ur/renting", "/ur/family-visa", "/ur/settlement"]) {
      await page.goto(FRONTEND + path);
      await page.waitForSelector(".cluster-official li", { timeout: 15000 });
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px app ${path} no horizontal overflow`);
    }
    for (const [path, ready] of [["/ur", ".home-page .topic-grid"], ["/ur/family-visa/topics/children-from-previous-relationship", ".family-topic-tasks"]]) {
      await page.goto(FRONTEND + path);
      await page.waitForSelector(ready, { timeout: 15000 });
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px app ${path} no horizontal overflow`);
      ok((await page.locator("html").getAttribute("dir")) === "rtl", `${width}px app ${path} RTL`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`seo static checks passed: ${checks}`);
