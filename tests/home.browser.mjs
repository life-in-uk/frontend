// Homepage browser checks. By default every /api request is mocked with
// test-only fixtures. REAL_BACKEND=1 instead checks the real published
// Guides and Bank Holidays through the running backend (read-only GETs).
import assert from "node:assert/strict";
import { LIVE_SERVICES_UI } from "../src/home/liveServicesI18n.ts";
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

// Met Office step for the current hour, as /api/weather/current returns it.
// Without a city (automatic), the backend answers the nearest city to CloudFront's approximate location
// (`detected`), or London by default.
const weatherFor = (city, { code = 7, temperature = 7.4, detected = null } = {}) => {
  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  return {
    city: city ?? detected ?? "london",
    citySource: city ? "requested" : detected ? "detected" : "default",
    forecastTime: hour.toISOString().replace(".000", ""),
    modelRunAt: new Date(hour.getTime() - 3 * 3600_000).toISOString().replace(".000", ""),
    fetchedAt: new Date().toISOString().replace(/\.\d{3}/, ""),
    temperatureC: temperature,
    feelsLikeC: temperature - 2.6,
    weatherCode: code,
    precipitationProbability: 20,
    attribution: "Data supplied by the Met Office",
  };
};

async function page(width, { guides = 200, holidays = 200, tube = null, weather = null, height = 900 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
  });
  const p = await context.newPage();
  const errors = [];
  const requests = [];
  // Completed requests only: in development, React StrictMode starts and aborts a first effect run.
  const finished = [];
  p.on("requestfinished", (r) => {
    const url = new URL(r.url());
    if (url.pathname.startsWith("/api/")) finished.push(url.pathname);
  });
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
      if (path === "/api/weather/current")
        return weather
          ? route.fulfill({ json: weather(new URL(route.request().url()).searchParams.get("city")) })
          : route.fulfill({ status: 503, json: { code: "WEATHER_NOT_CONFIGURED" } });
      return route.fulfill({ status: 404, json: {} });
    });
  }
  await p.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) =>
    route.abort(),
  );
  return { p, context, errors, requests, finished };
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
    const { p, context, errors, requests, finished } = await page(1440);
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
    // Live Services, directly under the search: heading and subtitle, the
    // headline and two market cards as "coming soon" placeholders (no value,
    // no link, no request), then four shortcuts. Underground status is read
    // from the stored snapshot (one no-store GET; never a provider call); Rail
    // is shown in development (production builds show "暂未开放", see
    // travel-production-isolation). No snapshot and no weather here: both
    // tiles say so and claim nothing.
    const live = p.locator(".live-panel");
    assert.equal(await live.locator("h2").innerText(), "实时服务");
    assert.equal(await live.locator(".live-subtitle").innerText(), "您的一站式英国实时生活信息中心");
    const cards = live.locator('.live-card[data-state="coming-soon"]');
    assert.deepEqual(await cards.locator(".live-card-label").allInnerTexts(), ["今日英国头条", "美国股指", "英国股指"]);
    assert.deepEqual(await cards.locator(".live-badge").allInnerTexts(), ["即将推出", "即将推出", "即将推出"]);
    assert.deepEqual(await cards.locator(".live-card-items").allInnerTexts(), [
      "S&P 500 · Nasdaq Composite · Dow Jones",
      "FTSE 100 · FTSE 250",
    ]);
    assert.equal(await cards.locator("a, button, input, select").count(), 0);
    // Placeholders carry no figures or source branding (only the index names' own numbers).
    const placeholderText = (await cards.allInnerTexts()).join(" ").replace(/S&P 500|FTSE 100|FTSE 250/g, "");
    assert.doesNotMatch(placeholderText, /\d|BBC|%|▲|▼/);
    const transport = live.locator(".live-shortcuts");
    await transport.locator('[data-tool="underground"] .transport-status[data-state="unavailable"]').waitFor();
    await transport.locator('[data-tool="weather"] .transport-status[data-state="unavailable"]').waitFor();
    assert.deepEqual(await transport.locator(".transport-item").evaluateAll((items) => items.map((el) => el.dataset.tool)),
      ["underground", "rail", "roads", "weather"]);
    assert.deepEqual(await transport.locator(".transport-status").allInnerTexts(), [
      "线路运行状态暂时无法获取",
      "车站延误查询",
      "按地点查附近道路异常",
      "天气暂时无法获取",
    ]);
    assert.deepEqual(
      await transport.locator("a.transport-item").evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/zh-CN/travel#underground", "/zh-CN/travel#rail", "/zh-CN/travel#roads"],
    );
    assert.equal(await live.locator("a.transport-all").getAttribute("href"), "/zh-CN/travel");
    assert.equal(await transport.locator(".weather-attribution").innerText(), "Data supplied by the Met Office");
    // The Rail tool's own label "车站延误查询" (station delay checker) is not a status.
    assert.doesNotMatch(
      (await transport.innerText()).replace("车站延误查询", ""),
      /Good Service|Delay|延误|拥堵|畅通|正常运行|实时|°C/,
    );
    assert.equal(await p.locator(".underground-card, .roads-card, .rail-card").count(), 0);
    if (!REAL)
      assert.deepEqual([...new Set(requests)].sort(), ["/api/bank-holidays", "/api/guides", "/api/guides/locales/zh-CN", "/api/travel/underground", "/api/weather/current"]);
    assert.equal(requests.filter((path) => path === "/api/travel/underground").length, 1);
    assert.equal(finished.filter((path) => path === "/api/weather/current").length, 1);
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
        const top = await p.locator(".live-panel").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
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

  if (!REAL) {
    // Weather tile: Met Office step for the current hour, automatic city, searchable selector, manual choice
    // remembered and overriding detection, every locale, Urdu RTL, phone width.
    const WEATHER = {
      "zh-CN": { condition: "多云", forecast: /^Met Office \d\d:00 预报，\d\d:00 发布（英国时间）$/, city: "爱丁堡" },
      "zh-TW": { condition: "多雲", forecast: /^Met Office \d\d:00 預報，\d\d:00 發布（英國時間）$/, city: "愛丁堡" },
      en: { condition: "Cloudy", forecast: /^Met Office forecast for \d\d:00, issued \d\d:00 \(UK time\)$/, city: "Edinburgh" },
      ur: { condition: "ابر آلود", forecast: /^Met Office کی پیشگوئی \d\d:00 کے لیے، \d\d:00 پر جاری \(برطانوی وقت\)$/, city: "ایڈنبرا" },
      hi: { condition: "बादल", forecast: /^Met Office पूर्वानुमान \d\d:00 के लिए, \d\d:00 पर जारी \(ब्रिटेन का समय\)$/, city: "एडिनबरा" },
    };
    for (const [locale, text] of Object.entries(WEATHER)) {
      const names = LIVE_SERVICES_UI[locale].weather;
      const { p, context, errors } = await page(390, { weather: (city) => weatherFor(city, { detected: "manchester" }), height: 844 });
      const asked = []; // the city parameter of each completed weather request ("" = automatic)
      p.on("requestfinished", (r) => { const u = new URL(r.url()); if (u.pathname === "/api/weather/current") asked.push(u.searchParams.get("city") ?? ""); });
      await p.addInitScript(() => {
        window.__geolocationCalls = 0;
        const count = () => { window.__geolocationCalls += 1; };
        Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: count, watchPosition: count } });
      });
      await p.goto(`${baseURL}/${locale}/`);
      const tile = p.locator('.weather-item[data-tool="weather"]');
      const button = tile.locator("button.weather-city");
      await tile.locator('.transport-status[data-state="fresh"]').waitFor();
      assert.equal(await tile.locator(".weather-temp").innerText(), "7°C");
      assert.equal(await tile.locator(".weather-condition").innerText(), text.condition);
      assert.match(await tile.locator(".transport-updated").innerText(), text.forecast);
      // Automatic: the backend's nearest city, labelled as automatic (not as the visitor's position).
      assert.equal(await button.locator(".weather-city-name").innerText(), names.cities.manchester);
      assert.equal(await tile.locator(".weather-city-auto").innerText(), names.autoTag);
      // The city name is shown in full on a phone (not cut off), whatever the language.
      assert.equal(await button.locator(".weather-city-name").evaluate((el) => el.scrollWidth <= el.clientWidth), true, `${locale}: city name cut off`);
      assert.equal(await button.getAttribute("aria-label"), names.changeCity(names.cities.manchester));
      assert.equal(await button.getAttribute("aria-expanded"), "false");
      assert.ok(asked.length >= 1 && asked.every((city) => city === ""), `automatic requests: ${asked}`);
      // Searchable selector: opens with focus in the search box; English search works in every language.
      await button.click();
      const dialog = tile.locator('[role="dialog"]');
      await dialog.waitFor();
      assert.equal(await button.getAttribute("aria-expanded"), "true");
      assert.equal(await dialog.locator('[role="combobox"]').evaluate((el) => el === document.activeElement), true);
      assert.equal(await dialog.locator('[role="option"]').count(), 8);
      await p.keyboard.type("edin");
      assert.deepEqual(await dialog.locator('[role="option"]').allInnerTexts(), [names.cities.edinburgh]);
      await p.keyboard.press("Enter");
      await dialog.waitFor({ state: "detached" });
      assert.equal(await button.evaluate((el) => el === document.activeElement), true, "focus back on the city button");
      await p.waitForFunction((name) => document.querySelector(".weather-item .weather-city-name")?.textContent === name
        && document.querySelector(".weather-item [data-state='fresh']") !== null, text.city);
      assert.equal(await tile.locator(".weather-city-auto").count(), 0, "a manual choice is not marked automatic");
      for (let i = 0; i < 40 && !asked.includes("edinburgh"); i++) await p.waitForTimeout(50);
      assert.equal(asked.at(-1), "edinburgh");
      // Remembered for the next visit, and it overrides detection.
      asked.length = 0;
      await p.reload();
      await tile.locator('.transport-status[data-state="fresh"]').waitFor();
      assert.equal(await button.locator(".weather-city-name").innerText(), text.city);
      assert.ok(asked.length >= 1 && asked.every((city) => city === "edinburgh"), `after reload: ${asked}`);
      // Back to automatic from the selector.
      await button.click();
      await dialog.locator('[role="option"][data-entry="auto"]').click();
      await p.waitForFunction((name) => document.querySelector(".weather-item .weather-city-name")?.textContent === name, names.cities.manchester);
      assert.equal(await p.evaluate(() => localStorage.getItem("lifeinuk.weather.city")), null);
      // Escape closes without changing anything.
      await button.click();
      await p.keyboard.type("zzz");
      assert.equal(await dialog.locator('[role="status"]').innerText(), names.noMatch);
      await p.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      assert.equal(await button.locator(".weather-city-name").innerText(), names.cities.manchester);
      assert.equal(await p.evaluate(() => window.__geolocationCalls), 0, "no browser location request");
      const dir = await p.locator("main").getAttribute("dir");
      if (locale === "ur") assert.equal(dir, "rtl");
      else assert.notEqual(dir, "rtl");
      if (locale === "ur") {
        // RTL: the first tile (Underground) sits at the right of its row.
        const [first, second] = await p.locator(".live-shortcuts > li").evaluateAll((els) => els.slice(0, 2).map((el) => el.getBoundingClientRect().left));
        assert.ok(first > second, "Urdu shortcuts run right to left");
      }
      // Open selector on a phone: inside the viewport, no horizontal overflow.
      await button.click();
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 390, `${locale}: selector inside the screen (${box.x}, ${box.width})`);
      assert.equal(await noOverflow(p), true, `${locale} weather: overflow`);
      await p.keyboard.press("Escape");
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Unknown location: London by default, still labelled automatic; errors keep the picker usable.
    {
      const { p, context, errors } = await page(1280, { weather: (city) => weatherFor(city) });
      await p.goto(`${baseURL}/en/`);
      const button = p.locator(".weather-item button.weather-city");
      await p.locator('.weather-item .transport-status[data-state="fresh"]').waitFor();
      assert.equal(await button.locator(".weather-city-name").innerText(), "London");
      assert.equal(await p.locator(".weather-item .weather-city-auto").innerText(), "auto");
      // Desktop: the selector opens as a popover next to the tile, inside the viewport.
      await button.click();
      const box = await p.locator('.weather-item [role="dialog"]').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 1280 && box.width <= 300, `desktop popover ${JSON.stringify(box)}`);
      await p.keyboard.press("Escape");
      assert.deepEqual(errors, []);
      await context.close();
    }
    {
      // The automatic request fails (weather not configured): "unavailable", a neutral "City" label, and a city can
      // still be chosen; that request fails too and is shown the same way, with no page errors.
      const { p, context, errors } = await page(390);
      await p.goto(`${baseURL}/en/`);
      const tile = p.locator(".weather-item");
      await tile.locator('.transport-status[data-state="unavailable"]').waitFor();
      assert.equal(await tile.locator(".weather-city-name").innerText(), "City");
      assert.equal(await tile.locator(".weather-city-auto").count(), 0);
      await tile.locator("button.weather-city").click();
      await tile.locator('[role="option"][data-entry="leeds"]').click();
      await tile.locator('.transport-status[data-state="unavailable"]').waitFor();
      assert.equal(await tile.locator(".weather-city-name").innerText(), "Leeds");
      assert.deepEqual(errors, []);
      await context.close();
    }
    // A step that is no longer for the current hour is not shown; an unknown code shows the temperature only.
    {
      const old = (city) => ({ ...weatherFor(city), forecastTime: new Date(Date.now() - 3 * 3600_000).toISOString().replace(/\.\d{3}/, "") });
      const { p, context } = await page(1280, { weather: old });
      await p.goto(`${baseURL}/en/`);
      await p.locator('.weather-item .transport-status[data-state="unavailable"]').waitFor();
      assert.doesNotMatch(await p.locator(".weather-item").innerText(), /°C/);
      await context.close();
    }
    {
      const { p, context } = await page(1280, { weather: (city) => weatherFor(city, { code: 4 }) });
      await p.goto(`${baseURL}/en/`);
      await p.locator('.weather-item .transport-status[data-state="fresh"]').waitFor();
      assert.equal(await p.locator(".weather-condition").count(), 0);
      assert.equal(await p.locator(".weather-temp").innerText(), "7°C");
      await context.close();
    }
    // A long-open tab: the label names the step's hour and its issue time; the tile reads again just after
    // the hour ends, only while visible (a hidden tab reads when shown again), and 10 minutes after a failure.
    {
      const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}/, "");
      let fail = false;
      const served = [];
      const { p, context, errors, finished } = await page(1280);
      await p.route("**/api/weather/current*", async (route) => {
        // The step for the page's current hour, issued three hours before it.
        const now = await p.evaluate(() => Date.now());
        const hour = Math.floor(now / 3_600_000) * 3_600_000;
        served.push(iso(hour));
        if (fail) return route.fulfill({ status: 502, json: { code: "WEATHER_UNAVAILABLE" } });
        return route.fulfill({ json: { ...weatherFor("london"), forecastTime: iso(hour), modelRunAt: iso(hour - 3 * 3_600_000), fetchedAt: iso(now) } });
      });
      const reads = () => finished.filter((path) => path === "/api/weather/current").length;
      // Request events reach the test a moment after the page updates: wait (real time) for the expected count.
      const readsReach = async (n) => {
        for (let i = 0; i < 100 && reads() < n; i++) await new Promise((resolve) => setTimeout(resolve, 50));
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(reads(), n, `weather reads: ${JSON.stringify(served)}`);
      };
      const setVisible = (visible) => p.evaluate((v) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (v ? "visible" : "hidden") });
        document.dispatchEvent(new Event("visibilitychange"));
      }, visible);
      await p.clock.install({ time: new Date("2026-11-19T08:20:00Z") });
      await p.goto(`${baseURL}/en/`);
      const tile = p.locator(".weather-item");
      await tile.locator('.transport-status[data-state="fresh"]').waitFor();
      assert.equal(await tile.locator(".transport-updated").innerText(), "Met Office forecast for 08:00, issued 05:00 (UK time)");
      assert.equal(await tile.locator(".transport-updated time").getAttribute("datetime"), "2026-11-19T08:00:00Z");
      await readsReach(1);
      await p.clock.fastForward("30:00"); // 08:50: still the 08:00 hour, no read
      await readsReach(1);
      await setVisible(false);
      await p.clock.fastForward("40:00"); // 09:30, hidden: the 08:00 step is no longer shown and nothing is read
      await tile.locator('.transport-status[data-state="unavailable"]').waitFor();
      await readsReach(1);
      await setVisible(true); // shown again: one read, the 09:00 step
      await p.waitForFunction(() => document.querySelector(".weather-item time")?.getAttribute("datetime") === "2026-11-19T09:00:00Z");
      assert.equal(await tile.locator(".transport-updated").innerText(), "Met Office forecast for 09:00, issued 06:00 (UK time)");
      await readsReach(2);
      fail = true;
      await p.clock.fastForward("31:00"); // 10:01: the hour ended; the read fails
      await tile.locator('.transport-status[data-state="unavailable"]').waitFor();
      await readsReach(3);
      await p.clock.fastForward("05:00");
      await readsReach(3); // no retry within 10 minutes of a failure
      fail = false;
      await p.clock.fastForward("05:30"); // 10 minutes after the failure: one retry
      await tile.locator('.transport-status[data-state="fresh"]').waitFor();
      await readsReach(4);
      // In development React StrictMode starts and aborts one extra first request; completed reads are counted above.
      assert.deepEqual(served.filter((hour, i) => i === 0 || hour !== "2026-11-19T08:00:00Z"),
        ["2026-11-19T08:00:00Z", "2026-11-19T09:00:00Z", "2026-11-19T10:00:00Z", "2026-11-19T10:00:00Z"]);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // A re-read in flight is never aborted or duplicated by the tab being hidden and shown again.
    {
      const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}/, "");
      let hold = null;
      const { p, context, errors, requests } = await page(1280);
      const aborted = [];
      p.on("requestfailed", (r) => { if (new URL(r.url()).pathname === "/api/weather/current") aborted.push(r.failure()?.errorText); });
      await p.route("**/api/weather/current*", async (route) => {
        const now = await p.evaluate(() => Date.now());
        const hour = Math.floor(now / 3_600_000) * 3_600_000;
        if (hold) await hold.promise;
        return route.fulfill({ json: { ...weatherFor("london"), forecastTime: iso(hour), modelRunAt: iso(hour - 3 * 3_600_000), fetchedAt: iso(now) } });
      });
      const started = () => requests.filter((path) => path === "/api/weather/current").length;
      const setVisible = (visible) => p.evaluate((v) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (v ? "visible" : "hidden") });
        document.dispatchEvent(new Event("visibilitychange"));
      }, visible);
      await p.clock.install({ time: new Date("2026-11-19T08:20:00Z") });
      await p.goto(`${baseURL}/en/`);
      const tile = p.locator(".weather-item");
      await tile.locator('.transport-status[data-state="fresh"]').waitFor();
      await new Promise((resolve) => setTimeout(resolve, 300));
      aborted.length = 0; // development StrictMode aborts one extra first request
      const before = started();
      let release;
      hold = { promise: new Promise((resolve) => { release = resolve; }) };
      await p.clock.fastForward("41:30"); // 09:01:30: the hourly re-read starts and is held
      for (let i = 0; i < 100 && started() === before; i++) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(started(), before + 1);
      for (let i = 0; i < 3; i++) {
        await setVisible(false);
        await setVisible(true);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.equal(started(), before + 1, "visibility changes started another read");
      assert.deepEqual(aborted, [], "the read in flight was aborted");
      release();
      await p.waitForFunction(() => document.querySelector(".weather-item time")?.getAttribute("datetime") === "2026-11-19T09:00:00Z");
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.equal(started(), before + 1);
      assert.deepEqual(aborted, []);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Live data never moves the layout below the section: same height loading and loaded.
    {
      const { p, context } = await page(390, { weather: (city) => weatherFor(city), tube: underground(3), height: 844 });
      await p.goto(`${baseURL}/en/`);
      await p.locator('.weather-item .transport-status[data-state="fresh"]').waitFor();
      await p.locator('.transport-item[data-tool="underground"] .transport-status[data-state="fresh"]').waitFor();
      const shift = await p.evaluate(() => new Promise((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value; })
          .observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(total), 500);
      }));
      assert.ok(shift < 0.1, `layout shift ${shift}`);
      await context.close();
    }
    console.log("PASS Live Services weather: current-hour Met Office step with issue time, automatic city, searchable selector, manual choice remembered and overriding detection, no geolocation × 5 locales, Urdu RTL; default London; errors; old step hidden; long-open tab re-reads hourly, only when visible, 10 min after failure, never aborts or duplicates a read in flight; CLS < 0.1");
  }

  // Responsive: no horizontal overflow, usable touch targets, screenshots.
  for (const width of WIDTHS) {
    const { p, context } = await page(width);
    await p.goto(`${baseURL}/`);
    await loaded(p);
    await p.locator(".holiday-panel .holiday-name, .holiday-panel .holiday-message").first().waitFor();
    assert.equal(await noOverflow(p), true, `overflow at ${width}`);
    const small = await p
      .locator(".masthead a, .topic-card a, .home-search-button, .transport-item, .weather-city")
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
    // Live Services: market cards side by side; four equal shortcuts in one row on wide screens, 2 × 2 on phones.
    const boxes = (selector) => p.locator(selector).evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), width: Math.round(r.width) };
    }));
    const markets = await boxes(".live-markets .live-card");
    // Below 360px (e.g. 320) everything stacks in one column.
    if (width >= 360) assert.equal(markets[0].top, markets[1].top, `market cards side by side at ${width}`);
    else assert.ok(markets[1].top > markets[0].top, `market cards stacked at ${width}`);
    const tiles = await boxes(".live-shortcuts > li");
    const rows = new Set(tiles.map((tile) => tile.top)).size;
    assert.equal(rows, width > 1100 ? 1 : width >= 360 ? 2 : 4, `shortcut rows at ${width}`);
    assert.ok(Math.max(...tiles.map((t) => t.width)) - Math.min(...tiles.map((t) => t.width)) <= 1, `equal shortcuts at ${width}`);
    await p.screenshot({ path: `${screenshots}/home-${width}.png`, fullPage: true });
    await context.close();
  }
  console.log(`PASS responsive ${WIDTHS.join("/")}; screenshots in ${screenshots}`);
} finally {
  await browser.close();
}
