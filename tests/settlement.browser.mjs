// Settlement / ILR section on the normal local site (FRONTEND_URL, default
// http://127.0.0.1:5173) against the real local backend. Covers: hub in five
// locales with every planned Guide linked, every Guide page in five locales
// (title, evidence links, NOT CURRENT LAW label on the tracker), navigation
// from Home topic card, header and footer, cross-links from Family Visa and
// Work Visa hubs, Urdu RTL, 320px and 390px layouts, and Travel preserved.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-settlement";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const LOCALES = [["", "zh-CN", "ltr"], ["/zh-TW", "zh-TW", "ltr"], ["/en", "en", "ltr"], ["/ur", "ur", "rtl"], ["/hi", "hi", "ltr"]];
const SLUGS = [
  "settlement-ilr-overview", "settlement-partner-ilr", "settlement-long-residence", "settlement-other-routes",
  "settlement-continuous-residence-absences", "settlement-english-life-in-uk-test", "settlement-children-dependants",
  "settlement-documents-evidence", "settlement-application-process", "settlement-after-ilr",
  "settlement-british-citizenship", "settlement-earned-settlement-tracker",
];
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

async function open(width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { context, page, errors };
}

try {
  // Hub in five locales.
  for (const [prefix, locale, dir] of LOCALES) {
    const { context, page, errors } = await open();
    await page.goto(`${baseURL}${prefix}/settlement`);
    await page.waitForSelector(".work-guide-link");
    ok((await page.locator("html").getAttribute("dir")) === dir, `${locale} dir`);
    ok((await page.locator(".work-guide-card").count()) === 13, `${locale} 13 cards`);
    ok((await page.locator(".work-guide-link").count()) === 13, `${locale} 13 linked Guides`);
    const sw = await page.locator('[data-slug="skilled-worker-settlement-ilr"] a').getAttribute("href");
    ok(sw === `${prefix}/work-visa/skilled-worker-settlement-ilr`, `${locale} SW ILR links to work-visa (${sw})`);
    ok((await page.locator(".work-date-list [data-proposed]").count()) === 1, `${locale} one proposed date`);
    ok(errors.length === 0, `${locale} hub errors ${errors}`);
    await page.screenshot({ path: `${screenshots}/hub-${locale}.png`, fullPage: true });
    await context.close();
  }

  // Every Guide in every locale renders with its evidence links.
  for (const [prefix, locale] of LOCALES) {
    const { context, page, errors } = await open();
    for (const slug of SLUGS) {
      const res = await page.goto(`${baseURL}${prefix}/settlement/${slug}`);
      ok(res.ok(), `${locale} ${slug} status`);
      await page.waitForSelector("h1");
      await page.waitForFunction(() => document.querySelectorAll(".evidence-toggle").length > 5);
      const h1 = await page.locator("h1").first().innerText();
      ok(h1.length > 5 && !/找不到|没有找到|not found/i.test(h1), `${locale} ${slug} h1 "${h1}"`);
      if (slug === "settlement-partner-ilr") {
        await page.locator(".evidence-toggle").first().click();
        ok((await page.locator('main a[href^="https://www.gov.uk/"]').count()) >= 1, `${locale} evidence shows a GOV.UK source`);
      }
      if (slug === "settlement-earned-settlement-tracker")
        ok((await page.content()).includes("NOT CURRENT LAW"), `${locale} tracker label`);
      if (locale === "zh-CN" && slug === "settlement-ilr-overview")
        ok((await page.locator("a.guide-reference").count()) >= 5, "zh-CN in-text 《》 references are linked");
    }
    ok(errors.length === 0, `${locale} guide errors ${errors}`);
    await context.close();
  }

  // Navigation: home topic card, header and footer.
  {
    const { context, page } = await open();
    await page.goto(`${baseURL}/`);
    for (const where of ["main", "header", "footer"]) {
      const n = await page.locator(`${where} a[href="/settlement"]`).count();
      ok(n >= 1, `home ${where} links to /settlement (${n})`);
    }
    await page.goto(`${baseURL}/ur`);
    ok((await page.locator('header a[href="/ur/settlement"]').count()) >= 1, "ur header link");
    // Cross-links.
    for (const hub of ["/family-visa", "/work-visa", "/en/family-visa", "/hi/work-visa"]) {
      await page.goto(`${baseURL}${hub}`);
      const link = page.locator("[data-settlement-link]");
      await link.waitFor();
      const href = await link.getAttribute("href");
      ok(href.endsWith("/settlement"), `${hub} cross-link ${href}`);
    }
    // Travel preserved.
    const t = await page.goto(`${baseURL}/travel`);
    ok(t.ok() && (await page.locator(".travel-tabs [role=tab]").count()) === 3, "travel page intact");
    await context.close();
  }

  // Mobile layouts, incl. Urdu RTL and the widest tables.
  for (const width of [320, 390]) {
    const { context, page } = await open(width);
    for (const path of ["/settlement", "/ur/settlement", "/settlement/settlement-ilr-overview", "/ur/settlement/settlement-earned-settlement-tracker",
      "/hi/settlement/settlement-british-citizenship", "/en/settlement/settlement-application-process", "/work-visa", "/family-visa"]) {
      await page.goto(`${baseURL}${path}`);
      await page.waitForSelector("h1");
      await page.waitForTimeout(300);
      ok(await noOverflow(page), `${width}px ${path} no horizontal overflow`);
    }
    await page.goto(`${baseURL}/ur/settlement/settlement-earned-settlement-tracker`);
    await page.screenshot({ path: `${screenshots}/ur-tracker-${width}.png`, fullPage: true });
    await context.close();
  }
  console.log(`settlement browser checks passed: ${checks}`);
} finally {
  await browser.close();
}
