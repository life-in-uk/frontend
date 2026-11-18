// Production builds of the travel tools (Rail released 2026-11-18).
//
// 1. Default production build: the Rail tool ships as a lazy chunk (never in
//    the entry script), like Underground and Roads. Served with `vite preview`
//    and mocked APIs: the homepage reads only the stored Underground snapshot;
//    the Rail tool loads on demand, makes no Rail request until the visitor
//    checks a station, shows a board, and says so honestly when the backend
//    has Rail switched off (RAIL_DISABLED).
// 2. VITE_RAIL_TOOL=off build: no Rail tool code at all; the Rail tab shows
//    the "not yet available" notice.
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
const RAIL_PROBES = ["/api/rail", "rail-card", "rail-check", "铁路延误与取消", "Check disruptions", "stations.csv", "rail-preview"];

function build(env) {
  const outDir = mkdtempSync(path.join(tmpdir(), "travel-prod-preview-"));
  execFileSync(vite, ["build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"], {
    cwd: root,
    stdio: "pipe",
    env: { ...process.env, ...env },
  });
  const assets = path.join(outDir, "assets");
  const scripts = readdirSync(assets).filter((file) => file.endsWith(".js"));
  const code = Object.fromEntries(scripts.map((file) => [file, readFileSync(path.join(assets, file), "utf8")]));
  const entry = readFileSync(path.join(outDir, "index.html"), "utf8").match(/assets\/(index-[^"]+\.js)/)[1];
  return { outDir, entryCode: code[entry], bundle: Object.values(code).join("\n") };
}

async function serve(outDir) {
  const server = spawn(vite, ["preview", "--outDir", outDir, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], {
    cwd: root,
    stdio: "pipe",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(baseURL)).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return server;
}

const BOARD = (direction) => ({
  stationName: "Sheffield",
  crs: "SHF",
  generatedAt: "2026-11-18T20:00:00Z",
  direction,
  unknownTimingCount: 0,
  disruptions: [
    {
      status: "delayed", delayMinutes: 12, scheduledTime: "20:10", estimatedTime: "20:22",
      locations: [{ name: "London St Pancras International", crs: "STP" }], platform: "5", operator: "East Midlands Railway",
      reason: "This train has been delayed by a fault with the signalling system", checkDelayRepay: false, affectedStops: [],
    },
  ],
});

const browser = await chromium.launch({ headless: true });
const builds = [];
try {
  // 1. Default production build.
  {
    const built = build({ VITE_RAIL_TOOL: "" });
    builds.push(built);
    for (const probe of ["/api/rail", "rail-check"])
      assert(built.bundle.includes(probe), `production bundle must contain the Rail tool (${probe})`);
    for (const probe of ["/api/rail", "/api/travel/underground", "/api/travel/roads", "/api/places/search", "rail-check"])
      assert(!built.entryCode.includes(probe), `${probe} must be lazy-loaded`);
    assert(!built.bundle.includes("rail-preview"), "no development preview switch");
    console.log("PASS default production bundle: Rail tool included as a lazy chunk; travel APIs outside the entry script");

    const server = await serve(built.outDir);
    try {
      for (const [prefix, railMode] of [["", "board"], ["/en", "disabled"], ["/ur", "board"]]) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const requests = [];
        await context.route("**/api/**", (route) => {
          const url = new URL(route.request().url());
          if (url.pathname === "/api/guides") return route.fulfill({ json: [] });
          if (url.pathname.startsWith("/api/rail/"))
            return railMode === "board"
              ? route.fulfill({ json: BOARD(url.searchParams.get("direction") || "arrivals") })
              : route.fulfill({ status: 503, json: { code: "RAIL_DISABLED", message: "Rail information is not available." } });
          return route.fulfill({ status: 404, json: {} });
        });
        await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => requests.push(new URL(request.url()).pathname));
        await page.goto(`${baseURL}${prefix}/`);
        await page.waitForLoadState("networkidle");
        // Homepage: only the stored Underground snapshot is read.
        assert(!requests.some((p) => /^\/api\/(travel\/roads|places|rail)/.test(p)));
        assert.equal(requests.filter((p) => p === "/api/travel/underground").length, 1);
        const railTile = page.locator('.transport-item[data-tool="rail"] .transport-status');
        assert.equal(await railTile.getAttribute("data-state"), "tool", "Rail tile opens the tool");
        const scriptsBefore = requests.filter((p) => p.endsWith(".js")).length;
        await page.locator('.transport-item[data-tool="rail"]').click();
        const card = page.locator(".travel-page .rail-card");
        await card.waitFor();
        assert(requests.filter((p) => p.endsWith(".js")).length > scriptsBefore, "Rail code loaded on demand");
        assert.equal(await page.locator(".travel-rail-unavailable").count(), 0);
        assert(!requests.some((p) => p.startsWith("/api/rail")), "no Rail request before a check");
        await card.locator("#rail-station").fill("shf");
        await card.locator(".rail-station-results button", { hasText: "Sheffield" }).first().click();
        await card.locator(".rail-check").click();
        if (railMode === "board") {
          await card.getByText("East Midlands Railway").first().waitFor();
        } else {
          await card.getByText("Live rail data is not connected on this site").waitFor();
          assert.equal(await card.locator('a[href="https://www.nationalrail.co.uk/status-and-disruptions/"]').count(), 1);
        }
        assert.equal(requests.filter((p) => p.startsWith("/api/rail")).length, 1, "one Rail request per check");
        assert.deepEqual(errors, []);
        await page.unrouteAll({ behavior: "ignoreErrors" });
        await context.close();
        console.log(`PASS production ${prefix || "/"}: Rail tool from the homepage panel, on-demand request, ${railMode === "board" ? "board shown" : "RAIL_DISABLED shown honestly"}`);
      }
    } finally {
      server.kill();
    }
  }

  // 2. VITE_RAIL_TOOL=off: no Rail tool code; the tab says not yet available.
  {
    const built = build({ VITE_RAIL_TOOL: "off" });
    builds.push(built);
    for (const probe of RAIL_PROBES)
      assert(!built.bundle.includes(probe), `VITE_RAIL_TOOL=off bundle must not contain ${probe}`);
    assert(built.bundle.includes("暂未开放"), "Rail unavailable notice is present");
    const server = await serve(built.outDir);
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const requests = [];
      await context.route("**/api/**", (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === "/api/guides") return route.fulfill({ json: [] });
        return route.fulfill({ status: 404, json: {} });
      });
      await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
      const page = await context.newPage();
      page.on("request", (request) => requests.push(new URL(request.url()).pathname));
      await page.goto(`${baseURL}/`);
      await page.waitForLoadState("networkidle");
      assert.match(await page.locator('.transport-item[data-tool="rail"]').innerText(), /暂未开放/);
      await page.locator('.transport-item[data-tool="rail"]').click();
      await page.locator('.travel-panel[data-tool="rail"] .travel-rail-unavailable').waitFor();
      assert.equal(await page.locator(".rail-card, .rail-check").count(), 0);
      assert(!requests.some((p) => p.startsWith("/api/rail")));
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await context.close();
      console.log("PASS VITE_RAIL_TOOL=off: no Rail code, notice with the National Rail link, no Rail requests");
    } finally {
      server.kill();
    }
  }
  console.log("Travel production build checks passed");
} finally {
  await browser.close();
  for (const built of builds) rmSync(built.outDir, { recursive: true, force: true });
}
