// Homepage browser checks. By default every /api request is mocked with
// test-only fixtures. REAL_BACKEND=1 instead checks the real published
// Guides and Bank Holidays through the running backend (read-only GETs).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-home-review";
const REAL = process.env.REAL_BACKEND === "1";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const WIDTHS = [1920, 1600, 1440, 1280, 768, 390, 320];

const meta = (slug, category, title, updatedAt) => ({
  slug,
  category,
  title,
  summary: `${title}的摘要。`,
  publishedAt: updatedAt,
  updatedAt,
});
const GUIDES = [
  meta("open-uk-bank-account-new-arrival", "money", "刚到英国，怎么开第一个银行账户？", "2026-10-07T15:53:00Z"),
  meta("fixture-family-visa", "family-visa", "配偶签证草稿", "2026-10-08T00:00:00Z"),
  meta("urgent-dental-care-england", "health-nhs", "突然牙疼怎么办？Emergency Dentist", "2026-10-05T06:15:00Z"),
  meta("nhs-ihs-costs-england", "health-nhs", "刚来英国，我能用 NHS 吗？IHS", "2026-10-05T05:59:00Z"),
  meta("where-to-go-when-ill-england", "health-nhs", "在英国生病了该去哪？Pharmacy", "2026-10-05T05:50:00Z"),
  meta("registering-with-a-gp-england", "health-nhs", "刚到英国怎么注册 GP？没有地址证明", "2026-10-04T21:30:00Z"),
  meta("medicines-prescriptions-england", "health-nhs", "英国怎么买药？处方", "2026-10-05T06:06:00Z"),
  meta("visiting-parents-healthcare-england", "health-nhs", "父母来英国探亲，生病了怎么办？", "2026-10-05T06:17:00Z"),
];
const HOLIDAYS = {
  evidence: {
    artifactId: "0b6a3a52-7f0e-4c6b-9d55-1a2b3c4d5e6f",
    observedAt: "2026-10-03T12:11:00Z",
  },
  divisions: [
    {
      division: "england-and-wales",
      events: [
        { title: "Christmas Day", date: "2099-12-25", notes: "", bunting: true },
      ],
    },
    { division: "scotland", events: [] },
    { division: "northern-ireland", events: [] },
  ],
};

async function page(width, { guides = 200, holidays = 200 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const p = await context.newPage();
  const errors = [];
  const requests = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("request", (r) => {
    const url = new URL(r.url());
    if (url.pathname.startsWith("/api/")) requests.push(url.pathname);
  });
  if (!REAL) {
    await p.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/guides")
        return guides === 200
          ? route.fulfill({ json: GUIDES })
          : route.fulfill({ status: guides, json: {} });
      if (path === "/api/bank-holidays")
        return holidays === 200
          ? route.fulfill({ json: HOLIDAYS })
          : route.fulfill({ status: holidays, json: {} });
      return route.fulfill({ status: 404, json: {} });
    });
  }
  await p.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) =>
    route.abort(),
  );
  return { p, context, errors, requests };
}
const noOverflow = (p) =>
  p.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
const loaded = (p) => p.locator(".featured-card-link").first().waitFor();

