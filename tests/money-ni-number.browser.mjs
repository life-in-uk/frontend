// M1 National Insurance number Guide on the normal local site (FRONTEND_URL,
// default http://127.0.0.1:5173) against the real local backend (read-only).
// Covers: the Guide in five locales (one H1, evidence, links to the official
// GOV.UK apply and find services), the Money hub listing it in every locale,
// related links that keep the locale (NI ↔ bank account, NI → Skilled Worker
// overview, Skilled Worker salary → NI), and 320px / 390px layouts including
// Urdu RTL.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const SLUG = "national-insurance-number-newcomers";
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
    // The Guide.
    const res = await page.goto(`${baseURL}${prefix}/money/${SLUG}`);
    ok(res.ok(), `${locale} status`);
    await page.waitForSelector("article.guide-article");
    await page.waitForFunction(() => document.querySelectorAll(".evidence-toggle").length >= 30, null, { timeout: 15000 });
    ok((await page.locator("h1").count()) === 1, `${locale} one H1`);
    ok(/National Insurance number/.test(await page.locator("h1").innerText()), `${locale} H1 names the NI number`);
    ok((await page.locator("html").getAttribute("dir")) === dir, `${locale} dir`);
    ok((await page.locator('article a[href="https://www.gov.uk/apply-national-insurance-number"]').count()) >= 1, `${locale} links the official apply service`);
    ok((await page.locator('article a[href="https://www.gov.uk/find-national-insurance-number"]').count()) >= 1, `${locale} links the official find service`);
    ok((await page.locator("article h2").count()) >= 10, `${locale} logical H2 sections`);
    // Related next steps keep the locale.
    await page.waitForSelector(".related-guides a", { timeout: 10000 });
    const related = await page.locator(".related-guides a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    ok(JSON.stringify(related) === JSON.stringify([`${prefix}/money/open-uk-bank-account-new-arrival`, `${prefix}/work-visa/skilled-worker-overview`]),
      `${locale} related ${related}`);

    // The Money hub lists the Guide.
    await page.goto(`${baseURL}${prefix}/money`);
    await page.waitForSelector(`a[href="${prefix}/money/${SLUG}"]`, { timeout: 15000 });
    ok(true, `${locale} Money hub lists the NI Guide`);

    // Reverse links: bank account → NI; Skilled Worker salary → NI (and the click keeps the locale).
    await page.goto(`${baseURL}${prefix}/money/open-uk-bank-account-new-arrival`);
    await page.waitForSelector(`.related-guides a[href="${prefix}/money/${SLUG}"]`, { timeout: 10000 });
    ok(true, `${locale} bank account Guide links the NI Guide`);
    await page.goto(`${baseURL}${prefix}/work-visa/skilled-worker-occupations-salary`);
    await page.locator(`.related-guides a[href="${prefix}/money/${SLUG}"]`).click();
    await page.waitForSelector("article.guide-article");
    ok(page.url().endsWith(`${prefix}/money/${SLUG}`), `${locale} Work Visa → NI Guide keeps the locale`);
  }
  ok(errors.length === 0, `no page errors ${errors}`);
  await context.close();

  for (const width of [320, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const p = await ctx.newPage();
    for (const [prefix, locale] of LOCALES) {
      await p.goto(`${baseURL}${prefix}/money/${SLUG}`);
      await p.waitForSelector("article.guide-article");
      await p.waitForTimeout(300);
      ok(await noOverflow(p), `${width}px ${locale} Guide no horizontal overflow`);
      await p.goto(`${baseURL}${prefix}/money`);
      await p.waitForSelector(`a[href="${prefix}/money/${SLUG}"]`, { timeout: 15000 });
      ok(await noOverflow(p), `${width}px ${locale} Money hub no horizontal overflow`);
      if (locale === "ur") ok((await p.locator("html").getAttribute("dir")) === "rtl", `${width}px ur RTL`);
    }
    await ctx.close();
  }
  console.log(`money NI number browser checks passed: ${checks}`);
} finally {
  await browser.close();
}
