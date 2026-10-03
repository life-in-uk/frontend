import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import {
  isUndergroundResponse,
  formatUndergroundObservation,
} from "../src/underground/api.ts";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots =
  process.env.SCREENSHOT_DIR || "/tmp/life-uk-underground-review";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const fixture = {
  observedAt: "2026-10-03T15:47:08.441419123Z",
  lines: [
    {
      lineId: "central",
      lineName: "  Central — 地铁  ",
      statuses: [
        { severity: 10, description: " Status A! ", reason: null },
        {
          severity: -2,
          description: "Status B — “notice”",
          reason: "  Reason: café / 雨。\nSecond line.  ",
        },
        { severity: 10, description: " Status A! ", reason: "" },
        { severity: 0, description: "Status C", reason: " \n " },
      ],
    },
    {
      lineId: "alpha",
      lineName: "  Alpha & café — London  ",
      statuses: [
        {
          severity: 2147483647,
          description: "Long description " + "Unicode地铁".repeat(40),
          reason: "LongReason".repeat(60),
        },
      ],
    },
    {
      lineId: "empty-statuses",
      lineName: "Empty-status fixture",
      statuses: [],
    },
  ],
};
const unavailable = "Underground status is temporarily unavailable.";
const emptyMessage =
  "No Underground line status information was included in this observation.";

async function newPage(width) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    timezoneId: "America/Los_Angeles",
  });
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  const consoleErrors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return { context, page, requests, errors, consoleErrors };
}
async function assertPage(page, requests, errors, width) {
  assert.equal(
    await page.locator("h1").innerText(),
    "把英国日常，\n讲得亲切、清楚。",
  );
  assert.equal(await page.locator(".foundation-card").count(), 2);
  assert.equal(
    await page
      .locator(
        ".information-section:not(.underground-section) .information-card",
      )
      .count(),
    1,
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    width,
  );
  assert(
    requests.some((url) => new URL(url).pathname === "/api/travel/underground"),
  );
  assert(!requests.some((url) => new URL(url).hostname.endsWith("tfl.gov.uk")));
  assert.deepEqual(errors, []);
  const source = page.locator(".underground-card .source-label");
  assert((await source.innerText()).includes("Transport for London"));
  await source.focus();
  assert.equal(
    await source.evaluate((el) => getComputedStyle(el).outlineWidth),
    "3px",
  );
}
async function assertFacts(page, data) {
  const card = page.locator(".underground-card");
  await card.locator("time").waitFor();
  assert.deepEqual(
    await card.locator(".underground-line h3").allTextContents(),
    data.lines.map((line) => line.lineName),
  );
  for (let index = 0; index < data.lines.length; index++) {
    const line = card.locator(".underground-line").nth(index);
    const expected = data.lines[index];
    assert.deepEqual(
      await line.locator(".underground-description").allTextContents(),
      expected.statuses.map((status) => status.description),
    );
    assert.deepEqual(
      await line.locator(".underground-reason").allTextContents(),
      expected.statuses
        .filter(
          (status) => status.reason !== null && status.reason.trim().length > 0,
        )
        .map((status) => status.reason),
    );
  }
  assert.equal(
    await card.locator("time").getAttribute("datetime"),
    data.observedAt,
  );
  assert.equal(
    await card.locator("time").innerText(),
    `Source observed: ${formatUndergroundObservation(data.observedAt)} UK time`,
  );
  assert(!(await card.innerText()).includes("Live now"));
  assert.equal(await card.locator(".trust-badge").count(), 0);
}

