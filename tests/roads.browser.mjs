// Deterministic Roads browser checks: geolocation and every API response are
// mocked, so no real location, backend or National Highways request is used.
// Roads is a first-party tool inside the homepage travel dialog. The browser
// clock is pinned shortly after the fixture snapshot so the fresh path runs;
// stale paths use other times.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { formatUkDateTimeZh } from "../src/travel/format.ts";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-roads-review";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });

const position = { latitude: 52.193516, longitude: -0.90838 };
const fixture = {
  snapshotAt: "2026-10-04T12:37:37.802125Z",
  relevanceRadiusMeters: 15000.0,
  disruptions: [
    {
      situationId: "fixture/second-nearest-is-listed-first",
      recordId: "r-1",
      recordVersion: "1",
      descriptions: [
        "laneClosures",
        "Fixture comment: recovery vehicle on scene",
      ],
      type: { value: "laneClosures", extendedValue: null },
      cause: {
        type: "roadOrCarriagewayOrLaneManagement",
        managementType: { value: "laneClosures", extendedValue: null },
      },
      status: "active",
      startTime: "2026-10-04T11:56:19.190Z",
      endTime: "2026-10-04T12:11:19.190Z",
      distanceMeters: 0,
      locations: [
        {
          description: "Fixture M1 northbound within J15",
          roads: [
            {
              name: "M1",
              direction: "northBound",
              relativeDirection: "aligned",
            },
          ],
          coordinates: [{ latitude: 52.111111, longitude: -0.777777 }],
        },
      ],
    },
    {
      situationId: "fixture/optional-values-null",
      recordId: "r-2",
      recordVersion: null,
      descriptions: [],
      type: null,
      cause: null,
      status: null,
      startTime: null,
      endTime: null,
      distanceMeters: 1276.380340910437,
      locations: [
        {
          description: "Fixture A14 location without direction",
          roads: [{ name: "A14", direction: null, relativeDirection: null }],
          coordinates: [],
        },
      ],
    },
    {
      situationId: "fixture/third",
      recordId: "r-3",
      recordVersion: "2",
      descriptions: [],
      type: { value: "carriagewayClosures", extendedValue: null },
      cause: null,
      status: "suspended",
      startTime: null,
      endTime: "2026-12-04T09:30:00Z",
      distanceMeters: 14_999,
      locations: [
        {
          description: "Fixture M6 southbound between J1 and J2",
          roads: [
            { name: "M6", direction: "southBound", relativeDirection: null },
          ],
          coordinates: [],
        },
      ],
    },
  ],
};
const empty = { ...fixture, disruptions: [] };
// Five minutes after the snapshot: within the 30-minute limit.
const FRESH_NOW = Date.parse(fixture.snapshotAt) + 5 * 60_000;
const NH_ATTRIBUTION = "Powered by National Highways’ Transport Data Feeds";

// Replaces browser geolocation and records every storage write.
function installMocks({ mode, coords, delayMs }) {
  window.__roadsTest = {
    calls: 0,
    watch: 0,
    options: null,
    storage: [],
    idb: 0,
  };
  const record = (kind) =>
    function (key) {
      window.__roadsTest.storage.push(`${kind}:${key}`);
    };
  Storage.prototype.setItem = record("storage");
  if (window.indexedDB) {
    const open = window.indexedDB.open.bind(window.indexedDB);
    window.indexedDB.open = (...args) => {
      window.__roadsTest.idb++;
      return open(...args);
    };
  }
  if (mode === "unsupported") {
    Object.defineProperty(Navigator.prototype, "geolocation", {
      configurable: true,
      get: () => undefined,
    });
    return;
  }
  const codes = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
  const geolocation = {
    getCurrentPosition(success, failure, options) {
      window.__roadsTest.calls++;
      window.__roadsTest.options = options;
      const outcome = window.__roadsTest.next ?? mode;
      setTimeout(() => {
        if (outcome === "success")
          success({
            coords: { ...coords, accuracy: 10 },
            timestamp: Date.now(),
          });
        else
          failure({
            ...codes,
            code: codes[outcome],
            message: "RAW BROWSER MESSAGE",
          });
      }, delayMs);
    },
    watchPosition() {
      window.__roadsTest.watch++;
      return 1;
    },
    clearWatch() {},
  };
  Object.defineProperty(Navigator.prototype, "geolocation", {
    configurable: true,
    get: () => geolocation,
  });
}

