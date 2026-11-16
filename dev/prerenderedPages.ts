import { existsSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import type { Plugin } from "vite";

/**
 * `vite preview` only: serve a prerendered page (dist/<path>/index.html, see
 * scripts/prerender.mjs) for its extensionless URL, as a static host would
 * (`try_files $uri $uri/index.html`). Other URLs keep the SPA fallback. The
 * dev server and the build output are unaffected.
 */
export function prerenderedPages(): Plugin {
  return {
    name: "life-in-uk-prerendered-pages",
    configurePreviewServer(server) {
      const dist = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, _res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        const url = new URL(req.url ?? "/", "http://localhost");
        const path = url.pathname;
        if (path === "/" || path.endsWith("/") || extname(path) || path.startsWith("/api/")) return next();
        let file: string;
        try {
          file = join(dist, decodeURIComponent(path), "index.html");
        } catch {
          return next();
        }
        if (file.startsWith(dist + sep) && existsSync(file)) req.url = `${path}/${url.search}`;
        next();
      });
    },
  };
}
