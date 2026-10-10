// Family & Visa checklist-first journey, in a browser. Every /api request is
// mocked. The verified path serves the reviewed Guide files from
// FAMILY_VISA_GUIDES_DIR (default: the sibling backend's draft directory) as
// if published; nothing from them is copied into this repository. Without
// them, only the unpublished/pending checks run.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { localContent } from "./fixtures/familyVisaContent.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const screenshots =
  process.env.SCREENSHOT_DIR || "/tmp/life-uk-family-visa-checklist";
await mkdir(screenshots, { recursive: true });
const guidesDir =
  process.env.FAMILY_VISA_GUIDES_DIR ||
  fileURLToPath(
    new URL(
      "../../life-in-uk-backend/content/drafts/family-visa/",
      import.meta.url,
    ),
  );

const SLUGS = {
  routes: "partner-visa-routes-overview",
  finance: "partner-visa-financial-requirement",
  relationship: "partner-visa-relationship-evidence",
  children: "partner-visa-dependent-children",
};
const STORAGE_KEY = "lifeinuk.familyVisa.checklist";
const haveGuides = Object.values(SLUGS).every((slug) =>
  existsSync(`${guidesDir}/${slug}-zh.json`),
);
// Verified-wording checks need the real local wording (gitignored) and the
// opt-in preview server. Probes are read from the local file at run time, so
// this public test file quotes none of the unpublished wording.
const LOCAL = await localContent();
const serverPreview = await fetch(`${baseURL}/family-visa`)
  .then((r) => r.text())
  .then((html) => html.includes("family-visa-draft-preview"))
  .catch(() => false);
const haveWording = haveGuides && LOCAL !== null && serverPreview;
/** A short, distinctive prefix of a wording string (markup removed). */
const probe = (text) => text.replace(/\*\*/g, "").slice(0, 14);
function published(slug) {
  const { status: _status, ...guide } = JSON.parse(
    readFileSync(`${guidesDir}/${slug}-zh.json`, "utf8"),
  );
  return { ...guide, publishedAt: guide.updatedAt };
}
const meta = ({ slug, category, title, summary, publishedAt, updatedAt }) => ({
  slug,
  category,
  title,
  summary,
  publishedAt,
  updatedAt,
});
const otherFamily = {
  slug: "fixture-family-other",
  category: "family-visa",
  title: "Fixture 标题 other",
  summary: "Fixture 摘要 other",
  publishedAt: "2026-10-06T08:00:00Z",
  updatedAt: "2026-10-06T08:00:00Z",
};
const ANSWER_TOKENS = [
  "married",
  "unmarried",
  "fiance",
  "not-parent",
  "adopt-guard",
  "outside",
  "inside",
  "owned",
  "rented",
];

const browser = await chromium.launch({ headless: true });

