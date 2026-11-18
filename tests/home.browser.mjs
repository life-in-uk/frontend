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

// Stored Underground snapshot observed `ageMinutes` ago (the frontend's freshness limit is 15).
const underground = (ageMinutes, lines = [
  ["bakerloo", "Bakerloo", 10, "Good Service"],
  ["central", "Central", 9, "Minor Delays"],
  ["district", "District", 5, "Part Closure"],
  ["victoria", "Victoria", 10, "Good Service"],
]) => ({
  observedAt: new Date(Date.now() - ageMinutes * 60_000).toISOString(),
  lines: lines.map(([lineId, lineName, severity, description]) => ({
    lineId, lineName, statuses: [{ severity, description, reason: null }],
  })),
});

async function page(width, { guides = 200, holidays = 200, tube = null, height = 900 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
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
      if (path === "/api/travel/underground")
        return tube
          ? route.fulfill({ json: tube })
          : route.fulfill({ status: 404, json: { code: "UNDERGROUND_UNAVAILABLE" } });
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
    // Navigation: real anchors, only launched sections linked, grouped
    // into the five header categories (tests/site-header.browser.mjs covers the rest).
    const nav = p.getByRole("navigation", { name: "主导航" });
    assert.deepEqual(
      await nav.getByRole("button").evaluateAll((b) => b.map((el) => [el.textContent, el.getAttribute("aria-expanded")])),
      [["签证与移民", "false"], ["住房与日常生活", "false"], ["健康与教育", "false"], ["工作与财务", "false"], ["交通与出行", "false"]],
    );
    assert.deepEqual(
      await nav.locator("a").evaluateAll((a) => a.map((l) => l.getAttribute("href"))),
      ["/zh-CN", "/zh-CN/family-visa", "/zh-CN/work-visa", "/zh-CN/settlement", "/zh-CN/renting", "/zh-CN/health", "/zh-CN/money", "/zh-CN/travel"],
    );
    assert.equal(
      await nav.getByRole("link", { name: "首页", includeHidden: true }).getAttribute("aria-current"),
      "page",
    );
    // Topic cards: nine; two upcoming without links (Travel links to /travel).
    assert.equal(await p.locator(".topic-card").count(), 9);
    assert.equal(await p.locator(".topic-card a").count(), 7);
    assert.equal(await p.locator(".topic-card-soon").count(), 2);
    assert.deepEqual(
      await p.locator(".topic-card a").evaluateAll((a) => a.map((l) => l.getAttribute("href"))),
      ["/zh-CN/health", "/zh-CN/money", "/zh-CN/family-visa", "/zh-CN/work-visa", "/zh-CN/settlement", "/zh-CN/renting", "/zh-CN/travel"],
    );
    const counts = await p.locator(".topic-card-count").allInnerTexts();
    if (!REAL) assert.deepEqual(counts, ["6 篇指南", "1 篇指南 · 12 条解答", "1 篇指南", "", "", ""]);
    // Featured: four published Guides, preferred order.
    const featured = await p
      .locator(".featured-card-link")
      .evaluateAll((a) => a.map((l) => l.getAttribute("href")));
    assert.deepEqual(featured, [
      "/zh-CN/money/open-uk-bank-account-new-arrival",
      "/zh-CN/health/registering-with-a-gp-england",
      "/zh-CN/health/where-to-go-when-ill-england",
      "/zh-CN/health/nhs-ihs-costs-england",
    ]);
    assert.equal(await p.locator(".featured-media img").count(), 0);
    // More Guides: the rest, never duplicating featured or unlaunched.
    const more = await p
      .locator(".guide-index-link")
      .evaluateAll((a) => a.map((l) => l.getAttribute("href")));
    assert.ok(more.every((href) => !featured.includes(href)));
    if (!REAL)
      assert.deepEqual(more, [
        "/zh-CN/family-visa/fixture-family-visa",
        "/zh-CN/health/visiting-parents-healthcare-england",
        "/zh-CN/health/urgent-dental-care-england",
        "/zh-CN/health/medicines-prescriptions-england",
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
    // Transport, directly under the search: Underground status read from the
    // stored snapshot (one no-store GET; never a provider call), Roads and
    // Rail entries. Rail is shown in development (production builds show
    // "暂未开放", see travel-production-isolation). No snapshot here: the
    // Underground entry says so and claims no status.
    const transport = p.locator(".transport-panel");
    await transport.locator('[data-tool="underground"] .transport-status[data-state="unavailable"]').waitFor();
    assert.deepEqual(await transport.locator(".transport-status").allInnerTexts(), [
      "线路运行状态暂时无法获取",
      "按地点查附近道路异常",
      "车站延误查询",
    ]);
    assert.deepEqual(
      await transport.locator("a.transport-item").evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/zh-CN/travel#underground", "/zh-CN/travel#roads", "/zh-CN/travel#rail"],
    );
    assert.equal(await transport.locator("a.transport-all").getAttribute("href"), "/zh-CN/travel");
    // The Rail tool's own label "车站延误查询" (station delay checker) is not a status.
    assert.doesNotMatch(
      (await transport.innerText()).replace("车站延误查询", ""),
      /Good Service|Delay|延误|拥堵|畅通|正常运行|实时/,
    );
    assert.equal(await p.locator(".underground-card, .roads-card, .rail-card").count(), 0);
    if (!REAL)
      assert.deepEqual([...new Set(requests)].sort(), ["/api/bank-holidays", "/api/guides", "/api/travel/underground"]);
    assert.equal(requests.filter((path) => path === "/api/travel/underground").length, 1);
    assert.ok(!requests.some((path) => /^\/api\/(travel\/roads|places|rail)/.test(path)));
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
    assert.equal(await results.first().getAttribute("href"), "/zh-CN/health/urgent-dental-care-england");
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
    assert.equal(await results.first().getAttribute("href"), "/zh-CN/money/open-uk-bank-account-new-arrival");
    // Family & Visa is launched (locally), so its Guides are searchable.
    await input.fill("配偶签证草稿");
    await results.first().waitFor();
    assert.equal(await results.first().getAttribute("href"), "/zh-CN/family-visa/fixture-family-visa");
    // A query with no match shows the empty state.
    await input.fill("完全不存在的内容");
    await p.locator(".home-search-empty").waitFor();
    assert.match(await p.locator(".home-search-status").innerText(), /没有找到/);
    assert.equal(await results.count(), 0);
    // A result navigates without a full reload.
    await input.fill("注册 GP");
    await p.evaluate(() => (window.__noReload = true));
    await results.first().click();
    await p.waitForURL(`${baseURL}/zh-CN/health/registering-with-a-gp-england`);
    assert.equal(await p.evaluate(() => window.__noReload), true);
    console.log("PASS search: keyboard, suggestions, empty state, navigation");
    await context.close();
  }

  // Header search from another page focuses the homepage search.
  {
    const { p, context } = await page(1280);
    await p.goto(`${baseURL}/zh-CN/health`);
    await p.getByRole("link", { name: "搜索指南和问题" }).click();
    await p.waitForURL(`${baseURL}/zh-CN#search`);
    await p.waitForFunction(() => document.activeElement?.id === "home-search");
    // Topic card to Money, no reload, aria-current follows.
    await loaded(p);
    await p.evaluate(() => (window.__noReload = true));
    await p.locator(".topic-card a[href='/zh-CN/money']").click();
    await p.waitForURL(`${baseURL}/zh-CN/money`);
    assert.equal(await p.evaluate(() => window.__noReload), true);
    assert.equal(
      await p
        .getByRole("navigation", { name: "主导航" })
        .getByRole("link", { name: "金钱与财务", includeHidden: true })
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
    assert.equal(await p.locator(".topic-card a").count(), 7);
    assert.deepEqual(await p.locator(".topic-card-count").allInnerTexts(), ["", "", "", "", "", ""]);
    console.log("PASS unavailable Guides and Bank Holidays");
    await context.close();
  }

  if (!REAL) {
    // Underground on the homepage: fresh, stale and unavailable, in every locale.
    const LOCALES = {
      "zh-CN": { fresh: /4 条线路中有 2 条报告异常/, updated: /（英国时间）更新/, stale: /不是最新状态：最后更新于 .*（英国时间）/, none: "线路运行状态暂时无法获取" },
      "zh-TW": { fresh: /4 條路線中有 2 條/, updated: /（英國時間）更新/, stale: /不是最新狀態：最後更新於/, none: "路線營運狀態暫時無法取得" },
      en: { fresh: /2 of 4 lines reporting problems/, updated: /^Updated \d\d:\d\d \(UK time\)$/, stale: /^Not current: last updated .+ \(UK time\)$/, none: "Line status is unavailable right now" },
      ur: { fresh: /4/, updated: /برطانوی وقت/, stale: /تازہ نہیں/, none: "لائنوں کی صورتحال ابھی دستیاب نہیں" },
      hi: { fresh: /4/, updated: /ब्रिटेन का समय/, stale: /ताज़ा नहीं/, none: "लाइनों की स्थिति अभी उपलब्ध नहीं" },
    };
    for (const [locale, text] of Object.entries(LOCALES)) {
      for (const [state, tube] of [["fresh", underground(3)], ["stale", underground(16)], ["unavailable", null]]) {
        const { p, context, errors } = await page(390, { tube, height: 844 });
        await p.goto(`${baseURL}/${locale}/`);
        const item = p.locator('.transport-item[data-tool="underground"]');
        const status = item.locator(`.transport-status[data-state="${state}"]`);
        await status.waitFor();
        const shown = await item.innerText();
        if (state === "fresh") {
          assert.match(await status.locator(".transport-summary").innerText(), text.fresh);
          assert.match(await status.locator(".transport-updated").innerText(), text.updated);
          // Affected lines with TfL's own text, in TfL's order; good-service lines are not listed.
          assert.deepEqual(await item.locator(".transport-line").allInnerTexts(), ["Central: Minor Delays", "District: Part Closure"]);
          assert.equal(await status.locator("time").getAttribute("datetime"), tube.observedAt);
        } else {
          // Stale or missing data: no counts, no line statuses, nothing presented as current.
          assert.equal(await item.locator(".transport-line, .transport-summary").count(), 0);
          assert.doesNotMatch(shown, /Minor Delays|Part Closure|Good Service/);
          if (state === "stale") {
            assert.match(await status.innerText(), text.stale);
            assert.equal(await status.locator("time").getAttribute("datetime"), tube.observedAt);
          } else assert.equal(await status.innerText(), text.none);
        }
        // Reachable on a phone: the panel starts within the first screen (zh-CN) or just below it.
        const top = await p.locator(".transport-panel").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
        assert.ok(top < (locale === "zh-CN" ? 700 : 900), `${locale}: travel panel at ${top}px`);
        assert.equal(await noOverflow(p), true, `${locale} ${state}: overflow`);
        assert.deepEqual(errors, []);
        await context.close();
      }
    }
    // A snapshot that turns stale while the page is open stops being shown as current.
    {
      const { p, context } = await page(390, { tube: underground(14.9) });
      await p.clock.install();
      await p.goto(`${baseURL}/en/`);
      await p.locator('.transport-status[data-state="fresh"]').waitFor();
      await p.clock.fastForward("02:00");
      await p.locator('.transport-status[data-state="stale"]').waitFor();
      assert.equal(await p.locator(".transport-line").count(), 0);
      await context.close();
    }
    console.log("PASS homepage Underground status: fresh, stale (also while open), unavailable × 5 locales; panel near the top on mobile");
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
    if (width >= 1280) assert.ok(topicColumns === 3, "nine topics in three even rows (3 + 3 + 3)");
    if (width <= 390) assert.ok(topicColumns >= 3, "topics reflow on mobile");
    await p.screenshot({ path: `${screenshots}/home-${width}.png`, fullPage: true });
    await context.close();
  }
  console.log(`PASS responsive ${WIDTHS.join("/")}; screenshots in ${screenshots}`);
} finally {
  await browser.close();
}
