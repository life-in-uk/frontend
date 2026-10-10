// Production isolation in a real browser: builds the app for production,
// serves it with `vite preview`, and mocks the API so that all four Family &
// Visa Guides look PUBLISHED at exactly the reviewed versions (the strongest
// case for a leak). The production build has no restated wording, so every
// checklist task, the rules section and the topic page must stay pending,
// whatever UI state or route is used.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localContent } from "./fixtures/familyVisaContent.mjs";
import { JOURNEY_GUIDES } from "../src/guides/familyVisaJourney.ts";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = path.join(root, "node_modules", ".bin", "vite");
const port = Number(process.env.PRODUCTION_PREVIEW_PORT || 5194);
const baseURL = `http://127.0.0.1:${port}`;
const guidesDir =
  process.env.FAMILY_VISA_GUIDES_DIR ||
  path.join(
    root,
    "..",
    "life-in-uk-backend",
    "content",
    "drafts",
    "family-visa",
  );
const SLUGS = [
  "partner-visa-routes-overview",
  "partner-visa-financial-requirement",
  "partner-visa-relationship-evidence",
  "partner-visa-dependent-children",
];
// Mandatory: with the backend drafts (real evidence, the strongest case) when
// present, otherwise with synthetic published-looking Guides.
const haveDrafts = SLUGS.every((slug) =>
  existsSync(path.join(guidesDir, `${slug}-zh.json`)),
);
const details = Object.fromEntries(
  SLUGS.map((slug) => {
    if (haveDrafts) {
      const { status: _status, ...guide } = JSON.parse(
        readFileSync(path.join(guidesDir, `${slug}-zh.json`), "utf8"),
      );
      return [slug, { ...guide, publishedAt: guide.updatedAt }];
    }
    const reviewed = Object.values(JOURNEY_GUIDES).find(
      (g) => g.slug === slug,
    ).reviewedUpdatedAt;
    return [
      slug,
      {
        slug,
        category: "family-visa",
        title: `Fixture ${slug}`,
        summary: "Fixture",
        publishedAt: reviewed,
        updatedAt: reviewed,
        content: "Fixture",
        sources: [
          {
            key: "s",
            organisation: "Fixture",
            title: "Fixture",
            url: "https://example.test/",
            accessedAt: reviewed,
          },
        ],
        evidence: [],
      },
    ];
  }),
);
const list = Object.values(details).map(
  ({ slug, category, title, summary, publishedAt, updatedAt }) => ({
    slug,
    category,
    title,
    summary,
    publishedAt,
    updatedAt,
  }),
);
// Distinctive local wording that must never render, when the gitignored
// local file is present (read at run time; nothing is quoted here).
const LOCAL = await localContent();
const probes = LOCAL
  ? [
      LOCAL.tasks["kid-sole-responsibility"].summary,
      LOCAL.tasks["rel-certificate"].summary,
      LOCAL.tasks["fin-standard"].summary,
      LOCAL.sections.children.intro,
      LOCAL.topics["children-from-previous-relationship"].intro,
    ].map((text) => text.replace(/\*\*/g, "").slice(0, 18))
  : [];
console.log(
  `Production isolation fixtures: ${haveDrafts ? "backend draft Guides" : "synthetic Guides"}; wording probes: ${LOCAL ? "local file" : "none (structural checks only)"}`,
);

