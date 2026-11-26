// UI/UX audit refinements (2026-11) in a real browser, with synthetic API data (no network):
//   - Health hub "choose by your situation" rows wrap long translated titles: no overflow at 320–390px.
//   - /{locale}/guides groups Guides by section with jump links; no footer jump while loading.
//   - Long Guides list their sections ("On this page"): open on wide screens, collapsed on phones;
//     inline links are underlined; breadcrumb, language and article share one column.
//   - Home: no "not yet translated" notice when every Guide is translated, a space between the two
//     lead sentences, market cards stacked full width on phones, no clipped header tagline.
//   - Checkboxes/radios are at least 24px; reduced motion disables transitions.
// Run against the dev server: FRONTEND_URL=http://127.0.0.1:5179 node tests/uiux.browser.mjs
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.FRONTEND_URL || "http://127.0.0.1:5179";
const LOCALES = ["zh-CN", "zh-TW", "en", "ur", "hi"];
const AT = "2026-11-20T10:00:00Z";

// Category ids as the backend sends them (src/guides/domains.ts).
const CATEGORY = { health: "health-nhs", visa: "family-visa", money: "money", renting: "renting" };
const LONG = {
  en: "Parents visiting the UK fall ill: GPs, A&E, NHS charges, travel insurance and what to bring",
  ur: "برطانیہ آنے والے والدین بیمار ہو جائیں: جی پی، اے اینڈ ای، این ایچ ایس کے اخراجات اور سفری بیمہ",
  hi: "ब्रिटेन आए माता-पिता बीमार पड़ जाएँ: जीपी, ए एंड ई, एनएचएस शुल्क, यात्रा बीमा और साथ क्या लाएँ",
};
const HEALTH_SLUGS = ["where-to-go-when-ill-england", "registering-with-a-gp-england", "medicines-prescriptions-england",
  "urgent-dental-care-england", "visiting-parents-healthcare-england", "nhs-ihs-costs-england"]; // HEALTH_INTENTS

function list(locale) {
  const title = (base) => locale === "zh-CN" ? `${base}（简体）` : `${LONG[locale] ?? LONG.en} — ${base}`;
  const guides = HEALTH_SLUGS.map((slug) => ({ slug, category: CATEGORY.health, title: title(slug), summary: `Summary ${slug}. `.repeat(12) }));
  guides.push({ slug: "uk-paye-tax-codes-national-insurance", category: CATEGORY.money, title: title("PAYE"), summary: "Tax summary." });
  guides.push({ slug: "partner-visa-routes-overview", category: CATEGORY.visa, title: title("Partner"), summary: "Visa summary." });
  guides.push({ slug: "renting-letting-agent-full-process", category: CATEGORY.renting, title: title("Renting"), summary: "Renting summary." });
  return guides.map((g) => ({ ...g, publishedAt: AT, updatedAt: AT }));
}
const CONTENT = [
  "## First section", "Read the [official page](https://www.gov.uk/example) before you start.",
  "## Second section", "Text.", "## Third section", "Text.", "## Fourth section", "Text.", "## Fifth section", "Text.",
].join("\n\n");
const detail = (locale, slug) => ({ ...list(locale).find((g) => g.slug === slug), content: CONTENT, sources: [], evidence: [] });

const browser = await chromium.launch();
async function open(path, width, { reducedMotion = "no-preference", holdLists = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await p.route(/\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (holdLists && /^\/api\/guides(\/locales\/[^/]+)?$/.test(path)) await held;
    let m;
    if (path === "/api/guides") return route.fulfill({ json: list("zh-CN") });
    if ((m = /^\/api\/guides\/locales\/([^/]+)$/.exec(path))) return route.fulfill({ json: list(m[1]) });
    if ((m = /^\/api\/guides\/([^/]+)\/locales\/([^/]+)$/.exec(path)))
      return route.fulfill({ json: { locale: m[2], guide: detail(m[2], m[1]), sourceRevisionId: null, contentHash: null } });
    if ((m = /^\/api\/guides\/([^/]+)$/.exec(path))) return route.fulfill({ json: detail("zh-CN", m[1]) });
    return route.fulfill({ status: 503, json: {} }); // live cards are out of scope here
  });
  await p.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
  await p.goto(baseURL + path);
  return { p, context, errors, release };
}
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}

