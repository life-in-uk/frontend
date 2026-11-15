// Rail disruption checker on the Travel page. Rail is not released: it is
// shown by default in development (see travel/tools.ts). The
// card follows the page language (/travel = zh-CN, /en/travel = English, …),
// so each language is checked on its own localized page. APIs are mocked.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const disclaimer = {
  en: "Rail information provided by National Rail. Live information may change and may be incomplete. Please confirm your journey with National Rail or your train operator before travelling.",
  zh: "铁路信息来源：National Rail。实时信息可能发生变化或存在遗漏。出行前请通过 National Rail 或列车运营商确认最新情况。",
};
async function checkDisclaimer(card, language) {
  const text = card.locator(".rail-disclaimer");
  assert.equal(await text.count(), 1);
  assert.equal(await text.innerText(), disclaimer[language]);
  assert.equal(await card.getByRole("link", { name: "National Rail", exact: true }).count(), 1);
  assert.equal(await text.getByRole("link").getAttribute("href"), "https://www.nationalrail.co.uk/");
}
const partial = [
  { status: "partially_cancelled", delayMinutes: null, scheduledTime: "10:00", estimatedTime: "On time", locations: [], platform: null, operator: null, reason: null, checkDelayRepay: true, affectedStops: [{ name: "Derby", crs: "DBY" }] },
  { status: "cancelled", delayMinutes: null, scheduledTime: "10:10", estimatedTime: "Cancelled", locations: [], platform: null, operator: null, reason: null, checkDelayRepay: true, affectedStops: [] },
  { status: "delayed", delayMinutes: 15, scheduledTime: "10:20", estimatedTime: "10:35", locations: [], platform: null, operator: null, reason: null, checkDelayRepay: true, affectedStops: [] },
  { status: "partially_cancelled", delayMinutes: null, scheduledTime: "10:30", estimatedTime: "On time", locations: [], platform: null, operator: null, reason: "Stop reason", checkDelayRepay: true, affectedStops: [] },
];

/** Opens the Rail tab on a localized Travel page with mocked Rail responses. */
async function openRail(prefix, handler) {
  const page = await browser.newPage();
  await page.clock.install();
  const state = { requests: 0 };
  await page.route("**/api/rail/**", async (route) => {
    state.requests++;
    assert.match(route.request().url(), /\/SHF\/disruptions\?direction=(arrivals|departures)/);
    return handler(route, new URL(route.request().url()).searchParams.get("direction"));
  });
  await page.goto(`${baseURL}${prefix}/travel#rail`);
  const card = page.locator(".travel-page .rail-card");
  await card.waitFor();
  return { page, card, state };
}
const board = (direction, disruptions = []) => ({ json: { stationName: "Sheffield", crs: "SHF", generatedAt: "2026-10-27T13:45:27Z", direction, unknownTimingCount: 0, disruptions } });

