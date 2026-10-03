// Uses an externally available Playwright installation; no project test dependency.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import {
  formatHolidayDate,
  isBankHolidaysResponse,
  londonCalendarDate,
  nextEnglandAndWalesHoliday,
} from "../src/bank-holidays/api.ts";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5176";
const screenshots =
  process.env.SCREENSHOT_DIR || "/tmp/life-uk-bank-holidays-review";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const fixture = {
  evidence: {
    artifactId: "12345678-1234-1234-1234-123456789abc",
    observedAt: "2026-10-03T12:11:04.878793Z",
  },
  divisions: [
    {
      division: "scotland",
      events: [
        {
          title: "Scottish fixture",
          date: "2026-10-04",
          notes: "",
          bunting: true,
        },
      ],
    },
    {
      division: "england-and-wales",
      events: [
        {
          title: "England and Wales API fixture",
          date: "2026-12-25",
          notes: "",
          bunting: true,
        },
        { title: "Past fixture", date: "2026-01-01", notes: "", bunting: true },
      ],
    },
    {
      division: "northern-ireland",
      events: [
        {
          title: "Northern Irish fixture",
          date: "2026-10-05",
          notes: "",
          bunting: true,
        },
      ],
    },
  ],
};

async function newPage(width, timezoneId = "Europe/London", fixedClock = true) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    timezoneId,
  });
  const page = await context.newPage();
  if (fixedClock)
    await page.clock.install({ time: new Date("2026-10-03T12:00:00Z") });
  const runtimeErrors = [];
  const consoleErrors = [];
  const requests = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => requests.push(request.url()));
  return { context, page, runtimeErrors, consoleErrors, requests };
}

async function assertHomepage(page, requests, runtimeErrors, width) {
  assert.equal(
    await page.locator("h1").innerText(),
    "把英国日常，\n讲得亲切、清楚。",
  );
  assert.equal(await page.locator(".foundation-card").count(), 2);
  assert.equal(await page.locator(".neighbourhood").count(), 1);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    width,
  );
  assert(
    requests.some((url) => new URL(url).pathname === "/api/bank-holidays"),
  );
  assert(!requests.some((url) => new URL(url).hostname.endsWith("gov.uk")));
  assert.deepEqual(runtimeErrors, []);
}

