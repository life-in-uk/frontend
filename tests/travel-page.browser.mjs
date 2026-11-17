// Travel page (/travel) on the normal local site. Runs against the real dev
// server and backend (FRONTEND_URL, default http://127.0.0.1:5173), with
// mocked travel APIs only where a check needs fresh data or a pending
// request. Covers: routes in five locales, navigation from Home, header,
// footer and topic card, the three tools on the real page, keyboard tabs,
// stale-data protection, Rail unavailable, official fallback links,
// language switching, Urdu RTL and mobile layout.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-travel-page";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const LOCALES = [
  ["/zh-CN", "zh-CN", "交通出行", "ltr"],
  ["/zh-TW", "zh-TW", "交通出行", "ltr"],
  ["/en", "en", "Travel and transport", "ltr"],
  ["/ur", "ur", "سفر اور ٹرانسپورٹ", "rtl"],
  ["/hi", "hi", "यात्रा और परिवहन", "ltr"],
];
const OFFICIAL = [
  "https://tfl.gov.uk/tube-dlr-overground/status/",
  "https://nationalhighways.co.uk/travel-updates/",
  "https://www.nationalrail.co.uk/status-and-disruptions/",
];
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

async function open(width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  // Official provider sites are never contacted by the page itself.
  const external = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => {
    external.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, errors, external };
}

