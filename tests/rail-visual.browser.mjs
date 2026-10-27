import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
const folder = process.env.SCREENSHOT_DIR || "/tmp/life-uk-rail-redesign";
await mkdir(folder, { recursive: true });
const base = { stationName: "Sheffield", crs: "SHF", generatedAt: "2026-10-27T13:45:27Z", unknownTimingCount: 0 };
const common = { locations: [{name: "Leeds", crs: "LDS"}], platform: "2", operator: "Northern", reason: null, affectedStops: [], checkDelayRepay: false };
const services = [
  { ...common, status: "delayed", delayMinutes: 12, scheduledTime: "14:00", estimatedTime: "14:12" },
  { ...common, status: "cancelled", delayMinutes: null, scheduledTime: "14:15", estimatedTime: "Cancelled", checkDelayRepay: true },
  { ...common, status: "partially_cancelled", delayMinutes: null, scheduledTime: "14:30", estimatedTime: "On time", affectedStops: [{name: "Derby", crs: "DBY"}], checkDelayRepay: true },
];
try {
  for (const width of [1280, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    let mode = "empty";
    await page.route("**/api/rail/**", route => {
      if (mode === "error") return route.fulfill({status: 502, json: {code:"RAIL_UPSTREAM_UNAVAILABLE"}});
      const direction = new URL(route.request().url()).searchParams.get("direction");
      return route.fulfill({json: { ...base, direction, disruptions: mode === "results" ? services : [] }});
    });
    await page.goto(process.env.FRONTEND_URL || "http://127.0.0.1:5199");
    const card = page.locator(".rail-card");
    await card.getByRole("textbox", {name: "Search station"}).fill("SHF");
    await card.getByRole("button", {name: "Sheffield", exact: true}).click();
    await card.getByRole("button", {name: "Check disruptions"}).click();
    await card.getByText("No reported delays of 10 minutes or more or cancellations in the available station board.").waitFor();
    assert.equal(await card.locator(".rail-state-empty").count(), 1);
    if (width === 390) await card.screenshot({path: `${folder}/rail-empty-390.png`});
    mode = "results";
    await card.getByRole("button", {name: "Refresh"}).click();
    await card.getByText("Delayed · 12 min").waitFor();
    await card.getByText("Cancelled", {exact: false}).first().waitFor();
    await card.getByText("Partially cancelled").waitFor();
    await card.getByText("Affected stops: Derby").waitFor();
    assert.equal(await card.evaluate(el => el.scrollWidth <= el.clientWidth), true, `card overflow ${width}px`);
    if (width === 1280 || width === 390 || width === 320) await card.screenshot({path: `${folder}/rail-results-${width}.png`});
    await card.getByLabel("Board").selectOption("departures");
    await card.getByRole("button", {name: "Check disruptions"}).click();
    await card.getByText("To: Leeds").first().waitFor();
    await card.getByLabel("Language / 语言").selectOption("zh");
    await card.getByText("延误 · 12 分钟").waitFor();
    await card.getByText("部分停站取消").waitFor();
    mode = "error";
    await card.getByRole("button", {name: "刷新"}).click();
    await card.getByText("铁路信息暂不可用，请稍后重试。").waitFor();
    assert.equal(await card.locator(".rail-state-empty").count(), 0);
    if (width === 390) await card.screenshot({path: `${folder}/rail-error-390.png`});
    await page.close();
  }
  console.log("Rail visual browser checks: 4 viewport sizes, empty, delay, cancellation, partial cancellation, errors, both directions and languages passed.");
} finally { await browser.close(); }