try {
  for (const [width, zone] of [
    [1440, "America/Los_Angeles"],
    [390, "Pacific/Kiritimati"],
  ]) {
    const { context, page, runtimeErrors, requests } = await newPage(
      width,
      zone,
    );
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/api/bank-holidays", async (route) => {
      await pending;
      await route.fulfill({ json: fixture });
    });
    await page.goto(baseURL);
    const card = page.locator(".information-card");
    await page.getByRole("status").filter({ hasText: "正在加载" }).waitFor();
    assert.equal(await card.getAttribute("aria-busy"), "true");
    assert(!(await card.innerText()).includes("England and Wales API fixture"));
    await page.getByRole("link", { name: "看看信息如何呈现" }).click();
    assert.equal(await page.evaluate(() => location.hash), "#information");
    await assertHomepage(page, requests, runtimeErrors, width);
    await page.screenshot({
      path: `${screenshots}/loading-${width}.png`,
      fullPage: true,
    });
    release();
    await card
      .getByRole("heading", { name: "England and Wales API fixture" })
      .waitFor();
    assert.equal(await card.getAttribute("aria-busy"), "false");
    assert.equal(
      await card.locator('time[datetime="2026-12-25"]').innerText(),
      "25 December 2026",
    );
    assert((await card.innerText()).includes("England & Wales"));
    assert(!(await card.innerText()).includes("Scottish fixture"));
    assert(!(await card.innerText()).includes("Northern Irish fixture"));
    assert(!(await card.innerText()).includes("Past fixture"));
    assert(!(await card.innerText()).includes(fixture.evidence.artifactId));
    await assertHomepage(page, requests, runtimeErrors, width);
    await context.close();
    console.log(
      `PASS ${width}px / ${zone}: loading, usable page, supplied title/date, regional selection, no overflow, no GOV.UK request`,
    );
  }

  const failures = [
    ["network", (route) => route.abort("failed")],
    [
      "404",
      (route) =>
        route.fulfill({
          status: 404,
          json: {
            code: "BANK_HOLIDAYS_UNAVAILABLE",
            message: "internal fixture",
          },
        }),
    ],
    [
      "500",
      (route) =>
        route.fulfill({
          status: 500,
          json: {
            code: "BANK_HOLIDAYS_INVALID_EVIDENCE",
            message: "internal fixture",
          },
        }),
    ],
    [
      "invalid DTO",
      (route) =>
        route.fulfill({ json: { evidence: fixture.evidence, divisions: [] } }),
    ],
    [
      "invalid JSON",
      (route) => route.fulfill({ contentType: "application/json", body: "{" }),
    ],
  ];
  for (const [name, handler] of failures) {
    const { context, page, requests, runtimeErrors } = await newPage(390);
    await page.route("**/api/bank-holidays", handler);
    await page.goto(baseURL);
    await page
      .getByRole("status")
      .filter({ hasText: "银行假日信息暂时无法加载" })
      .waitFor();
    const text = await page.locator(".information-card").innerText();
    for (const excluded of [
      "Christmas Day",
      "25 December",
      "England and Wales API fixture",
      "internal fixture",
      "BANK_HOLIDAYS",
      "状态示例",
      "本地展示样例",
    ])
      assert(!text.includes(excluded));
    assert.equal(await page.locator(".information-card time").count(), 0);
    await assertHomepage(page, requests, runtimeErrors, 390);
    await page.screenshot({
      path: `${screenshots}/failure-${name.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
    await context.close();
    console.log(
      `PASS ${name}: graceful unavailable, no fake fallback/internals, usable page, no runtime errors`,
    );
  }

  // A valid, exhausted calendar must not relabel past events as upcoming.
  {
    const { context, page } = await newPage(390);
    const past = structuredClone(fixture);
    past.divisions[1].events = [past.divisions[1].events[1]];
    await page.route("**/api/bank-holidays", (route) =>
      route.fulfill({ json: past }),
    );
    await page.goto(baseURL);
    await page
      .getByRole("status")
      .filter({ hasText: "没有今天或之后" })
      .waitFor();
    assert(
      !(await page.locator(".information-card").innerText()).includes(
        "Past fixture",
      ),
    );
    await context.close();
    console.log(
      "PASS exhausted calendar: explicit empty state, no historical holiday shown as upcoming",
    );
  }

  {
    const { context, page, requests, runtimeErrors } = await newPage(390);
    await page.route("**/api/bank-holidays", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: fixture });
    });
    await page.goto(baseURL);
    await page.getByRole("status").filter({ hasText: "正在加载" }).waitFor();
    await page.clock.runFor(10_001);
    await page
      .getByRole("status")
      .filter({ hasText: "暂时无法加载" })
      .waitFor();
    await assertHomepage(page, requests, runtimeErrors, 390);
    await context.close();
    console.log("PASS stalled request: deadline produces unavailable state");
  }

  // Real integration is deliberately opt-in; no acquisition or fixture substitution.
  if (process.env.REAL_BACKEND === "1") {
    for (const width of [1440, 390]) {
      const { context, page, requests, runtimeErrors, consoleErrors } =
        await newPage(width, "Europe/London", false);
      const result = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/bank-holidays" &&
          response.status() === 200,
      );
      await page.goto(baseURL);
      const response = await result;
      const data = await response.json();
      assert.equal(isBankHolidaysResponse(data), true);
      const holiday = nextEnglandAndWalesHoliday(data, londonCalendarDate());
      assert(
        holiday,
        "Existing backend evidence must contain an upcoming event",
      );
      const card = page.locator(".information-card");
      await card
        .getByRole("heading", { name: holiday.title, exact: true })
        .waitFor();
      assert.equal(
        await card.locator(`time[datetime="${holiday.date}"]`).innerText(),
        formatHolidayDate(holiday.date),
      );
      assert.equal(
        await card
          .locator(`time[datetime="${data.evidence.observedAt}"]`)
          .count(),
        1,
      );
      assert(!(await card.innerText()).includes(data.evidence.artifactId));
      assert.equal(await card.locator(".trust-badge").count(), 0);
      await assertHomepage(page, requests, runtimeErrors, width);
      assert.deepEqual(consoleErrors, []);
      await page.screenshot({
        path: `${screenshots}/real-${width}.png`,
        fullPage: true,
      });
      console.log(
        `PASS real backend ${width}px: HTTP ${response.status()}, england-and-wales, ${holiday.title}, ${holiday.date} (${formatHolidayDate(holiday.date)}), observation ${data.evidence.observedAt}, no console/runtime errors`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