await check("Health situation rows wrap long translated titles (no overflow, 320–390px, en/ur/hi)", async () => {
  for (const locale of ["en", "ur", "hi"]) for (const width of [320, 360, 390]) {
    const { p, context } = await open(`/${locale}/health`, width);
    await p.locator(".intent-chip").first().waitFor();
    assert.equal(await noOverflow(p), true, `${locale} ${width}`);
    const chips = await p.locator(".intent-chip").evaluateAll((els) => els.map((el) => ({
      fits: el.scrollWidth <= el.clientWidth + 1, w: el.getBoundingClientRect().width })));
    assert.ok(chips.length >= 5, `${locale} chips`);
    assert.ok(chips.every((c) => c.fits), `${locale} ${width}: a chip's text overflows`);
    assert.ok(chips.every((c) => c.w >= width - 64), `${locale} ${width}: one full-width row per chip`);
    await context.close();
  }
});

await check("Health hero is a WebP with a phone-sized source", async () => {
  const { p, context } = await open("/en/health", 360);
  const img = p.locator(".health-hero-image");
  await img.waitFor();
  assert.match(await img.getAttribute("src"), /\.webp$/);
  assert.match(await img.getAttribute("srcset"), /-800\.webp 800w/);
  assert.match(await img.evaluate((el) => el.currentSrc), /health-nhs-hero-800\.webp$/);
  await context.close();
});

await check("All-Guides index: sections in menu order with jump links; no layout jump while loading", async () => {
  for (const locale of ["en", "ur"]) {
    const { p, context, release } = await open(`/${locale}/guides`, 1440, { holdLists: true });
    await p.locator(".page-loading").waitFor();
    // While loading, the main area keeps a full screen of height: the footer is below the fold.
    const footerTop = await p.locator("footer").evaluate((el) => el.getBoundingClientRect().top);
    assert.ok(footerTop >= 900, `${locale}: footer visible while loading (${footerTop})`);
    release();
    await p.locator(".guide-index-section").first().waitFor();
    const ids = await p.locator(".guide-index-section").evaluateAll((els) => els.map((el) => el.id));
    assert.deepEqual(ids, ["guides-family-visa", "guides-renting", "guides-health", "guides-money"], locale);
    const jumps = await p.locator(".guide-index-jump a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
    assert.deepEqual(jumps, ids.map((id) => `#${id}`));
    assert.equal(await p.locator("#guides-health .localized-guide-list > li").count(), 6);
    assert.equal(await p.locator("#guides-health .guide-index-section-link").getAttribute("href"), `/${locale}/health`);
    // Long summaries are clamped to three lines in the listing.
    const clamped = await p.locator("#guides-health .localized-guide-list > li > a > span > span").first()
      .evaluate((el) => el.scrollHeight > el.clientHeight);
    assert.equal(clamped, true, `${locale}: summary clamp`);
    await p.locator(".guide-index-jump a[href='#guides-money']").click();
    await p.waitForTimeout(300);
    const top = await p.locator("#guides-money").evaluate((el) => el.getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 120, `${locale}: jump link scrolls to the section (${top})`);
    await context.close();
  }
});

await check("Guide sections list: open on desktop, collapsed on phones, anchors work; links underlined; one column", async () => {
  const path = "/en/money/uk-paye-tax-codes-national-insurance";
  const desktop = await open(path, 1440);
  const toc = desktop.p.locator(".guide-toc");
  await toc.waitFor();
  assert.equal(await toc.evaluate((el) => el.open), true);
  assert.deepEqual(await desktop.p.locator(".guide-toc a").evaluateAll((els) => els.map((a) => a.getAttribute("href"))),
    ["#guide-section-1", "#guide-section-2", "#guide-section-3", "#guide-section-4", "#guide-section-5"]);
  await desktop.p.locator(".guide-toc a[href='#guide-section-4']").click();
  await desktop.p.waitForTimeout(300);
  const top = await desktop.p.locator("#guide-section-4").evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(top >= 0 && top < 80, `anchor scroll (${top})`);
  const link = desktop.p.locator(".guide-body a[href^='https://www.gov.uk']");
  assert.match(await link.evaluate((el) => getComputedStyle(el).textDecorationLine), /underline/);
  const edges = await desktop.p.evaluate(() => ["nav.breadcrumb", ".guide-toolbar", ".guide-article"]
    .map((s) => Math.round(document.querySelector(s).getBoundingClientRect().left)));
  assert.equal(new Set(edges).size, 1, `left edges ${edges}`);
  await desktop.context.close();

  const phone = await open(path, 360);
  await phone.p.locator(".guide-toc").waitFor();
  assert.equal(await phone.p.locator(".guide-toc").evaluate((el) => el.open), false);
  assert.equal(await noOverflow(phone.p), true);
  await phone.context.close();
});

await check("Home: no translation notice when all Guides are translated; lead spacing; stacked markets; tagline", async () => {
  for (const locale of LOCALES) {
    const { p, context } = await open(`/${locale}`, 360);
    await p.locator(".home-hero-lead").waitFor();
    await p.locator(".topic-card").first().waitFor();
    await p.waitForTimeout(300);
    assert.equal(await p.locator(".home-translation-notice").count(), 0, `${locale}: notice`);
    const lead = await p.locator(".home-hero-lead").innerText();
    if (!locale.startsWith("zh")) assert.doesNotMatch(lead, /[.।۔][^\s]/u, `${locale}: sentences run together`);
    assert.equal(await p.locator(".masthead-brand .brand-caption").isVisible(), false, `${locale}: tagline hidden`);
    assert.equal(await noOverflow(p), true, locale);
    await context.close();
  }
  // Markets: placeholders stack in one column on phones (full-width cards).
  const { p, context } = await open("/en", 360);
  const cards = p.locator(".live-markets > *");
  await cards.first().waitFor();
  const boxes = await cards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: Math.round(r.left), w: Math.round(r.width) })));
  assert.equal(new Set(boxes.map((b) => b.x)).size, 1, "market cards share one column");
  assert.ok(boxes.every((b) => b.w > 280), "full width");
  await context.close();
});

