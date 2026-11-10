// Travel dialog behaviour on the homepage (development server, mocked APIs):
// accessible modal + tabs, focus restoration, lazy tool loading, no
// requests before a tool is shown, abort on close, Rail kept unavailable,
// and responsive geometry. Screenshots go to SCREENSHOT_DIR.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-travel-review";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });

const UNDERGROUND = {
  observedAt: "2026-10-03T15:47:08Z",
  lines: [
    {
      lineId: "central",
      lineName: "Central",
      statuses: [{ severity: 10, description: "Good Service", reason: null }],
    },
    {
      lineId: "victoria",
      lineName: "Victoria",
      statuses: [
        { severity: 9, description: "Minor Delays", reason: "Fixture reason." },
      ],
    },
  ],
};
const ROADS = {
  snapshotAt: "2026-10-03T15:45:00Z",
  relevanceRadiusMeters: 15000,
  disruptions: [
    {
      situationId: "s",
      recordId: "r",
      recordVersion: "1",
      descriptions: ["laneClosures"],
      type: { value: "laneClosures", extendedValue: null },
      cause: null,
      status: "active",
      startTime: null,
      endTime: "2026-10-03T18:00:00Z",
      distanceMeters: 3200,
      locations: [
        {
          description: "Fixture M1 northbound between J14 and J15",
          roads: [{ name: "M1", direction: "northBound", relativeDirection: null }],
          coordinates: [],
        },
      ],
    },
  ],
};
const FRESH_NOW = Date.parse(UNDERGROUND.observedAt) + 2 * 60_000;
const HOLIDAYS = {
  evidence: {
    artifactId: "12345678-1234-1234-1234-123456789abc",
    observedAt: "2026-10-03T12:11:04Z",
  },
  divisions: ["england-and-wales", "scotland", "northern-ireland"].map(
    (division) => ({
      division,
      events: [
        { title: "Christmas Day", date: "2026-12-25", notes: "", bunting: true },
      ],
    }),
  ),
};

async function newPage(width, { fresh = true, height, underground } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: height ?? (width > 800 ? 1000 : 844) },
    timezoneId: "Europe/London",
  });
  const api = [];
  const modules = [];
  await context.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    api.push(path);
    if (path === "/api/guides") return route.fulfill({ json: [] });
    if (path === "/api/bank-holidays") return route.fulfill({ json: HOLIDAYS });
    if (path === "/api/travel/underground")
      return underground ? underground(route) : route.fulfill({ json: UNDERGROUND });
    if (path === "/api/travel/roads") return route.fulfill({ json: ROADS });
    if (path === "/api/places/search")
      return route.fulfill({
        json: {
          query: "Leeds",
          places: [
            {
              id: "osgb-1",
              label: "Leeds, West Yorkshire",
              name: "Leeds",
              type: "city",
              area: null,
              region: "Yorkshire and the Humber",
              country: "England",
              latitude: 53.8,
              longitude: -1.55,
            },
          ],
          attribution: "Contains OS data © Crown copyright and database right 2026",
        },
      });
    return route.fulfill({ status: 404, json: {} });
  });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) =>
    route.abort(),
  );
  const page = await context.newPage();
  if (fresh) await page.clock.setFixedTime(FRESH_NOW);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/src/components/") || pathname.startsWith("/rail/"))
      modules.push(pathname);
  });
  return { context, page, api, modules, errors };
}
const dialog = (page) => page.locator("dialog.travel-dialog");
const entry = (page, tool) => page.locator(`.transport-item[data-tool="${tool}"]`);
const activeTab = (page) =>
  page.evaluate(() => ({
    role: document.activeElement?.getAttribute("role"),
    text: document.activeElement?.textContent,
    selected: document.activeElement?.getAttribute("aria-selected"),
  }));
// Unique travel API paths (development StrictMode mounts effects twice,
// aborting the first request, so counts are compared separately).
const travelApi = (api) => [
  ...new Set(api.filter((path) => /^\/api\/(travel|places|rail)/.test(path))),
];
const noOverflow = (page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );

