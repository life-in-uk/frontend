// Family & Visa and Guide-domain isolation browser checks. Every /api request
// is mocked with neutral test-only fixtures; no backend or provider is used.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots =
  process.env.SCREENSHOT_DIR || "/tmp/life-uk-family-visa-review";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });

const stamp = "2026-10-06T08:00:00Z";
const meta = (slug, category, extra = {}) => ({
  slug,
  category,
  title: `Fixture 标题 ${slug}`,
  summary: `Fixture 摘要 ${slug}`,
  publishedAt: stamp,
  updatedAt: stamp,
  ...extra,
});
// Test-only fixtures: titles and text are placeholders, not Guide content.
const familyOne = meta("fixture-family-one", "family-visa");
const familyTwo = meta("fixture-family-two", "family-visa");
const healthWhere = meta("where-to-go-when-ill-england", "health-nhs");
const healthDental = meta("urgent-dental-care-england", "health-nhs");
// A Health-configured related slug that the API reports as family-visa.
const miscategorised = meta("registering-with-a-gp-england", "family-visa");
const healthOnlyList = [healthWhere, healthDental];
const mixedList = [healthWhere, familyOne, healthDental, familyTwo];

const familyDetail = {
  ...familyOne,
  content: [
    "# Fixture 标题 fixture-family-one",
    "",
    "Fixture 段落。[查看官方依据](#guide-evidence-one)",
    "",
    "Fixture 段落二。[查看官方依据](#guide-evidence-two)",
    "",
    "另一个分区的标题《突然牙疼怎么办》不会变成链接。",
    "",
    "[Fixture 内部链接](/family-visa/fixture-family-two)",
  ].join("\n"),
  sources: [
    {
      key: "example-fixture-source",
      organisation: "Fixture Organisation",
      title: "Fixture English source title",
      url: "https://example.test/english",
      accessedAt: stamp,
    },
    {
      key: "fixture-chinese-source",
      organisation: "Fixture 机构",
      title: "Fixture 中文来源标题",
      url: "https://example.test/chinese",
      accessedAt: stamp,
    },
  ],
  evidence: [
    {
      key: "one",
      statement: "Fixture 依据一。",
      supports: [
        {
          sourceKey: "example-fixture-source",
          locator: "Section 1；Part A",
          excerpt: "Fixture English excerpt",
          note: null,
        },
      ],
    },
    {
      key: "two",
      statement: "Fixture 依据二。",
      supports: [
        {
          sourceKey: "fixture-chinese-source",
          locator: "第 1 节",
          excerpt: "Fixture 中文摘录",
          note: null,
        },
      ],
    },
  ],
};
const healthWhereDetail = {
  ...healthWhere,
  content: "# Fixture 标题 where-to-go-when-ill-england\n\nFixture 正文。",
  sources: [],
  evidence: [],
};
const healthDentalDetail = {
  ...healthDental,
  content: "# Fixture 标题 urgent-dental-care-england\n\nFixture 正文。",
  sources: [],
  evidence: [],
};
const details = {
  [familyDetail.slug]: familyDetail,
  [healthWhereDetail.slug]: healthWhereDetail,
  [healthDentalDetail.slug]: healthDentalDetail,
};

/** list: array to serve, or "hang" / an HTTP status number. */
async function page(width, { list = mixedList } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const p = await context.newPage();
  const errors = [];
  const requests = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.route(/\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path === "/api/guides") {
      if (list === "hang") return new Promise(() => {});
      if (typeof list === "number")
        return route.fulfill({ status: list, json: {} });
      return route.fulfill({ json: list });
    }
    const match = /^\/api\/guides\/(.+)$/.exec(path);
    if (match)
      return details[match[1]]
        ? route.fulfill({ json: details[match[1]] })
        : route.fulfill({ status: 404, json: { code: "GUIDE_NOT_FOUND" } });
    // Home-page live cards are out of scope here.
    return route.fulfill({ status: 503, json: {} });
  });
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
// "全部指南" is a secondary, collapsed section under the guided journey.
async function openAllGuides(p) {
  const toggle = p.getByRole("button", { name: "全部指南" });
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
}
const appErrors = (errors) =>
  errors.filter((e) => !/503|404|500|Failed to load resource/.test(e));

