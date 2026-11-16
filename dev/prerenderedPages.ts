import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import type { Plugin } from "vite";

/**
 * `vite preview` only: serve a prerendered page (dist/<path>/index.html, see
 * scripts/prerender.mjs) for its extensionless URL, as a static host would
 * (`try_files $uri $uri/index.html`). App-only routes keep the SPA fallback;
 * when the build wrote seo-spa-routes.json, any other extensionless path gets
 * 404.html with status 404 (scripts/seo/routes.mjs, docs/seo-hosting.md). The
 * dev server and the build output are unaffected.
 */
export function prerenderedPages(): Plugin {
  return {
    name: "life-in-uk-prerendered-pages",
    configurePreviewServer(server) {
      const dist = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, res, next) => {
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
        if (file.startsWith(dist + sep) && existsSync(file)) {
          req.url = `${path}/${url.search}`;
          return next();
        }
        const routesFile = join(dist, "seo-spa-routes.json");
        const notFound = join(dist, "404.html");
        if (existsSync(routesFile) && existsSync(notFound)) {
          const routes = JSON.parse(readFileSync(routesFile, "utf8")) as { paths: string[]; prefixes: string[] };
          if (!routes.paths.includes(path) && !routes.prefixes.some((prefix) => path.startsWith(prefix))) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            res.end(req.method === "HEAD" ? undefined : readFileSync(notFound));
            return;
          }
        }
        next();
      });
    },
  };
}
