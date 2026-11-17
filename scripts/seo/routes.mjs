// HTTP status contract for paths that are not prerendered files (see
// docs/seo-hosting.md). Every published Guide, topic hub and home page, and
// each verified Family Visa topic page, is a prerendered page; the only other
// real pages are the app-only routes below (the site root, the localized
// Guide index, travel tools, Family Visa topic pages whose content is not
// verified, and the owner's editorial tool). Any other extensionless path, including a Guide
// slug that is not published in that locale, is unknown: the host answers it
// with 404.html (the app shell plus noindex), status 404, so the app still
// shows its "not found" page but nothing is indexed as a soft 404.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GUIDE_LOCALES, guideHomePath } from "../../src/guides/locales.ts";
import { FAMILY_VISA_TOPICS, matchRoute } from "../../src/router.ts";
import { aliasFor, HOME_PATHS, ROOT_ALIAS } from "./inventory.mjs";

const SPA_ROOT = '<div id="root"></div>';

export const SPA_ROUTES_FILE = "seo-spa-routes.json";
export const NOT_FOUND_FILE = "404.html";

/**
 * App-only routes that answer 200 with the SPA shell: exact paths, plus path
 * prefixes. Paths that are prerendered `pages` (or their zh-CN short URLs) are
 * left out; the root stays, as the shell a host without redirects serves.
 */
export function spaRoutes(pages = []) {
  const prerendered = new Set(pages.flatMap((page) => [page.path, aliasFor(page)]).filter((path) => path && path !== ROOT_ALIAS));
  const paths = [
    ...HOME_PATHS,
    "/travel",
    ...GUIDE_LOCALES.map((locale) => `/${locale}/travel`),
    ...GUIDE_LOCALES.map((locale) => `/${locale}/guides`),
    ...FAMILY_VISA_TOPICS.flatMap((topic) => [
      `/family-visa/topics/${topic}`,
      ...GUIDE_LOCALES.map((locale) => `/${locale}/family-visa/topics/${topic}`),
    ]),
    "/owner/editorial",
  ];
  for (const path of paths)
    if (matchRoute(path).name === "not-found") throw new Error(`SPA route ${path} is not a route of the app`);
  return { paths: [...new Set(paths)].filter((path) => !prerendered.has(path)).sort(), prefixes: ["/owner/editorial/"] };
}

export function isSpaRoute(path, routes) {
  return routes.paths.includes(path) || routes.prefixes.some((prefix) => path.startsWith(prefix));
}

/** The app shell, marked noindex, with a short no-JavaScript message and links to the five home pages. */
export function notFoundPage(template) {
  if (!template.includes(SPA_ROOT)) throw new Error("dist/index.html is not a fresh app build (no empty #root)");
  // data-guide-seo / data-prerendered: the app removes the tag after the first navigation (main.tsx, seo.ts).
  const tag = 'data-guide-seo="true" data-prerendered="true"';
  const homes = [["zh-CN", "简体中文"], ["zh-TW", "繁體中文"], ["en", "English"], ["ur", "اردو"], ["hi", "हिन्दी"]]
    .map(([locale, label]) => `<li><a href="${guideHomePath(locale)}">${label}</a></li>`).join("");
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>Page not found · Life in UK</title>\n    <meta name="robots" content="noindex" ${tag}>`)
    .replace(SPA_ROOT, `<div id="root"><main id="main" class="static-page"><h1>Page not found</h1><p>This page does not exist. Life in UK:</p><ul>${homes}</ul></main></div>`);
}

export async function writeNotFound(distDir, template, pages = []) {
  await writeFile(join(distDir, NOT_FOUND_FILE), notFoundPage(template), "utf8");
  const body = {
    description: "Extensionless paths that are app-only pages: serve index.html with status 200. Every other path that is not a file or a prerendered page: serve 404.html with status 404.",
    notFound: NOT_FOUND_FILE,
    ...spaRoutes(pages),
  };
  await writeFile(join(distDir, SPA_ROUTES_FILE), JSON.stringify(body, null, 1) + "\n", "utf8");
}
