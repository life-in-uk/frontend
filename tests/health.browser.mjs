// Deterministic Health & NHS browser checks. Every /api request is mocked, so
// no backend or external provider is contacted.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-health-review";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });

const stamp = "2026-10-05T06:17:00Z";
const slugs = [
  "registering-with-a-gp-england",
  "where-to-go-when-ill-england",
  "nhs-ihs-costs-england",
  "visiting-parents-healthcare-england",
  "medicines-prescriptions-england",
  "chinese-medical-records-vaccinations-england",
  "nhs-interpreter-language-help-england",
  "nhs-dentist-england",
  "urgent-dental-care-england",
];
const list = slugs.map((slug) => ({
  slug,
  category: "health-nhs",
  title: `Fixture 标题 ${slug}`,
  summary: `Fixture 摘要 ${slug}`,
  publishedAt: stamp,
  updatedAt: stamp,
}));
const dentist = {
  ...list.find((g) => g.slug === "nhs-dentist-england"),
  content: [
    "# Fixture 标题 nhs-dentist-england",
    "",
    "> 这篇讲的是**英格兰（England）**的情况。苏格兰、威尔士和北爱尔兰以后单独写。",
    "",
    "## 收费",
    "",
    "NHS 牙科有三档收费。[查看官方依据](#guide-evidence-bands)",
    "",
    "- 第一档 *检查* [查看官方依据](#guide-evidence-band-one)",
    "- 第二档",
    "",
    "1. 先打电话",
    "2. 再预约",
    "",
    "自费价格举例：某诊所皇冠 £800 起。[查看官方依据](#guide-evidence-private-example)",
    "",
    "这一条的依据缺失。[查看官方依据](#guide-evidence-missing-key)",
    "",
    "突然牙疼，看《突然牙疼怎么办》。外部文件《You and your general practice》不链接。",
    "",
    "## 官方资料",
    "",
    "- NHS：https://www.nhs.uk/nhs-services/dentists/dental-costs/",
    "",
    "最后更新：2026 年 10 月 5 日",
  ].join("\n"),
  sources: [
    {
      key: "nhs-dental-costs",
      organisation: "NHS（NHS.uk）",
      title: "Dental costs",
      url: "https://www.nhs.uk/nhs-services/dentists/dental-costs/",
      accessedAt: "2026-10-05T06:11:45Z",
    },
    {
      key: "example-whites-dental-fees",
      organisation: "Whites Dental",
      title: "Fees（诊所自行公布的价格，仅作举例）",
      url: "https://example-clinic.test/fees",
      accessedAt: "2026-10-05T06:11:45Z",
    },
  ],
  evidence: [
    {
      key: "bands",
      statement: "NHS 牙科治疗按三档收费。",
      supports: [
        {
          sourceKey: "nhs-dental-costs",
          locator: "NHS dental charges",
          excerpt: "Fixture excerpt text",
          note: "Fixture 说明",
        },
      ],
    },
    {
      key: "band-one",
      statement: "第一档包括检查。",
      supports: [
        {
          sourceKey: "nhs-dental-costs",
          locator: "Band 1",
          excerpt: null,
          note: null,
        },
      ],
    },
    {
      key: "private-example",
      statement: "自费价格因诊所而异，此处仅作举例。",
      supports: [
        {
          sourceKey: "example-whites-dental-fees",
          locator: "Crowns",
          excerpt: null,
          note: "诊所自行公布",
        },
      ],
    },
  ],
};
const urgent = {
  ...list.find((g) => g.slug === "urgent-dental-care-england"),
  content: "# Fixture 标题 urgent-dental-care-england\n\n急诊正文。",
  sources: [],
  evidence: [],
};