async function newPage(
  width,
  {
    mode = "success",
    coords = position,
    delayMs = 0,
    roads,
    places,
    open = true,
    now = FRESH_NOW,
  } = {},
) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    timezoneId: "America/Los_Angeles",
  });
  // Keep the other homepage data independent of any backend.
  await context.route("**/api/guides", (route) => route.fulfill({ json: [] }));
  await context.route("**/api/bank-holidays", (route) =>
    route.fulfill({ status: 404, json: {} }),
  );
  await context.route("**/api/travel/underground", (route) =>
    route.fulfill({ json: { observedAt: "2026-10-03T15:47:08Z", lines: [] } }),
  );
  const roadsRequests = [];
  await context.route("**/api/travel/roads**", async (route) => {
    roadsRequests.push(route.request().url());
    if (roads) await roads(route, roadsRequests.length);
    else await route.abort("failed");
  });
  // Place search is always mocked; nothing can reach OS Names.
  const placeRequests = [];
  await context.route("**/api/places/search**", async (route) => {
    placeRequests.push(route.request().url());
    if (places) await places(route, placeRequests.length);
    else await route.abort("failed");
  });
  await context.addInitScript(installMocks, { mode, coords, delayMs });
  const page = await context.newPage();
  if (now !== null) await page.clock.setFixedTime(now);
  const requests = [];
  const errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL);
  const card = page.locator(".travel-dialog .roads-card");
  if (open) {
    // Open the Roads tool from the homepage transport panel.
    await page.locator('.transport-item[data-tool="roads"]').click();
    await card.waitFor();
  }
  const geo = () => page.evaluate(() => window.__roadsTest);
  return {
    context,
    page,
    card,
    requests,
    roadsRequests,
    placeRequests,
    errors,
    geo,
  };
}

async function assertSafe({ page, card, requests, errors, geo }, width) {
  const text = await card.innerText();
  // Precise coordinates (user or geometry) and raw browser errors never appear.
  for (const banned of [
    String(position.latitude),
    String(position.longitude),
    "52.19",
    "-0.90",
    "52.111111",
    "-0.777777",
    "RAW BROWSER MESSAGE",
    "fixture/",
    "r-1",
  ])
    assert(!text.includes(banned), `card must not show ${banned}`);
  const state = await geo();
  assert.deepEqual(state.storage, [], "nothing written to web storage");
  assert.equal(state.idb, 0, "IndexedDB not used");
  assert.equal(await page.evaluate(() => document.cookie), "");
  assert.equal(state.watch, 0, "watchPosition never used");
  for (const url of requests) {
    const { hostname, pathname } = new URL(url);
    assert(!/nationalhighways|highways\.gov|os\.uk/i.test(hostname), url);
    if (pathname.startsWith("/api/travel/roads"))
      assert.equal(pathname, "/api/travel/roads");
  }
  assert(
    (await card.getByRole("link", { name: /National Highways/ }).count()) === 1,
  );
  assert(text.includes("National Highways · 附近当前道路异常"));
  assert.equal(
    await card.locator(".travel-attribution").innerText(),
    NH_ATTRIBUTION,
  );
  assert.equal(await page.locator("dialog.travel-dialog[open]").count(), 1);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    width,
  );
  assert.deepEqual(errors, []);
}

const roadsCount = (requests) =>
  requests.filter((url) => new URL(url).pathname === "/api/travel/roads")
    .length;

