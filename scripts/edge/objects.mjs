// The S3 objects a release uploads, with the headers CloudFront serves them
// with (docs/deploy-cloudfront.md). Shared by the deploy script and the local
// edge emulator so both apply exactly the same rules.
import { readdirSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { REDIRECTS_FILE } from "../seo/redirects.mjs";
import { SPA_ROUTES_FILE } from "../seo/routes.mjs";
import { SITEMAP_FILE } from "../seo/sitemap.mjs";

/** Build manifests used to generate the edge function; never uploaded. */
export const INTERNAL_FILES = new Set([REDIRECTS_FILE, SPA_ROUTES_FILE]);

/**
 * Uploaded by its own deploy steps, never with the other files: the sitemap is
 * published in two phases around the function switch (scripts/seo/sitemap.mjs).
 */
export const SEPARATELY_UPLOADED = new Set([SITEMAP_FILE]);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".csv": "text/csv; charset=utf-8",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

export const IMMUTABLE = "public, max-age=31536000, immutable";
export const REVALIDATE = "no-cache";
const SHORT = "public, max-age=3600";

export function contentTypeFor(key) {
  return TYPES[extname(key).toLowerCase()] ?? "application/octet-stream";
}

/** Hashed build assets are immutable; HTML and the sitemap always revalidate; other public files cache for an hour. */
export function cacheControlFor(key) {
  if (key.startsWith("assets/")) return IMMUTABLE;
  // The sitemap changes with every release and is narrowed during one: revalidate like HTML.
  if (key === SITEMAP_FILE) return REVALIDATE;
  if (key.endsWith(".html")) return REVALIDATE;
  return SHORT;
}

/** Every file of dist/ that is published, as { key, file, contentType, cacheControl }, sorted by key. */
export function uploadObjects(distDir) {
  const objects = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const key = relative(distDir, file).split(sep).join("/");
        if (INTERNAL_FILES.has(key)) continue;
        objects.push({ key, file, contentType: contentTypeFor(key), cacheControl: cacheControlFor(key) });
      }
    }
  };
  walk(distDir);
  return objects.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
