// Local draft preview, end to end, against a running preview dev server
// (`npm run dev:family-visa-preview`, default http://127.0.0.1:5193). No API
// mocks: the dev-server middleware serves the reviewed drafts and the app's
// own integrity checks decide what shows. When NORMAL_URL is reachable (a
// plain `npm run dev` server), it also confirms preview is off there.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { localContent } from "./fixtures/familyVisaContent.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const previewURL = process.env.PREVIEW_URL || "http://127.0.0.1:5193";
// This suite checks the local draft preview itself, so it needs the
// gitignored local wording and the backend draft Guides. Expected text is
// read from them at run time; this public file quotes none of it.
const LOCAL = await localContent();
const routesDraft = fileURLToPath(
  new URL(
    "../../life-in-uk-backend/content/drafts/family-visa/partner-visa-routes-overview-zh.json",
    import.meta.url,
  ),
);
if (!LOCAL || !existsSync(routesDraft)) {
  console.log(
    "SKIP local preview checks: the local wording file or the backend drafts are not present",
  );
  process.exit(0);
}
const routesTitle = JSON.parse(readFileSync(routesDraft, "utf8")).title;
/** A short, distinctive prefix of a wording string (markup removed). */
const probe = (text) => text.replace(/\*\*/g, "").slice(0, 14);
const normalURL = process.env.NORMAL_URL || "http://127.0.0.1:5179";
const screenshots =
  process.env.SCREENSHOT_DIR || "/tmp/life-uk-family-visa-preview";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function page(width) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const p = await context.newPage();
  const errors = [];
  const requests = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("request", (r) => requests.push(r.url()));
  return { p, context, errors, requests };
}
const stage = (p, n) => p.locator(".journey-stage").nth(n - 1);
const noOverflow = (p) =>
  p.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );

