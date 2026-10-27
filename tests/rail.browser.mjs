import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
const page = await browser.newPage();
await page.clock.install();
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
  assert.equal(await card.getByText(/^(Data: National Rail|数据来源：National Rail)$/).count(), 0);
}
let release;
const wait = new Promise(resolve => { release = resolve; });
let mode = "loading", requests = 0;
await page.route("**/api/rail/**", async route => {
  requests++;
  assert.match(route.request().url(), /\/SHF\/disruptions\?direction=(arrivals|departures)/);
  const direction = new URL(route.request().url()).searchParams.get("direction");
  if (mode === "loading") { await wait; mode = "empty"; }
  if (mode === "error") return route.fulfill({ status: 503, body: "upstream error" });
  const disruptions = mode === "partial" ? [{ status: "partially_cancelled", delayMinutes: null, scheduledTime: "10:00", estimatedTime: "On time", locations: [], platform: null, operator: null, reason: null, checkDelayRepay: true, affectedStops: [{name: "Derby", crs: "DBY"}] }, { status: "cancelled", delayMinutes: null, scheduledTime: "10:10", estimatedTime: "Cancelled", locations: [], platform: null, operator: null, reason: null, checkDelayRepay: true, affectedStops: [] }, { status: "delayed", delayMinutes: 15, scheduledTime: "10:20", estimatedTime: "10:35", locations: [], platform: null, operator: null, reason: null, checkDelayRepay: true, affectedStops: [] }, { status: "partially_cancelled", delayMinutes: null, scheduledTime: "10:30", estimatedTime: "On time", locations: [], platform: null, operator: null, reason: "Stop reason", checkDelayRepay: true, affectedStops: [] }] : [];
  return route.fulfill({ json: { stationName: "Sheffield", crs: "SHF", generatedAt: "2026-10-27T13:45:27Z", direction, unknownTimingCount: 0, disruptions } });
});
try {
  await page.goto(process.env.FRONTEND_URL || "http://127.0.0.1:5179");
  const card = page.locator(".rail-card");
  assert.equal(await card.getByLabel("Language / 语言").inputValue(), "zh");
  await checkDisclaimer(card, "zh");
  await card.getByLabel("Language / 语言").selectOption("en");
  await checkDisclaimer(card, "en");
  assert.equal(requests, 0);
  assert.equal(await card.getByLabel("Board").inputValue(), "arrivals");
  await card.getByRole("textbox", { name: "Search station" }).fill("kgx");
  await card.getByRole("button", { name: /Kings Cross/ }).waitFor();
  await card.getByRole("textbox", { name: "Search station" }).fill("Sheff");
  await card.getByRole("button", { name: "Sheffield", exact: true }).waitFor();
  await card.getByRole("textbox", { name: "Search station" }).fill("shf");
  await card.getByRole("button", { name: "Sheffield", exact: true }).click();
  assert.equal(requests, 0);
  await card.getByRole("button", { name: "Check disruptions" }).click();
  await card.getByText("Loading rail information…").waitFor();
  await checkDisclaimer(card, "en");
  release();
  await card.getByText("No reported delays of 10 minutes or more or cancellations in the available station board.").waitFor();
  await card.getByText("Results cover only the services returned on the station board, not every train or the entire day.").waitFor();
  await checkDisclaimer(card, "en");
  mode = "error";
  await card.getByRole("button", { name: "Refresh" }).click();
  await card.getByText("Rail information is unavailable. Please try again later.").waitFor();
  assert.equal(await card.getByText("No reported delays of 10 minutes or more or cancellations in the available station board.").count(), 0);
  await checkDisclaimer(card, "en");
  mode = "partial";
  await card.getByRole("button", { name: "Check disruptions" }).click();
  await card.getByText("Partially cancelled").first().waitFor();
  await card.getByText("Affected stops are not available.").waitFor();
  await card.getByText("Stop reason").waitFor();
  await card.getByText("Delayed · 15 min").waitFor();
  await card.getByText("Affected stops: Derby").waitFor();
  assert.equal(await card.getByRole("link", { name: "Check Delay Repay" }).count(), 4);
  assert.equal(await card.getByRole("link", { name: "Check Delay Repay" }).first().getAttribute("href"), "https://www.nationalrail.co.uk/help-and-assistance/compensation-and-refunds/");
  await card.getByLabel("Language / 语言").selectOption("zh");
  await checkDisclaimer(card, "zh");
  await card.getByText("延误 · 15 分钟").waitFor();
  await card.getByText("暂无受影响车站信息。").waitFor();
  await card.getByLabel("Language / 语言").selectOption("en");
  const prior = requests;
  await card.getByLabel("Board").selectOption("departures");
  assert.equal(requests, prior);
  await card.getByRole("button", { name: "Check disruptions" }).click();
  await card.getByText("To: Unavailable").first().waitFor();
  assert.equal(requests, prior + 1);
  await card.getByLabel("Language / 语言").selectOption("zh");
  await card.getByText("目的地: 暂无").first().waitFor();
  await card.getByLabel("车次方向").selectOption("arrivals");
  assert.equal(requests, prior + 1);
  await card.getByRole("button", { name: "查询延误" }).click();
  await card.getByText("出发地: 暂无").first().waitFor();
  const afterExplicitChecks = requests;
  await page.clock.fastForward(120000);
  assert.equal(requests, afterExplicitChecks, "no background Rail polling over two minutes");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const language of ["en", "zh"]) {
      await card.getByLabel("Language / 语言").selectOption(language);
      await checkDisclaimer(card, language);
      const layout = await card.locator(".rail-disclaimer").evaluate(el => {
        const bounds = el.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, viewport: innerWidth,
          width: el.clientWidth, scrollWidth: el.scrollWidth,
          fontSize: parseFloat(getComputedStyle(el).fontSize),
          lineHeight: parseFloat(getComputedStyle(el).lineHeight) };
      });
      assert.ok(layout.left >= 0 && layout.right <= layout.viewport, JSON.stringify(layout));
      assert.ok(layout.scrollWidth <= layout.width, "disclaimer wraps within mobile width");
      assert.ok(layout.fontSize >= 14 && layout.lineHeight >= layout.fontSize * 1.4);
    }
    assert.ok(await card.evaluate(el => el.scrollWidth <= el.clientWidth), "Rail card fits mobile width");
  }
  assert.equal(requests, afterExplicitChecks, "language and viewport changes never request a board");
  console.log("Rail browser: deferred requests, station search, loading, empty, errors, partial cancellation, repay, departures, bilingual disclaimer, mobile layout and no-polling checks passed");
} finally { await browser.close(); }