try {
  // Initial state: no backend request and no location prompt until asked.
  for (const width of [1440, 390]) {
    const ctx = await newPage(width, {
      roads: (route) => route.fulfill({ json: fixture }),
    });
    const { page, card, requests, geo } = ctx;
    await page.waitForLoadState("networkidle");
    await page.clock.install({ time: FRESH_NOW });
    await page.clock.runFor(120_000);
    assert.equal(roadsCount(requests), 0);
    assert.equal((await geo()).calls, 0);
    const action = card.getByRole("button", { name: "使用我的位置" });
    assert(await action.isVisible());
    const text = await card.innerText();
    assert(!text.includes("M1") && !text.includes("Lane closures"));
    assert.equal(await card.locator(".roads-item, time").count(), 0);
    await assertSafe(ctx, width);
    await page.screenshot({
      path: `${screenshots}/initial-${width}.png`,
      fullPage: true,
    });
    await ctx.context.close();
    console.log(
      `PASS ${width}px initial: action shown, no Roads request, no geolocation, no fake data`,
    );
  }

  // Successful lookup via keyboard, results, refresh and re-locate.
  for (const width of [1440, 390]) {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const ctx = await newPage(width, {
      roads: async (route, n) => {
        if (n === 1) await gate;
        await route.fulfill({ json: fixture });
      },
    });
    const { page, card, roadsRequests, requests, geo } = ctx;
    await card.getByRole("button", { name: "使用我的位置" }).focus();
    await page.keyboard.press("Enter");
    await card
      .getByRole("status")
      .filter({ hasText: "正在查询附近" })
      .waitFor();
    assert.equal(await card.getAttribute("aria-busy"), "true");
    const state = await geo();
    assert.equal(state.calls, 1);
    assert.equal(state.options.enableHighAccuracy, false);
    const url = new URL(roadsRequests[0]);
    assert.equal(url.pathname, "/api/travel/roads");
    assert.equal(url.searchParams.get("lat"), String(position.latitude));
    assert.equal(url.searchParams.get("lon"), String(position.longitude));
    release();
    await card.locator(".roads-item").first().waitFor();
    assert.equal(await card.getAttribute("aria-busy"), "false");
    // Keyboard focus stays inside the card after the pressed control is replaced.
    assert(await card.evaluate((el) => el.contains(document.activeElement)));

    const items = card.locator(".roads-item");
    assert.equal(await items.count(), 3);
    assert.deepEqual(await items.locator(".roads-location").allTextContents(), [
      "Fixture M1 northbound within J15",
      "Fixture A14 location without direction",
      "Fixture M6 southbound between J1 and J2",
    ]);
    const first = items.nth(0);
    assert.equal(
      await first
        .locator("h3")
        .innerText()
        .then((t) => t.replace(/\s+/g, " ")),
      "M1 Northbound",
    );
    assert.equal(
      await first.locator(".roads-distance").textContent(),
      "直线距离 不到 0.1 英里",
    );
    assert.equal(
      await first.locator(".roads-kind").textContent(),
      "Lane closures",
    );
    assert.deepEqual(await first.locator(".roads-comment").allTextContents(), [
      "Fixture comment: recovery vehicle on scene",
    ]);
    assert.equal(
      await first.locator("time").getAttribute("datetime"),
      "2026-10-04T12:11:19.190Z",
    );
    assert.equal(
      await first.locator("time").textContent(),
      formatUkDateTimeZh("2026-10-04T12:11:19.190Z"),
    );
    assert((await first.innerText()).includes("2026年10月4日 13:11"));
    assert((await first.innerText()).includes("来源状态：Active"));
    // Active, estimated end 12:11 before the 12:37 snapshot: explained, with
    // the provider status kept, compared with the snapshot (the browser clock
    // is pinned five minutes later, not used).
    assert.equal(
      await first.locator(".roads-estimate-passed").innerText(),
      "原预计结束时间已过，来源仍显示为进行中（Active），尚未确认解除。",
    );
    assert((await first.innerText()).includes("原预计结束时间："));
    assert(!(await first.innerText()).includes("来源结束时间："));
    // Optional values absent: nothing invented.
    const second = items.nth(1);
    assert.equal(await second.locator("h3").innerText(), "A14");
    assert.equal(
      await second
        .locator(".roads-direction, .roads-kind, .roads-comment, time")
        .count(),
      0,
    );
    assert(!/来源(状态|结束时间)/.test(await second.innerText()));
    // No status and no end time: no expired-estimate notice.
    assert.equal(await second.locator(".roads-estimate-passed").count(), 0);
    assert.equal(
      await second.locator(".roads-distance").textContent(),
      "直线距离 0.8 英里",
    );
    const third = items.nth(2);
    assert.equal(
      await third.locator(".roads-distance").textContent(),
      "直线距离 9.3 英里",
    );
    assert((await third.innerText()).includes("2026年12月4日 09:30"));
    assert((await third.innerText()).includes("Southbound"));
    // Non-active ("suspended") with a future end: plain end time, no notice.
    assert.equal(await third.locator(".roads-estimate-passed").count(), 0);
    assert((await third.innerText()).includes("来源结束时间："));
    const summary = await card.locator(".roads-summary").innerText();
    assert.equal(summary, "9.3 英里 范围内有 3 条道路异常，按距离由近到远排列。");
    assert((await card.innerText()).includes("不是驾车距离"));
    assert.equal(
      await card.locator(".provenance time").getAttribute("datetime"),
      fixture.snapshotAt,
    );
    await assertSafe(ctx, width);
    await page.screenshot({
      path: `${screenshots}/results-${width}.png`,
      fullPage: true,
    });

    // Refresh reuses the in-memory location: new request, no new geolocation.
    await card.getByRole("button", { name: "重新查询" }).click();
    await card.locator(".roads-item").first().waitFor();
    assert.equal(roadsRequests.length, 2);
    assert.equal((await geo()).calls, 1);
    assert.equal(
      new URL(roadsRequests[1]).search,
      new URL(roadsRequests[0]).search,
    );
    // No polling.
    await page.clock.install({ time: FRESH_NOW });
    await page.clock.runFor(30 * 60_000);
    assert.equal(roadsRequests.length, 2);
    // Return to a fresh time so the next lookup shows results, not staleness.
    await page.clock.setSystemTime(FRESH_NOW);
    // Re-locating is explicit and asks the browser once more.
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await page.clock.runFor(10);
    await card.locator(".roads-item").first().waitFor();
    assert.equal((await geo()).calls, 2);
    assert.equal(roadsRequests.length, 3);
    assert.equal(roadsCount(requests), 3);
    await assertSafe(ctx, width);
    await ctx.context.close();
    console.log(
      `PASS ${width}px success: keyboard action, exact coordinates sent once to /api/travel/roads, backend order, optional values absent, readable distance/UK times, refresh reuses location without geolocation, re-locate asks again, no polling or persistence`,
    );
  }

  // Empty result is a calm success.
  {
    const ctx = await newPage(390, {
      roads: (route) => route.fulfill({ json: empty }),
    });
    const { card } = ctx;
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await card
      .getByRole("status")
      .filter({
        hasText: "附近没有找到 National Highways 报告的当前道路异常。",
      })
      .waitFor();
    const text = await card.innerText();
    assert(!/clear|unavailable|couldn’t|畅通|暂时无法|未能/i.test(text));
    assert.equal(await card.locator(".roads-item").count(), 0);
    assert(await card.getByRole("button", { name: "重新查询" }).isVisible());
    await assertSafe(ctx, 390);
    await ctx.context.close();
    console.log("PASS empty: successful neutral message, no 'all clear' claim");
  }

  // Unsupported browser.
  {
    const ctx = await newPage(390, { mode: "unsupported" });
    const { card, roadsRequests } = ctx;
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await card
      .getByRole("status")
      .filter({ hasText: "无法提供你的位置" })
      .waitFor();
    assert.equal(roadsRequests.length, 0);
    await assertSafe(ctx, 390);
    await ctx.context.close();
    console.log("PASS unsupported: clear message, no request");
  }

  // Denied, unavailable and timeout: no request, no automatic re-prompt, explicit retry.
  for (const [mode, message] of [
    ["PERMISSION_DENIED", "未获得位置权限"],
    ["POSITION_UNAVAILABLE", "无法获取你的位置。"],
    ["TIMEOUT", "无法获取你的位置。"],
  ]) {
    const ctx = await newPage(390, {
      mode,
      roads: (route) => route.fulfill({ json: fixture }),
    });
    const { page, card, roadsRequests, geo } = ctx;
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await card.getByRole("status").filter({ hasText: message }).waitFor();
    await page.clock.install({ time: FRESH_NOW });
    await page.clock.runFor(120_000);
    assert.equal((await geo()).calls, 1, "no automatic re-prompt");
    assert.equal(roadsRequests.length, 0);
    await assertSafe(ctx, 390);
    // Explicit retry asks again; this time the browser succeeds.
    await page.evaluate(() => {
      window.__roadsTest.next = "success";
    });
    await card.getByRole("button", { name: "重试" }).click();
    await page.clock.runFor(10);
    await card.locator(".roads-item").first().waitFor();
    assert.equal((await geo()).calls, 2);
    assert.equal(roadsRequests.length, 1);
    await ctx.context.close();
    console.log(
      `PASS ${mode}: bounded message, no raw error, no request, retry only on request`,
    );
  }

  // Backend failures: bounded states, retry reuses in-memory location, no fake data.
  for (const [name, handle, message] of [
    [
      "404 unavailable",
      (route) =>
        route.fulfill({
          status: 404,
          json: { code: "ROADS_UNAVAILABLE", message: "private" },
        }),
      "道路信息暂时无法获取。",
    ],
    [
      "500",
      (route) =>
        route.fulfill({
          status: 500,
          json: { code: "ROADS_READ_FAILED", message: "private" },
        }),
      "道路信息未能加载。",
    ],
    [
      "network",
      (route) => route.abort("failed"),
      "道路信息未能加载。",
    ],
    [
      "invalid JSON",
      (route) => route.fulfill({ contentType: "application/json", body: "{" }),
      "道路信息未能加载。",
    ],
    [
      "malformed DTO",
      (route) =>
        route.fulfill({
          json: {
            ...fixture,
            disruptions: [...fixture.disruptions, { situationId: "bad" }],
          },
        }),
      "道路信息未能加载。",
    ],
  ]) {
    const ctx = await newPage(390, {
      roads: (route, n) =>
        n === 1 ? handle(route) : route.fulfill({ json: fixture }),
    });
    const { card, roadsRequests, geo } = ctx;
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await card.getByRole("status").filter({ hasText: message }).waitFor();
    const text = await card.innerText();
    for (const banned of [
      "Fixture",
      "M1",
      "ROADS_",
      "private",
      "Lane closures",
    ])
      assert(!text.includes(banned), `${name}: must not show ${banned}`);
    assert.equal(
      await card.locator(".roads-item, .provenance time").count(),
      0,
    );
    await assertSafe(ctx, 390);
    await card.getByRole("button", { name: "重试" }).click();
    await card.locator(".roads-item").first().waitFor();
    assert.equal(roadsRequests.length, 2);
    assert.equal((await geo()).calls, 1, "retry reuses in-memory location");
    await ctx.context.close();
    console.log(
      `PASS ${name}: bounded state, no partial/fake data, retry reuses location`,
    );
  }

  // Request deadline aborts a stalled request.
  {
    const ctx = await newPage(390, {
      roads: () => new Promise(() => {}),
    });
    const { page, card } = ctx;
    await page.clock.install({ time: FRESH_NOW });
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await page.clock.runFor(10);
    await card
      .getByRole("status")
      .filter({ hasText: "正在查询附近" })
      .waitFor();
    await page.clock.runFor(10_001);
    await card
      .getByRole("status")
      .filter({ hasText: "未能加载" })
      .waitFor();
    await ctx.context.close();
    console.log(
      "PASS deadline: stalled request aborted into a retryable state",
    );
  }

  // Unmounting while the Roads request is pending aborts it without stale rendering.
  {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const ctx = await newPage(390, {
      open: false,
      roads: async (route) => {
        await gate;
        await route.fulfill({ json: fixture }).catch(() => {});
      },
    });
    const { page, errors } = ctx;
    const aborted = [];
    page.on("requestfailed", (request) => {
      if (new URL(request.url()).pathname === "/api/travel/roads")
        aborted.push(request.url());
    });
    await page.evaluate(async () => {
      const [{ default: React }, { default: ReactDOM }, { RoadsCard }] =
        await Promise.all([
          import("/node_modules/.vite/deps/react.js"),
          import("/node_modules/.vite/deps/react-dom_client.js"),
          import("/src/components/RoadsCard.tsx"),
        ]);
      const host = document.createElement("div");
      host.id = "roads-unmount-test";
      document.body.appendChild(host);
      globalThis.roadsTestRoot = ReactDOM.createRoot(host);
      globalThis.roadsTestRoot.render(React.createElement(RoadsCard));
    });
    const isolated = page.locator("#roads-unmount-test .roads-card");
    await isolated.getByRole("button", { name: "使用我的位置" }).click();
    await isolated
      .getByRole("status")
      .filter({ hasText: "正在查询附近" })
      .waitFor();
    await page.evaluate(() => globalThis.roadsTestRoot.unmount());
    await page.waitForTimeout(50);
    assert.equal(aborted.length, 1, "unmount must abort the pending request");
    release();
    await page.waitForTimeout(50);
    assert.equal(await isolated.count(), 0);
    assert.deepEqual(errors, []);
    await ctx.context.close();
    console.log(
      "PASS unmount: pending Roads request aborted; no stale rendering or errors",
    );
  }

  // A location answer arriving after the card unmounts is ignored.
  {
    const ctx = await newPage(390, {
      open: false,
      delayMs: 200,
      roads: (route) => route.fulfill({ json: fixture }),
    });
    const { page, roadsRequests, errors } = ctx;
    await page.evaluate(async () => {
      const [{ default: React }, { default: ReactDOM }, { RoadsCard }] =
        await Promise.all([
          import("/node_modules/.vite/deps/react.js"),
          import("/node_modules/.vite/deps/react-dom_client.js"),
          import("/src/components/RoadsCard.tsx"),
        ]);
      const host = document.createElement("div");
      host.id = "roads-late-test";
      document.body.appendChild(host);
      globalThis.roadsLateRoot = ReactDOM.createRoot(host);
      globalThis.roadsLateRoot.render(React.createElement(RoadsCard));
    });
    await page
      .locator("#roads-late-test .roads-card")
      .getByRole("button", { name: "使用我的位置" })
      .click();
    await page.evaluate(() => globalThis.roadsLateRoot.unmount());
    await page.waitForTimeout(400);
    assert.equal(roadsRequests.length, 0, "late position starts no request");
    assert.deepEqual(errors, []);
    await ctx.context.close();
    console.log("PASS late geolocation after unmount: ignored, no request");
  }
  // ---- Place search (Issue #12) ----
  const attribution =
    "Fixture attribution: Contains OS data © Crown copyright and database right 2026";
  const place = (id, label, type, latitude, longitude) => ({
    id: `osgb-fixture-${id}`,
    label,
    name: label.split(",")[0],
    type,
    area: null,
    region: "Fixture Region",
    country: "England",
    latitude,
    longitude,
  });
  const sheffield = place(
    "1",
    "Sheffield, Fixture Region",
    "city",
    53.381129,
    -1.470085,
  );
  const sheffieldPark = place(
    "2",
    "Sheffield Park, Wealden, South East",
    "hamlet",
    50.991734,
    0.023456,
  );
  const leeds = place(
    "3",
    "Leeds, Fixture Region",
    "city",
    53.799722,
    -1.549167,
  );
  const leedsVillage = place(
    "4",
    "Leeds, Maidstone, South East",
    "village",
    51.247321,
    0.613214,
  );
  const barnsley = place(
    "5",
    "Barnsley, Fixture Region",
    "town",
    53.552631,
    -1.479726,
  );
  const placeResponse = (query, places) => ({ query, places, attribution });
  const byQuery = {
    Sheffield: placeResponse("Sheffield", [sheffield, sheffieldPark]),
    Leeds: placeResponse("Leeds", [leeds, leedsVillage]),
    Barnsley: placeResponse("Barnsley", [barnsley]),
    Nowhere: placeResponse("Nowhere", []),
  };
  const placesByQuery = (route) =>
    route.fulfill({
      json: byQuery[new URL(route.request().url()).searchParams.get("q")],
    });
  const roadsAt = (url) => {
    const query = new URL(url).searchParams;
    return [Number(query.get("lat")), Number(query.get("lon"))];
  };
  const assertNoPlaceCoordinates = async (card) => {
    const text = await card.innerText();
    for (const candidate of [
      sheffield,
      sheffieldPark,
      leeds,
      leedsVillage,
      barnsley,
    ])
      for (const banned of [
        String(candidate.latitude),
        String(candidate.longitude),
        String(candidate.latitude).slice(0, 5),
        candidate.id,
      ])
        assert(!text.includes(banned), `card must not show ${banned}`);
  };
  const search = (card) =>
    card.getByRole("searchbox", { name: "搜索邮编、城镇或地点" });

  // Explicit submit, candidates, selection, refresh and switching locations.
  for (const width of [1440, 390]) {
    const ctx = await newPage(width, {
      places: placesByQuery,
      roads: (route) => route.fulfill({ json: fixture }),
    });
    const { page, card, placeRequests, roadsRequests, geo } = ctx;
    // Typing alone sends nothing.
    await search(card).pressSequentially("  Sheffield  ", { delay: 5 });
    await page.waitForTimeout(100);
    assert.equal(placeRequests.length, 0, "typing must not search");
    // The Search button submits the trimmed query.
    await card.getByRole("button", { name: "搜索", exact: true }).click();
    await card
      .getByRole("status")
      .filter({ hasText: "找到 2 个地点" })
      .waitFor();
    assert.equal(placeRequests.length, 1);
    assert.equal(new URL(placeRequests[0]).pathname, "/api/places/search");
    assert.equal(new URL(placeRequests[0]).searchParams.get("q"), "Sheffield");
    const candidates = card.locator(".roads-candidate");
    assert.deepEqual(
      (await candidates.allInnerTexts()).map((t) => t.replace(/\s+/g, " ")),
      [
        "Sheffield, Fixture Region 城市",
        "Sheffield Park, Wealden, South East 小村",
      ],
    );
    assert((await card.innerText()).includes(attribution));
    assert.equal(roadsRequests.length, 0, "no Roads request before a choice");
    await assertNoPlaceCoordinates(card);
    await page.screenshot({
      path: `${screenshots}/places-candidates-${width}.png`,
      fullPage: true,
    });

    // Choosing a candidate uses its coordinates for the existing Roads API.
    await candidates.nth(1).click();
    await card.locator(".roads-item").first().waitFor();
    assert.deepEqual(roadsAt(roadsRequests[0]), [
      sheffieldPark.latitude,
      sheffieldPark.longitude,
    ]);
    assert.equal(
      await card.locator(".roads-active-label").innerText(),
      sheffieldPark.label,
    );
    assert.equal(await card.locator(".roads-candidate").count(), 0);
    assert(
      (await card.locator(".provenance").innerText()).includes(attribution),
    );
    assert(
      await card.getByRole("link", { name: /National Highways/ }).isVisible(),
    );
    assert.equal((await geo()).calls, 0, "no geolocation for searched places");
    await assertNoPlaceCoordinates(card);
    await page.screenshot({
      path: `${screenshots}/places-selected-${width}.png`,
      fullPage: true,
    });

    // Refresh reuses the selected place.
    await card.getByRole("button", { name: "重新查询" }).click();
    await card.locator(".roads-item").first().waitFor();
    assert.equal(roadsRequests.length, 2);
    assert.deepEqual(roadsAt(roadsRequests[1]), roadsAt(roadsRequests[0]));
    assert.equal((await geo()).calls, 0);

    // Enter submits; a single match is used directly and replaces the previous place.
    await search(card).fill("Barnsley");
    await search(card).press("Enter");
    await card
      .locator(".roads-active-label")
      .filter({ hasText: barnsley.label })
      .waitFor();
    await card.locator(".roads-item").first().waitFor();
    assert.equal(placeRequests.length, 2);
    assert.deepEqual(roadsAt(roadsRequests[2]), [
      barnsley.latitude,
      barnsley.longitude,
    ]);
    assert.equal(await card.locator(".roads-candidate").count(), 0);

    // Switching to browser geolocation replaces the searched place.
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await card
      .locator(".roads-active-label")
      .filter({ hasText: "你的当前位置" })
      .waitFor();
    await card.locator(".roads-item").first().waitFor();
    assert.equal((await geo()).calls, 1);
    assert.deepEqual(roadsAt(roadsRequests[3]), [
      position.latitude,
      position.longitude,
    ]);
    assert(
      !(await card.locator(".provenance").innerText()).includes(attribution),
    );
    await card.getByRole("button", { name: "重新查询" }).click();
    await card.locator(".roads-item").first().waitFor();
    assert.deepEqual(roadsAt(roadsRequests[4]), [
      position.latitude,
      position.longitude,
    ]);
    assert.equal((await geo()).calls, 1, "refresh reuses device location");

    // And searching again replaces geolocation.
    await search(card).fill("Leeds");
    await search(card).press("Enter");
    await card.locator(".roads-candidate").first().waitFor();
    await card.locator(".roads-candidate").first().click();
    await card
      .locator(".roads-active-label")
      .filter({ hasText: leeds.label })
      .waitFor();
    await card.locator(".roads-item").first().waitFor();
    assert.deepEqual(roadsAt(roadsRequests[5]), [
      leeds.latitude,
      leeds.longitude,
    ]);
    assert.equal((await geo()).calls, 1);
    assert.equal(
      await card.locator(".roads-active").count(),
      1,
      "one active location",
    );
    await assertNoPlaceCoordinates(card);
    await assertSafe(ctx, width);
    await ctx.context.close();
    console.log(
      `PASS ${width}px place search: no request while typing, Search/Enter submit trimmed query, candidates without coordinates/IDs, selection drives Roads with candidate coordinates, single match auto-selected, refresh reuses location, place ↔ geolocation switching, OS + National Highways attribution, nothing persisted`,
    );
  }

  // Blank input and empty results: no request / no location invented.
  {
    const ctx = await newPage(390, { places: placesByQuery });
    const { card, placeRequests, roadsRequests, geo } = ctx;
    await card.getByRole("button", { name: "搜索", exact: true }).click();
    await card
      .getByRole("status")
      .filter({ hasText: "请输入邮编、城镇或地点。" })
      .waitFor();
    await search(card).fill("   ");
    await search(card).press("Enter");
    assert.equal(placeRequests.length, 0, "blank input must not search");
    await search(card).fill("Nowhere");
    await search(card).press("Enter");
    await card
      .getByRole("status")
      .filter({ hasText: "没有找到匹配的地点。" })
      .waitFor();
    assert.equal(placeRequests.length, 1);
    assert.equal(roadsRequests.length, 0);
    assert.equal((await geo()).calls, 0, "no automatic geolocation fallback");
    assert.equal(
      await card.locator(".roads-active, .roads-candidate").count(),
      0,
    );
    await assertSafe(ctx, 390);
    await ctx.context.close();
    console.log(
      "PASS blank/empty place search: no request for blank input, 'No matching place found.', no fallback",
    );
  }

  // Place-search failures stay local, hide provider bodies and leave the card usable.
  for (const [name, handle, message] of [
    [
      "400 invalid",
      (route) =>
        route.fulfill({
          status: 400,
          json: { code: "PLACE_QUERY_INVALID", message: "private" },
        }),
      "无法使用这个搜索词",
    ],
    [
      "503 not configured",
      (route) =>
        route.fulfill({
          status: 503,
          json: { code: "PLACES_NOT_CONFIGURED", message: "private" },
        }),
      "地点搜索暂时不可用",
    ],
    [
      "502 unavailable",
      (route) =>
        route.fulfill({
          status: 502,
          json: { code: "PLACES_UNAVAILABLE", message: "private" },
        }),
      "地点搜索暂时不可用",
    ],
    [
      "500",
      (route) =>
        route.fulfill({
          status: 500,
          json: { code: "PLACES_SEARCH_FAILED", message: "private" },
        }),
      "地点搜索未能完成。",
    ],
    [
      "network",
      (route) => route.abort("failed"),
      "地点搜索未能完成。",
    ],
    [
      "malformed",
      (route) =>
        route.fulfill({
          json: {
            query: "Sheffield",
            places: [{ ...sheffield, latitude: "53" }],
            attribution,
          },
        }),
      "地点搜索未能完成。",
    ],
  ]) {
    const ctx = await newPage(390, {
      places: (route, n) => (n === 1 ? handle(route) : placesByQuery(route)),
      roads: (route) => route.fulfill({ json: fixture }),
    });
    const { card, roadsRequests } = ctx;
    await search(card).fill("Sheffield");
    await search(card).press("Enter");
    await card.getByRole("status").filter({ hasText: message }).waitFor();
    const text = await card.innerText();
    for (const banned of [
      "PLACE",
      "private",
      "Sheffield, Fixture",
      attribution,
    ])
      assert(!text.includes(banned), `${name}: must not show ${banned}`);
    assert.equal(roadsRequests.length, 0);
    // Still usable: the next search works.
    await search(card).press("Enter");
    await card.locator(".roads-candidate").first().click();
    await card.locator(".roads-item").first().waitFor();
    await assertSafe(ctx, 390);
    await ctx.context.close();
    console.log(
      `PASS place search ${name}: local bounded message, no provider body, card remains usable`,
    );
  }

  // A slower earlier search cannot replace a newer one.
  {
    let releaseSheffield;
    const sheffieldGate = new Promise((resolve) => {
      releaseSheffield = resolve;
    });
    const ctx = await newPage(1440, {
      places: async (route) => {
        const q = new URL(route.request().url()).searchParams.get("q");
        if (q === "Sheffield") await sheffieldGate;
        await placesByQuery(route).catch(() => {});
      },
    });
    const { page, card } = ctx;
    await search(card).fill("Sheffield");
    await search(card).press("Enter");
    await card
      .getByRole("status")
      .filter({ hasText: "正在搜索地点" })
      .waitFor();
    await search(card).fill("Leeds");
    await search(card).press("Enter");
    await card.locator(".roads-candidate").first().waitFor();
    releaseSheffield();
    await page.waitForTimeout(200);
    assert.deepEqual(
      await card.locator(".roads-candidate > span:first-child").allInnerTexts(),
      [leeds.label, leedsVillage.label],
    );
    await ctx.context.close();
    console.log(
      "PASS stale place search: earlier Sheffield response cannot replace newer Leeds results",
    );
  }

  // A slower Roads response for an earlier choice cannot replace the newer location.
  {
    let releaseSheffield;
    const sheffieldGate = new Promise((resolve) => {
      releaseSheffield = resolve;
    });
    const ctx = await newPage(1440, {
      places: placesByQuery,
      roads: async (route) => {
        const [lat] = roadsAt(route.request().url());
        if (lat === sheffield.latitude) {
          await sheffieldGate;
          await route.fulfill({ json: fixture }).catch(() => {});
        } else await route.fulfill({ json: empty });
      },
    });
    const { page, card, roadsRequests } = ctx;
    await search(card).fill("Sheffield");
    await search(card).press("Enter");
    await card.locator(".roads-candidate").first().click();
    await card
      .getByRole("status")
      .filter({ hasText: "正在查询附近" })
      .waitFor();
    await search(card).fill("Leeds");
    await search(card).press("Enter");
    await card.locator(".roads-candidate").first().click();
    await card
      .getByRole("status")
      .filter({
        hasText: "附近没有找到 National Highways 报告的当前道路异常。",
      })
      .waitFor();
    releaseSheffield();
    await page.waitForTimeout(200);
    assert.equal(roadsRequests.length, 2);
    assert.equal(
      await card.locator(".roads-item").count(),
      0,
      "Sheffield results must not appear",
    );
    assert.equal(
      await card.locator(".roads-active-label").innerText(),
      leeds.label,
    );
    await ctx.context.close();
    console.log(
      "PASS stale Roads response: earlier Sheffield result cannot replace newer Leeds location",
    );
  }

  // A single match arriving after the user chose geolocation does not take over.
  {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const ctx = await newPage(1440, {
      places: async (route) => {
        await gate;
        await placesByQuery(route).catch(() => {});
      },
      roads: (route) => route.fulfill({ json: fixture }),
    });
    const { page, card, roadsRequests } = ctx;
    await search(card).fill("Barnsley");
    await search(card).press("Enter");
    await card.getByRole("button", { name: "使用我的位置" }).click();
    await card
      .locator(".roads-active-label")
      .filter({ hasText: "你的当前位置" })
      .waitFor();
    release();
    await page.waitForTimeout(200);
    assert.equal(roadsRequests.length, 1);
    assert.deepEqual(roadsAt(roadsRequests[0]), [
      position.latitude,
      position.longitude,
    ]);
    assert.equal(
      await card.locator(".roads-active-label").innerText(),
      "你的当前位置",
    );
    await ctx.context.close();
    console.log(
      "PASS later location choice wins over a pending single-match search",
    );
  }

  // ---- Freshness: snapshots older than 30 minutes show no disruption claims ----
  for (const [name, now, data] of [
    [
      "30 min 1 s old",
      Date.parse(fixture.snapshotAt) + 30 * 60_000 + 1000,
      fixture,
    ],
    ["five weeks old (real clock)", null, fixture],
    ["stale empty snapshot", null, empty],
  ]) {
    const ctx = await newPage(390, {
      now,
      roads: (route) => route.fulfill({ json: data }),
    });
    const { card, roadsRequests } = ctx;
    await card.getByRole("button", { name: "使用我的位置" }).click();
    const stale = card.locator(".travel-stale");
    await stale.waitFor();
    assert.equal(roadsRequests.length, 1, "the lookup itself still runs");
    assert.match(await stale.innerText(), /暂无最新的附近道路异常信息/);
    assert.match(await stale.innerText(), /已超过 30 分钟/);
    assert.equal(
      await stale.locator("time").getAttribute("datetime"),
      fixture.snapshotAt,
    );
    assert.equal(
      await stale.locator("time").innerText(),
      formatUkDateTimeZh(fixture.snapshotAt),
    );
    assert.equal(
      await card
        .locator(".roads-item, .roads-summary, .provenance time")
        .count(),
      0,
    );
    const text = await card.innerText();
    for (const banned of [
      "M1",
      "A14",
      "Lane closures",
      "Fixture",
      "范围内有",
      "附近没有找到",
    ])
      assert(!text.includes(banned), `${name}: must not show ${banned}`);
    // Location and re-check stay usable; the official source is the fallback.
    assert.equal(
      await card.locator(".roads-active-label").innerText(),
      "你的当前位置",
    );
    assert(await card.getByRole("button", { name: "重新查询" }).isVisible());
    assert.equal(
      await card.locator(".source-label").getAttribute("href"),
      "https://nationalhighways.co.uk/travel-updates/",
    );
    await assertSafe(ctx, 390);
    await ctx.context.close();
    console.log(
      `PASS stale (${name}): no disruptions, counts or "none nearby"; snapshot time shown; official fallback and attribution`,
    );
  }
} finally {
  await browser.close();
}