async function page(
  width,
  { details = {}, list = [otherFamily], init, context: shared } = {},
) {
  const context =
    shared ?? (await browser.newContext({ viewport: { width, height: 900 } }));
  if (init) await context.addInitScript(init);
  const p = await context.newPage();
  const errors = [];
  const requests = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("request", (r) => requests.push(r.url()));
  await p.route(/\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/guides") return route.fulfill({ json: list });
    const match = /^\/api\/guides\/(.+)$/.exec(path);
    if (match && details[match[1]])
      return route.fulfill({ json: details[match[1]] });
    if (match)
      return route.fulfill({ status: 404, json: { code: "GUIDE_NOT_FOUND" } });
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
const appErrors = (errors) =>
  errors.filter((e) => !/503|404|500|Failed to load resource/.test(e));
const focusedText = (p) =>
  p.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
const stored = (p) =>
  p.evaluate((key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return "unavailable";
    }
  }, STORAGE_KEY);

async function answer(p, name, { multiple = false } = {}) {
  await p
    .getByRole(multiple ? "checkbox" : "radio", {
      name,
      exact: typeof name === "string",
    })
    .first()
    .check();
}
async function next(p) {
  await p.getByRole("button", { name: /^(下一步|查看结果)$/ }).click();
}
/** Answers the questions and stops at the save prompt. */
async function questions(
  p,
  { relationship, children, childRelations, location },
) {
  await answer(p, relationship);
  await next(p);
  await answer(p, children);
  await next(p);
  for (const relation of childRelations ?? [])
    await answer(p, relation, { multiple: true });
  if (childRelations) await next(p);
  await answer(p, location);
  await next(p);
  await p.getByRole("heading", { name: "要不要帮你保存准备进度？" }).waitFor();
}
/** The checklist is shown and no Guide is still loading. */
async function settled(p) {
  await p.locator(".checklist-section").first().waitFor();
  await p.waitForLoadState("networkidle");
}
async function toChecklist(p, answers, { save = false } = {}) {
  await questions(p, answers);
  await p
    .getByRole("button", {
      name: save ? "保存在这台设备上（30 天）" : "不保存，直接开始",
    })
    .click();
  await settled(p);
}
const section = (p, title) =>
  p.locator(".checklist-section", {
    has: p.locator(".checklist-section-name", { hasText: title }),
  });
async function openSection(p, title) {
  const toggle = section(p, title).locator(".checklist-section-toggle");
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
}
const task = (p, title) =>
  p.locator(".checklist-task", {
    has: p.locator(".checklist-task-title", { hasText: title }),
  });
const progressText = (p) => p.locator(".checklist-progress-text").textContent();
const SECTION_TITLES = [
  "身份和申请材料",
  "婚姻 / 伴侣关系和真实关系证据",
  "财务材料",
  "英国住处",
  "英语和其他要求",
];
const EXAMPLE = {
  relationship: "已婚，或已登记民事伴侣",
  children: "有",
  childRelations: [/^不是/],
  location: "英国境外",
};

try {
  // History must not contaminate unrelated routes, including the initial entry.
  {
    const { p, context } = await page(390);
    await p.goto(`${baseURL}/health`);
    await p.getByRole("heading", { level: 1 }).waitFor();
    await p.evaluate(() => {
      history.replaceState({ unrelated: "preserve" }, "");
      history.pushState(null, "", "/family-visa");
      dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
    await answer(p, "已婚，或已登记民事伴侣");
    await next(p);
    await p.goBack();
    await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
    assert.equal(await p.getByRole("radio", { name: "已婚，或已登记民事伴侣", exact: true }).isChecked(), true);
    await answer(p, /^未婚伴侣/);
    await p.goForward();
    await p.getByRole("heading", { name: "有孩子会和申请人一起申请吗？" }).waitFor();
    await p.reload();
    assert.equal(await p.evaluate(() => history.state.familyVisaNavigator.answers.relationship), "unmarried");
    await p.goBack();
    await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
    await p.goBack();
    await p.waitForURL(`${baseURL}/health`);
    assert.deepEqual(await p.evaluate(() => history.state), { unrelated: "preserve" });
    await p.goForward();
    await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
    assert.equal(await p.getByRole("radio", { name: /^未婚伴侣/ }).isChecked(), true);
    console.log("PASS back/forward, edited answers, reload and unrelated history isolation");
    await context.close();
  }

  // Both user deletion actions must retain the record on a storage failure.
  for (const resumeOffer of [false, true]) {
    const { p, context } = await page(390);
    await p.goto(`${baseURL}/family-visa`);
    await toChecklist(p, { relationship: "已婚，或已登记民事伴侣", children: "没有", location: "英国境外" }, { save: true });
    const raw = await stored(p);
    assert.ok(raw);
    if (resumeOffer) {
      await p.evaluate(() => history.replaceState(null, ""));
      await p.reload();
      await p.getByRole("region", { name: "继续上次的清单" }).waitFor();
    }
    await p.evaluate(() => { Storage.prototype.removeItem = () => { throw new Error("blocked"); }; });
    await p.getByRole("button", { name: /删除.*进度/ }).click();
    await p.getByText("无法删除这台设备上保存的准备进度，请稍后再试。").waitFor();
    assert.equal(await stored(p), raw);
    assert.equal(await p.getByText("已删除这台设备上保存的准备进度。", { exact: true }).count(), 0);
    if (resumeOffer) assert.equal(await p.getByRole("region", { name: "继续上次的清单" }).count(), 1);
    else assert.equal(await p.evaluate(() => history.state.familyVisaSaveChoice), "device");
    await context.close();
  }
  console.log("PASS both delete actions report storage failure without claiming success");

  // Hub: slogan, journey first, special circumstances, 全部指南 collapsed.
  {
    const { p, context, errors } = await page(1280);
    await p.goto(`${baseURL}/family-visa`);
    await p
      .getByRole("heading", { level: 1, name: "一份清单，理清每一步。" })
      .waitFor();
    assert.match(
      await p.locator(".family-hero-lead").textContent(),
      /从第一份材料，到最后一个勾选，让签证准备更简单。/,
    );
    await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
    const toggle = p.getByRole("button", { name: "全部指南" });
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert.equal(await p.locator("#family-guides-panel").isHidden(), true);
    assert.equal(
      await p
        .locator(
          "#special-circumstances a[href='/family-visa/topics/children-from-previous-relationship']",
        )
        .count(),
      1,
    );
    assert.match(
      await p.locator("#special-circumstances").textContent(),
      /Immigration Advice Authority（IAA）/,
    );
    assert.doesNotMatch(await p.locator("main").textContent(), /OISC/);
    assert.deepEqual(appErrors(errors), []);
    console.log(
      "PASS hub: slogan, questions first, special circumstances, 全部指南 secondary",
    );
    await context.close();
  }

  // Questions: validation, keyboard, focus, the conditional child question.
  {
    const { p, context } = await page(390);
    await p.goto(`${baseURL}/family-visa`);
    await p.getByRole("button", { name: "下一步" }).click();
    assert.match(await p.getByRole("alert").textContent(), /请选择一项/);
    await p.getByRole("radio").first().focus();
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("Enter");
    await p
      .getByRole("heading", { name: "有孩子会和申请人一起申请吗？" })
      .waitFor();
    assert.equal(await focusedText(p), "有孩子会和申请人一起申请吗？");
    await answer(p, "没有");
    await next(p);
    assert.match(
      await p.locator(".navigator-progress").textContent(),
      /第 3 步，共 3 步/,
    );
    await p.getByRole("button", { name: "上一步" }).click();
    await answer(p, "有");
    await next(p);
    await p
      .getByRole("heading", { name: "英国这边的伴侣是不是孩子的父母？" })
      .waitFor();
    await p.getByRole("button", { name: "下一步" }).click();
    assert.match(await p.getByRole("alert").textContent(), /请至少选择一项/);
    assert.equal(await noOverflow(p), true);
    console.log(
      "PASS questions: validation, keyboard, focus, conditional step",
    );
    await context.close();
  }

  // Unpublished Guides: every task pending, nothing restated.
  for (const width of [1280, 390]) {
    const { p, context, errors, requests } = await page(width);
    await p.goto(`${baseURL}/family-visa`);
    await toChecklist(p, EXAMPLE);
    assert.equal(await focusedText(p), "你的材料清单");
    assert.deepEqual(
      await p.locator(".checklist-section-name").allTextContents(),
      [...SECTION_TITLES, "随行孩子"],
    );
    for (const title of [...SECTION_TITLES, "随行孩子"])
      await openSection(p, title);
    const badges = await p.locator(".checklist-badge").allTextContents();
    assert.ok(badges.length > 10);
    assert.ok(
      badges.every((b) => b === "待核对"),
      badges.join(","),
    );
    const sole = task(p, "单方负责的证据");
    await sole.getByRole("button", { name: "怎么准备" }).click();
    assert.match(await sole.textContent(), /具体说明还在核对/);
    assert.doesNotMatch(await sole.textContent(), /抚养令/);
    assert.equal(
      await p.getByRole("button", { name: /^查看法律依据/ }).count(),
      0,
    );
    assert.equal(
      requests.filter((url) => /\/api\/guides\/partner-visa/.test(url)).length,
      0,
    );
    assert.equal(await stored(p), null);
    assert.equal(await noOverflow(p), true, `overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/checklist-unpublished-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(appErrors(errors), []);
    console.log(
      `PASS unpublished ${width}px: all tasks pending, nothing restated`,
    );
    await context.close();
  }

  // Unpublished topic page: pending state, noindex, no content.
  {
    const { p, context } = await page(1280);
    await p.goto(
      `${baseURL}/family-visa/topics/children-from-previous-relationship`,
    );
    await p.getByText("这个专题还在核对中").waitFor();
    assert.equal(
      await p.locator('meta[name="robots"]').getAttribute("content"),
      "noindex, nofollow",
    );
    assert.equal(await p.locator(".family-topic-task").count(), 0);
    assert.match(await p.title(), /孩子来自上一段关系/);
    // Leaving the page removes the noindex tag again.
    await p.getByRole("link", { name: "回到家庭与签证" }).click();
    await p.waitForURL(/\/family-visa$/);
    assert.equal(await p.locator('meta[name="robots"]').count(), 0);
    console.log("PASS topic page unpublished: pending, noindex, no content");
    await context.close();
  }

  const details = haveGuides
    ? Object.fromEntries(
        Object.values(SLUGS).map((slug) => [slug, published(slug)]),
      )
    : {};
  const list = haveGuides
    ? [...Object.values(details).map(meta), otherFamily]
    : [otherFamily];
  if (!haveWording)
    console.log(
      "SKIP verified-wording checks: they need the opt-in preview server (npm run dev:family-visa-preview), the local wording file and the backend drafts",
    );
  {
    // Verified checklist, decline saving: labels, details, evidence, privacy.
    if (haveWording)
      for (const width of [1280, 390, 320]) {
        const { p, context, errors, requests } = await page(width, {
          details,
          list,
        });
        await p.goto(`${baseURL}/family-visa`);
        await toChecklist(p, EXAMPLE);
        assert.match(
          await p.locator(".checklist-save").textContent(),
          /没有保存/,
        );
        await openSection(p, "身份和申请材料");
        assert.equal(
          await task(p, "申请人的有效护照或旅行证件")
            .locator(".checklist-badge")
            .textContent(),
          "常见材料 · 待核对",
        );
        await openSection(p, "婚姻 / 伴侣关系和真实关系证据");
        assert.equal(
          await task(p, "结婚证或民事伴侣登记证明")
            .locator(".checklist-badge")
            .textContent(),
          "必需",
        );
        const previous = task(p, "以前的婚姻或关系已经结束的证明");
        assert.equal(
          await previous.locator(".checklist-badge").textContent(),
          "视情况",
        );
        assert.match(
          await previous.textContent(),
          /适用于：如果你们任何一方以前结过婚/,
        );
        // A required task can never be marked not applicable.
        assert.equal(
          await task(p, "你们见过面的证明")
            .getByRole("button", { name: "这项不适用于我" })
            .count(),
          0,
        );
        // Child from a previous relationship: plain explanation, one evidence control.
        await openSection(p, "随行孩子");
        const sole = task(p, "单方负责的证据");
        await sole.getByRole("button", { name: "怎么准备" }).click();
        const soleText = await sole.textContent();
        const soleWording = LOCAL.tasks["kid-sole-responsibility"];
        for (const text of [
          soleWording.summary,
          ...soleWording.steps,
          soleWording.advice,
        ])
          assert.ok(
            soleText.includes(probe(text)),
            "sole-responsibility wording",
          );
        await sole
          .getByRole("button", { name: "查看法律依据（4 条）" })
          .click();
        assert.equal(await sole.locator(".evidence-panel").count(), 4);
        assert.equal(
          await task(p, "境内申请：孩子通常和你一起生活的证明").count(),
          0,
        );
        // Finance prepares documents only: no calculator.
        await openSection(p, "财务材料");
        assert.ok(
          (
            await section(p, "财务材料")
              .locator(".checklist-section-intro")
              .textContent()
          ).includes(probe(LOCAL.sections.finance.intro)),
        );
        assert.equal(await p.locator("input[type='number']").count(), 0);
        assert.equal(await noOverflow(p), true, `overflow at ${width}`);
        await p.screenshot({
          path: `${screenshots}/checklist-verified-${width}.png`,
          fullPage: true,
        });
        // Declined: nothing persisted; requests carry no answers.
        assert.equal(await stored(p), null);
        for (const url of requests.filter((u) => u.includes("/api/"))) {
          const path = new URL(url).pathname;
          assert.ok(
            path === "/api/guides" ||
              Object.values(SLUGS).some(
                (slug) => path === `/api/guides/${slug}`,
              ),
            path,
          );
          for (const token of ANSWER_TOKENS)
            assert.ok(!new URL(url).search.includes(token), url);
        }
        assert.equal(new URL(p.url()).search, "");
        assert.deepEqual(appErrors(errors), []);
        console.log(
          `PASS verified checklist ${width}px: labels, details, evidence, privacy`,
        );
        await context.close();
      }

    // Accommodation paths, ticking, green sections, not-applicable, completion.
    {
      const { p, context, errors } = await page(1280, { details, list });
      await p.goto(`${baseURL}/family-visa`);
      await toChecklist(p, {
        relationship: "已婚，或已登记民事伴侣",
        children: "没有",
        location: "英国境外",
      });
      await openSection(p, "英国住处");
      const housing = section(p, "英国住处");
      assert.equal(await task(p, "房产登记信息（Title Register）").count(), 0);
      await housing
        .getByRole("radio", { name: "自己的房子（自有房产）" })
        .check();
      await task(p, "房产登记信息（Title Register）").waitFor();
      assert.equal(await task(p, "租房合同").count(), 0);
      await housing.getByRole("radio", { name: "租的房子" }).check();
      await task(p, "租房合同").waitFor();
      assert.equal(await task(p, "房产登记信息（Title Register）").count(), 0);
      await housing
        .getByRole("radio", { name: "和亲友同住，或其他情况" })
        .check();
      await housing
        .locator(".checklist-note a[href='#special-circumstances']")
        .waitFor();
      assert.equal(await task(p, "租房合同").count(), 0);
      await housing.getByRole("radio", { name: "租的房子" }).check();

      // Tick a whole section: it turns green and counts as complete.
      await openSection(p, "身份和申请材料");
      const identity = section(p, "身份和申请材料");
      const boxes = identity.getByRole("checkbox");
      const n = await boxes.count();
      for (let i = 0; i < n; i++) await boxes.nth(i).check();
      assert.match(await identity.getAttribute("class"), /is-complete/);
      assert.equal(
        await identity.locator(".checklist-section-count").textContent(),
        "已完成",
      );
      assert.match(await progressText(p), new RegExp(`已完成 ${n} / \\d+ 项`));

      // Complete everything: optional tasks marked not applicable, rest ticked.
      for (const title of SECTION_TITLES) await openSection(p, title);
      const skip = p.getByRole("button", { name: "这项不适用于我" });
      while ((await skip.count()) > 0) await skip.first().click();
      const all = p.locator(
        ".checklist-task:not(.is-excluded) input[type='checkbox']",
      );
      const total = await all.count();
      for (let i = 0; i < total; i++) await all.nth(i).check();
      await p.locator(".checklist-complete").waitFor();
      assert.match(
        await p.locator(".checklist-complete").textContent(),
        /不代表签证一定获批/,
      );
      assert.match(
        await progressText(p),
        new RegExp(`已完成 ${total} / ${total} 项`),
      );
      assert.equal(
        await p.locator(".checklist-section:not(.is-complete)").count(),
        0,
      );
      // Restoring a not-applicable task makes the list incomplete again.
      await p.getByRole("button", { name: "恢复这一项" }).first().click();
      assert.equal(await p.locator(".checklist-complete").count(), 0);
      assert.equal(await stored(p), null);
      assert.deepEqual(appErrors(errors), []);
      console.log(
        "PASS accommodation paths, green sections, not-applicable, completion",
      );
      await context.close();
    }

    // Changing answers keeps only still-relevant progress; back/forward.
    {
      const { p, context } = await page(1280, { details, list });
      await p.goto(`${baseURL}/family-visa`);
      await toChecklist(p, {
        relationship: "已婚，或已登记民事伴侣",
        children: "没有",
        location: "英国境外",
      });
      await openSection(p, "身份和申请材料");
      await task(p, "申请人的有效护照或旅行证件").getByRole("checkbox").check();
      await openSection(p, "婚姻 / 伴侣关系和真实关系证据");
      await task(p, "结婚证或民事伴侣登记证明").getByRole("checkbox").check();
      assert.match(await progressText(p), /已完成 2 \//);
      await p.getByRole("button", { name: "修改：你们是什么关系？" }).click();
      await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
      await answer(p, /^未婚伴侣/);
      await p.getByRole("button", { name: "直接查看结果" }).click();
      await settled(p);
      assert.equal(await task(p, "结婚证或民事伴侣登记证明").count(), 0);
      await openSection(p, "婚姻 / 伴侣关系和真实关系证据");
      await task(p, "在一起至少 2 年的证据").waitFor();
      assert.match(await progressText(p), /已完成 1 \//);
      await openSection(p, "身份和申请材料");
      assert.equal(
        await task(p, "申请人的有效护照或旅行证件")
          .getByRole("checkbox")
          .isChecked(),
        true,
      );
      await p.goBack();
      await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
      assert.equal(
        await p.getByRole("radio", { name: /^未婚伴侣/ }).isChecked(),
        true,
      );
      await p.goForward();
      await settled(p);
      console.log(
        "PASS changing answers prunes progress; back/forward keeps answers",
      );
      await context.close();
    }

    // Saving: consent, record shape, reload, resume, delete.
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      let p = (await page(1280, { details, list, context })).p;
      await p.goto(`${baseURL}/family-visa`);
      await toChecklist(p, EXAMPLE, { save: true });
      await openSection(p, "身份和申请材料");
      await task(p, "申请人的有效护照或旅行证件").getByRole("checkbox").check();
      const record = JSON.parse(await stored(p));
      assert.equal(record.schema, 1);
      assert.equal(
        Date.parse(record.expiresAt) - Date.parse(record.createdAt),
        30 * 24 * 60 * 60 * 1000,
      );
      assert.deepEqual(record.progress.checked, ["id-passport"]);
      assert.deepEqual(Object.keys(record.answers).sort(), [
        "childRelations",
        "children",
        "location",
        "relationship",
      ]);
      assert.match(
        await p.locator(".checklist-save").textContent(),
        /进度保存在这台设备上/,
      );
      await p.reload();
      await settled(p);
      await openSection(p, "身份和申请材料");
      assert.equal(
        await task(p, "申请人的有效护照或旅行证件")
          .getByRole("checkbox")
          .isChecked(),
        true,
      );
      // A new visit offers to resume.
      p = (await page(1280, { details, list, context })).p;
      await p.goto(`${baseURL}/family-visa`);
      await p
        .getByText("欢迎回来！你在这台设备上保存了一份准备清单。")
        .waitFor();
      assert.match(
        await p.locator(".resume-meta").textContent(),
        /已勾选 1 项/,
      );
      await p.getByRole("button", { name: "继续上次的清单" }).click();
      await settled(p);
      await openSection(p, "身份和申请材料");
      assert.equal(
        await task(p, "申请人的有效护照或旅行证件")
          .getByRole("checkbox")
          .isChecked(),
        true,
      );
      await p.getByRole("button", { name: "删除本设备上的进度" }).click();
      assert.equal(await stored(p), null);
      await p.getByText("已删除这台设备上保存的准备进度。").waitFor();
      assert.match(
        await p.locator(".checklist-save").textContent(),
        /没有保存/,
      );
      // Ticks after deleting stay in memory only.
      await task(p, "英国伴侣的身份证明").getByRole("checkbox").check();
      assert.equal(await stored(p), null);
      p = (await page(1280, { details, list, context })).p;
      await p.goto(`${baseURL}/family-visa`);
      await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
      assert.equal(await p.locator(".resume-card").count(), 0);
      console.log(
        "PASS saving: consent, 30-day record, reload, resume, delete",
      );
      await context.close();
    }

    // Expired and unreadable records are removed with a notice.
    for (const [label, record, text] of [
      [
        "expired",
        JSON.stringify({
          schema: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-31T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          answers: { relationship: "married" },
          applicable: [],
          progress: { checked: [], notApplicable: [] },
        }),
        /超过 30 天，已经自动删除/,
      ],
      ["invalid", "{broken", /无法读取，已经删除/],
    ]) {
      const { p, context } = await page(1280, {
        details,
        list,
        init: `try { if (!sessionStorage.getItem("seeded")) { localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(record)}); sessionStorage.setItem("seeded", "1"); } } catch {}`,
      });
      await p.goto(`${baseURL}/family-visa`);
      await p.getByText(text).waitFor();
      assert.equal(await stored(p), null);
      assert.equal(await p.locator(".resume-card").count(), 0);
      console.log(`PASS ${label} saved record: removed, notice, no resume`);
      await context.close();
    }

    // Storage unavailable: the save choice falls back to memory with a notice.
    {
      const { p, context } = await page(1280, {
        details,
        list,
        init: `Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });`,
      });
      await p.goto(`${baseURL}/family-visa`);
      await toChecklist(p, EXAMPLE, { save: true });
      assert.match(
        await p.locator(".checklist-save").textContent(),
        /不能保存进度/,
      );
      await openSection(p, "身份和申请材料");
      await task(p, "申请人的有效护照或旅行证件").getByRole("checkbox").check();
      assert.match(await progressText(p), /已完成 1 \//);
      console.log("PASS storage unavailable: memory only, clear notice");
      await context.close();
    }

    // Special circumstances: checklist link, hub section, verified topic page.
    {
      const { p, context, errors } = await page(390, { details, list });
      await p.goto(`${baseURL}/family-visa`);
      await toChecklist(p, EXAMPLE);
      await p.locator(".checklist-special-link a").click();
      await p.waitForURL(/#special-circumstances$/);
      await p
        .locator("#special-circumstances")
        .getByRole("link", { name: /孩子来自上一段关系/ })
        .click();
      await p.waitForURL(
        /\/family-visa\/topics\/children-from-previous-relationship$/,
      );
      await p
        .getByRole("heading", {
          level: 1,
          name: "孩子来自上一段关系，如何准备英国签证材料？",
        })
        .waitFor();
      if (haveWording) {
        await p.locator(".family-topic-task").first().waitFor();
        assert.equal(await p.locator('meta[name="robots"]').count(), 0);
        const topic = await p.locator(".family-topic-article").textContent();
        assert.match(topic, /单方负责的证据/);
        assert.ok(
          topic.includes(
            probe(LOCAL.topics["children-from-previous-relationship"].intro),
          ),
        );
      } else {
        await p.getByText("这个专题还在核对中").waitFor();
        assert.equal(
          await p.locator('meta[name="robots"]').getAttribute("content"),
          "noindex, nofollow",
        );
      }
      assert.equal(await noOverflow(p), true);
      await p.getByRole("link", { name: "生成我的材料清单" }).click();
      await p.waitForURL(/\/family-visa$/);
      assert.deepEqual(appErrors(errors), []);
      console.log(
        "PASS special circumstances: link, section, verified topic page",
      );
      await context.close();
    }

    // A changed Guide: its sections fall back to pending; others stay verified.
    if (haveWording) {
      const changed = {
        ...details,
        [SLUGS.finance]: {
          ...details[SLUGS.finance],
          updatedAt: "2026-12-01T09:00:00Z",
          publishedAt: "2026-12-01T09:00:00Z",
        },
      };
      const { p, context } = await page(1280, {
        details: changed,
        list: [...Object.values(changed).map(meta), otherFamily],
      });
      await p.goto(`${baseURL}/family-visa`);
      await toChecklist(p, {
        relationship: "已婚，或已登记民事伴侣",
        children: "没有",
        location: "英国境内",
      });
      for (const title of ["财务材料", "英国住处"]) {
        await openSection(p, title);
        const badges = await section(p, title)
          .locator(".checklist-badge")
          .allTextContents();
        assert.ok(
          badges.every((b) => b === "待核对"),
          `${title}: ${badges}`,
        );
      }
      await openSection(p, "婚姻 / 伴侣关系和真实关系证据");
      assert.equal(
        await task(p, "结婚证或民事伴侣登记证明")
          .locator(".checklist-badge")
          .textContent(),
        "必需",
      );
      console.log("PASS changed Guide: its sections pending, others verified");
      await context.close();
    }

    // The rules behind the checklist stay available as a secondary disclosure.
    if (haveWording) {
      const { p, context } = await page(1280, { details, list });
      await p.goto(`${baseURL}/family-visa`);
      await toChecklist(p, EXAMPLE);
      await p
        .getByRole("button", { name: "想了解这些要求背后的规则？" })
        .click();
      await p.locator(".journey-stage").first().waitFor();
      const statuses = await p.locator(".journey-status").allTextContents();
      assert.equal(statuses.length, 6);
      assert.match(statuses[0], /^已核对/);
      assert.equal(statuses[4], "待核对");
      console.log("PASS rules disclosure: six-stage explanation with evidence");
      await context.close();
    }
  }
  console.log(
    `Family & Visa checklist browser checks passed; screenshots in ${screenshots}`,
  );
} finally {
  await browser.close();
}