try {
  for (const width of [1280, 390]) {
    const { p, context, errors, requests } = await page(width);
    await p.goto(`${previewURL}/family-visa`);
    // Clearly marked as a local draft preview.
    assert.match(
      await p.locator("#family-visa-draft-preview").textContent(),
      /本地预览 · 家庭与签证显示未发布的 DRAFT 指南/,
    );
    await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
    await p.getByRole("radio", { name: "已婚，或已登记民事伴侣" }).check();
    await p.getByRole("button", { name: "下一步" }).click();
    await p.getByRole("radio", { name: "有", exact: true }).check();
    await p.getByRole("button", { name: "下一步" }).click();
    await p.getByRole("checkbox", { name: /^不是/ }).check();
    await p.getByRole("button", { name: "下一步" }).click();
    await p.getByRole("radio", { name: "英国境外", exact: true }).check();
    await p.getByRole("button", { name: "查看结果" }).click();
    await p.getByRole("button", { name: "不保存，直接开始" }).click();
    await p.locator(".checklist-section").first().waitFor();
    // The checklist shows verified requirements from the drafts.
    await p.waitForLoadState("networkidle");
    assert.match(
      await p
        .locator(".checklist-badge")
        .allTextContents()
        .then((b) => b.join(",")),
      /必需/,
    );
    await p.getByRole("button", { name: "想了解这些要求背后的规则？" }).click();
    await p.locator(".journey-stage").first().waitFor();
    await p.waitForFunction(
      () => !document.querySelector(".journey-status-loading"),
    );

    const statuses = await p.locator(".journey-status").allTextContents();
    assert.equal(statuses.length, 6);
    assert.match(statuses[0], /^已核对 · \d+ 个要点$/);
    assert.match(statuses[1], /^已核对/);
    assert.match(statuses[2], /^已核对/);
    assert.match(statuses[3], /^已核对/);
    assert.equal(statuses[4], "待核对");
    assert.match(statuses[5], /^已核对/);
    assert.ok(
      (await stage(p, 1).textContent()).includes(
        probe(LOCAL.passages["s1-married"].text[0]),
      ),
    );
    assert.match(await stage(p, 2).textContent(), /一般是每年 £29,000/);
    // Expanded detail with evidence from the draft.
    await stage(p, 1).getByRole("button", { name: "展开详细信息" }).click();
    const details1 = stage(p, 1).locator(".journey-details");
    await details1
      .getByRole("button", { name: /^查看法律依据/ })
      .first()
      .click();
    await details1.locator(".evidence-panel").first().waitFor();
    assert.match(
      await details1.locator(".evidence-panel").first().textContent(),
      /Appendix FM/,
    );
    // Child stage from the T3 draft; the application stage stays pending.
    assert.match(
      await stage(p, 4).locator(".journey-summary").textContent(),
      /单方负责/,
    );
    await stage(p, 4).getByRole("button", { name: "展开详细信息" }).click();
    assert.ok(
      (await stage(p, 4).locator(".journey-details").textContent()).includes(
        probe(LOCAL.passages["d4-3-meaning"].text[0]),
      ),
    );
    assert.equal(statuses[4], "待核对");
    assert.equal(await stage(p, 5).locator(".journey-passage").count(), 0);
    assert.equal(await noOverflow(p), true, `overflow at ${width}`);
    await p.screenshot({
      path: `${screenshots}/preview-journey-${width}.png`,
      fullPage: false,
    });
    // Only the Guide API is called, with fixed paths.
    for (const url of requests.filter((u) => u.includes("/api/")))
      assert.match(
        new URL(url).pathname,
        /^\/api\/guides(\/partner-visa-(routes-overview|financial-requirement|relationship-evidence|dependent-children))?$/,
      );
    // The full Guide opens from the journey.
    await stage(p, 1)
      .getByRole("link", { name: /阅读完整指南/ })
      .click();
    await p.waitForURL(/\/family-visa\/partner-visa-routes-overview$/);
    await p.getByRole("heading", { level: 1, name: routesTitle }).waitFor();
    // Back returns to the results with the answers kept.
    await p.goBack();
    await p.locator(".checklist-section").first().waitFor();
    assert.match(
      await p.locator(".journey-answers").textContent(),
      /已婚或民事伴侣/,
    );
    assert.deepEqual(errors, []);
    console.log(`PASS preview ${width}px: verified journey from drafts`);
    await context.close();
  }

  // "全部指南" lists the drafts in preview.
  {
    const { p, context } = await page(1280);
    await p.goto(`${previewURL}/family-visa`);
    await p.getByRole("button", { name: "全部指南" }).click();
    await p.locator(".family-guide-card").first().waitFor();
    // Exactly the four drafts, by slug.
    const draftLinks = await p
      .locator(".family-guide-card a[href^='/family-visa/partner-visa-']")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")).sort());
    assert.deepEqual(draftLinks, [
      "/family-visa/partner-visa-dependent-children",
      "/family-visa/partner-visa-financial-requirement",
      "/family-visa/partner-visa-relationship-evidence",
      "/family-visa/partner-visa-routes-overview",
    ]);
    console.log("PASS preview: 全部指南 lists exactly the four drafts");
    await context.close();
  }

  // A plain dev server, if one is running, shows no drafts and no banner.
  {
    const { p, context } = await page(1280);
    let reachable = true;
    try {
      await p.goto(`${normalURL}/family-visa`, { timeout: 5000 });
    } catch {
      reachable = false;
    }
    if (!reachable)
      console.log(`SKIP normal server not reachable at ${normalURL}`);
    else {
      await p.getByRole("heading", { name: "你们是什么关系？" }).waitFor();
      assert.equal(await p.locator("#family-visa-draft-preview").count(), 0);
      await p.getByRole("radio", { name: "已婚，或已登记民事伴侣" }).check();
      await p.getByRole("button", { name: "下一步" }).click();
      await p.getByRole("radio", { name: "没有", exact: true }).check();
      await p.getByRole("button", { name: "下一步" }).click();
      await p.getByRole("radio", { name: "英国境外", exact: true }).check();
      await p.getByRole("button", { name: "查看结果" }).click();
      await p.getByRole("button", { name: "不保存，直接开始" }).click();
      await p.locator(".checklist-section").first().waitFor();
      await p.waitForLoadState("networkidle");
      // Without the preview, every checklist task stays pending.
      assert.ok(
        (await p.locator(".checklist-badge").allTextContents()).every(
          (b) => b === "待核对",
        ),
      );
      await p
        .getByRole("button", { name: "想了解这些要求背后的规则？" })
        .click();
      await p.locator(".journey-stage").first().waitFor();
      await p.waitForFunction(
        () => !document.querySelector(".journey-status-loading"),
      );
      assert.deepEqual(
        await p.locator(".journey-status").allTextContents(),
        Array(5).fill("待核对"),
      );
      const draft = await p.request.get(
        `${normalURL}/api/guides/partner-visa-routes-overview`,
      );
      assert.equal(draft.status(), 404);
      // Plain `npm run dev` refuses the local wording module itself.
      const wordingModule = await p.request.get(
        `${normalURL}/dev/familyVisaDraftContent.ts`,
      );
      assert.equal(wordingModule.status(), 404);
      console.log(
        "PASS normal dev server: no drafts, no wording module, no banner, all pending",
      );
    }
    await context.close();
  }
  console.log(
    `Family & Visa preview checks passed; screenshots in ${screenshots}`,
  );
} finally {
  await browser.close();
}