await check("Search: a clear focus ring and a link to every Guide when nothing matches", async () => {
  const { p, context } = await open("/en", 1440);
  const input = p.locator(".home-search-form input");
  await input.waitFor();
  await p.locator(".topic-card").first().waitFor();
  await input.focus();
  const shadow = await p.locator(".home-search-form").evaluate((el) => getComputedStyle(el).boxShadow);
  assert.match(shadow, /rgb\(49, 92, 73\) 0px 0px 0px 2px/);
  await input.fill("zzqxv");
  const all = p.locator(".home-search-empty a[href='/en/guides']");
  await all.waitFor();
  assert.equal(await all.innerText(), "See all guides by topic");
  await context.close();
});

await check("Inputs are at least 24px; reduced motion removes transitions", async () => {
  const { p, context } = await open("/en/renting", 390, { reducedMotion: "reduce" });
  const radio = p.locator(".renting-option input").first();
  await radio.waitFor();
  const box = await radio.boundingBox();
  assert.ok(box.width >= 24 && box.height >= 24, `${box.width}x${box.height}`);
  const legendInside = await p.locator(".renting-question").first().evaluate((fs) => {
    const l = fs.querySelector("legend").getBoundingClientRect(); const f = fs.getBoundingClientRect();
    return l.top >= f.top && l.left >= f.left - 1 && l.right <= f.right + 1;
  });
  assert.equal(legendInside, true, "the question sits inside its card");
  const duration = await p.locator(".masthead-menu-button, .masthead-search").first()
    .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) || 0);
  assert.ok(duration <= 0.001, `transition ${duration}s`);
  await context.close();
});

await check("Unprefetched Urdu pages start right-to-left (no flip when the app starts)", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await context.newPage();
  await p.route(/\/api\//, (route) => route.fulfill({ status: 503, json: {} }));
  await p.route("**/src/main.tsx", (route) => route.abort()); // the app never starts
  await p.goto(`${baseURL}/ur/travel`).catch(() => {});
  assert.deepEqual(await p.evaluate(() => [document.documentElement.lang, document.documentElement.dir]), ["ur", "rtl"]);
  await context.close();
});

await browser.close();
console.log(results.join("\n"));
