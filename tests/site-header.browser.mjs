// Site header navigation regression checks (all five locales, phone to wide
// desktop). Guards the defect where sections fell off a horizontally
// scrolling bar: every launched section must be reachable from the header,
// nothing may overflow or clip, and the menus must work by mouse, touch and
// keyboard, including right-to-left (Urdu).
//
//   PLAYWRIGHT_MODULE=… FRONTEND_URL=http://127.0.0.1:5179 npm run test:header:browser
import assert from "node:assert/strict";
import { HOME_TOPICS, topicHref } from "../src/home/topics.ts";
import { GUIDE_LOCALES, guideHomePath, guideRoutePath } from "../src/guides/locales.ts";
import { SITE_UI } from "../src/guides/siteUi.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const browser = await chromium.launch({ headless: true });
const WIDTHS = [320, 390, 768, 1024, 1440, 1920];
const WIDE = 1024; // from here the bar shows one menu per group, when it fits
let checks = 0;

/** Expected header destinations: every launched section, per locale. */
const expectedTopics = (locale) =>
  HOME_TOPICS.map((topic) => topicHref(topic, locale)).filter(Boolean).sort();

async function open(width, path, { touch = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: false });
  // The header never depends on data; keep pages quiet and deterministic.
  await context.route("**/api/**", (route) => route.fulfill({ status: 503, body: "{}" }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL + path);
  await page.locator(".masthead").waitFor();
  return { page, context, errors };
}

/** Page never scrolls sideways; every given element is inside the viewport and not clipped. */
async function assertFits(page, selector, label) {
  const report = await page.evaluate((sel) => {
    const vw = document.documentElement.clientWidth;
    const pageOverflow = document.documentElement.scrollWidth - vw;
    const bad = [];
    for (const el of document.querySelectorAll(sel)) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.left < -0.5 || r.right > vw + 0.5) bad.push(`${el.textContent.trim()} outside viewport ${r.left}..${r.right}/${vw}`);
      if (el.scrollWidth > el.clientWidth + 1) bad.push(`${el.textContent.trim()} clipped ${el.scrollWidth}>${el.clientWidth}`);
    }
    return { pageOverflow, bad };
  }, selector);
  assert.ok(report.pageOverflow <= 0, `${label}: page scrolls sideways by ${report.pageOverflow}px`);
  assert.deepEqual(report.bad, [], label);
  checks++;
}

/** Wide bar: the top-level items never run under the search / About actions. */
async function assertBarClear(page, label) {
  const overlap = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".masthead-brand, .masthead-top")].map((e) => e.getBoundingClientRect());
    const actions = document.querySelector(".masthead-actions").getBoundingClientRect();
    const rtl = document.documentElement.dir === "rtl";
    return items
      .map((r) => (rtl ? actions.right - r.left : r.right - actions.left))
      .filter((overlapPx) => overlapPx > 0);
  });
  assert.deepEqual(overlap, [], `${label}: nav overlaps header actions`);
  checks++;
}

const hrefs = (page, scope) =>
  page.locator(`${scope} a.masthead-link`).evaluateAll((links) => links.map((a) => a.getAttribute("href")));