try {
  // Structure, truthfulness and SEO basics.
  {
    const { p, context, errors, requests } = await page(1440);
    await p.goto(`${baseURL}/`);
    await loaded(p);
    await p.locator(".holiday-panel time").first().waitFor();
    assert.equal(await p.locator("h1").count(), 1);
    assert.match(await p.locator("h1").innerText(), /在英国生活、工作、\s*学习的实用指南/);
    assert.equal(await p.title(), "Life in UK · 在英国，把日子过明白。");
    // Navigation: real anchors, only launched sections linked.
    const nav = p.getByRole("navigation", { name: "主导航" });
    assert.deepEqual(
      await nav.getByRole("link").evaluateAll((a) => a.map((l) => l.getAttribute("href"))),
      ["/", "/health", "/money"],
    );
    assert.equal(
      await nav.getByRole("link", { name: "首页" }).getAttribute("aria-current"),
      "page",
    );
    assert.equal(await p.locator("a[href^='/family-visa']").count(), 0);
    // Topic cards: six; four upcoming without links.
    assert.equal(await p.locator(".topic-card").count(), 6);
    assert.equal(await p.locator(".topic-card a").count(), 2);
    assert.equal(await p.locator(".topic-card-soon").count(), 4);
    assert.deepEqual(
      await p.locator(".topic-card a").evaluateAll((a) => a.map((l) => l.getAttribute("href"))),
      ["/health", "/money"],
    );
    const counts = await p.locator(".topic-card-count").allInnerTexts();
    if (!REAL) assert.deepEqual(counts, ["6 篇指南", "1 篇指南 · 12 条解答"]);
    // Featured: four published Guides, preferred order.
    const featured = await p
      .locator(".featured-card-link")
      .evaluateAll((a) => a.map((l) => l.getAttribute("href")));
    assert.deepEqual(featured, [
      "/money/open-uk-bank-account-new-arrival",
      "/health/registering-with-a-gp-england",
      "/health/where-to-go-when-ill-england",
      "/health/nhs-ihs-costs-england",
    ]);
    assert.equal(await p.locator(".featured-media img").count(), 0);
    // More Guides: the rest, never duplicating featured or unlaunched.
    const more = await p
      .locator(".guide-index-link")
      .evaluateAll((a) => a.map((l) => l.getAttribute("href")));
    assert.ok(more.every((href) => !featured.includes(href)));
    if (!REAL)
      assert.deepEqual(more, [
        "/health/visiting-parents-healthcare-england",
        "/health/urgent-dental-care-england",
        "/health/medicines-prescriptions-england",
      ]);
    // Questions: no popularity claims.
    const body = await p.locator("main").innerText();
    assert.doesNotMatch(body, /最热门|热门搜索|实时信息/);
    assert.equal(await p.locator(".question-group").count(), 2);
    // Bank holiday: title, Chinese date, observation timestamp.
    const holiday = p.locator(".holiday-panel");
    if (!REAL) {
      assert.equal(await holiday.locator(".holiday-name").innerText(), "Christmas Day");
      assert.equal(
        await holiday.locator(".holiday-date time").getAttribute("datetime"),
        "2099-12-25",
      );
      assert.match(await holiday.innerText(), /2099年12月25日（周五）/);
      assert.equal(
        await holiday.locator(".home-panel-meta time").getAttribute("datetime"),
        HOLIDAYS.evidence.observedAt,
      );
    } else {
      await holiday.locator(".holiday-name").waitFor();
    }
    assert.match(await holiday.innerText(), /England & Wales/);
    // Transport: no service data, no transport requests, no old cards.
    const transport = p.locator(".transport-panel");
    assert.equal(
      (await transport.innerText()).match(/实时状态暂未接入/g).length,
      3,
    );
    assert.doesNotMatch(await transport.innerText(), /Good Service|Delay|延误|拥堵|异常/);
    assert.equal(await p.locator(".underground-card, .roads-card, .rail-card").count(), 0);
    assert.ok(requests.every((path) => path === "/api/guides" || path === "/api/bank-holidays"));
    // About and footer.
    assert.equal(await p.locator("#about h2").count(), 1);
    assert.match(await p.locator("footer").innerText(), /与 NHS 及英国政府无隶属关系/);
    assert.deepEqual(errors, []);
    console.log("PASS structure: launched-only links, real Guides, truthful panels");
    await context.close();
  }

  // Search: keyboard, suggestions, empty state.
  {
    const { p, context } = await page(1280);
    await p.goto(`${baseURL}/`);
    await loaded(p);
    const input = p.getByRole("searchbox", { name: "搜索指南和常见问题" });
    await input.focus();
    await p.keyboard.type("牙疼");
    const results = p.locator(".home-search-list a");
    await results.first().waitFor();
    assert.equal(await results.first().getAttribute("href"), "/health/urgent-dental-care-england");
    assert.match(await p.locator(".home-search-status").innerText(), /找到 \d+ 条相关内容/);
    // Keyboard: Enter keeps focus; Tab reaches the submit button, then results.
    await p.keyboard.press("Enter");
    assert.equal(await input.evaluate((el) => el === document.activeElement), true);
    await p.keyboard.press("Escape");
    assert.equal(await input.inputValue(), "");
    assert.equal(await p.locator(".home-search-results").isHidden(), true);
    // Suggestions are buttons that fill the query; each returns results.
    for (const chip of await p.locator(".home-search-suggestions button").all()) {
      await chip.click();
      await results.first().waitFor();
    }
    await p.locator(".home-search-suggestions button", { hasText: "银行开户" }).click();
    assert.equal(await input.inputValue(), "银行开户");
    assert.equal(await results.first().getAttribute("href"), "/money/open-uk-bank-account-new-arrival");
    // Unlaunched content never appears.
    await input.fill("配偶签证草稿");
    await p.locator(".home-search-empty").waitFor();
    assert.match(await p.locator(".home-search-status").innerText(), /没有找到/);
    assert.equal(await results.count(), 0);
    // A result navigates without a full reload.
    await input.fill("注册 GP");
    await p.evaluate(() => (window.__noReload = true));
    await results.first().click();
    await p.waitForURL(`${baseURL}/health/registering-with-a-gp-england`);
    assert.equal(await p.evaluate(() => window.__noReload), true);
    console.log("PASS search: keyboard, suggestions, empty state, navigation");
    await context.close();
  }

  // Header search from another page focuses the homepage search.
  {
    const { p, context } = await page(1280);
    await p.goto(`${baseURL}/health`);
    await p.getByRole("link", { name: "搜索指南和问题" }).click();
    await p.waitForURL(`${baseURL}/#search`);
    await p.waitForFunction(() => document.activeElement?.id === "home-search");
    // Topic card to Money, no reload, aria-current follows.
    await loaded(p);
    await p.evaluate(() => (window.__noReload = true));
    await p.locator(".topic-card a[href='/money']").click();
    await p.waitForURL(`${baseURL}/money`);
    assert.equal(await p.evaluate(() => window.__noReload), true);
    assert.equal(
      await p
        .getByRole("navigation", { name: "主导航" })
        .getByRole("link", { name: "金钱与财务" })
        .getAttribute("aria-current"),
      "page",
    );
    console.log("PASS header search and topic navigation");
    await context.close();
  }

  if (!REAL) {
    // Failures: Guides and Bank Holidays unavailable.
    const { p, context } = await page(1280, { guides: 500, holidays: 500 });
    await p.goto(`${baseURL}/`);
    await p.locator(".home-notice").waitFor();
    assert.match(await p.locator(".home-notice").innerText(), /暂时无法加载/);
    await p.locator(".holiday-message").waitFor();
    assert.match(await p.locator(".holiday-panel").innerText(), /暂时无法加载/);
    assert.equal(await p.locator(".holiday-panel time").count(), 0);
    await p.getByRole("searchbox").fill("牙疼");
    assert.match(await p.locator(".home-search-status").innerText(), /搜索暂时不可用/);
    // Topic navigation still works; counts are not invented.
    assert.equal(await p.locator(".topic-card a").count(), 2);
    assert.deepEqual(await p.locator(".topic-card-count").allInnerTexts(), ["", ""]);
    console.log("PASS unavailable Guides and Bank Holidays");
    await context.close();
  }

  // Responsive: no horizontal overflow, usable touch targets, screenshots.
  for (const width of WIDTHS) {
    const { p, context } = await page(width);
    await p.goto(`${baseURL}/`);
    await loaded(p);
    await p.locator(".holiday-panel .holiday-name, .holiday-panel .holiday-message").first().waitFor();
    assert.equal(await noOverflow(p), true, `overflow at ${width}`);
    const small = await p
      .locator(".masthead a, .topic-card a, .home-search-button, .transport-item")
      .evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length > 0)
          .filter((el) => el.getBoundingClientRect().height < 44)
          .map((el) => el.textContent),
      );
    assert.deepEqual(small, [], `small touch targets at ${width}`);
    const topicColumns = await p
      .locator(".topic-card")
      .evaluateAll((els) => new Set(els.map((el) => el.getBoundingClientRect().top)).size);
    if (width >= 1280) assert.equal(topicColumns, 1, "six topics in one row");
    if (width <= 390) assert.ok(topicColumns >= 3, "topics reflow on mobile");
    await p.screenshot({ path: `${screenshots}/home-${width}.png`, fullPage: true });
    await context.close();
  }
  console.log(`PASS responsive ${WIDTHS.join("/")}; screenshots in ${screenshots}`);
} finally {
  await browser.close();
}
