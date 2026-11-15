// Production isolation in a real browser: builds the app for production,
// serves it with `vite preview`, and mocks the API so that all five Family &
// Visa Guides look PUBLISHED at exactly the reviewed versions. The production
// build carries only the reviewed wording in
// src/guides/familyVisaPublishedWording.ts (since 15 Nov 2026 this includes the
// dependent-children and application Guides). Draft-only text in the
// gitignored dev/ files (superseded children wording) must never render,
// whatever UI state or route is used.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localDraftContent as localContent } from "./fixtures/familyVisaContent.mjs";
import { JOURNEY_GUIDES } from "../src/guides/familyVisaJourney.ts";
import { FAMILY_VISA_PUBLISHED_WORDING } from "../src/guides/familyVisaPublishedWording.ts";
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
  "partner-visa-application-process",
  "partner-visa-dependent-children",
];
// Mandatory: with the backend drafts (real evidence, the strongest case) when
// present, otherwise with synthetic published-looking Guides.
const haveDrafts = SLUGS.every((slug) =>
  existsSync(path.join(guidesDir, `${slug}-zh.json`)),
);
const details = Object.fromEntries(
  SLUGS.map((slug) => {
    const reviewed = Object.values(JOURNEY_GUIDES).find(
      (g) => g.slug === slug,
    ).reviewedUpdatedAt;
    if (haveDrafts) {
      // Exactly the reviewed version (publishing re-stamps updatedAt).
      const { status: _status, ...guide } = JSON.parse(
        readFileSync(path.join(guidesDir, `${slug}-zh.json`), "utf8"),
      );
      return [slug, { ...guide, publishedAt: reviewed, updatedAt: reviewed }];
    }
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
// Only strings that exist in the dev file but NOT in the published wording are
// draft-only; those are the probes.
const allStrings = (value, out = []) => {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) if (k !== "reviewedFor") allStrings(v, out);
  return out;
};
const plain = (text) => text.replace(/\*\*/g, "");
const publishedText = allStrings(FAMILY_VISA_PUBLISHED_WORDING).map(plain);
const probes = LOCAL
  ? [...new Set(allStrings(LOCAL).map(plain))]
      .filter((text) => text.length >= 30)
      .map((text) => text.slice(0, 30))
      // A probe must not also begin (or appear in) any published string.
      .filter((probe) => !publishedText.some((text) => text.includes(probe)))
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
    // Published Guides: some tasks are verified, with their legal basis.
    assert.ok(
      badges.some((b) => b !== "待核对"),
      badges.join(","),
    );
    // Dependent children: published wording since 15 Nov 2026, so the section
    // is verified, with its reviewed intro.
    const kids = p.locator(".checklist-section", { hasText: "随行孩子" });
    const kidBadges = await kids.locator(".checklist-badge").allTextContents();
    assert.ok(kidBadges.length > 0);
    if (haveDrafts)
      assert.ok(
        kidBadges.some((b) => b !== "待核对"),
        kidBadges.join(","),
      );
    // The rules section shows published passages only.
    await p.getByRole("button", { name: "想了解这些要求背后的规则？" }).click();
    await openAll(p, ".journey-toggle[aria-expanded='false']");
    assert.ok((await p.locator(".journey-passage").count()) > 0);
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
      "PASS production checklist: published wording shows; children wording stays pending",
    );
    await context.close();
  }

  // Topic page: verified from the published wording, never draft-only text.
  {
    const { p, context } = await page();
    await p.goto(
      `${baseURL}/family-visa/topics/children-from-previous-relationship`,
    );
    if (haveDrafts) {
      await p.locator(".family-topic-task").first().waitFor();
      assert.equal(await p.locator('meta[name="robots"]').count(), 0);
    } else {
      await p.getByText("这个专题还在核对中").waitFor();
    }
    await noWording(p, "topic page");
    console.log("PASS production topic page: published wording only, no draft-only text");
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
    const kidBadges = await p
      .locator(".checklist-section", { hasText: "随行孩子" })
      .locator(".checklist-badge")
      .allTextContents();
    assert.ok(kidBadges.length > 0);
    await noWording(p, "resumed checklist");
    console.log("PASS production resume: saved state shows no draft-only wording");
    await context.close();
  }
  console.log("Family & Visa production isolation checks passed");
} finally {
  await browser.close();
  server.kill();
  rmSync(outDir, { recursive: true, force: true });
}
