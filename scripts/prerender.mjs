// `npm run build:static` (local): prerender every published Guide and topic
// hub into dist/ and validate the result. Canonical URLs use PUBLIC_ORIGIN if
// set, otherwise the backend's configured public origin (from robots.txt),
// which may be a local origin. For a deployable artifact use
// `npm run build:release`, which requires a public https origin.
//
//   API_BASE=http://127.0.0.1:8188 npm run build:static
import { resolve } from "node:path";
import { loadInventory } from "./seo/inventory.mjs";
import { prerender } from "./seo/prerender.mjs";
import { formatReport, validateSeoOutput } from "./seo/validate.mjs";

const API = (process.env.API_BASE || "http://127.0.0.1:8188").replace(/\/$/, "");
const DIST = resolve(process.env.DIST_DIR || "dist");

async function localOrigin() {
  if (process.env.PUBLIC_ORIGIN) return new URL(process.env.PUBLIC_ORIGIN).origin;
  const response = await fetch(`${API}/robots.txt`);
  const match = response.ok && /Sitemap:\s*(\S+)\/sitemap\.xml/.exec(await response.text());
  if (!match) throw new Error("No public origin: set life-in-uk.public-base-url on the backend or PUBLIC_ORIGIN");
  return new URL(match[1]).origin;
}

try {
  const origin = await localOrigin();
  const inventory = await loadInventory(API);
  const { written } = await prerender({ distDir: DIST, origin, inventory });
  console.log(`prerendered ${written.length} HTML files for ${origin}`);
  const { errors, report } = await validateSeoOutput({ distDir: DIST, inventory, origin });
  console.log(formatReport(report, errors));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error(`build:static failed: ${error.message}`);
  process.exitCode = 1;
}