try {
  {
    // Routes in all five locales, with SEO, language, direction and fallbacks.
    for (const [prefix, locale, title, dir] of LOCALES) {
      const { context, page, errors } = await open();
      await page.goto(`${baseURL}${prefix}/travel`);
      await page.locator(".travel-page h1").waitFor();
      assert.equal(await page.locator("h1").innerText(), title, locale);
      assert.equal(await page.evaluate(() => document.documentElement.dir), dir, locale);
      assert.match(await page.title(), new RegExp(`^${title} · Life in UK$`));
      assert.equal(await page.locator('link[rel="alternate"][hreflang]').count() >= 5, true, `${locale} hreflang`);
      assert.equal(await page.locator('meta[name="robots"][content*="noindex"]').count(), 0);
      assert.equal(await page.locator('.masthead-link[aria-current="page"]').getAttribute("href"), `${prefix}/travel`);
      assert.deepEqual(
        await page.locator(".travel-official a").evaluateAll((links) => links.map((a) => [a.href, a.target, a.rel])),
        OFFICIAL.map((href) => [href, "_blank", "noopener noreferrer"]),
      );
      assert.equal(await page.locator(".travel-tab").count(), 3);
      if (!["zh-CN", "zh-TW"].includes(locale))
        assert.doesNotMatch(await page.locator("main").innerText(), /[一-鿿]/, `${locale}: no Chinese`);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log("PASS routes: /travel and /{zh-TW,en,ur,hi}/travel, titles, lang/dir, hreflang, header current, official links (new tab)");
  }
  {
    // Navigation into /travel from Home (topic card and transport panel), header and footer.
    const { context, page } = await open();
    await page.goto(`${baseURL}/en`);
    await page.locator('.topic-card a[href="/en/travel"]').click();
    await page.waitForURL(`${baseURL}/en/travel`);
    await page.goto(`${baseURL}/en`);
    await page.locator('.transport-item[data-tool="roads"]').click();
    await page.waitForURL(`${baseURL}/en/travel#roads`);
    assert.equal(await page.locator('.travel-tab[aria-selected="true"]').getAttribute("data-tool"), "roads");
    await page.locator(".travel-page .roads-card").waitFor();
    await page.goto(`${baseURL}/zh-CN/money`);
    // Travel sits in a header menu: open it (Menu on narrow screens, the group otherwise).
    const menu = page.locator(".masthead-menu-button");
    if (await menu.count()) await menu.click();
    else await page.locator('.masthead-group-button:has(+ .masthead-panel a[href="/zh-CN/travel"])').click();
    await page.locator('.masthead-link[href="/zh-CN/travel"]').click();
    await page.waitForURL(`${baseURL}/zh-CN/travel`);
    await page.locator(".travel-page h1").waitFor();
    await page.goto(`${baseURL}/hi/health`);
    await page.locator('.site-footer a[href="/hi/travel"]').click();
    await page.waitForURL(`${baseURL}/hi/travel`);
    await page.locator(".travel-page h1").waitFor();
    await context.close();
    console.log("PASS navigation: Home topic card, Home transport entry (#roads), header (zh-CN), footer (hi)");
  }
  {
    // Real local backend. Underground follows the stored snapshot's real age:
    // with the local TfL refresh running it is fresh and must match the API
    // exactly; otherwise it is older than 15 minutes and must be hidden.
    const { context, page, errors, external } = await open();
    const snapshot = await (await fetch(`${baseURL}/api/travel/underground`)).json();
    // Leave a margin so the snapshot cannot cross the 15-minute limit mid-check.
    const fresh = Date.now() - Date.parse(snapshot.observedAt) < 14 * 60_000;
    await page.goto(`${baseURL}/en/travel`);
    const underground = page.locator(".travel-page .underground-card");
    if (fresh) {
      await underground.locator(".underground-line").first().waitFor();
      assert.equal(await underground.locator(".travel-stale").count(), 0);
      assert.equal(await underground.locator(".underground-line").count(), snapshot.lines.length);
      for (const line of snapshot.lines) {
        const item = underground.locator(".underground-line", { has: page.locator(`h3:text-is("${line.lineName}")`) });
        assert.equal(await item.count(), 1, line.lineName);
        for (const status of line.statuses) assert.match(await item.innerText(), new RegExp(status.description), line.lineName);
      }
      assert.equal(await underground.locator(`.provenance time[datetime="${snapshot.observedAt}"]`).count(), 1);
    } else {
      await underground.locator(".travel-stale").waitFor();
      assert.match(await underground.locator(".travel-stale").innerText(), /No up-to-date London Underground line status/);
      assert.equal(await underground.locator(".underground-line, .underground-summary").count(), 0);
    }
    assert.match(await underground.innerText(), /Powered by TfL Open Data/);
    assert.equal(await underground.locator('a[href="https://tfl.gov.uk/tube-dlr-overground/status/"]').count(), 1);
    // Roads: search via a mocked place list is not needed; use a device location.
    await page.locator('.travel-tab[data-tool="roads"]').click();
    const roads = page.locator(".travel-page .roads-card");
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 });
    await roads.locator(".roads-locate").click();
    // Roads also follows the stored snapshot's real age (10-minute refresh, 15-minute limit).
    const roadsReply = await fetch(`${baseURL}/api/travel/roads?lat=51.5074&lon=-0.1278`);
    const roadsData = roadsReply.ok ? await roadsReply.json() : null;
    const roadsFresh = roadsData !== null && Date.now() - Date.parse(roadsData.snapshotAt) < 14 * 60_000;
    if (roadsFresh) {
      await roads.locator(".roads-summary").waitFor();
      assert.equal(await roads.locator(".travel-stale").count(), 0);
      assert.equal(await roads.locator(".roads-item").count(), roadsData.disruptions.length);
    } else {
      await roads.locator(".travel-stale").waitFor();
      assert.equal(await roads.locator(".roads-summary, .roads-item").count(), 0);
      assert.match(await roads.locator(".travel-stale").innerText(), /more than 15 minutes ago/);
    }
    assert.equal(await roads.locator('a[href="https://nationalhighways.co.uk/travel-updates/"]').count(), 1);
    // Rail is shown by default in development (no query parameter); production
    // builds show "Not yet available" instead (travel-production-isolation).
    await page.locator('.travel-tab[data-tool="rail"]').click();
    const rail = page.locator(".travel-page .rail-card");
    await rail.waitFor();
    assert.equal(await page.locator(".travel-rail-unavailable").count(), 0);
    assert.equal(await page.locator('.travel-tab[data-tool="rail"] .travel-tab-badge').count(), 0);
    // One live board for King's Cross through the local backend; the page must show
    // exactly what the backend returned (or an honest unavailable state).
    const railReply = page.waitForResponse((r) => r.url().includes("/api/rail/stations/KGX/disruptions"));
    await rail.locator(".rail-search-input input").fill("KGX");
    await rail.locator(".rail-station-results button").first().click();
    await rail.locator(".rail-check").click();
    const railResponse = await railReply;
    let railState;
    if (railResponse.status() === 200) {
      const board = await railResponse.json();
      await rail.locator(".rail-results").waitFor();
      assert.equal(await rail.locator(".rail-list > li").count(), board.disruptions.length);
      assert.match(await rail.locator(".rail-results-heading").innerText(), new RegExp(board.stationName));
      railState = `live board, ${board.disruptions.length} disruptions`;
    } else {
      await rail.getByText("Rail information is unavailable. Please try again later.").waitFor();
      railState = `backend ${railResponse.status()}, unavailable shown`;
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await context.close();
    console.log(`PASS real backend: Underground ${fresh ? "fresh, matches the API" : "stale, hidden"}; Roads ${roadsFresh ? "fresh, matches the API" : "stale, hidden"}; official fallbacks; Rail (no query parameter): ${railState}`);
  }
  {
    // Fresh (mocked) data is shown, localized chrome around untranslated provider text.
    const now = new Date(Date.now() - 60_000).toISOString();
    for (const [prefix, locale, , , summary] of [
      ["", "zh-CN", , , /2 条线路中有 1 条报告异常/],
      ["/ur", "ur", , , /2 میں سے 1 لائنوں پر مسائل رپورٹ ہوئے/],
      ["/hi", "hi", , , /2 में से 1 लाइनों पर समस्याएँ रिपोर्ट हुईं/],
    ]) {
      const { context, page } = await open(390);
      await context.route("**/api/travel/underground", (route) =>
        route.fulfill({ json: { observedAt: now, lines: [
          { lineId: "victoria", lineName: "Victoria", statuses: [{ severity: 9, description: "Minor Delays", reason: "Signal failure." }] },
          { lineId: "central", lineName: "Central", statuses: [{ severity: 10, description: "Good Service", reason: null }] },
        ] } }));
      await page.goto(`${baseURL}${prefix}/travel#underground`);
      const card = page.locator(".travel-page .underground-card");
      await card.locator(".underground-line").first().waitFor();
      assert.match(await card.locator(".underground-summary").innerText(), summary, locale);
      // Provider text is kept in English, marked as such.
      assert.equal(await card.locator('.underground-description[lang="en"]', { hasText: "Minor Delays" }).count(), 1);
      assert.equal(await card.locator('h3[lang="en"]', { hasText: "Victoria" }).count(), 1);
      assert.equal(await card.locator(".travel-stale").count(), 0);
      assert.equal(await noOverflow(page), true, `${locale} overflow`);
      await context.close();
    }
    console.log("PASS fresh data: line status shown with localized summary (zh-CN, ur, hi); provider text untranslated");
  }
  {
    // Keyboard tabs: arrows (reversed in RTL), Home/End; panels keep state.
    const { context, page } = await open();
    await page.goto(`${baseURL}/en/travel`);
    await page.locator('.travel-tab[data-tool="underground"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.tool), "roads");
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.tool), "rail");
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.tool), "underground");
    assert.equal(new URL(page.url()).hash, "#underground");
    await page.goto(`${baseURL}/ur/travel`);
    await page.locator('.travel-tab[data-tool="underground"]').focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.tool), "roads", "RTL: left moves forward");
    await context.close();
    console.log("PASS keyboard tabs: arrows (RTL-aware), Home/End, hash kept in sync");
  }
  {
    // Language switching from the header keeps the Travel page.
    const { context, page } = await open();
    await page.goto(`${baseURL}/zh-CN/travel`);
    for (const [next, path] of [["en", "/en/travel"], ["ur", "/ur/travel"], ["zh-CN", "/zh-CN/travel"]]) {
      await page.locator(".masthead-language select").selectOption(next);
      await page.waitForURL(`${baseURL}${path}`);
      await page.locator(".travel-page h1").waitFor();
    }
    await context.close();
    console.log("PASS language switching keeps /travel (zh-CN → en → ur → zh-CN)");
  }
  {
    // Mobile and Urdu RTL: no horizontal overflow, 44px targets, screenshots.
    for (const width of [390, 320]) {
      for (const [prefix, locale] of [["/ur", "ur"], ["", "zh-CN"], ["/hi", "hi"]]) {
        const { context, page } = await open(width);
        await page.goto(`${baseURL}${prefix}/travel`);
        await page.locator(".travel-page .underground-card").waitFor();
        await page.waitForLoadState("networkidle");
        assert.equal(await noOverflow(page), true, `${locale} ${width}`);
        const small = await page
          .locator(".travel-tab, .travel-official a, .transport-item, .masthead a")
          .evaluateAll((els) => els.filter((el) => el.getClientRects().length && el.getBoundingClientRect().height < 44).map((el) => el.textContent));
        assert.deepEqual(small, [], `${locale} ${width} touch targets`);
        await page.screenshot({ path: `${screenshots}/travel${prefix.replace("/", "-") || "-zh-CN"}-${width}.png`, fullPage: true });
        await context.close();
      }
    }
    console.log(`PASS mobile 390/320 (ur RTL, zh-CN, hi): no overflow, 44px targets; screenshots in ${screenshots}`);
  }
} finally {
  await browser.close();
}
