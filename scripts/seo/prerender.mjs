// The one prerender pipeline: writes dist/<path>/index.html for every page
// the published inventory requires (see inventory.mjs), using the app's own
// renderer (src/seo/staticPages.ts). Used by `build:static`, `build:release`
// and the tests.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fillTemplate, staticGuidePage, staticHubPage } from "../../src/seo/staticPages.ts";
import { aliasFor, expectedPages } from "./inventory.mjs";
import { writeNotFound } from "./routes.mjs";

export const SPA_ROOT = '<div id="root"></div>';

/** Returns { pages, written } where pages are the expected canonical pages. */
export async function prerender({ distDir, origin, inventory }) {
  const template = await readFile(join(distDir, "index.html"), "utf8");
  if (!template.includes(SPA_ROOT)) throw new Error("dist/index.html is not a fresh app build (no empty #root); run vite build first");
  const pages = expectedPages(inventory);
  const written = [];
  const write = async (path, html) => {
    const file = join(distDir, path, "index.html");
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, "utf8");
    written.push(path);
  };
  for (const page of pages) {
    const published = inventory.lists[page.locale];
    const availableLocales = page.alternates.map((row) => row.locale);
    const rendered = page.kind === "guide"
      ? staticGuidePage({ origin, locale: page.locale, domainId: page.domainId, guide: inventory.details[page.locale].get(page.slug), published, availableLocales })
      : staticHubPage({
          origin, locale: page.locale, domainId: page.domainId, published, availableLocales,
          details: [...inventory.details[page.locale].values()].filter((guide) => published.some((meta) => meta.slug === guide.slug && meta.category === guide.category)),
        });
    if (!rendered) throw new Error(`No content for required page ${page.path}`);
    const html = fillTemplate(template, rendered);
    await write(page.path, html);
    const alias = aliasFor(page);
    if (alias) await write(alias, html);
  }
  // 404.html and the app-only route list for the host's status contract (routes.mjs).
  await writeNotFound(distDir, template);
  return { pages, written };
}