try {
  // Hub: loading state.
  {
    const { p, context } = await page(1280, { list: "hang" });
    await p.goto(`${baseURL}/family-visa`);
    await p
      .getByRole("heading", { level: 1, name: "一份清单，理清每一步。" })
      .waitFor();
    await p.getByText("正在加载家庭与签证指南…").waitFor({ state: "attached" });
    assert.equal(await p.locator(".family-skeleton-card").count(), 3);
    assert.equal(await p.locator(".family-guide-card").count(), 0);
    assert.equal(await p.title(), "家庭与签证 · Life in UK");
    console.log("PASS hub loading: skeleton and status, no cards");
    await context.close();
  }

  // Hub: error state, with no fallback content.
  {
    const { p, context } = await page(1280, { list: 500 });
    await p.goto(`${baseURL}/family-visa`);
    await openAllGuides(p);
    await p.locator(".family-error").waitFor();
    assert.match(
      await p.locator(".family-error").textContent(),
      /暂时无法加载/,
    );
    assert.equal(
      await p.locator(".family-guide-card, .family-empty").count(),
      0,
    );
    console.log("PASS hub error: unavailable panel, no cards or empty state");
    await context.close();
  }

  // Hub: empty state when the API has no family-visa Guides.
  for (const width of [1280, 390, 320]) {
    const { p, context, errors } = await page(width, { list: healthOnlyList });
    await p.goto(`${baseURL}/family-visa`);
    await openAllGuides(p);
    await p.locator(".family-empty").waitFor();
    assert.match(
      await p.locator(".family-empty").textContent(),
      /指南正在整理中/,
    );
    assert.equal(await p.locator(".family-guide-card").count(), 0);
    // Health Guides never appear in the Family & Visa hub.
    assert.doesNotMatch(await p.locator("main").textContent(), /Fixture 标题/);
    assert.equal(await p.locator("main a[href^='/health']").count(), 0);
    assert.equal(await noOverflow(p), true, `empty overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/hub-empty-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(appErrors(errors), []);
    console.log(`PASS hub empty ${width}px: neutral empty state, no overflow`);
    await context.close();
  }

  // Hub: only family-visa Guides, in backend order, linked under the domain.
  for (const width of [1280, 390]) {
    const { p, context, errors } = await page(width);
    await p.goto(`${baseURL}/family-visa`);
    await openAllGuides(p);
    await p.locator(".family-guide-card").first().waitFor();
    assert.deepEqual(
      await p
        .locator(".family-guide-card a")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/family-visa/fixture-family-one", "/family-visa/fixture-family-two"],
    );
    assert.doesNotMatch(
      await p.locator("main").textContent(),
      /where-to-go-when-ill|urgent-dental-care/,
    );
    assert.equal(await noOverflow(p), true, `ready overflow at ${width}`);
    assert.deepEqual(appErrors(errors), []);
    console.log(`PASS hub ready ${width}px: family Guides only, domain links`);
    await context.close();
  }

  // Review surface: not linked from navigation, the homepage or Health.
  {
    const { p, context } = await page(1280, { list: healthOnlyList });
    for (const path of ["/", "/health", "/family-visa"]) {
      await p.goto(`${baseURL}${path}`);
      await p.locator("main").waitFor();
      await p.waitForLoadState("networkidle");
      // The hub itself links only to its own special-circumstances topic.
      assert.deepEqual(
        await p
          .locator("a[href^='/family-visa']")
          .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
        path === "/family-visa"
          ? ["/family-visa/topics/children-from-previous-relationship"]
          : [],
        `family-visa links on ${path}`,
      );
      assert.equal(
        await p
          .getByRole("navigation", { name: "主导航" })
          .getByRole("link")
          .count(),
        1,
      );
    }
    console.log(
      "PASS not promoted: no /family-visa links in nav, home or Health",
    );
    await context.close();
  }

  // A family-visa Guide renders under /family-visa with domain-aware links.
  for (const width of [1280, 390, 320]) {
    const { p, context, errors } = await page(width);
    await p.goto(`${baseURL}/family-visa/${familyOne.slug}`);
    await p.locator(".guide-body").waitFor();
    assert.equal(await p.locator("h1").textContent(), familyOne.title);
    assert.equal(await p.locator(".guide-kicker").textContent(), "家庭与签证");
    assert.deepEqual(await p.locator(".breadcrumb li").allTextContents(), [
      "首页",
      "家庭与签证",
      familyOne.title,
    ]);
    assert.equal(
      await p.locator(".breadcrumb a").nth(1).getAttribute("href"),
      "/family-visa",
    );
    assert.equal(
      await p
        .getByRole("link", { name: "回到家庭与签证" })
        .getAttribute("href"),
      "/family-visa",
    );
    // A title belonging to another domain stays plain text.
    assert.equal(await p.locator(".guide-body a.guide-reference").count(), 0);
    assert.match(
      await p.locator(".guide-body").textContent(),
      /《突然牙疼怎么办》/,
    );
    assert.equal(await p.locator(".guide-body a[href^='/health']").count(), 0);
    assert.equal(
      await p
        .getByRole("link", { name: "Fixture 内部链接" })
        .getAttribute("href"),
      "/family-visa/fixture-family-two",
    );
    // No related Guides are configured for Family & Visa yet.
    assert.equal(await p.locator(".related-guides").count(), 0);
    // Evidence: language hints follow the source text; the Health-only
    // example-price label is never applied outside Health.
    for (const toggle of await p.locator(".evidence-toggle").all())
      await toggle.click();
    assert.equal(await p.locator(".evidence-panel").count(), 2);
    const english = p.locator(".evidence-source-link span", {
      hasText: "Fixture English source title",
    });
    assert.equal(await english.getAttribute("lang"), "en");
    const chinese = p.locator(".evidence-source-link span", {
      hasText: "Fixture 中文来源标题",
    });
    assert.equal(await chinese.getAttribute("lang"), null);
    assert.equal(
      await p
        .locator("dd", { hasText: "Section 1；Part A" })
        .getAttribute("lang"),
      "en",
    );
    assert.equal(
      await p.locator("dd", { hasText: "第 1 节" }).getAttribute("lang"),
      null,
    );
    assert.equal(await p.locator(".evidence-example-tag").count(), 0);
    assert.equal(await noOverflow(p), true, `detail overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/detail-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(appErrors(errors), []);
    console.log(
      `PASS family detail ${width}px: domain links, evidence, no overflow`,
    );
    await context.close();
  }

  // Cross-domain requests are treated as not found, without leaking content.
  {
    const { p, context } = await page(1280);
    await p.goto(`${baseURL}/family-visa/${healthWhere.slug}`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    assert.equal(await p.locator(".guide-body").count(), 0);
    assert.doesNotMatch(await p.locator("main").textContent(), /Fixture/);
    assert.equal(
      await p
        .getByRole("link", { name: "回到家庭与签证" })
        .getAttribute("href"),
      "/family-visa",
    );
    console.log("PASS /family-visa rejects a health-nhs Guide");

    await p.goto(`${baseURL}/health/${familyOne.slug}`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    assert.equal(await p.locator(".guide-body").count(), 0);
    assert.doesNotMatch(await p.locator("main").textContent(), /Fixture/);
    assert.equal(
      await p
        .getByRole("link", { name: "回到健康与 NHS" })
        .getAttribute("href"),
      "/health",
    );
    console.log("PASS /health rejects a family-visa Guide");

    // Each domain still accepts its own category.
    await p.goto(`${baseURL}/health/${healthWhere.slug}`);
    await p.locator(".guide-body").waitFor();
    assert.equal(
      await p.locator(".guide-kicker").textContent(),
      "健康与 NHS · 我现在生病了",
    );
    console.log("PASS /health accepts a health-nhs Guide");
    await context.close();
  }

  // Malformed and unknown slugs fail safely in the new domain.
  {
    const { p, context, requests } = await page(1280);
    await p.goto(`${baseURL}/family-visa/Bad..Slug`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    assert.ok(!requests.some((r) => r.includes("Bad..Slug")));
    await p.goto(`${baseURL}/family-visa/not-a-published-guide`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    // Malformed percent-encoding is covered by the router unit tests: the
    // Vite dev server answers such URLs itself before the app loads.
    for (const path of ["/family-visa/a/b", "/constructor"]) {
      await p.goto(`${baseURL}${path}`);
      await p.getByRole("heading", { name: "页面不存在" }).waitFor();
    }
    console.log("PASS malformed/unknown family-visa slugs fail safely");
    await context.close();
  }

  // Related Guides never cross domains, even if editorial config lists one.
  {
    const { p, context } = await page(1280, {
      list: [healthWhere, miscategorised, healthDental, familyOne],
    });
    await p.goto(`${baseURL}/health/${healthWhere.slug}`);
    await p.locator(".related-guides a").first().waitFor();
    assert.deepEqual(
      await p
        .locator(".related-guides a")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/health/urgent-dental-care-england"],
    );
    console.log("PASS related Guides stay within the Health domain");
    await context.close();
  }

  console.log(
    `Family & Visa browser checks passed; screenshots in ${screenshots}`,
  );
} finally {
  await browser.close();
}
