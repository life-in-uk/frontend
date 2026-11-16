// Crawlable static pages on the built site (`npm run build:static`, then
// `vite preview`). Three parts:
//  1. Raw HTTP, no JavaScript: every sitemap URL (Guides and topic hubs, five
//     locales) returns its article/hub HTML with one H1, real text, the
//     sitemap's own canonical and exactly the sitemap's hreflang set, correct
//     lang/dir, and internal links that resolve; zh-CN in-app aliases point
//     their canonical at /zh-CN/…; Guides link to their section's Journey.
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
const homes = new Set(["/", "/zh-TW", "/en", "/ur", "/hi"]);
const aliasPaths = new Set();
for (const entry of entries) {
  const path = new URL(entry.loc).pathname;
  const [, locale, section, slug] = path.split("/");
  const response = await fetch(FRONTEND + path);
  ok(response.status === 200, `${path} 200`);
  const html = await response.text();
  const root = html.split('<div id="root">')[1] ?? "";
  ok(root.startsWith('<header class="static-header">'), `${path} prerendered markup in the first response`);
  ok((root.match(/<h1>/g) ?? []).length === 1, `${path} exactly one H1`);
  const text = root.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  ok(text.length > (slug ? 1500 : 300), `${path} meaningful text (${text.length})`);
  ok(attr(html, /rel="canonical" href="([^"]+)"/) === entry.loc, `${path} canonical = sitemap loc`);
  const pageAlternates = [...html.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(([, l, h]) => `${l} ${h}`).sort();
  ok(JSON.stringify(pageAlternates) === JSON.stringify(entry.alternates), `${path} hreflang matches sitemap`);
  ok(html.includes(`<html lang="${LANG[locale]}" dir="${locale === "ur" ? "rtl" : "ltr"}">`), `${path} lang/dir`);
  ok(/<title>[^<]+ · Life in UK<\/title>/.test(html) && /<meta name="description" content="[^"]{10,}"/.test(html), `${path} title and description`);
  ok(html.includes('<script type="module"'), `${path} app still loads`);
  if (slug && JOURNEY_SECTIONS.has(section)) ok(root.includes('class="static-journey"'), `${path} links to its section's Journey`);
  // Topic clusters: grouped hubs with official sources and their own title; curated related links on Guides.
  const cluster = TOPIC_CLUSTERS[section];
  if (cluster && !slug) {
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
  // Internal links resolve to prerendered pages or home pages.
  for (const [, href] of root.matchAll(/href="(\/[^"#]*)/g)) {
    const target = href.replace(/\/$/, "") || "/";
    const zhAlias = target.split("/").length <= 3 && !/^\/(zh-CN|zh-TW|en|ur|hi)(\/|$)/.test(target) && target !== "/";
    if (zhAlias) aliasPaths.add(target);
    ok(homes.has(target) || sitemapPaths.has(target) || (zhAlias && sitemapPaths.has(`/zh-CN${target}`)), `${path} link ${href} resolves`);
  }
}

// zh-CN in-app aliases (/renting/…): same content, canonical on /zh-CN/….
for (const alias of aliasPaths) {
  const html = await (await fetch(FRONTEND + alias)).text();
  ok(attr(html, /rel="canonical" href="([^"]+)"/) === `${origin}/zh-CN${alias}`, `${alias} canonical → /zh-CN${alias}`);
}
console.log(`PASS raw HTML: ${entries.length} sitemap URLs (${hubs.length} hubs), ${aliasPaths.size} zh-CN aliases`);

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
    ok(errors.length === 0, `no page errors ${errors}`);
    await context.close();
  }

  // ---- 3. Without JavaScript, phones, Urdu RTL ----
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, javaScriptEnabled: false });
    const page = await context.newPage();
    for (const path of ["/ur/renting/renting-council-tax", "/ur/renting", "/ur/family-visa", "/ur/settlement", "/hi/family-visa/partner-visa-routes-overview", "/en/renting/renting-referencing-checks", "/ur/work-visa/skilled-worker-settlement-ilr", "/ur/renting/renting-moving-out-deposit", "/hi/renting/renting-moving-out-deposit", "/ur/money/national-insurance-number-newcomers", "/zh-CN/money/national-insurance-number-newcomers"]) {
      await page.goto(FRONTEND + path);
      ok((await page.locator(".static-page h1").count()) === 1, `${width}px no-JS ${path} article visible`);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no-JS ${path} no horizontal overflow`);
      if (path.startsWith("/ur/")) ok((await page.evaluate(() => getComputedStyle(document.querySelector(".static-page")).direction)) === "rtl", `${width}px ${path} RTL`);
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
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`seo static checks passed: ${checks}`);
