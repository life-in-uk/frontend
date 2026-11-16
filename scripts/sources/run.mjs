// Manual, local source review. Never runs on its own; nothing is scheduled.
//
//   npm run sources:inventory                 # offline from the sources: inventory summary only
//   npm run sources:check                     # check every allowlisted source (≈1.5 s apart)
//   npm run sources:check -- --risk high      # only sources used by high-priority Guides
//   npm run sources:check -- --limit 20 --delay 2000 --only gov.uk/eta
//   npm run sources:check -- --all            # include commercial pages (banks) too
//
// Reads the published Guides from API_BASE (GET only) and the sources (GET
// only). Writes nothing but the review queue and the text-hash baseline in
// SOURCE_REVIEW_DIR (default ~/.local/state/life-in-uk/source-review). It never
// calls an owner or editorial endpoint and never edits a Guide.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { assessSource, fetchSource, renderQueue, reviewQueue } from "./check.mjs";
import { buildSourceInventory, inventorySummary, loadPublishedDetails } from "./inventory.mjs";
import { RISK_ORDER } from "./risk.mjs";

/** Official bodies and statutory or national advice services; other domains (banks) need --all. */
export const ALLOWLIST = [
  "www.gov.uk", "www.legislation.gov.uk", "assets.publishing.service.gov.uk",
  "www.nhs.uk", "www.england.nhs.uk", "www.nhsbsa.nhs.uk", "nhsbsa.nhs.uk", "faq.nhsbsa.nhs.uk", "www.sps.nhs.uk", "pthb.nhs.wales",
  "www.ofgem.gov.uk", "www.ofcom.org.uk", "www.ccw.org.uk", "handbook.fca.org.uk", "www.fca.org.uk", "www.fscs.org.uk", "www.bankofengland.co.uk",
  "england.shelter.org.uk", "www.citizensadvice.org.uk", "www.bma.org.uk", "www.healthwatch.co.uk",
];

export function parseArgs(argv) {
  const args = { command: argv[0] ?? "check", all: false, risk: null, limit: Infinity, delay: 1500, only: null };
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--all") args.all = true;
    else if (flag === "--risk") args.risk = argv[++i];
    else if (flag === "--limit") args.limit = Number(argv[++i]);
    else if (flag === "--delay") args.delay = Number(argv[++i]);
    else if (flag === "--only") args.only = argv[++i];
    else throw new Error(`unknown option ${flag}`);
  }
  if (args.risk && !RISK_ORDER.includes(args.risk)) throw new Error(`--risk must be one of ${RISK_ORDER.join(", ")}`);
  if (!(args.delay >= 500)) throw new Error("--delay must be at least 500 ms");
  return args;
}

/** Which inventory sources a run checks, and which it skips (and why). */
export function selectSources(inventory, args) {
  const chosen = [];
  const skipped = [];
  for (const source of inventory.sources.values()) {
    const host = new URL(source.url).hostname;
    if (!args.all && !ALLOWLIST.includes(host)) skipped.push({ url: source.url, reason: "not on the official/advice allowlist" });
    else if (args.risk && RISK_ORDER.indexOf(source.risk) > RISK_ORDER.indexOf(args.risk)) skipped.push({ url: source.url, reason: `priority ${source.risk}` });
    else if (args.only && !source.url.includes(args.only)) skipped.push({ url: source.url, reason: "--only filter" });
    else chosen.push(source);
  }
  const order = { high: 0, medium: 1, lower: 2 };
  chosen.sort((a, b) => order[a.risk] - order[b.risk] || a.url.localeCompare(b.url));
  return { chosen: chosen.slice(0, args.limit), skipped: [...skipped, ...chosen.slice(args.limit).map((s) => ({ url: s.url, reason: "--limit" }))] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const api = (process.env.API_BASE || "http://127.0.0.1:8188").replace(/\/$/, "");
  const outDir = process.env.SOURCE_REVIEW_DIR || join(homedir(), ".local/state/life-in-uk/source-review");
  const inventory = buildSourceInventory(await loadPublishedDetails(api));
  const summary = inventorySummary(inventory);
  if (args.command === "inventory") {
    console.log(JSON.stringify(summary, null, 1));
    const shared = [...inventory.sources.values()].sort((a, b) => b.guides.size - a.guides.size).slice(0, 10);
    for (const source of shared) {
      const locales = new Set([...source.guides.values()].flatMap((cite) => cite.locales));
      console.log(`${String(source.guides.size).padStart(3)} Guides · ${locales.size} locales · ${source.risk.padEnd(6)} · ${source.url}`);
    }
    return;
  }
  if (args.command !== "check") throw new Error(`unknown command ${args.command} (use inventory or check)`);
  await mkdir(outDir, { recursive: true });
  const baselineFile = join(outDir, "baseline.json");
  const baseline = existsSync(baselineFile) ? JSON.parse(await readFile(baselineFile, "utf8")) : {};
  const { chosen, skipped } = selectSources(inventory, args);
  const results = new Map();
  const checkedAt = new Date().toISOString();
  for (const [index, source] of chosen.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, args.delay));
    const result = assessSource(source, await fetchSource(source.url), baseline[source.url]);
    results.set(source.url, result);
    process.stdout.write(`${String(index + 1).padStart(3)}/${chosen.length} ${result.status.padEnd(11)} ${source.url}\n`);
    // Only successful reads move the baseline; an outage never erases it.
    if (result.hash) baseline[source.url] = { hash: result.hash, checkedAt, publicUpdatedAt: result.publicUpdatedAt };
  }
  const items = reviewQueue(inventory, results);
  const stamp = checkedAt.replace(/[:.]/g, "-");
  const markdown = renderQueue(items, { checkedAt, summary, checked: chosen.length, skipped });
  await writeFile(join(outDir, `review-${stamp}.md`), markdown, "utf8");
  await writeFile(join(outDir, `review-${stamp}.json`), JSON.stringify({ checkedAt, summary, items, skipped }, null, 1), "utf8");
  await writeFile(baselineFile, JSON.stringify(baseline, null, 1), "utf8");
  console.log(`\nreview queue: ${join(outDir, `review-${stamp}.md`)}`);
  console.log(`review ${items.filter((i) => i.status === "review").length} · notes ${items.filter((i) => i.status === "note").length} · unavailable ${items.filter((i) => i.status === "unavailable").length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`source review failed: ${error.message}`);
    process.exitCode = 1;
  });
}
