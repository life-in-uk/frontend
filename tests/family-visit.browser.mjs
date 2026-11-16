// F2 family-visit Guide (Standard Visitor visa, ETA or neither) on the normal
// local site (FRONTEND_URL, default http://127.0.0.1:5173) against the real
// local backend (read-only). Covers: the Guide in five locales (one H1,
// evidence, the official GOV.UK visa checker), its place on the Family Visa
// hub in a separate "visits" subtopic, related links that keep the locale
// (→ partner routes overview, ↔ Health Guide on visiting parents), the
// Family Visa Journey still present, and 320px / 390px incl. Urdu RTL.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const SLUG = "visiting-family-uk-visitor-visa-eta";
const LOCALES = [["", "zh-CN", "ltr"], ["/zh-TW", "zh-TW", "ltr"], ["/en", "en", "ltr"], ["/ur", "ur", "rtl"], ["/hi", "hi", "ltr"]];
const browser = await chromium.launch({ headless: true });
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const [prefix, locale, dir] of LOCALES) {
    const res = await page.goto(`${baseURL}${prefix}/family-visa/${SLUG}`);
    ok(res.ok(), `${locale} status`);
    await page.waitForSelector("article.guide-article");
    await page.waitForFunction(() => document.querySelectorAll(".evidence-toggle").length >= 40, null, { timeout: 15000 });
    ok((await page.locator("h1").count()) === 1, `${locale} one H1`);
    ok(/ETA/.test(await page.locator("h1").innerText()), `${locale} H1 names the ETA`);
    ok((await page.locator("html").getAttribute("dir")) === dir, `${locale} dir`);
    ok((await page.locator('article a[href="https://www.gov.uk/check-uk-visa"]').count()) === 1, `${locale} links the official visa checker`);
    ok((await page.locator("article h2").count()) >= 12, `${locale} logical H2 sections`);
    await page.waitForSelector(".related-guides a", { timeout: 10000 });
    const related = await page.locator(".related-guides a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    ok(JSON.stringify(related) === JSON.stringify([`${prefix}/family-visa/partner-visa-routes-overview`, `${prefix}/health/visiting-parents-healthcare-england`]),
      `${locale} related ${related}`);
    // Guide → Health Guide keeps the locale, and the Health Guide links back.
    await page.locator(`.related-guides a[href="${prefix}/health/visiting-parents-healthcare-england"]`).click();
    await page.waitForSelector(`.related-guides a[href="${prefix}/family-visa/${SLUG}"]`, { timeout: 10000 });
    ok(page.url().endsWith(`${prefix}/health/visiting-parents-healthcare-england`), `${locale} → Health keeps the locale and links back`);

    // Family Visa hub: a separate "visits" subtopic; the Journey is still there.
    await page.goto(`${baseURL}${prefix}/family-visa`);
    await page.waitForSelector(`.family-guide-group[data-topic="visits"] a[href="${prefix}/family-visa/${SLUG}"]`, { state: "attached", timeout: 15000 });
    ok((await page.locator('.family-guide-group[data-topic="visits"] a').count()) === 1, `${locale} visits subtopic holds only the visit Guide`);
    ok((await page.locator(`.family-guide-group:not([data-topic="visits"]) a[href$="/${SLUG}"]`).count()) === 0, `${locale} not listed under a family visa route`);
    ok((await page.locator('a[href*="#family-visa-navigator"], [id*="navigator"], .family-journey, [class*="journey"]').count()) >= 1, `${locale} Journey still present`);
  }
  ok(errors.length === 0, `no page errors ${errors}`);
  await context.close();

  for (const width of [320, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const p = await ctx.newPage();
    for (const [prefix, locale] of LOCALES) {
      await p.goto(`${baseURL}${prefix}/family-visa/${SLUG}`);
      await p.waitForSelector("article.guide-article");
      await p.waitForTimeout(300);
      ok(await noOverflow(p), `${width}px ${locale} Guide no horizontal overflow`);
      if (locale === "ur") ok((await p.locator("html").getAttribute("dir")) === "rtl", `${width}px ur RTL`);
    }
    await ctx.close();
  }
  console.log(`family visit browser checks passed: ${checks}`);
} finally {
  await browser.close();
}
