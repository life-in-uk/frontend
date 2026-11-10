// Production isolation for travel tools: builds the app for production,
// checks that no Rail tool code ships, serves it with `vite preview`, and
// verifies in a browser that Rail stays unavailable (even with
// ?rail-preview) while Underground and Roads load lazily. APIs are mocked.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = path.join(root, "node_modules", ".bin", "vite");
const port = Number(process.env.PRODUCTION_PREVIEW_PORT || 5195);
const baseURL = `http://127.0.0.1:${port}`;

const outDir = mkdtempSync(path.join(tmpdir(), "travel-prod-preview-"));
execFileSync(
  vite,
  ["build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"],
  { cwd: root, stdio: "pipe" },
);

// 1. Static bundle: no Rail tool code, copy or API path in any script.
const assets = path.join(outDir, "assets");
const scripts = readdirSync(assets).filter((file) => file.endsWith(".js"));
const bundle = scripts
  .map((file) => readFileSync(path.join(assets, file), "utf8"))
  .join("\n");
for (const probe of [
  "/api/rail",
  "rail-card",
  "rail-check",
  "铁路延误与取消",
  "Check disruptions",
  "stations.csv",
  "rail-preview",
])
  assert(!bundle.includes(probe), `production bundle must not contain ${probe}`);
assert(bundle.includes("暂未开放"), "Rail unavailable notice is present");
// Underground and Roads are separate lazy chunks, not in the entry script.
const entry = readFileSync(path.join(outDir, "index.html"), "utf8").match(
  /assets\/(index-[^"]+\.js)/,
)[1];
const entryCode = readFileSync(path.join(assets, entry), "utf8");
for (const probe of ["/api/travel/underground", "/api/travel/roads", "/api/places/search"])
  assert(!entryCode.includes(probe), `${probe} must be lazy-loaded`);
console.log(
  `PASS production bundle: ${scripts.length} scripts, no Rail tool code; travel tools in lazy chunks`,
);

const server = spawn(
  vite,
  ["preview", "--outDir", outDir, "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
  { cwd: root, stdio: "pipe" },
);
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(baseURL)).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch({ headless: true });
try {
  for (const url of [`${baseURL}/`, `${baseURL}/?rail-preview`]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const requests = [];
    await context.route("**/api/**", (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/api/guides") return route.fulfill({ json: [] });
      return route.fulfill({ status: 404, json: {} });
    });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(new URL(request.url()).pathname));
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const scriptsBefore = requests.filter((p) => p.endsWith(".js")).length;
    assert(!requests.some((p) => /^\/api\/(travel|places|rail)/.test(p)));
    assert.match(
      await page.locator('.transport-item[data-tool="rail"]').innerText(),
      /暂未开放/,
    );
    await page.locator('.transport-item[data-tool="rail"]').click();
    const panel = page.locator('.travel-panel[data-tool="rail"]');
    await panel.locator(".travel-rail-unavailable").waitFor();
    assert.equal(await page.locator(".rail-card, .rail-check").count(), 0);
    // Underground is fetched only after its tab is chosen.
    await page.getByRole("tab", { name: "伦敦地铁" }).click();
    await page.locator(".travel-dialog .underground-card").waitFor();
    assert(
      requests.filter((p) => p.endsWith(".js")).length > scriptsBefore,
      "tool code loaded on demand",
    );
    assert(requests.includes("/api/travel/underground"));
    assert(!requests.some((p) => p.startsWith("/api/rail") || p.startsWith("/rail/")));
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS production ${new URL(url).search || "/"}: Rail unavailable, no Rail requests, tools lazy`);
  }
  console.log("Travel production isolation checks passed");
} finally {
  await browser.close();
  server.kill();
  rmSync(outDir, { recursive: true, force: true });
}
