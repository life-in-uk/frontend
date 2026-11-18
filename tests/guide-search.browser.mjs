// Exercises the homepage search and the shared header against the public
// list contract. No editorial API or production writes are involved.
import assert from "node:assert/strict";
import { SITE_UI } from "../src/guides/siteUi.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const browser = await chromium.launch({ headless: true });
const examples = [
  ["zh-CN", "全科医生", "临时地址", "ltr"],
  ["zh-TW", "家庭醫師", "臨時住址", "ltr"],
  ["en", "Register with a GP", "temporary address", "ltr"],
  ["ur", "ڈاکٹر کے ساتھ اندراج", "عارضی پتا", "rtl"],
  ["hi", "जीपी में पंजीकरण", "अस्थायी पता", "ltr"],
];
const slug = "registering-with-a-gp-england";
const date = "2026-11-17T14:00:00Z";
const meta = (title, summary, identifier = slug) => ({
  slug: identifier, category: "health-nhs", title, summary, publishedAt: date, updatedAt: date,
});
const sourceOnly = meta("仅简体中文发布", "仅简体中文发布", "source-only");

try {
  for (const [locale, title, summary, direction] of examples) {
    const ui = SITE_UI[locale];
    const context = await browser.newContext({ viewport: { width: locale === "en" ? 1280 : 320, height: 850 } });
    const page = await context.newPage();
    const published = meta(title, summary);
    const detail = { ...published, content: `# ${title}`, sources: [], evidence: [] };
    let finishLoading;
    const loading = new Promise((resolve) => { finishLoading = resolve; });
    const requests = [];
    await context.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      requests.push(path);
      const index = locale === "zh-CN" ? "/api/guides" : `/api/guides/locales/${locale}`;
      if (path === index) {
        await loading;
        return route.fulfill({ json: [published] });
      }
      if (path === "/api/guides")
        return route.fulfill(locale === "ur" ? { status: 503, json: {} } : { json: [sourceOnly] });
      if (path === `/api/guides/${slug}`) return route.fulfill({ json: detail });
      if (path === `/api/guides/${slug}/locales/${locale}`)
        return route.fulfill({ json: { locale, guide: detail, contentHash: null, sourceRevisionId: null } });
      if (path.startsWith("/api/guides/locales/")) return route.fulfill({ json: [sourceOnly] });
      return route.fulfill({ status: 404, json: {} });
    });
    await page.goto(`${base}/${locale}`);
    const input = page.getByRole("searchbox", { name: ui.search.input });
    const status = page.getByRole("status").and(page.locator(".home-search-status"));
    const results = page.locator(".home-search-list a");
    await input.fill(summary);
    assert.equal(await status.innerText(), ui.search.loading);
    finishLoading();
    await results.first().waitFor();
    assert.equal(await results.count(), 1);
    assert.equal(await results.first().locator(".home-search-summary").innerText(), summary);
    assert.equal(await page.locator("html").getAttribute("dir"), direction);
    assert.equal(await input.getAttribute("dir"), "auto");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(requests.every((path) => !path.startsWith("/api/editorial/") && !path.startsWith("/api/owner/")));
    await input.fill("仅简体中文发布");
    await page.locator(".home-search-empty").waitFor();
    assert.equal(await results.count(), 0);
    await input.press("Escape");
    assert.equal(await input.inputValue(), "");
    await input.fill(summary);
    await input.press("Enter");
    assert.equal(await input.evaluate((el) => el === document.activeElement), true);
    const href = `/${locale}/health/${slug}`;
    assert.equal(await results.first().getAttribute("href"), href);
    await results.first().click();
    await page.waitForURL(base + href);
    await page.locator("article.guide-article").waitFor();
    await page.getByRole("link", { name: ui.searchLabel }).click();
    await page.waitForURL(`${base}/${locale}#search`);
    await page.waitForFunction(() => document.activeElement?.id === "home-search");
    await context.close();
    console.log(`PASS ${locale}: search states, summary match, keyboard, navigation and layout`);
  }

  const context = await browser.newContext();
  await context.route("**/api/**", (route) => route.fulfill({ status: 503, json: {} }));
  const page = await context.newPage();
  await page.goto(`${base}/ur`);
  await page.getByRole("searchbox").fill("GP");
  await page.getByText(SITE_UI.ur.search.error, { exact: true }).waitFor();
  assert.equal(await page.locator(".home-search-list a").count(), 0);
  await context.close();
  console.log("PASS localized API failure renders the accessible error state");
} finally {
  await browser.close();
}
