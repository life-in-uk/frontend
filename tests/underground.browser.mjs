import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import {
  isUndergroundResponse,
  formatUndergroundObservation,
} from "../src/underground/api.ts";
import {
  PRESENTATION_LABELS,
  classifyStatus,
  hasMeaningfulReason,
  lineColour,
  summariseLines,
} from "../src/underground/presentation.ts";
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
      lineId: "victoria",
      lineName: "Victoria",
      statuses: [
        { severity: 10, description: "Good Service", reason: null },
        { severity: 9, description: "Minor Delays", reason: "Fixture delay." },
        { severity: 6, description: "Severe Delays", reason: "  " },
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

async function newPage(width, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    timezoneId: "America/Los_Angeles",
    reducedMotion,
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
    const marker = await line
      .locator(".underground-marker")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const colour = lineColour(expected.lineId);
    assert.equal(
      marker,
      colour
        ? `rgb(${[1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16)).join(", ")})`
        : "rgba(0, 0, 0, 0)",
      `identity marker for ${expected.lineId}`,
    );
    const statuses = line.locator(".underground-status");
    for (let s = 0; s < expected.statuses.length; s++) {
      const status = expected.statuses[s];
      const presentation = classifyStatus(status);
      const item = statuses.nth(s);
      assert.equal(await item.getAttribute("data-presentation"), presentation);
      const led = item.locator(".underground-led");
      assert.equal(
        await led.getAttribute("aria-label"),
        PRESENTATION_LABELS[presentation],
      );
      const box = await led.boundingBox();
      assert(box.width >= 7 && box.width <= 9, "LED core is 7-9px");
      // The exact status text is visible beside the LED: colour is never the only signal.
      assert(await item.locator(".underground-description").isVisible());
    }
    // Reasons: collapsed by default, revealed exactly on demand, collapsible again.
    const reasons = expected.statuses
      .filter((status) => hasMeaningfulReason(status.reason))
      .map((status) => status.reason);
    const toggles = line.locator(".underground-toggle");
    assert.equal(await toggles.count(), reasons.length);
    assert.equal(
      await line.locator(".underground-reason").count(),
      reasons.length,
    );
    for (let r = 0; r < reasons.length; r++) {
      const toggle = toggles.nth(r);
      const reason = page.locator(
        `[id="${await toggle.getAttribute("aria-controls")}"]`,
      );
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await reason.isVisible(), false);
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert(await reason.isVisible());
      assert.equal(await reason.textContent(), reasons[r]);
      // Keyboard collapses it again, with a visible focus ring.
      await toggle.focus();
      assert.equal(
        await toggle.evaluate((el) => getComputedStyle(el).outlineWidth),
        "3px",
      );
      await page.keyboard.press("Enter");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await reason.isVisible(), false);
      await page.keyboard.press("Space");
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    }
  }
  const { affected, unclassified } = summariseLines(data.lines);
  const summary = await card.locator(".underground-summary").innerText();
  assert(
    summary.includes(`${affected} of ${data.lines.length}`) || affected === 0,
  );
  if (unclassified > 0)
    assert(summary.includes(`${unclassified} not classified`));
  assert.equal(
    await card.locator(".underground-reason:visible").count(),
    0,
    "every reason is collapsed again",
  );
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
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const { context, page } = await newPage(1440, reducedMotion);
      await page.route("**/api/travel/underground", (route) =>
        route.fulfill({ json: fixture }),
      );
      await page.goto(baseURL);
      const card = page.locator(".underground-card");
      await card.locator("time").waitFor();
      const animation = (state) =>
        card
          .locator(
            `.underground-status[data-presentation="${state}"] .underground-led`,
          )
          .first()
          .evaluate((el) => {
            const halo = getComputedStyle(el, "::after");
            return { name: halo.animationName, content: halo.content };
          });
      for (const state of ["normal", "disruption", "severe"]) {
        const { name } = await animation(state);
        assert.equal(
          name,
          reducedMotion === "reduce" ? "none" : "underground-led-breathe",
          `${state} LED under ${reducedMotion}`,
        );
      }
      // Unknown LEDs have no halo at all, animated or not.
      assert.equal((await animation("unknown")).content, "none");
      await context.close();
      console.log(
        `PASS LED motion (${reducedMotion}): breathing halo ${reducedMotion === "reduce" ? "disabled, static state kept" : "running"}; unknown LED unlit`,
      );
    }
    {
      // Desktop columns are independent stacks: a reason grows only its own column.
      const { context, page } = await newPage(1440, "reduce");
      await page.route("**/api/travel/underground", (route) =>
        route.fulfill({ json: fixture }),
      );
      await page.goto(baseURL);
      const card = page.locator(".underground-card");
      await card.locator("time").waitFor();
      const layout = () =>
        card.locator(".underground-line").evaluateAll((els) =>
          els.map((el) => {
            const box = el.getBoundingClientRect();
            const origin = el
              .closest(".underground-card")
              .getBoundingClientRect();
            return {
              id: el.dataset.lineId,
              x: Math.round(box.x - origin.x),
              y: Math.round(box.y - origin.y),
            };
          }),
        );
      const before = await layout();
      // DOM/backend order runs down the first column, then the second.
      assert.deepEqual(
        before.map((line) => line.id),
        fixture.lines.map((line) => line.lineId),
      );
      const half = Math.ceil(fixture.lines.length / 2);
      const [left, right] = [before.slice(0, half), before.slice(half)];
      assert(left.every((line) => line.x === left[0].x));
      assert(
        right.every((line) => line.x === right[0].x && line.x > left[0].x),
      );
      assert.equal(right[0].y, left[0].y, "both columns start together");
      for (const [name, column] of [
        ["Status B", 0],
        ["Minor Delays", 1],
      ]) {
        const toggle = card.getByRole("button", { name: new RegExp(name) });
        const opened = await layout();
        await toggle.click();
        const after = await layout();
        const other = column === 0 ? [half, after.length] : [0, half];
        assert.deepEqual(
          after.slice(...other),
          opened.slice(...other),
          `expanding ${name} must not move the other column`,
        );
      }
      for (const name of ["Status B", "Minor Delays"])
        await card.getByRole("button", { name: new RegExp(name) }).click();
      assert.deepEqual(
        await layout(),
        before,
        "collapsing restores the layout",
      );
      await context.close();
      console.log(
        "PASS desktop columns: backend order down each column; expanding a reason moves only its own column; collapse restores layout",
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