// 1. Layout and reachability: every locale, every width, key pages.
for (const locale of GUIDE_LOCALES) {
  const ui = SITE_UI[locale];
  const pages = [guideHomePath(locale), guideRoutePath(locale, "renting"), guideRoutePath(locale, "family-visa"), guideRoutePath(locale, "travel")];
  for (const width of WIDTHS) {
    for (const path of pages) {
      const label = `${locale} ${width}px ${path}`;
      const { page, context, errors } = await open(width, path);
      await assertFits(page, ".masthead-brand, .masthead-top, .masthead-menu-button, .masthead-search, .masthead-about, .masthead-language select", label);
      const found = [];
      // From 1024px the bar is used when it fits; it must fall back to the
      // Menu layout (never overflow) when it does not. From 1440px it must fit.
      const wide = (await page.locator(".masthead-bar").count()) > 0;
      if (width < WIDE) assert.ok(!wide, `${label}: narrow screens use the Menu`);
      const languageInHeader = (await page.locator(".masthead-language").count()) > 0;
      if (width >= 1440 || (width >= WIDE && !languageInHeader))
        assert.ok(wide, `${label}: wide bar expected`);
      if (wide) {
        assert.equal(await page.locator(".masthead-menu-button").count(), 0, label);
        await assertBarClear(page, label);
        const buttons = page.locator(".masthead-group-button");
        assert.equal(await buttons.count(), Object.keys(ui.navGroups).length, label);
        for (let i = 0; i < (await buttons.count()); i++) {
          await buttons.nth(i).click();
          assert.equal(await buttons.nth(i).getAttribute("aria-expanded"), "true", label);
          const panel = page.locator(`[id="${await buttons.nth(i).getAttribute("aria-controls")}"]`);
          assert.ok(await panel.isVisible(), `${label} panel ${i}`);
          // Only one menu open at a time.
          assert.equal(await page.locator(".masthead-panel:not([hidden])").count(), 1, label);
          await assertFits(page, ".masthead-panel:not([hidden]), .masthead-panel:not([hidden]) .masthead-link, .masthead-panel:not([hidden]) .masthead-upcoming > span", `${label} panel ${i}`);
          found.push(...(await hrefs(page, ".masthead-panel:not([hidden])")));
        }
        await page.keyboard.press("Escape");
        assert.equal(await page.locator(".masthead-panel:not([hidden])").count(), 0, `${label} Escape`);
      } else {
        const menu = page.locator(".masthead-menu-button");
        assert.ok(await menu.isVisible(), label);
        await menu.click();
        assert.equal(await menu.getAttribute("aria-expanded"), "true", label);
        await assertFits(page, ".masthead-sheet, .masthead-sheet .masthead-link, .masthead-sheet .masthead-upcoming > span, .masthead-group-label", `${label} sheet`);
        found.push(...(await hrefs(page, ".masthead-sheet")));
        assert.ok(found.includes(guideHomePath(locale)), `${label}: Home in menu`);
        assert.ok(found.some((href) => href.endsWith("#about")), `${label}: About in menu`);
      }
      // Every launched section, and nothing unlaunched, is linked.
      const topicLinks = [...new Set(found)].filter((href) => href !== guideHomePath(locale) && !href.includes("#")).sort();
      assert.deepEqual(topicLinks, expectedTopics(locale), `${label}: section links`);
      // Upcoming sections are listed but never as links.
      for (const topic of HOME_TOPICS.filter((t) => !topicHref(t, locale)))
        assert.equal(await page.locator(`.masthead a:has-text("${ui.topics[topic.id].title}")`).count(), 0, `${label}: ${topic.id} must not be linked`);
      // Search stays one tap away in every layout.
      assert.ok(await page.locator(".masthead-search").isVisible(), `${label}: search`);
      if (path === guideHomePath(locale)) assert.ok(languageInHeader && (await page.locator(".masthead-language select").isVisible()), `${label}: language`);
      assert.deepEqual(errors, [], label);
      await context.close();
    }
  }
}

