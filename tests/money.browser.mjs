// Money & Finance browser checks. By default every /api request is mocked
// with test-only fixtures (Quick Answers use the reviewed evidence snapshot).
// REAL_BACKEND=1 instead verifies the real published Money Guide through the
// running backend (read-only GETs).
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import { MONEY_QUICK_ANSWERS as QA } from "../src/guides/moneyQuickAnswers.ts";
import { MONEY_AFFILIATE_DRAFT as DRAFT } from "../src/components/money/affiliate.ts";
const reviewed = JSON.parse(
  await readFile(
    new URL("./fixtures/money-guide-evidence.json", import.meta.url),
  ),
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots = process.env.SCREENSHOT_DIR || "/tmp/life-uk-money-review";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const widths = [1280, 390, 320];

const noOverflow = (p) =>
  p.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
const appErrors = (errors) =>
  errors.filter((e) => !/503|404|500|Failed to load resource/.test(e));

/** Text directly inside list items, i.e. what a reader sees as item text. */
const ownListText = (p) =>
  p.locator(".guide-body li").evaluateAll((items) =>
    items.map((li) =>
      [...li.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(""),
    ),
  );

try {
  if (process.env.REAL_BACKEND === "1") await realBackend();
  else await mocked();
  console.log(`Money browser checks passed; screenshots in ${screenshots}`);
} finally {
  await browser.close();
}

async function realBackend() {
  const slug = "open-uk-bank-account-new-arrival";
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const listResponse = p.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/guides",
    );
    await p.goto(`${baseURL}/money`);
    const list = await (await listResponse).json();
    const money = list.filter((guide) => guide.category === "money");
    assert.ok(
      money.some((guide) => guide.slug === slug),
      "published Guide",
    );
    // Every Quick Answer verifies against the published Guide and evidence.
    const items = p.locator(".money-qa-item");
    await p.locator(".money-qa-answer").waitFor();
    assert.equal(await items.count(), QA.answers.length);
    assert.equal(await p.locator(".money-qa-notice").count(), 0);
    for (const [index, answer] of QA.answers.entries()) {
      const item = items.nth(index);
      if (index > 0) await item.locator(".money-qa-question").click();
      await item.locator(".money-qa-text").waitFor();
      assert.equal(await item.locator(".money-qa-unverified").count(), 0);
      assert.equal(
        await item.locator(".money-qa-text").textContent(),
        answer.answer,
      );
      await item.locator(".evidence-toggle").click();
      assert.equal(
        await item.locator(".evidence-panel").count(),
        answer.evidenceKeys.length,
        answer.id,
      );
      assert.equal(await item.locator(".evidence-missing").count(), 0);
    }
    assert.equal(
      await p.locator(".money-aside-link").getAttribute("href"),
      `/money/${slug}`,
    );
    assert.equal(await noOverflow(p), true, `hub overflow at ${width}`);

    await p.goto(`${baseURL}/money/${slug}`);
    await p.locator(".guide-body").waitFor();
    assert.equal(await p.locator(".guide-kicker").textContent(), "金钱与财务");
    // Checklist and nested lists render as structure, not literal markers.
    assert.ok((await p.locator(".guide-body .task-item").count()) > 0);
    assert.equal(await p.locator(".guide-body input").count(), 0);
    assert.ok(
      (await p.locator(".guide-body li > ul:not([class]) > li").count()) > 0,
    );
    for (const text of await ownListText(p))
      assert.doesNotMatch(text, /\[ \]|\[x\]|(^|\s)- /i);
    const toggles = p.locator(".evidence-toggle");
    const count = await toggles.count();
    assert.ok(count > 0);
    for (let i = 0; i < count; i++) await toggles.nth(i).click();
    assert.equal(await p.locator(".evidence-panel").count(), count);
    assert.equal(
      await p.locator(".evidence-panel .evidence-missing").count(),
      0,
    );
    assert.equal(await p.locator(".evidence-example-tag").count(), 0);
    assert.equal(await noOverflow(p), true, `detail overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/real-detail-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(appErrors(errors), []);
    console.log(
      `PASS real ${width}px: ${QA.answers.length} Quick Answers verified with evidence; Guide has ${count} evidence panels; checklist and nested lists; no overflow`,
    );
    await context.close();
  }
}

async function mocked() {
  const stamp = "2026-10-07T15:53:00Z";
  const meta = (slug, category) => ({
    slug,
    category,
    title: `Fixture 标题 ${slug}`,
    summary: `Fixture 摘要 ${slug}`,
    publishedAt: stamp,
    updatedAt: stamp,
  });
  // Test-only fixtures: placeholder text, not Guide content.
  const moneyOne = meta("fixture-money-one", "money");
  const moneyTwo = meta("fixture-money-two", "money");
  const health = meta("where-to-go-when-ill-england", "health-nhs");
  const family = meta("fixture-family-one", "family-visa");
  const noMoney = [health, family];
  // The Guide behind the Quick Answers, at the reviewed version.
  const qaMeta = {
    ...meta(QA.guideSlug, "money"),
    publishedAt: QA.reviewedUpdatedAt,
    updatedAt: QA.reviewedUpdatedAt,
  };
  const answersList = [health, qaMeta, family];
  /** The reviewed evidence; `drop` removes a key, `edit` mutates a copy. */
  const qaDetail = ({ drop, edit, ...overrides } = {}) => {
    const detail = { ...structuredClone(reviewed), ...overrides };
    detail.evidence = detail.evidence.filter((item) => item.key !== drop);
    edit?.(detail);
    return detail;
  };

  const moneyDetail = {
    ...moneyOne,
    content: [
      "# Fixture 标题 fixture-money-one",
      "",
      "Fixture 段落。[查看官方依据](#guide-evidence-one)",
      "",
      "- Fixture 父项：",
      "  - Fixture 子项甲 [查看官方依据](#guide-evidence-two)",
      "    子项续行",
      "  - Fixture 子项乙",
      "- Fixture 普通项",
      "",
      "3. Fixture 有序项：",
      "   - Fixture 有序子项",
      "4. Fixture 有序项二",
      "",
      "- [ ] Fixture 待确认一",
      "- [x] Fixture 已确认二",
      "",
      "另一个分区的标题《突然牙疼怎么办》不会变成链接。",
    ].join("\n"),
    sources: [
      {
        key: "example-fixture-source",
        organisation: "Fixture Organisation",
        title: "Fixture source title",
        url: "https://example.test/source",
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
            locator: "Section 1",
            excerpt: null,
            note: null,
          },
        ],
      },
      {
        key: "two",
        statement: "Fixture 依据二。",
        supports: [
          {
            sourceKey: "example-fixture-source",
            locator: null,
            excerpt: null,
            note: null,
          },
        ],
      },
    ],
  };
  const healthDetail = {
    ...health,
    content: "# Fixture\n\nFixture 正文。",
    sources: [],
    evidence: [],
  };
  const familyDetail = {
    ...family,
    content: "# Fixture\n\nFixture 正文。",
    sources: [],
    evidence: [],
  };
  const details = {
    [moneyDetail.slug]: moneyDetail,
    [healthDetail.slug]: healthDetail,
    [familyDetail.slug]: familyDetail,
  };

  /** list: array to serve, or "hang" / an HTTP status number. */
  async function page(
    width,
    { list = answersList, answers = qaDetail() } = {},
  ) {
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
      if (match && match[1] === QA.guideSlug) {
        if (answers === "hang") return new Promise(() => {});
        if (typeof answers === "number")
          return route.fulfill({ status: answers, json: {} });
        return route.fulfill({ json: answers });
      }
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

  // Hub: loading the Guide list.
  {
    const { p, context } = await page(1280, { list: "hang" });
    await p.goto(`${baseURL}/money`);
    await p.getByRole("heading", { level: 1, name: "金钱与财务" }).waitFor();
    await p
      .getByText("正在加载金钱与财务的解答…")
      .waitFor({ state: "attached" });
    assert.equal(await p.locator(".money-qa-skeleton li").count(), 6);
    assert.equal(await p.locator(".money-qa-item, .money-aside").count(), 0);
    assert.equal(await p.title(), "金钱与财务 · Life in UK");
    console.log("PASS hub loading list: skeleton rows and status");
    await context.close();
  }

  // Hub: loading the answers; the full Guide is already reachable.
  {
    const { p, context } = await page(390, { answers: "hang" });
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-aside-link").waitFor();
    assert.equal(await p.locator(".money-qa-skeleton li").count(), 6);
    assert.equal(await p.locator(".money-qa-item").count(), 0);
    assert.equal(
      await p.locator(".money-aside-link").getAttribute("href"),
      `/money/${QA.guideSlug}`,
    );
    console.log(
      "PASS hub loading answers: skeleton, full Guide link available",
    );
    await context.close();
  }

  // Hub: list API error, with no fallback content.
  {
    const { p, context } = await page(1280, { list: 500 });
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-error").waitFor();
    assert.match(await p.locator(".money-error").textContent(), /暂时无法加载/);
    assert.equal(
      await p.locator(".money-qa-item, .money-aside, .money-empty").count(),
      0,
    );
    console.log("PASS hub list error: unavailable panel only");
    await context.close();
  }

  // Hub: answer Guide error: no answers shown, full Guide link kept.
  {
    const { p, context } = await page(1280, { answers: 500 });
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-error").waitFor();
    assert.match(await p.locator(".money-error").textContent(), /完整指南/);
    assert.equal(await p.locator(".money-qa-item, .money-qa-text").count(), 0);
    assert.equal(await p.locator(".money-aside-link").count(), 1);
    console.log(
      "PASS hub answers error: no unverified answers, Guide link kept",
    );
    await context.close();
  }

  // Hub: empty when the API has no money Guides.
  for (const width of widths) {
    const { p, context, errors } = await page(width, { list: noMoney });
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-empty").waitFor();
    assert.equal(
      await p
        .locator(".money-qa-item, .money-guide-card, .money-aside")
        .count(),
      0,
    );
    assert.doesNotMatch(await p.locator("main").textContent(), /Fixture 标题/);
    assert.equal(await noOverflow(p), true, `empty overflow at ${width}`);
    assert.deepEqual(appErrors(errors), []);
    console.log(
      `PASS hub empty ${width}px: neutral state, other domains hidden`,
    );
    await context.close();
  }

  // Hub: Quick Answers with evidence, one open at a time.
  for (const width of widths) {
    const { p, context, errors, requests } = await page(width);
    await p.goto(`${baseURL}/money`);
    const items = p.locator(".money-qa-item");
    await p.locator(".money-qa-answer").waitFor();
    assert.equal(await items.count(), QA.answers.length);
    assert.deepEqual(
      await p.locator(".money-qa-question span").allTextContents(),
      QA.answers.map((a) => a.question),
    );
    // On phones the first question is in the first screen.
    const first = await p.locator(".money-qa-question").first().boundingBox();
    assert.ok(first.y + first.height <= 900, `first question at ${first.y}`);
    // The first answer is open; only one answer is ever open.
    const [a0, a1, a2] = QA.answers;
    assert.equal(await p.locator(".money-qa-answer").count(), 1);
    assert.equal(
      await items.nth(0).locator(".money-qa-text").textContent(),
      a0.answer,
    );
    if (a0.nextStep)
      assert.match(
        await items.nth(0).locator(".money-qa-step").textContent(),
        new RegExp(a0.nextStep.slice(0, 8)),
      );
    // Evidence on demand, reusing the shared evidence panel.
    const toggle = items.nth(0).locator(".evidence-toggle");
    assert.equal(
      await toggle.textContent(),
      `查看依据（${a0.evidenceKeys.length} 条）`,
    );
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    const panels = items.nth(0).locator(".evidence-panel");
    assert.equal(await panels.count(), a0.evidenceKeys.length);
    assert.equal(
      await panels.first().getAttribute("aria-label"),
      "这句话的依据",
    );
    assert.match(
      await panels.first().textContent(),
      new RegExp(
        reviewed.evidence
          .find((item) => item.key === a0.evidenceKeys[0])
          .statement.slice(0, 12),
      ),
    );
    await toggle.click();
    assert.equal(await panels.count(), 0);
    // Full Guide link inside the answer and in the aside.
    assert.equal(
      await items.nth(0).locator(".money-qa-guide-link").getAttribute("href"),
      `/money/${QA.guideSlug}`,
    );
    assert.equal(
      await p.locator(".money-aside-link").getAttribute("href"),
      `/money/${QA.guideSlug}`,
    );
    // Switching questions closes the previous answer; clicking again closes.
    await items.nth(2).locator(".money-qa-question").click();
    assert.equal(await p.locator(".money-qa-answer").count(), 1);
    assert.equal(
      await items.nth(2).locator(".money-qa-text").textContent(),
      a2.answer,
    );
    assert.equal(
      await items
        .nth(0)
        .locator(".money-qa-question")
        .getAttribute("aria-expanded"),
      "false",
    );
    await items.nth(2).locator(".money-qa-question").click();
    assert.equal(await p.locator(".money-qa-answer").count(), 0);
    // "Next question" opens the following answer and moves focus to it.
    await items.nth(0).locator(".money-qa-question").click();
    await items.nth(0).locator(".money-qa-next-question").click();
    assert.equal(
      await items.nth(1).locator(".money-qa-text").textContent(),
      a1.answer,
    );
    assert.equal(
      await p.evaluate(() => document.activeElement.id),
      `qa-q-${a1.id}`,
    );
    // One detail request for all answers; nothing else.
    assert.deepEqual([...new Set(requests)].sort(), [
      "/api/guides",
      `/api/guides/${QA.guideSlug}`,
    ]);
    assert.equal(
      await p.locator(".money-qa-unverified, .money-qa-notice").count(),
      0,
    );
    assert.doesNotMatch(await p.locator("main").textContent(), /英国官方依据/);
    assert.equal(await noOverflow(p), true, `hub overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/hub-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(appErrors(errors), []);
    console.log(
      `PASS quick answers ${width}px: evidence, switching, next question`,
    );
    await context.close();
  }

  // Missing evidence withholds exactly the answers that cite it.
  {
    const drop = QA.answers[0].evidenceKeys[0];
    const { p, context } = await page(390, { answers: qaDetail({ drop }) });
    await p.goto(`${baseURL}/money`);
    const items = p.locator(".money-qa-item");
    await p.locator(".money-qa-answer").waitFor();
    assert.equal(await items.nth(0).locator(".money-qa-text").count(), 0);
    assert.equal(await items.nth(0).locator(".evidence-toggle").count(), 0);
    assert.match(
      await items.nth(0).locator(".money-qa-unverified").textContent(),
      /依据暂时无法核对/,
    );
    assert.equal(
      await items.nth(0).locator(".money-qa-guide-link").getAttribute("href"),
      `/money/${QA.guideSlug}`,
    );
    const unaffected = QA.answers.findIndex(
      (a) => !a.evidenceKeys.includes(drop),
    );
    await items.nth(unaffected).locator(".money-qa-question").click();
    await items.nth(unaffected).locator(".money-qa-text").waitFor();
    assert.equal(await p.locator(".money-qa-notice").count(), 0);
    assert.equal(await noOverflow(p), true);
    console.log("PASS missing evidence: only answers citing it are withheld");
    await context.close();
  }

  // A newer Guide version withholds every answer until re-reviewed.
  {
    const { p, context } = await page(1280, {
      answers: qaDetail({ updatedAt: "2026-11-01T09:00:00Z" }),
    });
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-qa-notice").waitFor();
    assert.equal(await p.locator(".money-qa-text").count(), 0);
    assert.equal(await p.locator(".money-qa-unverified").count(), 1);
    console.log("PASS updated Guide: answers withheld, notice shown");
    await context.close();
  }

  // Evidence edited without a new Guide version still withholds the answers
  // that cite it; answers citing other evidence stay available.
  {
    const key = "fscs-120k-limit";
    const { p, context } = await page(1280, {
      answers: qaDetail({
        edit: (g) => {
          g.evidence.find((item) => item.key === key).statement += "（改）";
        },
      }),
    });
    await p.goto(`${baseURL}/money`);
    const items = p.locator(".money-qa-item");
    await p.locator(".money-qa-answer").waitFor();
    for (const [index, answer] of QA.answers.entries()) {
      if (index > 0)
        await items.nth(index).locator(".money-qa-question").click();
      const cites = answer.evidenceKeys.includes(key);
      assert.equal(
        await items.nth(index).locator(".money-qa-text").count(),
        cites ? 0 : 1,
        answer.id,
      );
      assert.equal(
        await items.nth(index).locator(".money-qa-unverified").count(),
        cites ? 1 : 0,
        answer.id,
      );
    }
    console.log(
      "PASS changed evidence at the same version: citing answers withheld",
    );
    await context.close();
  }

  // Affiliate slot: disabled by default, leaving no card, copy or space.
  for (const width of [1280, 390]) {
    const { p, context } = await page(width);
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-qa-answer").waitFor();
    assert.equal(await p.locator(".money-affiliate").count(), 0);
    assert.equal(await p.locator(".money-qa-list").count(), 1);
    assert.equal(await p.locator(".money-qa-list-continued").count(), 0);
    const text = await p.locator("main").textContent();
    for (const copy of [DRAFT.disclosure, DRAFT.title, DRAFT.ctaLabel])
      assert.ok(!text.includes(copy), copy);
    // The aside goes straight from the Guide card to the source notes.
    assert.deepEqual(
      await p
        .locator(".money-aside > *")
        .evaluateAll((els) => els.map((e) => e.className)),
      ["money-guide-aside", "money-trust-points"],
    );
    console.log(`PASS affiliate disabled ${width}px: no card, copy or gap`);
    await context.close();
  }

  // Affiliate preview (development only): placement and separation.
  {
    const { p, context } = await page(1280);
    await p.goto(`${baseURL}/money?affiliate-preview`);
    await p.locator(".money-qa-answer").waitFor();
    const card = p.locator(".money-affiliate-aside");
    assert.equal(await card.isVisible(), true);
    assert.equal(await p.locator(".money-affiliate-inline").isVisible(), false);
    assert.equal(
      await card.locator(".money-affiliate-disclosure").textContent(),
      DRAFT.disclosure,
    );
    assert.equal(await card.locator("h3").textContent(), DRAFT.title);
    assert.equal(await card.locator("p").textContent(), DRAFT.description);
    assert.equal(await card.getAttribute("aria-label"), DRAFT.disclosure);
    // No destination yet: the CTA is plain text, not a link or button.
    assert.equal(await card.locator("a, button").count(), 0);
    assert.equal(
      await card.locator(".money-affiliate-cta.is-inactive").textContent(),
      DRAFT.ctaLabel,
    );
    // Below the complete Guide card, above the source notes.
    const guideBox = await p.locator(".money-guide-aside").boundingBox();
    const cardBox = await card.boundingBox();
    const trustBox = await p.locator(".money-trust-points").boundingBox();
    assert.ok(cardBox.y > guideBox.y + guideBox.height, "below Guide card");
    assert.ok(cardBox.y + cardBox.height < trustBox.y, "above source notes");
    // Answers, evidence and the Guide link are unaffected.
    assert.equal(await p.locator(".money-qa-item").count(), QA.answers.length);
    await p.locator(".money-qa-answer .evidence-toggle").click();
    assert.equal(
      await p.locator(".money-qa-evidence .evidence-panel").count(),
      QA.answers[0].evidenceKeys.length,
    );
    assert.equal(
      await p.locator(".money-qa-evidence .money-affiliate").count(),
      0,
    );
    assert.equal(await noOverflow(p), true);
    await p.screenshot({
      path: `${screenshots}/affiliate-preview-1280.png`,
      fullPage: true,
    });
    console.log(
      "PASS affiliate preview 1280px: aside placement, disclosure, no link",
    );
    await context.close();
  }
  for (const width of [390, 320]) {
    const { p, context } = await page(width);
    await p.goto(`${baseURL}/money?affiliate-preview`);
    await p.locator(".money-qa-answer").waitFor();
    const inline = p.locator(".money-affiliate-inline");
    assert.equal(await inline.isVisible(), true);
    assert.equal(await p.locator(".money-affiliate-aside").isVisible(), false);
    assert.equal(await inline.locator("a, button").count(), 0);
    // Between the fifth and sixth questions, never inside an answer.
    const items = p.locator(".money-qa-item");
    const fifth = await items.nth(4).boundingBox();
    const sixth = await items.nth(5).boundingBox();
    const box = await inline.boundingBox();
    assert.ok(box.y >= fifth.y + fifth.height && box.y + box.height <= sixth.y);
    await items.nth(4).locator(".money-qa-question").click();
    await items.nth(4).locator(".money-qa-text").waitFor();
    assert.equal(await items.nth(4).locator(".money-affiliate").count(), 0);
    const opened = await items.nth(4).boundingBox();
    const moved = await inline.boundingBox();
    assert.ok(
      moved.y >= opened.y + opened.height,
      "card stays after the answer",
    );
    await items.nth(4).locator(".money-qa-next-question").click();
    assert.equal(
      await items.nth(5).locator(".money-qa-text").textContent(),
      QA.answers[5].answer,
    );
    assert.equal(
      await p.evaluate(() => document.activeElement.id),
      `qa-q-${QA.answers[5].id}`,
    );
    assert.equal(await noOverflow(p), true, `preview overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/affiliate-preview-${width}.png`,
      fullPage: true,
    });
    console.log(`PASS affiliate preview ${width}px: inline after five answers`);
    await context.close();
  }

  // Other money Guides are listed after the answers, without featuring.
  {
    const { p, context } = await page(1280, { list: [qaMeta, moneyOne] });
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-qa-answer").waitFor();
    assert.deepEqual(
      await p
        .locator(".money-more .money-guide-card")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/money/fixture-money-one"],
    );
    console.log("PASS other money Guides listed under 更多指南");
    await context.close();
  }

  // Without the Quick Answer Guide, money Guides are equal cards.
  {
    const { p, context, requests } = await page(390, {
      list: [moneyOne, moneyTwo],
    });
    await p.goto(`${baseURL}/money`);
    await p.locator(".money-guide-card").first().waitFor();
    assert.equal(await p.locator(".money-qa-item, .money-aside").count(), 0);
    assert.deepEqual(
      await p
        .locator(".money-guide-card")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      ["/money/fixture-money-one", "/money/fixture-money-two"],
    );
    assert.ok(requests.every((path) => path === "/api/guides"));
    assert.equal(await noOverflow(p), true);
    console.log("PASS no answer Guide: equal cards, no detail request");
    await context.close();
  }

  // Homepage entry links to /money, after Health; the header nav is unchanged.
  {
    const { p, context } = await page(1280);
    await p.goto(`${baseURL}/`);
    const entry = p.getByRole("link", { name: "进入金钱与财务" });
    await entry.waitFor();
    assert.equal(await entry.getAttribute("href"), "/money");
    assert.equal(await p.locator(".health-entry + .money-entry").count(), 1);
    assert.doesNotMatch(await p.locator(".money-entry").textContent(), /官方/);
    const nav = p.getByRole("navigation", { name: "主导航" });
    assert.equal(await nav.getByRole("link").count(), 1);
    assert.equal(await nav.locator("a[href^='/money']").count(), 0);
    await p.evaluate(() => (window.__noReload = true));
    await entry.click();
    await p.waitForURL(`${baseURL}/money`);
    await p.getByRole("heading", { level: 1, name: "金钱与财务" }).waitFor();
    assert.equal(await p.evaluate(() => window.__noReload), true);
    console.log("PASS homepage entry: /money after Health, nav unchanged");
    await context.close();
  }

  // Money Guide detail: shared renderer, domain links, evidence wording.
  for (const width of widths) {
    const { p, context, errors } = await page(width);
    await p.goto(`${baseURL}/money/${moneyOne.slug}`);
    await p.locator(".guide-body").waitFor();
    assert.equal(await p.locator("h1").textContent(), moneyOne.title);
    assert.equal(await p.locator(".guide-kicker").textContent(), "金钱与财务");
    assert.deepEqual(await p.locator(".breadcrumb li").allTextContents(), [
      "首页",
      "金钱与财务",
      moneyOne.title,
    ]);
    assert.equal(
      await p
        .getByRole("link", { name: "回到金钱与财务" })
        .getAttribute("href"),
      "/money",
    );
    // Neutral frontend wording; content-authored labels are untouched.
    assert.match(
      await p.locator(".guide-meta").textContent(),
      /2 处标注了依据/,
    );
    assert.doesNotMatch(
      (await p.locator(".guide-meta").textContent()) +
        (await p.locator(".evidence-intro").textContent()),
      /官方/,
    );
    assert.deepEqual(await p.locator(".evidence-toggle").allTextContents(), [
      "查看官方依据",
      "查看官方依据",
    ]);
    // Nested lists: real sub-lists, continuation joined, no literal markers.
    const nested = p.locator(".guide-body li > ul:not([class]) > li");
    assert.deepEqual(
      (await nested.allTextContents()).map((t) =>
        t.replace(/查看官方依据/, ""),
      ),
      ["Fixture 子项甲  子项续行", "Fixture 子项乙", "Fixture 有序子项"],
    );
    for (const text of await ownListText(p))
      assert.doesNotMatch(text, /\[ \]|\[x\]|(^|\s)- /i);
    // Checklist: read-only markers, no form controls.
    const tasks = p.locator(".guide-body ul.task-list > li.task-item");
    assert.equal(await tasks.count(), 2);
    assert.equal(
      await p.locator(".guide-body input, .guide-body [role=checkbox]").count(),
      0,
    );
    assert.equal(await tasks.nth(0).locator(".task-marker").count(), 1);
    assert.match(await tasks.nth(1).getAttribute("class"), /task-done/);
    assert.match(await tasks.nth(1).textContent(), /（已勾选）/);
    // Another domain's title stays text.
    assert.equal(await p.locator(".guide-body a.guide-reference").count(), 0);
    // Evidence: panels open beside their item; no example tag outside Health.
    const toggles = p.locator(".evidence-toggle");
    await toggles.nth(1).click();
    const nestedPanel = p.locator(".guide-body li > ul li .evidence-panel");
    assert.equal(await nestedPanel.count(), 1);
    assert.equal(await nestedPanel.getAttribute("aria-label"), "这句话的依据");
    await toggles.nth(0).click();
    assert.equal(await p.locator(".evidence-panel").count(), 2);
    assert.equal(await p.locator(".evidence-example-tag").count(), 0);
    assert.equal(await noOverflow(p), true, `detail overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/detail-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(appErrors(errors), []);
    console.log(
      `PASS money detail ${width}px: lists, checklist, evidence, no overflow`,
    );
    await context.close();
  }

  // Cross-domain isolation in every direction.
  {
    const { p, context } = await page(1280);
    for (const [path, back, backHref] of [
      [`/health/${moneyOne.slug}`, "回到健康与 NHS", "/health"],
      [`/family-visa/${moneyOne.slug}`, "回到家庭与签证", "/family-visa"],
      [`/money/${health.slug}`, "回到金钱与财务", "/money"],
      [`/money/${family.slug}`, "回到金钱与财务", "/money"],
    ]) {
      await p.goto(`${baseURL}${path}`);
      await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
      assert.equal(await p.locator(".guide-body").count(), 0, path);
      assert.doesNotMatch(
        await p.locator("main").textContent(),
        /Fixture/,
        path,
      );
      assert.equal(
        await p.getByRole("link", { name: back }).getAttribute("href"),
        backHref,
      );
    }
    console.log("PASS cross-domain isolation: money ↔ health / family-visa");
    await context.close();
  }

  // Malformed and unknown Money routes fail safely.
  {
    const { p, context, requests } = await page(1280);
    await p.goto(`${baseURL}/money/Bad..Slug`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    assert.ok(!requests.some((r) => r.includes("Bad..Slug")));
    await p.goto(`${baseURL}/money/not-a-published-guide`);
    await p.getByRole("heading", { name: "没有找到这篇指南" }).waitFor();
    // Malformed percent-encoding is covered by the router unit tests: the
    // Vite dev server answers such URLs itself before the app loads.
    for (const path of ["/money/a/b", "/moneys"]) {
      await p.goto(`${baseURL}${path}`);
      await p.getByRole("heading", { name: "页面不存在" }).waitFor();
    }
    console.log("PASS malformed/unknown money routes fail safely");
    await context.close();
  }
}
