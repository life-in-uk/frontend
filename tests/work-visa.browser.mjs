// Work Visa (Skilled Worker) section on the normal local site (FRONTEND_URL,
// default http://127.0.0.1:5173) against the real local backend: the hub in
// five locales links all eight published Guides in its own locale, every
// Guide opens with evidence links, the corrected ILR wording (S10) shows,
// header navigation works, Urdu is right-to-left, and 320/390px layouts have
// no horizontal overflow.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const LOCALES = [["", "zh-CN", "ltr"], ["/zh-TW", "zh-TW", "ltr"], ["/en", "en", "ltr"], ["/ur", "ur", "rtl"], ["/hi", "hi", "ltr"]];
const SLUGS = [
  "skilled-worker-overview", "skilled-worker-sponsorship-cos", "skilled-worker-occupations-salary",
  "skilled-worker-english-documents", "skilled-worker-switch-extend-change-employer", "skilled-worker-dependants",
  "skilled-worker-job-loss-sponsorship-ends", "skilled-worker-settlement-ilr",
];
// S10: the ILR Guide says the reform's applicability is uncertain.
const S10 = { "zh-CN": "仍不确定", "zh-TW": "仍不確定", en: "remain uncertain", ur: "غیر یقینی", hi: "अनिश्चित" };
const browser = await chromium.launch({ headless: true });
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const [prefix, locale, dir] of LOCALES) {
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${baseURL}${prefix}/work-visa`);
    await page.locator(".work-guide-link").first().waitFor();
    const hrefs = await page.locator(".work-guide-link").evaluateAll((a) => a.map((l) => l.getAttribute("href")));
    ok(hrefs.length === 8, `${locale}: 8 Guides linked (${hrefs.length})`);
    ok(SLUGS.every((slug) => hrefs.includes(`${prefix}/work-visa/${slug}`)), `${locale}: locale-correct Guide links`);
    ok(await page.evaluate(() => document.documentElement.dir) === dir, `${locale}: dir=${dir}`);
    ok(await noOverflow(page), `${locale} hub: no overflow at ${width}px`);
    if (width === 1280) {
      const nav = page.locator(`header a[href="${prefix}/work-visa"]`);
      ok(await nav.count() >= 1, `${locale}: header links to Work Visa`);
      ok(await page.locator(`a[data-settlement-link][href="${prefix}/settlement"]`).count() === 1,
        `${locale}: Settlement cross-link`);
    }
    ok(errors.length === 0, `${locale} hub: no page errors ${errors.join("; ")}`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  for (const slug of SLUGS) {
    await page.goto(`${baseURL}${prefix}/work-visa/${slug}`);
    await page.locator(".guide-body").waitFor();
    ok((await page.locator("h1").first().textContent()).trim().length > 0, `${locale} ${slug}: title`);
    ok(await page.locator(".guide-body .evidence-toggle").count() > 0, `${locale} ${slug}: evidence links`);
    ok(await noOverflow(page), `${locale} ${slug}: no overflow at 390px`);
    if (slug === "skilled-worker-settlement-ilr")
      ok((await page.locator(".guide-body").innerText()).includes(S10[locale]), `${locale}: S10 wording shown`);
  }
  await context.close();
}
await browser.close();
console.log(`PASS work visa: ${checks} checks`);