// 2. Keyboard on the wide bar (left-to-right and right-to-left).
for (const locale of ["en", "ur"]) {
  const { page, context } = await open(1440, guideRoutePath(locale, "renting"));
  const label = `keyboard ${locale}`;
  const focused = () => page.evaluate(() => document.activeElement?.className + "|" + document.activeElement?.getAttribute("href"));
  await page.locator(".masthead-home").focus();
  // The arrow pointing along the reading direction moves forward.
  await page.keyboard.press(locale === "ur" ? "ArrowLeft" : "ArrowRight");
  const visas = page.locator(".masthead-group-button").first();
  assert.ok(await visas.evaluate((el) => el === document.activeElement), `${label}: arrow to next item`);
  await page.keyboard.press(locale === "ur" ? "ArrowRight" : "ArrowLeft");
  assert.ok((await focused()).includes("masthead-home"), `${label}: arrow back to Home`);
  await page.keyboard.press(locale === "ur" ? "ArrowLeft" : "ArrowRight");
  // Enter opens; Down/Up move through the links; Escape closes and returns focus.
  await page.keyboard.press("Enter");
  assert.equal(await visas.getAttribute("aria-expanded"), "true", label);
  await page.keyboard.press("Escape");
  assert.equal(await visas.getAttribute("aria-expanded"), "false", label);
  assert.ok(await visas.evaluate((el) => el === document.activeElement), `${label}: focus back on button`);
  await page.keyboard.press("ArrowDown");
  assert.equal(await visas.getAttribute("aria-expanded"), "true", `${label}: ArrowDown opens`);
  const panel = page.locator(".masthead-panel:not([hidden]) a");
  await page.waitForFunction(() => document.activeElement?.closest(".masthead-panel"));
  assert.equal(await focused(), "masthead-link|" + (await panel.first().getAttribute("href")), `${label}: first link`);
  await page.keyboard.press("ArrowUp");
  assert.equal(await focused(), "masthead-link|" + (await panel.last().getAttribute("href")), `${label}: wraps to last`);
  await page.keyboard.press("Home");
  assert.equal(await focused(), "masthead-link|" + (await panel.first().getAttribute("href")), `${label}: Home key`);
  // Tab past the last link closes the menu.
  const count = await panel.count();
  for (let i = 0; i < count; i++) await page.keyboard.press("Tab");
  assert.equal(await visas.getAttribute("aria-expanded"), "false", `${label}: Tab out closes`);
  // Visible focus indicator on the group buttons.
  const living = page.locator(".masthead-group-button").last();
  await living.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  assert.notEqual(await living.evaluate((el) => getComputedStyle(el).outlineStyle), "none", `${label}: focus visible`);
  // The current section is marked.
  assert.match((await living.getAttribute("class")) ?? "", /is-current/, `${label}: current group`);
  await living.click();
  assert.equal(await page.locator('.masthead-panel:not([hidden]) a[aria-current="page"]').getAttribute("href"), guideRoutePath(locale, "renting"), label);
  // Clicking outside closes.
  await page.mouse.click(700, 600);
  assert.equal(await living.getAttribute("aria-expanded"), "false", `${label}: outside click closes`);
  // Choosing a section navigates and closes the menu.
  await living.click();
  await page.locator(`.masthead-panel a[href="${guideRoutePath(locale, "travel")}"]`).click();
  await page.waitForURL(baseURL + guideRoutePath(locale, "travel"));
  assert.equal(await page.locator(".masthead-panel:not([hidden])").count(), 0, `${label}: closes on navigation`);
  await context.close();
  checks += 12;
}

// 3. Touch and the narrow-screen menu (no hover anywhere).
for (const locale of ["zh-CN", "ur"]) {
  const { page, context } = await open(390, guideHomePath(locale), { touch: true });
  const label = `touch ${locale}`;
  const menu = page.locator(".masthead-menu-button");
  await menu.tap();
  assert.equal(await menu.getAttribute("aria-expanded"), "true", label);
  // Escape closes and returns focus to the Menu button.
  await page.locator(".masthead-sheet a").first().focus();
  await page.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("aria-expanded"), "false", `${label}: Escape`);
  assert.ok(await menu.evaluate((el) => el === document.activeElement), `${label}: focus back on Menu`);
  // Tapping outside closes.
  await menu.tap();
  await page.touchscreen.tap(200, 800);
  assert.equal(await menu.getAttribute("aria-expanded"), "false", `${label}: outside tap closes`);
  // Tapping a section navigates and closes.
  await menu.tap();
  await page.locator(`.masthead-sheet a[href="${guideRoutePath(locale, "family-visa")}"]`).tap();
  await page.waitForURL(baseURL + guideRoutePath(locale, "family-visa"));
  assert.equal(await menu.getAttribute("aria-expanded"), "false", `${label}: closes on navigation`);
  // The language selector still switches language.
  await page.goto(baseURL + guideHomePath(locale));
  const next = locale === "ur" ? "hi" : "en";
  await page.locator(".masthead-language select").selectOption(next);
  await page.waitForURL(baseURL + guideHomePath(next));
  assert.equal(await page.locator(".masthead-menu-button span").textContent(), SITE_UI[next].menu, `${label}: menu relabelled`);
  await context.close();
  checks += 7;
}

await browser.close();
console.log(`site header: ${checks} checks passed`);