try {
  {
    // English: deferred requests, loading, empty, error, partial results, repay, departures.
    let release;
    const wait = new Promise((resolve) => { release = resolve; });
    let mode = "loading";
    const { page, card, state } = await openRail("/en", async (route, direction) => {
      if (mode === "loading") { await wait; mode = "empty"; }
      if (mode === "error") return route.fulfill({ status: 503, body: "upstream error" });
      return route.fulfill(board(direction, mode === "partial" ? partial : []));
    });
    await checkDisclaimer(card, "en");
    assert.equal(state.requests, 0);
    assert.equal(await card.getByLabel("Board").inputValue(), "arrivals");
    await card.getByRole("textbox", { name: "Search station" }).fill("kgx");
    await card.getByRole("button", { name: /Kings Cross/ }).waitFor();
    await card.getByRole("textbox", { name: "Search station" }).fill("shf");
    await card.getByRole("button", { name: "Sheffield", exact: true }).click();
    assert.equal(state.requests, 0);
    await card.getByRole("button", { name: "Check disruptions" }).click();
    await card.getByText("Loading rail information…").waitFor();
    release();
    await card.getByText("No reported delays of 10 minutes or more or cancellations in the available station board.").waitFor();
    await card.getByText("Results cover only the services returned on the station board, not every train or the entire day.").waitFor();
    mode = "error";
    await card.getByRole("button", { name: "Refresh" }).click();
    await card.getByText("Rail information is unavailable. Please try again later.").waitFor();
    assert.equal(await card.getByText("No reported delays of 10 minutes or more").count(), 0);
    mode = "partial";
    await card.getByRole("button", { name: "Check disruptions" }).click();
    await card.getByText("Partially cancelled").first().waitFor();
    await card.getByText("Affected stops are not available.").waitFor();
    await card.getByText("Stop reason").waitFor();
    await card.getByText("Delayed · 15 min").waitFor();
    await card.getByText("Affected stops: Derby").waitFor();
    assert.equal(await card.getByRole("link", { name: "Check Delay Repay" }).count(), 4);
    assert.equal(await card.getByRole("link", { name: "Check Delay Repay" }).first().getAttribute("href"), "https://www.nationalrail.co.uk/help-and-assistance/compensation-and-refunds/");
    const prior = state.requests;
    await card.getByLabel("Board").selectOption("departures");
    assert.equal(state.requests, prior);
    await card.getByRole("button", { name: "Check disruptions" }).click();
    await card.getByText("To: Unavailable").first().waitFor();
    assert.equal(state.requests, prior + 1);
    const afterChecks = state.requests;
    await page.clock.fastForward(120000);
    assert.equal(state.requests, afterChecks, "no background Rail polling over two minutes");
    await checkDisclaimer(card, "en");
    await page.close();
    console.log("PASS Rail (en): deferred requests, station search, loading, empty, error, partial cancellation, repay, departures, no polling");
  }
  {
    // Simplified Chinese on /travel: the same states in the original wording.
    const { page, card } = await openRail("", (route, direction) => route.fulfill(board(direction, partial)));
    await checkDisclaimer(card, "zh");
    await card.getByRole("textbox", { name: "搜索车站" }).fill("shf");
    await card.getByRole("button", { name: "Sheffield", exact: true }).click();
    await card.getByRole("button", { name: "查询延误" }).click();
    await card.getByText("延误 · 15 分钟").waitFor();
    await card.getByText("暂无受影响车站信息。").waitFor();
    await card.getByText("出发地: 暂无").first().waitFor();
    await card.getByLabel("车次方向").selectOption("departures");
    await card.getByRole("button", { name: "查询延误" }).click();
    await card.getByText("目的地: 暂无").first().waitFor();
    await page.close();
    console.log("PASS Rail (zh-CN): wording, results and both directions");
  }
  {
    // Backend without Rail credentials or with the access flag off: an honest
    // "not connected" state with the official link, never an empty board.
    for (const [prefix, code, text] of [
      ["/en", "RAIL_DISABLED", "Live rail data is not connected on this site"],
      ["", "RAIL_NOT_CONFIGURED", "本站尚未接入铁路实时数据"],
      ["/ur", "RAIL_DISABLED", "اس سائٹ پر تازہ ریل ڈیٹا منسلک نہیں"],
    ]) {
      const { page, card } = await openRail(prefix, (route) =>
        route.fulfill({ status: 503, json: { code, message: "Rail information is not available." } }));
      await card.locator("#rail-station").fill("shf");
      await card.locator(".rail-station-results button", { hasText: "Sheffield" }).first().click();
      await card.locator(".rail-check").click();
      await card.getByText(text).waitFor();
      assert.equal(await card.locator(".rail-state-empty").count(), 0, "no empty board");
      assert.equal(await card.locator(".rail-results-heading").count(), 0, "no board heading");
      assert.equal(await card.locator('.rail-results a[href="https://www.nationalrail.co.uk/status-and-disruptions/"]').count(), 1);
      await page.close();
    }
    console.log("PASS Rail not configured / disabled: honest unavailable state with the National Rail link (en, zh-CN, ur)");
  }
  {
    // Mobile layout of the disclaimer in both original languages.
    for (const [prefix, language] of [["/en", "en"], ["", "zh"]]) {
      const { page, card, state } = await openRail(prefix, (route, direction) => route.fulfill(board(direction)));
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await checkDisclaimer(card, language);
        const layout = await card.locator(".rail-disclaimer").evaluate((el) => {
          const bounds = el.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right, viewport: innerWidth, width: el.clientWidth, scrollWidth: el.scrollWidth,
            fontSize: parseFloat(getComputedStyle(el).fontSize), lineHeight: parseFloat(getComputedStyle(el).lineHeight) };
        });
        assert.ok(layout.left >= 0 && layout.right <= layout.viewport, JSON.stringify(layout));
        assert.ok(layout.scrollWidth <= layout.width, "disclaimer wraps within mobile width");
        assert.ok(layout.fontSize >= 14 && layout.lineHeight >= layout.fontSize * 1.4);
        assert.ok(await card.evaluate((el) => el.scrollWidth <= el.clientWidth), "Rail card fits mobile width");
      }
      assert.equal(state.requests, 0, "viewport changes never request a board");
      await page.close();
    }
    console.log("PASS Rail mobile layout (390/320, en and zh-CN)");
  }
} finally {
  await browser.close();
}
