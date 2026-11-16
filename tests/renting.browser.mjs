// Renting & Moving In (Phase 1) on the normal local site (FRONTEND_URL,
// default http://127.0.0.1:5173) against the real local backend. Covers: hub
// in five locales with the six Guides linked; the journey (scope question,
// out-of-scope notice with a way on, three branches, ten steps, key points
// read from the published Guides, checklist progress, nothing written to
// storage); every Guide in five locales with evidence and in-text links;
// navigation from Home, header and footer; Urdu RTL; 320px and 390px.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-renting";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const LOCALES = [["", "zh-CN", "ltr"], ["/zh-TW", "zh-TW", "ltr"], ["/en", "en", "ltr"], ["/ur", "ur", "rtl"], ["/hi", "hi", "ltr"]];
const SLUGS = [
  "renting-letting-agent-overview", "renting-finding-viewing", "renting-referencing-checks",
  "renting-guarantors", "renting-deposits-fees", "renting-tenancy-agreement",
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

/** Answers the journey: in scope, then the given branch; waits for key points. */
async function answer(page, branch) {
  await page.locator('input[name="renting-scope"][value="england-agent"]').check();
  await page.locator(`input[name="renting-branch"][value="${branch}"]`).check();
  await page.waitForSelector(".renting-step");
  await page.waitForFunction(() => !document.querySelector(".renting-facts-status"), null, { timeout: 15000 });
}

try {
  // Hub and journey in five locales.
  for (const [prefix, locale, dir] of LOCALES) {
    const { context, page, errors } = await open();
    await page.goto(`${baseURL}${prefix}/renting`);
    await page.waitForSelector(".work-guide-link");
    ok((await page.locator("html").getAttribute("dir")) === dir, `${locale} dir`);
    ok((await page.locator(".work-guide-card").count()) === 6, `${locale} 6 cards`);
    ok((await page.locator(".work-guide-link").count()) === 6, `${locale} 6 linked Guides`);
    ok((await page.locator(".renting-later-list li").count()) === 6, `${locale} 6 Phase 2 extension points`);
    ok((await page.locator(".renting-later-list a").count()) === 0, `${locale} extension points are not links`);
    ok((await page.locator(".renting-step").count()) === 0, `${locale} steps wait for answers`);

    // Out of scope: a notice with a way on, and a way back.
    await page.locator('input[name="renting-scope"][value="other-nation"]').check();
    await page.waitForSelector(".renting-scope-notice");
    ok((await page.locator(".renting-step").count()) === 0, `${locale} no steps out of scope`);
    const overview = await page.locator(".renting-scope-notice a").getAttribute("href");
    ok(overview === `${prefix}/renting/renting-letting-agent-overview`, `${locale} scope notice links the overview (${overview})`);
    await page.locator(".renting-scope-notice .renting-reset").click();
    ok((await page.locator('input[name="renting-scope"]:checked').count()) === 0, `${locale} answers reset`);

    for (const branch of ["student-newcomer", "employed-family", "other"]) {
      await answer(page, branch);
      ok((await page.locator(".renting-step").count()) === 10, `${locale} ${branch} 10 steps`);
      const order = await page.locator(".renting-step").evaluateAll((els) => els.map((el) => el.dataset.step));
      ok(order.join() === "listing,contact,viewing,apply,referencing,guarantor,agreement,payments,sign,keys", `${locale} order ${order}`);
      ok((await page.locator(".renting-guide-link").count()) === 10, `${locale} ${branch} every step links its Guide`);
      ok((await page.locator(".renting-unpublished").count()) === 0, `${locale} ${branch} no unpublished steps`);
      const facts = await page.locator(".renting-fact-list li").count();
      ok(facts >= 30, `${locale} ${branch} key points from Guides (${facts})`);
      const kinds = new Set(await page.locator(".renting-fact-list li").evaluateAll((els) => els.map((el) => el.dataset.kind)));
      ok(["legal", "agent", "optional", "help"].every((kind) => kinds.has(kind)), `${locale} ${branch} four kinds shown`);
      const hasNoCredit = (await page.locator('[data-evidence="no-uk-history"]').count()) > 0;
      ok(hasNoCredit === (branch === "student-newcomer"), `${locale} ${branch} no-UK-credit help only for students/newcomers`);
      ok((await page.locator('[data-step="guarantor"] [data-evidence="guarantor-is-condition"][data-kind="agent"]').count()) === 1,
        `${locale} ${branch} guarantor shown as agent practice`);
    }
    // Checklist progress, held in memory only.
    const before = await page.locator(".renting-progress").innerText();
    await page.locator('[data-task="listing-rent-stated"]').check();
    await page.locator('[data-task="keys-date"]').check();
    const after = await page.locator(".renting-progress").innerText();
    ok(before !== after && /2/.test(after), `${locale} progress updates (${before} → ${after})`);
    ok((await page.evaluate(() => localStorage.length + sessionStorage.length)) === 0, `${locale} journey stores nothing`);
    ok((await page.locator('main input[type="text"], main input[type="file"], main textarea').count()) === 0, `${locale} no personal-data inputs`);
    // A step link opens the Guide in the same locale.
    await page.locator('[data-step="guarantor"] .renting-guide-link').click();
    await page.waitForSelector("h1");
    ok(page.url().endsWith(`${prefix}/renting/renting-guarantors`), `${locale} step link → ${page.url()}`);
    ok(errors.length === 0, `${locale} hub errors ${errors}`);
    await context.close();
  }

  // Every Guide in every locale renders with evidence and in-text links.
  for (const [prefix, locale] of LOCALES) {
    const { context, page, errors } = await open();
    for (const slug of SLUGS) {
      const res = await page.goto(`${baseURL}${prefix}/renting/${slug}`);
      ok(res.ok(), `${locale} ${slug} status`);
      await page.waitForSelector("h1");
      await page.waitForFunction(() => document.querySelectorAll(".evidence-toggle").length > 5);
      const h1 = await page.locator("h1").first().innerText();
      ok(h1.length > 5 && !/找不到|没有找到|not found/i.test(h1), `${locale} ${slug} h1 "${h1}"`);
      const refs = await page.locator("a.guide-reference").count();
      ok(refs >= 1, `${locale} ${slug} in-text Guide references linked (${refs})`);
      if (slug === "renting-deposits-fees") {
        await page.locator(".evidence-toggle").first().click();
        ok((await page.locator('main a[href^="https://www.gov.uk/"]').count()) >= 1, `${locale} evidence shows a GOV.UK source`);
      }
    }
    ok(errors.length === 0, `${locale} guide errors ${errors}`);
    await context.close();
  }

  // Navigation: home topic card, header and footer; other locales.
  {
    const { context, page } = await open();
    await page.goto(`${baseURL}/`);
    for (const where of ["main", "header", "footer"]) {
      const n = await page.locator(`${where} a[href="/renting"]`).count();
      ok(n >= 1, `home ${where} links to /renting (${n})`);
    }
    for (const locale of ["zh-TW", "en", "ur", "hi"]) {
      await page.goto(`${baseURL}/${locale}`);
      ok((await page.locator(`header a[href="/${locale}/renting"]`).count()) >= 1, `${locale} header link`);
    }
    // Neighbouring sections preserved.
    const t = await page.goto(`${baseURL}/travel`);
    ok(t.ok() && (await page.locator(".travel-tabs [role=tab]").count()) === 3, "travel page intact");
    await page.goto(`${baseURL}/family-visa`);
    await page.waitForSelector("h1");
    ok((await page.locator("h1").count()) >= 1, "family visa hub intact");
    await context.close();
  }

  // Mobile layouts with the journey open, incl. Urdu RTL.
  for (const width of [320, 390]) {
    const { context, page } = await open(width);
    for (const [prefix, locale] of LOCALES) {
      await page.goto(`${baseURL}${prefix}/renting`);
      await page.waitForSelector(".work-guide-link");
      await answer(page, "student-newcomer");
      ok(await noOverflow(page), `${width}px ${locale} hub+journey no horizontal overflow`);
      if (locale === "ur" || locale === "zh-CN") await page.screenshot({ path: `${screenshots}/hub-${locale}-${width}.png`, fullPage: true });
    }
    for (const path of ["/renting/renting-deposits-fees", "/ur/renting/renting-tenancy-agreement", "/hi/renting/renting-referencing-checks",
      "/en/renting/renting-guarantors", "/zh-TW/renting/renting-finding-viewing"]) {
      await page.goto(`${baseURL}${path}`);
      await page.waitForSelector("h1");
      await page.waitForTimeout(300);
      ok(await noOverflow(page), `${width}px ${path} no horizontal overflow`);
    }
    await context.close();
  }
  console.log(`renting browser checks passed: ${checks}`);
} finally {
  await browser.close();
}