async function page(width, { listStatus = 200, detailStatus = 200 } = {}) {
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
    if (path === "/api/guides")
      return listStatus === 200
        ? route.fulfill({ json: list })
        : route.fulfill({
            status: listStatus,
            json: { code: "GUIDES_READ_FAILED" },
          });
    const match = /^\/api\/guides\/(.+)$/.exec(path);
    if (match) {
      const detail = { [dentist.slug]: dentist, [urgent.slug]: urgent }[
        match[1]
      ];
      if (detailStatus !== 200)
        return route.fulfill({
          status: detailStatus,
          json: { code: "GUIDES_READ_FAILED" },
        });
      return detail
        ? route.fulfill({ json: detail })
        : route.fulfill({
            status: 404,
            json: { code: "GUIDE_NOT_FOUND", message: "Guide not found." },
          });
    }
    // Other home-page cards are out of scope here.
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
const guideErrors = (errors) =>
  errors.filter((e) => !/503|Failed to load resource/.test(e));

try {
  // Home entry → Hub, without a full reload.
  {
    const { p, context, errors } = await page(1280);
    await p.goto(`${baseURL}/`);
    await p.evaluate(() => (window.__noReload = true));
    await p.getByRole("link", { name: "进入健康与 NHS" }).click();
    await p.waitForURL(`${baseURL}/health`);
    await p.getByRole("heading", { level: 1, name: "健康与 NHS" }).waitFor();
    assert.equal(await p.evaluate(() => window.__noReload), true);
    assert.equal(
      await p
        .getByRole("navigation", { name: "主导航" })
        .getByRole("link", { name: "健康与 NHS" })
        .getAttribute("aria-current"),
      "page",
    );
    await p.locator(".category-card").first().waitFor();
    // Product surface: brand slogan, no internal design-system label,
    // independence note in the footer, hero artwork and 999 panel.
    assert.equal(
      await p.locator(".brand-caption").textContent(),
      "在英国，把日子过明白。",
    );
    assert.equal(await p.locator(".internal-label").count(), 0);
    assert.match(
      await p.locator("footer").textContent(),
      /与 NHS 及英国政府无隶属关系/,
    );
    // The supplied local hero photo loads (no remote images).
    const heroImage = p.locator(".health-hero-image");
    assert.equal(await heroImage.isVisible(), true);
    assert.equal(
      await heroImage.getAttribute("src"),
      "/images/health/health-nhs-hero.png",
    );
    assert.ok(await heroImage.evaluate((img) => img.naturalWidth > 0));
    // Compact action row: calm 999 action and the "where to go" Guide.
    const emergency = p.locator(".health-emergency");
    assert.match(await emergency.textContent(), /危及生命请拨打 999/);
    assert.equal(await emergency.getAttribute("href"), "tel:999");
    assert.equal(
      await p.locator(".health-hero-unsure").getAttribute("href"),
      "/health/where-to-go-when-ill-england",
    );
    assert.match(
      await p.locator(".health-hero-unsure").textContent(),
      /不确定该去哪？/,
    );
    // Four categories, in editorial order.
    const titles = await p.locator(".category-card h3").allTextContents();
    assert.deepEqual(
      titles.map((t) => t.split("，从《")[0]),
      ["刚来英国？从这里开始", "我现在生病了", "药和长期疾病", "牙齿"],
    );
    // Every published Guide is reachable exactly once from the categories.
    const guideHrefs = await p
      .locator(".category-guides a")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    assert.equal(guideHrefs.length, 9);
    assert.deepEqual(
      [...guideHrefs].sort(),
      slugs.map((slug) => `/health/${slug}`).sort(),
    );
    assert.deepEqual(
      await p
        .locator("[data-category='start'] .category-guides a")
        .allTextContents(),
      [
        "Fixture 标题 nhs-ihs-costs-england",
        "Fixture 标题 registering-with-a-gp-england",
        "Fixture 标题 visiting-parents-healthcare-england",
      ],
    );
    // A single-Guide category shows that Guide's API summary.
    assert.equal(
      await p
        .locator("[data-category='ill-now'] .category-guide-summary")
        .textContent(),
      "Fixture 摘要 where-to-go-when-ill-england",
    );
    // Intent chips and quick answers only link to existing Guides.
    assert.deepEqual(
      await p
        .locator(".intent-chips a")
        .evaluateAll((links) =>
          links.map((a) => [a.textContent, a.getAttribute("href")]),
        ),
      [
        ["生病了该去哪？", "/health/where-to-go-when-ill-england"],
        ["怎么注册 GP？", "/health/registering-with-a-gp-england"],
        ["药怎么买？", "/health/medicines-prescriptions-england"],
        ["晚上牙痛怎么办？", "/health/urgent-dental-care-england"],
        ["父母来英国看病？", "/health/visiting-parents-healthcare-england"],
        ["NHS 收费吗？", "/health/nhs-ihs-costs-england"],
      ],
    );
    const quickHrefs = await p
      .locator(".quick-answers a")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    assert.equal(quickHrefs.length, 9);
    for (const href of quickHrefs)
      assert.ok(slugs.includes(href.replace("/health/", "")), href);
    assert.equal(await noOverflow(p), true);
    await p.screenshot({ path: `${screenshots}/hub-1280.png`, fullPage: true });

    // Clicking the card surface opens the category's first Guide.
    await p
      .locator("[data-category='ill-now']")
      .click({ position: { x: 24, y: 24 } });
    await p.waitForURL(`${baseURL}/health/where-to-go-when-ill-england`);
    await p.goBack();
    await p.waitForURL(`${baseURL}/health`);

    // Guide link inside a card → detail via client-side navigation.
    await p
      .locator(".category-guides a[href='/health/nhs-dentist-england']")
      .click();
    await p.waitForURL(`${baseURL}/health/nhs-dentist-england`);
    await p.locator(".guide-body").waitFor();
    assert.equal(await p.evaluate(() => window.__noReload), true);
    // Back returns to the Hub.
    await p.goBack();
    await p.waitForURL(`${baseURL}/health`);
    await p.locator(".category-card").first().waitFor();
    assert.deepEqual(guideErrors(errors), []);
    await context.close();
  }

  // Detail rendering, evidence disclosure and internal links.
  {
    const { p, context, errors } = await page(1280);
    await p.goto(`${baseURL}/health/nhs-dentist-england`);
    await p.locator(".guide-body").waitFor();
    assert.equal(await p.locator("h1").count(), 1);
    assert.equal(
      await p.locator("h1").textContent(),
      "Fixture 标题 nhs-dentist-england",
    );
    assert.equal(
      await p.locator(".guide-summary").textContent(),
      "Fixture 摘要 nhs-dentist-england",
    );
    assert.equal(
      await p.locator(".guide-kicker").textContent(),
      "健康与 NHS · 牙齿",
    );
    // Shared, frontend-owned wording is neutral about the kind of source.
    assert.match(
      await p.locator(".guide-meta").textContent(),
      /4 处标注了依据/,
    );
    assert.doesNotMatch(await p.locator(".guide-meta").textContent(), /官方/);
    assert.equal(
      await p.locator(".evidence-intro").textContent(),
      "文中标着依据链接的地方，可以点开看这句话依据的是哪份资料、出自哪个机构。",
    );
    assert.equal(await p.locator(".internal-label").count(), 0);
    assert.equal(
      await p.locator(".guide-meta time").textContent(),
      "2026 年 10 月 5 日",
    );
    assert.equal(
      await p.title(),
      "Fixture 标题 nhs-dentist-england · Life in UK",
    );
    assert.deepEqual(await p.locator(".breadcrumb li").allTextContents(), [
      "首页",
      "健康与 NHS",
      "Fixture 标题 nhs-dentist-england",
    ]);
    assert.match(
      await p.locator(".guide-body blockquote strong").textContent(),
      /英格兰/,
    );
    assert.match(
      await p.locator(".guide-body blockquote").textContent(),
      /以后单独写/,
    );
    assert.equal(
      await p.locator(".guide-body ul:not([class]) > li").count(),
      3,
    );
    assert.equal(
      await p.locator(".guide-body ol:not([class]) > li").count(),
      2,
    );
    assert.equal(await p.locator(".guide-body em").textContent(), "检查");
    // Markdown evidence anchors became buttons; no raw anchors remain.
    assert.equal(await p.locator('a[href^="#guide-evidence-"]').count(), 0);
    const toggles = p.locator(".evidence-toggle");
    assert.equal(await toggles.count(), 4);
    assert.equal(await p.locator(".evidence-panel").count(), 0);

    // Keyboard: focus the first toggle and press Enter, then Space to close.
    await toggles.nth(0).focus();
    await p.keyboard.press("Enter");
    assert.equal(await toggles.nth(0).getAttribute("aria-expanded"), "true");
    const panel = p.locator(
      `#${await toggles.nth(0).getAttribute("aria-controls")}`,
    );
    assert.match(await panel.textContent(), /NHS 牙科治疗按三档收费。/);
    assert.match(await panel.textContent(), /NHS（NHS\.uk）/);
    assert.match(await panel.textContent(), /NHS dental charges/);
    assert.match(await panel.textContent(), /Fixture excerpt text/);
    assert.match(await panel.textContent(), /Fixture 说明/);
    const sourceLink = panel.locator("a.evidence-source-link");
    assert.equal(
      await sourceLink.getAttribute("href"),
      "https://www.nhs.uk/nhs-services/dentists/dental-costs/",
    );
    assert.equal(await sourceLink.getAttribute("target"), "_blank");
    assert.equal(await sourceLink.getAttribute("rel"), "noopener noreferrer");
    await toggles.nth(0).focus();
    await p.keyboard.press("Space");
    assert.equal(await toggles.nth(0).getAttribute("aria-expanded"), "false");
    assert.equal(await p.locator(".evidence-panel").count(), 0);

    // Nullable support fields are simply omitted.
    await toggles.nth(1).click();
    const bandOne = p.locator(".guide-body li .evidence-panel");
    assert.doesNotMatch(await bandOne.textContent(), /原文摘录|说明/);
    assert.match(await bandOne.textContent(), /Band 1/);

    // Private price example is labelled with its consultation date.
    await toggles.nth(2).click();
    const example = p.locator(".evidence-panel", {
      hasText: "自费价格因诊所而异",
    });
    assert.equal(
      await example.locator(".evidence-example-tag").textContent(),
      "价格举例 · 非官方资料",
    );
    assert.match(await example.textContent(), /查阅日期\s*2026 年 10 月 5 日/);

    // Missing evidence degrades gracefully.
    await toggles.nth(3).click();
    const missing = p.locator(".evidence-panel", {
      hasText: "这条依据暂时无法显示",
    });
    assert.match(await missing.textContent(), /文末列出了本文使用的全部来源/);
    assert.equal(await missing.getAttribute("aria-label"), "这句话的依据");
    // No internal identifiers leak into the page.
    const text = await p.locator("main").textContent();
    assert.doesNotMatch(
      text,
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    assert.doesNotMatch(
      text,
      /guide-evidence|sourceKey|missing-key|example-whites/,
    );

    // Bare URLs are external links.
    const external = p.locator(
      '.guide-body a.external-link[href="https://www.nhs.uk/nhs-services/dentists/dental-costs/"]',
    );
    assert.equal(await external.getAttribute("target"), "_blank");
    // 《》 references to existing Guides link internally; others stay text.
    assert.equal(
      await p.locator(".guide-body a.guide-reference").getAttribute("href"),
      "/health/urgent-dental-care-england",
    );
    assert.equal(await p.locator(".guide-body a.guide-reference").count(), 1);
    await p.screenshot({
      path: `${screenshots}/detail-1280.png`,
      fullPage: true,
    });
    await p.locator(".guide-body a.guide-reference").click();
    await p.waitForURL(`${baseURL}/health/urgent-dental-care-england`);
    await p
      .getByRole("heading", {
        level: 1,
        name: "Fixture 标题 urgent-dental-care-england",
      })
      .waitFor();
    assert.equal(await p.locator(".evidence-panel").count(), 0);
    // Related Guides come from the list endpoint.
    assert.deepEqual(
      await p
        .locator(".related-guides a")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/health/nhs-dentist-england", "/health/where-to-go-when-ill-england"],
    );
    await p.getByRole("link", { name: "回到健康与 NHS" }).click();
    await p.waitForURL(`${baseURL}/health`);
    assert.deepEqual(guideErrors(errors), []);
    await context.close();
  }

  // Not found, server error and list failure states (no fallback content).
  {
    const { p, context } = await page(1280);
    await p.goto(`${baseURL}/health/not-a-published-guide`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    await p.goto(`${baseURL}/health/Bad..Slug`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    await p.goto(`${baseURL}/somewhere-else`);
    await p.getByRole("heading", { name: "页面不存在" }).waitFor();
    await context.close();
  }
  {
    const { p, context } = await page(1280, {
      listStatus: 500,
      detailStatus: 500,
    });
    await p.goto(`${baseURL}/health`);
    await p.getByText("健康指南暂时无法加载，请稍后再试。").waitFor();
    assert.equal(
      await p.locator(".category-card, .intent-chips, .quick-answers").count(),
      0,
    );
    await p.goto(`${baseURL}/health/nhs-dentist-england`);
    await p.getByRole("heading", { name: "指南暂时无法加载" }).waitFor();
    assert.equal(await p.locator(".guide-body").count(), 0);
    await context.close();
  }

  // Mobile: no horizontal overflow on the Hub or an article with panels open.
  for (const width of [320, 390]) {
    const { p, context, errors } = await page(width);
    await p.goto(`${baseURL}/health`);
    await p.locator(".category-card").first().waitFor();
    assert.equal(await noOverflow(p), true, `hub overflow at ${width}`);
    await p.goto(`${baseURL}/health/nhs-dentist-england`);
    await p.locator(".guide-body").waitFor();
    for (const toggle of await p.locator(".evidence-toggle").all())
      await toggle.click();
    assert.equal(await p.locator(".evidence-panel").count(), 4);
    assert.equal(await noOverflow(p), true, `detail overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/detail-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(guideErrors(errors), []);
    await context.close();
  }
  console.log(`Health browser checks passed; screenshots in ${screenshots}`);
} finally {
  await browser.close();
}
