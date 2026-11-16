// Portable redirect manifest for the zh-CN short URLs (/renting/… →
// /zh-CN/renting/…). Hosts that support redirects should apply these as
// permanent (301) redirects; hosts that do not still serve the alias HTML
// pages, whose canonical already points at /zh-CN/…, so no link breaks.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { aliasFor } from "./inventory.mjs";

export const REDIRECTS_FILE = "seo-redirects.json";

export function redirectsFor(pages) {
  return pages
    .map((page) => ({ from: aliasFor(page), to: page.path, status: 301 }))
    .filter((row) => row.from)
    .sort((a, b) => a.from.localeCompare(b.from));
}

export async function writeRedirects(distDir, pages) {
  const redirects = redirectsFor(pages);
  const body = {
    description: "Permanent redirects from zh-CN short URLs to their canonical /zh-CN/ pages. Apply as HTTP 301 where the host supports redirects; the alias HTML pages remain as a fallback.",
    redirects,
  };
  await writeFile(join(distDir, REDIRECTS_FILE), JSON.stringify(body, null, 1) + "\n", "utf8");
  return redirects;
}
