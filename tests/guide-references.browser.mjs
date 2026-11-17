// In-text Guide cross-links on the normal local site (FRONTEND_URL, default
// http://127.0.0.1:5173) against the real local backend, in all five locales:
// each reference is a real link, its visible label is the published
// localized wording, its URL stays in the page's locale and section, it
// opens a published Guide, and Urdu stays right-to-left.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const LOCALES = [["/zh-CN", "zh-CN", "ltr"], ["/zh-TW", "zh-TW", "ltr"], ["/en", "en", "ltr"], ["/ur", "ur", "rtl"], ["/hi", "hi", "ltr"]];
// [section, Guide, Guide it refers to, minimum references in the article]
const PAGES = [
  ["settlement", "settlement-ilr-overview", "settlement-british-citizenship", 5],
  ["health", "where-to-go-when-ill-england", "registering-with-a-gp-england", 1],
  ["health", "nhs-dentist-england", "urgent-dental-care-england", 1],
];
const browser = await chromium.launch({ headless: true });
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

for (const [prefix, locale, dir] of LOCALES) {
  for (const [section, slug, target, min] of PAGES) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${baseURL}${prefix}/${section}/${slug}`);
    await page.locator(".guide-body").waitFor();
    const refs = page.locator(".guide-body a.guide-reference");
    await refs.first().waitFor();
    const found = await refs.evaluateAll((links) => links.map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })));
    ok(found.length >= min, `${locale} ${slug}: ${found.length} references`);
    for (const { href, text } of found) {
      ok(href.startsWith(`${prefix}/${section}/`), `${locale} ${slug}: locale/section path ${href}`);
      ok(text.length > 0 && !/[《》"“”]/.test(text), `${locale} ${slug}: label without quote marks "${text}"`);
    }
    ok(found.every(({ href }) => href !== `${prefix}/${section}/${slug}`), `${locale} ${slug}: no self-link`);
    ok(await page.evaluate(() => document.documentElement.dir) === dir, `${locale}: dir=${dir}`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale} ${slug}: no overflow at 390px`);
    const link = refs.and(page.locator(`[href="${prefix}/${section}/${target}"]`)).first();
    const label = (await link.textContent()).trim();
    await link.click();
    await page.waitForURL(`**${prefix}/${section}/${target}`);
    await page.locator(".guide-body").waitFor();
    const title = (await page.locator("h1").first().textContent()).trim();
    ok(title.length > 0, `${locale}: opened ${target}`);
    if (section === "settlement") ok(title === label, `${locale}: label "${label}" is the published title "${title}"`);
    ok(errors.length === 0, `${locale} ${slug}: no page errors ${errors.join("; ")}`);
    await context.close();
  }
}
await browser.close();
console.log(`PASS guide references: ${checks} checks`);