try {
  // Homepage: entries are dialog triggers; nothing travel-related loads early.
  {
    const { context, page, api, modules, errors } = await newPage(1440);
    await page.goto(baseURL);
    await page.waitForLoadState("networkidle");
    const triggers = page.locator(".transport-list .transport-item");
    assert.equal(await triggers.count(), 3);
    for (const handle of await triggers.all()) {
      assert.equal(await handle.evaluate((el) => el.tagName), "BUTTON");
      assert.equal(await handle.getAttribute("aria-haspopup"), "dialog");
    }
    assert.equal(await page.locator(".transport-list a").count(), 0);
    assert.deepEqual(travelApi(api), [], "no travel API before opening");
    for (const name of ["UndergroundCard", "RoadsCard", "RailCard"])
      assert(
        !modules.some((path) => path.includes(name)),
        `${name} must not load before its tab is shown`,
      );
    assert.equal(await dialog(page).evaluate((el) => el.open), false);
    assert.match(
      await entry(page, "rail").innerText(),
      /铁路[\s\S]*暂未开放/,
    );
    await page.screenshot({ path: `${screenshots}/home-1440.png` });
    assert.deepEqual(errors, []);
    await context.close();
    console.log("PASS homepage: button triggers, no travel requests or tool code before opening");
  }

  // Keyboard: open, tabs, Esc, focus restoration, scroll lock, inert background.
  {
    const { context, page, api, modules, errors } = await newPage(1440);
    await page.goto(baseURL);
    await entry(page, "underground").focus();
    await page.keyboard.press("Enter");
    await page.locator(".travel-dialog .underground-line").first().waitFor();
    assert.equal(await dialog(page).evaluate((el) => el.matches(":modal")), true);
    assert.equal(
      await dialog(page).getAttribute("aria-labelledby"),
      await page.locator(".travel-dialog-head h2").getAttribute("id"),
    );
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.classList.contains("travel-dialog-open"),
      ),
      true,
    );
    assert.deepEqual(await activeTab(page), {
      role: "tab",
      text: "伦敦地铁",
      selected: "true",
    });
    assert(modules.some((path) => path.includes("UndergroundCard")));
    assert(!modules.some((path) => path.includes("RoadsCard")));
    assert.deepEqual(travelApi(api), ["/api/travel/underground"]);
    const undergroundRequests = api.length;
    // Roving tabindex and arrow keys (automatic activation, wrapping).
    assert.deepEqual(
      await page.locator(".travel-tab").evaluateAll((tabs) =>
        tabs.map((t) => t.tabIndex),
      ),
      [0, -1, -1],
    );
    await page.keyboard.press("ArrowRight");
    assert.equal((await activeTab(page)).text, "道路");
    await page.locator(".travel-dialog .roads-card").waitFor();
    assert(modules.some((path) => path.includes("RoadsCard")));
    assert.deepEqual(travelApi(api), ["/api/travel/underground"], "Roads waits for a search");
    await page.keyboard.press("End");
    assert.match((await activeTab(page)).text, /^铁路/);
    await page.keyboard.press("Home");
    assert.equal((await activeTab(page)).text, "伦敦地铁");
    await page.keyboard.press("ArrowLeft");
    assert.match((await activeTab(page)).text, /^铁路/);
    await page.keyboard.press("ArrowRight");
    assert.equal((await activeTab(page)).text, "伦敦地铁");
    // The Underground panel was kept: no further request on return.
    assert.equal(api.length, undergroundRequests);
    // Tab moves from the tab list into the open panel's content.
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() =>
        Boolean(
          document.activeElement?.closest('.travel-panel[data-tool="underground"]'),
        ),
      ),
      true,
    );
    // Background content is inert while open: it cannot take focus and
    // pointer input lands on the dialog, not the page behind it.
    assert.deepEqual(
      await page.evaluate(() => {
        const search = document.getElementById("home-search");
        const before = document.activeElement;
        search.focus();
        const focused = document.activeElement === search;
        before?.focus();
        const button = document.querySelector(".home-search-button");
        const box = button.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + 4, box.y + 4);
        return { focused, hitsDialog: hit?.closest("dialog") !== null };
      }),
      { focused: false, hitsDialog: true },
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.travel-dialog").open);
    await page.waitForFunction(
      () => document.activeElement?.dataset?.tool === "underground",
    );
    // The browser restores focus before React handles the close event, so
    // wait for the committed close: scroll unlocked and tools unmounted.
    await page.waitForFunction(
      () =>
        !document.documentElement.classList.contains("travel-dialog-open") &&
        document.querySelectorAll(".travel-panel").length === 0,
      null,
      { timeout: 2000 },
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log("PASS keyboard: modal, labelled, arrow/Home/End tabs, panel kept, inert background, Esc closes, focus restored, scroll unlocked");
  }

  // Close button and backdrop also close and restore focus.
  {
    const { context, page } = await newPage(1440);
    await page.goto(baseURL);
    await entry(page, "roads").click();
    await page.getByRole("button", { name: "关闭交通出行" }).click();
    await page.waitForFunction(() => document.activeElement?.dataset?.tool === "roads");
    await entry(page, "roads").click();
    await dialog(page).waitFor();
    await page.mouse.click(10, 10); // backdrop
    await page.waitForFunction(() => !document.querySelector("dialog.travel-dialog").open);
    await page.waitForFunction(() => document.activeElement?.dataset?.tool === "roads");
    await context.close();
    console.log("PASS close button and backdrop: close, focus restored");
  }

  // Closing while a request is pending aborts it; nothing renders late.
  {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const { context, page, errors } = await newPage(1440, {
      underground: async (route) => {
        await gate;
        await route.fulfill({ json: UNDERGROUND }).catch(() => {});
      },
    });
    const aborted = [];
    page.on("requestfailed", (request) => {
      if (new URL(request.url()).pathname === "/api/travel/underground")
        aborted.push(request.url());
    });
    await page.goto(baseURL);
    await entry(page, "underground").click();
    await page.locator(".travel-dialog .underground-card [role=status]").first().waitFor();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    assert(aborted.length >= 1, "closing aborts the pending request");
    release();
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".underground-line").count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log("PASS close while loading: request aborted, no late rendering");
  }

  // Rail without the development preview: clearly unavailable, no Rail code or data.
  {
    const { context, page, api, modules } = await newPage(1440);
    await page.goto(baseURL);
    await entry(page, "rail").click();
    const panel = page.locator('.travel-panel[data-tool="rail"]');
    await panel.locator(".travel-rail-unavailable").waitFor();
    const text = await panel.innerText();
    assert.match(text, /暂未开放/);
    assert.match(text, /审核完成前不提供查询，也不显示任何列车信息/);
    assert.equal(
      await panel.getByRole("link", { name: /National Rail/ }).getAttribute("href"),
      "https://www.nationalrail.co.uk/status-and-disruptions/",
    );
    assert.equal(await page.locator(".rail-card, .rail-check").count(), 0);
    assert(!modules.some((path) => path.includes("RailCard") || path.startsWith("/rail/")));
    assert(!api.some((path) => path.startsWith("/api/rail")));
    await context.close();
    console.log("PASS Rail unavailable: explicit notice, official fallback, no Rail code, stations or API");
  }

  // Responsive geometry and screenshots.
  for (const [width, height] of [
    [1920, 1080],
    [1440, 1000],
    [390, 844],
    [320, 640],
  ]) {
    const { context, page, errors } = await newPage(width, { height });
    await page.goto(baseURL);
    await page.waitForLoadState("networkidle");
    for (const tool of ["underground", "roads", "rail"]) {
      await entry(page, tool).click();
      const box = await dialog(page).boundingBox();
      if (width <= 640) {
        assert.equal(Math.round(box.width), width, `full width at ${width}`);
        assert.equal(Math.round(box.height), height, `full height at ${width}`);
      } else {
        assert.equal(Math.round(box.width), 1040, `desktop width at ${width}`);
        assert(Math.abs(box.x - (width - box.width) / 2) <= 1, "centred");
      }
      if (tool === "underground")
        await page.locator(".travel-dialog .underground-line").first().waitFor();
      if (tool === "roads") {
        const d = dialog(page);
        await d.getByRole("searchbox", { name: "搜索邮编、城镇或地点" }).fill("Leeds");
        await d.getByRole("button", { name: "搜索", exact: true }).click();
        await d.locator(".roads-item").first().waitFor();
      }
      if (tool === "rail") await dialog(page).locator(".travel-rail-unavailable").waitFor();
      assert.equal(
        await dialog(page).evaluate((el) => {
          const body = el.querySelector(".travel-dialog-body");
          return body.scrollWidth <= body.clientWidth;
        }),
        true,
        `no horizontal overflow in ${tool} at ${width}`,
      );
      assert.equal(await noOverflow(page), true);
      if ([1920, 1440, 390].includes(width))
        await page.screenshot({ path: `${screenshots}/dialog-${tool}-${width}.png` });
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog.travel-dialog").open);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log("PASS responsive: 1040px centred on desktop, full-screen on phones, no overflow");
} finally {
  await browser.close();
}
