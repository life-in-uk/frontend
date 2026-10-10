// Local-only preview of unpublished Family & Visa Guide drafts.
//
// Enabled only by `vite --mode family-visa-preview` on the dev server. The
// middleware answers the Guide API before the backend proxy:
//   GET /api/guides          backend list + the drafts (drafts win on slug)
//   GET /api/guides/{slug}   a draft's detail; anything else goes to backend
// Drafts are read unchanged from the backend checkout (no copies here), except
// that `status` is dropped and `publishedAt` is set to `updatedAt`, which is
// what a published Guide of that version would look like. The application is
// untouched: the navigator's version and evidence checks run as in production.
//
// The plugin never runs in `vite build` or `vite preview`, and a guard plugin
// makes a build in this mode fail, so a production bundle cannot contain it.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";

export const PREVIEW_MODE = "family-visa-preview";

const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)-zh\.json$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type DraftGuide = Record<string, unknown> & {
  slug: string;
  updatedAt: string;
};

/**
 * Family & Visa DRAFT Guides in a directory, shaped like published API
 * Guides. Files that are not `<slug>-zh.json`, not family-visa, not DRAFT, or
 * not valid JSON are skipped (and reported through `warn`).
 */
export function readDraftGuides(
  dir: string,
  warn: (message: string) => void = () => {},
): DraftGuide[] {
  if (!existsSync(dir)) {
    warn(`draft directory not found: ${dir}`);
    return [];
  }
  const drafts: DraftGuide[] = [];
  for (const name of readdirSync(dir).sort()) {
    const match = FILE.exec(name);
    if (!match) continue;
    try {
      const raw = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      if (
        raw.slug !== match[1] ||
        raw.category !== "family-visa" ||
        raw.status !== "DRAFT" ||
        typeof raw.updatedAt !== "string"
      ) {
        warn(`skipped ${name}: not a family-visa DRAFT matching its file name`);
        continue;
      }
      const guide = { ...raw, publishedAt: raw.updatedAt };
      delete guide.status;
      drafts.push(guide);
    } catch {
      warn(`skipped ${name}: unreadable JSON`);
    }
  }
  return drafts;
}

const META_KEYS = [
  "slug",
  "category",
  "title",
  "summary",
  "publishedAt",
  "updatedAt",
] as const;

/** The backend list with drafts added; a draft replaces a same-slug Guide. */
export function mergeGuideList(
  upstream: unknown,
  drafts: readonly DraftGuide[],
): Record<string, unknown>[] {
  const slugs = new Set(drafts.map((draft) => draft.slug));
  const list = Array.isArray(upstream)
    ? upstream.filter(
        (guide): guide is Record<string, unknown> =>
          typeof guide === "object" &&
          guide !== null &&
          !slugs.has((guide as Record<string, unknown>).slug as string),
      )
    : [];
  const metas = drafts.map((draft) =>
    Object.fromEntries(META_KEYS.map((key) => [key, draft[key]])),
  );
  return [...list, ...metas];
}

function sendJson(res: ServerResponse, body: unknown) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function upstreamList(target: string): Promise<unknown> {
  try {
    const response = await fetch(new URL("/api/guides", target), {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? await response.json() : [];
  } catch {
    return [];
  }
}

/** The preview middleware, exported for tests. */
export function previewMiddleware(options: {
  draftsDir: string;
  backendTarget: string;
  warn?: (message: string) => void;
}) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (req.method !== "GET" || !req.url) return next();
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/api/guides") {
      const drafts = readDraftGuides(options.draftsDir, options.warn);
      return sendJson(
        res,
        mergeGuideList(await upstreamList(options.backendTarget), drafts),
      );
    }
    const match = /^\/api\/guides\/([^/]+)$/.exec(pathname);
    if (match && SLUG.test(match[1])) {
      const draft = readDraftGuides(options.draftsDir, options.warn).find(
        (guide) => guide.slug === match[1],
      );
      if (draft) return sendJson(res, draft);
    }
    next();
  };
}

/** A small, fixed notice so drafts are never mistaken for published Guides. */
const BANNER_STYLE = [
  "position:fixed",
  "left:8px",
  "bottom:8px",
  "z-index:50",
  "max-width:calc(100vw - 16px)",
  "padding:6px 12px",
  "border-radius:999px",
  "background:#7a5d2e",
  "color:#fffdf9",
  "font:600 12px/1.5 system-ui,sans-serif",
  "box-shadow:0 4px 14px rgb(0 0 0 / 0.18)",
  "pointer-events:none",
].join(";");

/** Dev-server-only draft preview, active in PREVIEW_MODE. */
export function familyVisaDraftPreview(options: {
  draftsDir: string;
  backendTarget: string;
}): Plugin {
  return {
    name: "family-visa-draft-preview",
    apply: (_config, env) =>
      env.command === "serve" && !env.isPreview && env.mode === PREVIEW_MODE,
    configureServer(server) {
      const warn = (message: string) =>
        server.config.logger.warn(`[family-visa-preview] ${message}`);
      const drafts = readDraftGuides(options.draftsDir, warn);
      server.config.logger.info(
        `[family-visa-preview] LOCAL PREVIEW ONLY: serving ${drafts.length} DRAFT Guide(s) from ${options.draftsDir}`,
      );
      // Registered directly, so it runs before Vite's /api proxy.
      server.middlewares.use(previewMiddleware({ ...options, warn }));
    },
    transformIndexHtml: () => [
      {
        tag: "div",
        injectTo: "body",
        attrs: {
          id: "family-visa-draft-preview",
          role: "note",
          style: BANNER_STYLE,
        },
        children: "本地预览 · 家庭与签证显示未发布的 DRAFT 指南",
      },
    ],
  };
}

/** Fails any build in preview mode, so drafts can never ship. */
export function familyVisaPreviewBuildGuard(): Plugin {
  return {
    name: "family-visa-preview-build-guard",
    apply: "build",
    config(_config, env) {
      if (env.mode === PREVIEW_MODE)
        throw new Error(
          `"${PREVIEW_MODE}" is a local dev-server mode; it cannot be used for a build.`,
        );
    },
  };
}

/** The gitignored local wording module, served only by the opt-in preview. */
export const DRAFT_CONTENT_URL = /familyVisaDraftContent/;

/**
 * On every dev server except the opt-in preview, refuses requests for the
 * local DRAFT wording module, so plain `npm run dev` cannot serve it even
 * when asked for it directly.
 */
export function familyVisaDraftContentGuard(): Plugin {
  return {
    name: "family-visa-draft-content-guard",
    apply: (_config, env) =>
      env.command === "serve" && !env.isPreview && env.mode !== PREVIEW_MODE,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && DRAFT_CONTENT_URL.test(decodeURIComponent(req.url))) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        next();
      });
    },
  };
}