const outDir = mkdtempSync(path.join(tmpdir(), "fv-prod-preview-"));
execFileSync(
  vite,
  ["build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"],
  {
    cwd: root,
    stdio: "pipe",
  },
);
const server = spawn(
  vite,
  [
    "preview",
    "--outDir",
    outDir,
    "--port",
    String(port),
    "--strictPort",
    "--host",
    "127.0.0.1",
  ],
  { cwd: root, stdio: "pipe" },
);
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${baseURL}/family-visa`)).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch({ headless: true });
async function page() {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const p = await context.newPage();
  const requests = [];
  const errors = [];
  p.on("request", (r) => requests.push(r.url()));
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route(/\/api\//, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/guides") return route.fulfill({ json: list });
    const match = /^\/api\/guides\/(.+)$/.exec(pathname);
    if (match && details[match[1]])
      return route.fulfill({ json: details[match[1]] });
    return route.fulfill({ status: 404, json: {} });
  });
  await p.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) =>
    route.abort(),
  );
  return { p, context, requests, errors };
}
/** Clicks matching closed toggles until none remain. */
async function openAll(p, selector) {
  const closed = p.locator(selector);
  for (let guard = 0; guard < 200 && (await closed.count()) > 0; guard++)
    await closed.first().click();
}
const noWording = async (p, where) => {
  const text = await p.locator("main").textContent();
  for (const probe of probes)
    assert.ok(!text.includes(probe), `${where}: ${probe}`);
};

try {
  // Checklist: every task pending even though the Guides look published.
  {
    const { p, context, requests, errors } = await page();
    await p.goto(`${baseURL}/family-visa`);
    await p.getByRole("radio", { name: "已婚，或已登记民事伴侣" }).check();
    await p.getByRole("button", { name: "下一步" }).click();
    await p.getByRole("radio", { name: "有", exact: true }).check();
    await p.getByRole("button", { name: "下一步" }).click();
    await p.getByRole("checkbox", { name: /^不是/ }).check();
    await p.getByRole("button", { name: "下一步" }).click();
    await p.getByRole("radio", { name: "英国境内", exact: true }).check();
    await p.getByRole("button", { name: "查看结果" }).click();
    await p.getByRole("button", { name: "不保存，直接开始" }).click();
    await p.locator(".checklist-section").first().waitFor();
    await p.waitForLoadState("networkidle");
    // Open every section and every task detail (all UI states).
    await openAll(p, ".checklist-section-toggle[aria-expanded='false']");
    await openAll(p, "button.checklist-link-button[aria-expanded='false']");
    const badges = await p.locator(".checklist-badge").allTextContents();
    assert.ok(badges.length > 20);
    assert.ok(
      badges.every((b) => b === "待核对"),
      badges.join(","),
    );
    assert.equal(await p.locator(".checklist-section-intro").count(), 0);
    assert.equal(
      await p.getByRole("button", { name: /^查看法律依据/ }).count(),
      0,
    );
    assert.ok((await p.locator(".checklist-pending").count()) > 20);
    // The rules section stays pending too.
    await p.getByRole("button", { name: "想了解这些要求背后的规则？" }).click();
    await openAll(p, ".journey-toggle[aria-expanded='false']");
    const statuses = await p.locator(".journey-status").allTextContents();
    assert.ok(
      statuses.every((s) => s === "待核对"),
      statuses.join(","),
    );
    assert.equal(await p.locator(".journey-passage").count(), 0);
    await noWording(p, "checklist");
    // No module beyond the production bundle was requested.
    assert.ok(
      !requests.some((u) =>
        /\.ts(\?|$)|familyVisaDraftContent|\/dev\//.test(u),
      ),
      requests.filter((u) => !u.includes("/api/")).join("\n"),
    );
    assert.equal(await p.locator("#family-visa-draft-preview").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS production checklist: published-looking Guides still show no wording",
    );
    await context.close();
  }

  // Hidden route: the topic page stays pending and noindex.
  {
    const { p, context } = await page();
    await p.goto(
      `${baseURL}/family-visa/topics/children-from-previous-relationship`,
    );
    await p.getByText("这个专题还在核对中").waitFor();
    assert.equal(
      await p.locator('meta[name="robots"]').getAttribute("content"),
      "noindex, nofollow",
    );
    assert.equal(await p.locator(".family-topic-task").count(), 0);
    await noWording(p, "topic page");
    console.log("PASS production topic page: pending, noindex, no wording");
    await context.close();
  }

  // Saved progress cannot unlock wording either.
  {
    const { p, context } = await page();
    await context.addInitScript(() => {
      const now = Date.now();
      localStorage.setItem(
        "lifeinuk.familyVisa.checklist",
        JSON.stringify({
          schema: 1,
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + 30 * 86400000).toISOString(),
          updatedAt: new Date(now).toISOString(),
          answers: {
            relationship: "unmarried",
            children: "yes",
            childRelations: ["not-parent"],
            location: "outside",
          },
          applicable: [],
          progress: { checked: ["rel-met"], notApplicable: [] },
        }),
      );
    });
    await p.goto(`${baseURL}/family-visa`);
    await p.getByRole("button", { name: "继续上次的清单" }).click();
    await p.locator(".checklist-section").first().waitFor();
    await p.waitForLoadState("networkidle");
    await openAll(p, ".checklist-section-toggle[aria-expanded='false']");
    const badges = await p.locator(".checklist-badge").allTextContents();
    assert.ok(
      badges.every((b) => b === "待核对"),
      badges.join(","),
    );
    await noWording(p, "resumed checklist");
    console.log("PASS production resume: saved state cannot unlock wording");
    await context.close();
  }
  console.log("Family & Visa production isolation checks passed");
} finally {
  await browser.close();
  server.kill();
  rmSync(outDir, { recursive: true, force: true });
}