try {
  if (!["1", "unavailable"].includes(process.env.REAL_BACKEND)) {
    for (const width of [1440, 390]) {
      const { context, page, requests, errors, consoleErrors } =
        await newPage(width);
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      await page.route("**/api/travel/underground", async (route) => {
        await gate;
        await route.fulfill({ json: fixture });
      });
      await page.goto(baseURL);
      const card = page.locator(".underground-card");
      await card
        .getByRole("status")
        .filter({ hasText: "Loading Underground" })
        .waitFor();
      assert.equal(await card.getAttribute("aria-busy"), "true");
      assert.equal(await card.locator(".underground-line").count(), 0);
      await page.getByRole("link", { name: "看看信息如何呈现" }).click();
      assert.equal(await page.evaluate(() => location.hash), "#information");
      await assertPage(page, requests, errors, width);
      release();
      await assertFacts(page, fixture);
      assert.equal(await card.getAttribute("aria-busy"), "false");
      assert.deepEqual(
        await card
          .locator(".underground-line")
          .first()
          .locator(".underground-description")
          .allTextContents(),
        [" Status A! ", "Status B — “notice”", " Status A! ", "Status C"],
      );
      assert.deepEqual(consoleErrors, []);
      await assertPage(page, requests, errors, width);
      await page.screenshot({
        path: `${screenshots}/fixture-${width}.png`,
        fullPage: true,
      });
      // The completed request is not repeated as time passes.
      const requestCount = requests.filter(
        (url) => new URL(url).pathname === "/api/travel/underground",
      ).length;
      await page.clock.install();
      await page.clock.runFor(120_000);
      assert.equal(
        requests.filter(
          (url) => new URL(url).pathname === "/api/travel/underground",
        ).length,
        requestCount,
      );
      await context.close();
      console.log(
        `PASS ${width}px: local loading, all lines/statuses, A/B/A repeats, exact wording/reasons, UK observedAt, long wrapping, keyboard focus, no TfL requests or polling`,
      );
    }
    const cases = [
      [
        "404",
        (route) =>
          route.fulfill({
            status: 404,
            json: {
              code: "UNDERGROUND_UNAVAILABLE",
              message: "private diagnostic",
            },
          }),
      ],
      [
        "500",
        (route) =>
          route.fulfill({
            status: 500,
            json: {
              code: "UNDERGROUND_READ_FAILED",
              message: "private diagnostic",
            },
          }),
      ],
      ["network", (route) => route.abort("failed")],
      [
        "invalid JSON",
        (route) =>
          route.fulfill({ contentType: "application/json", body: "{" }),
      ],
      [
        "partially valid DTO",
        (route) =>
          route.fulfill({
            json: {
              ...fixture,
              lines: [
                ...fixture.lines,
                {
                  lineId: "bad",
                  lineName: "bad",
                  statuses: [
                    {
                      severity: "10",
                      description: "unvalidated fact",
                      reason: null,
                    },
                  ],
                },
              ],
            },
          }),
      ],
    ];
    for (const [name, handle] of cases) {
      const { context, page, requests, errors } = await newPage(390);
      await page.route("**/api/travel/underground", handle);
      await page.goto(baseURL);
      const card = page.locator(".underground-card");
      await card.getByRole("status").filter({ hasText: unavailable }).waitFor();
      assert.equal(await card.locator(".underground-line,time").count(), 0);
      const text = await card.innerText();
      for (const banned of [
        "Status A",
        "Good Service",
        "unvalidated fact",
        "private diagnostic",
        "UNDERGROUND_READ_FAILED",
      ])
        assert(!text.includes(banned));
      await assertPage(page, requests, errors, 390);
      await context.close();
      console.log(
        `PASS ${name}: unavailable, no partial/fake facts or diagnostics, intact page`,
      );
    }
    {
      const { context, page, requests, errors } = await newPage(390);
      const data = { observedAt: fixture.observedAt, lines: [] };
      await page.route("**/api/travel/underground", (route) =>
        route.fulfill({ json: data }),
      );
      await page.goto(baseURL);
      const card = page.locator(".underground-card");
      await card
        .getByRole("status")
        .filter({ hasText: emptyMessage })
        .waitFor();
      assert.equal(
        await card.locator("time").getAttribute("datetime"),
        data.observedAt,
      );
      assert.equal(await card.locator(".underground-line").count(), 0);
      for (const banned of [
        unavailable,
        "Good Service",
        "No disruption",
        "running normally",
      ])
        assert(!(await card.innerText()).includes(banned));
      await assertPage(page, requests, errors, 390);
      await context.close();
      console.log(
        "PASS persisted empty snapshot: distinct neutral message, timestamp retained, no invented service facts",
      );
    }
    {
      const { context, page, requests, errors } = await newPage(390);
      await page.clock.install();
      await page.route("**/api/travel/underground", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({ json: fixture });
      });
      await page.goto(baseURL);
      await page
        .locator(".underground-card")
        .getByRole("status")
        .filter({ hasText: "Loading" })
        .waitFor();
      await page.clock.runFor(10_001);
      await page
        .locator(".underground-card")
        .getByRole("status")
        .filter({ hasText: unavailable })
        .waitFor();
      await assertPage(page, requests, errors, 390);
      await context.close();
      console.log("PASS deadline/abort: local unavailable state");
    }
    {
      const { context, page, errors } = await newPage(390);
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const aborted = [];
      page.on("requestfailed", (request) => {
        if (new URL(request.url()).pathname === "/api/travel/underground")
          aborted.push(request.failure());
      });
      await page.route("**/api/travel/underground", async (route) => {
        await gate;
        await route.fulfill({ json: fixture });
      });
      await page.goto(baseURL);
      await page
        .locator(".underground-card")
        .getByRole("status")
        .filter({ hasText: "Loading" })
        .waitFor();
      // Mount a separate instance and explicitly unmount it while its GET is pending.
      await page.evaluate(async () => {
        const [{ default: React }, { default: ReactDOM }, { UndergroundCard }] =
          await Promise.all([
            import("/node_modules/.vite/deps/react.js"),
            import("/node_modules/.vite/deps/react-dom_client.js"),
            import("/src/components/UndergroundCard.tsx"),
          ]);
        const host = document.createElement("div");
        host.id = "unmount-test";
        document.body.appendChild(host);
        globalThis.undergroundTestRoot = ReactDOM.createRoot(host);
        globalThis.undergroundTestRoot.render(
          React.createElement(UndergroundCard),
        );
      });
      await page
        .locator("#unmount-test .underground-card")
        .getByRole("status")
        .filter({ hasText: "Loading" })
        .waitFor();
      const previous = aborted.length;
      await page.evaluate(() => globalThis.undergroundTestRoot.unmount());
      await page.waitForTimeout(50);
      assert(
        aborted.length > previous,
        "Unmount must abort the pending request",
      );
      release();
      await page.waitForTimeout(50);
      assert.equal(
        await page.locator("#unmount-test .underground-card").count(),
        0,
      );
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        "PASS actual React unmount: pending request aborted; no stale rendering or runtime errors",
      );
    }
  } else {
    for (const width of [1440, 390]) {
      const { context, page, requests, errors, consoleErrors } =
        await newPage(width);
      const pending = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/travel/underground",
      );
      await page.goto(baseURL);
      const response = await pending;
      if (process.env.REAL_BACKEND === "unavailable") {
        assert.equal(response.status(), 404);
        const card = page.locator(".underground-card");
        await card
          .getByRole("status")
          .filter({ hasText: unavailable })
          .waitFor();
        assert.equal(await card.locator(".underground-line,time").count(), 0);
        for (const banned of [
          "Good Service",
          "Status A",
          "UNDERGROUND_UNAVAILABLE",
          "No Underground line status information",
        ]) {
          assert(!(await card.innerText()).includes(banned));
        }
        await assertPage(page, requests, errors, width);
        await page.screenshot({
          path: `${screenshots}/real-unavailable-${width}.png`,
          fullPage: true,
        });
        console.log(
          `PASS real ${width}px: HTTP 404; safe unavailable state; API paths ${JSON.stringify([...new Set(requests.filter((url) => new URL(url).pathname.startsWith("/api/")).map((url) => new URL(url).pathname))])}; zero TfL requests, no overflow, no runtime errors; browser console resource errors ${JSON.stringify(consoleErrors)}`,
        );
      } else {
        assert.equal(
          response.status(),
          200,
          "Real persisted Current State must be available",
        );
        const data = await response.json();
        assert.equal(isUndergroundResponse(data), true);
        assert(
          data.lines.length > 0,
          "Real line facts must be available for visible verification",
        );
        await assertFacts(page, data);
        await assertPage(page, requests, errors, width);
        assert.deepEqual(consoleErrors, []);
        await page.screenshot({
          path: `${screenshots}/real-${width}.png`,
          fullPage: true,
        });
        console.log(
          `PASS real ${width}px: HTTP 200; observedAt ${data.observedAt}; ${JSON.stringify(data.lines.map((line) => ({ line: line.lineName, statuses: line.statuses.map((status) => status.description) })))}; zero TfL data requests, no overflow, no console/runtime errors`,
        );
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
