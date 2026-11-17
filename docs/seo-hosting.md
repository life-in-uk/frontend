# Hosting the SEO release build

The deployable site is produced only by:

```
PUBLIC_ORIGIN=https://lifeinuk.info API_BASE=<Guide API> npm run build:release
```

It builds the app, prerenders every published Guide and topic hub, the five
home pages and each Family Visa topic page whose content is verified, from the
Guide API, writes `dist/seo-redirects.json`, validates everything against the
published inventory and the backend sitemap, and exits nonzero on any problem.
`npm run build` (app only) and `npm run build:static` (local origin) are for
development and must not be deployed.

`scripts/seo/static-host.mjs` is a dependency-free reference implementation of
the rules below (`npm run preview:release` serves `dist/` on port 4174), and
`tests/seo-release.test.mjs` checks it. `vite preview` (dev/prerenderedPages.ts)
follows rules 1 and 3 so the browser tests see the same statuses. Any static host or reverse proxy that
behaves the same way is suitable; no particular provider is assumed.

## Required behaviour

1. **Directory index, with or without a trailing slash.** `/en/renting/renting-council-tax`
   and `/en/renting/renting-council-tax/` must both return
   `dist/en/renting/renting-council-tax/index.html` with status 200 (for
   example `try_files $uri $uri/index.html …`). The canonical URL has no
   trailing slash; do not redirect the canonical form to a slash form.
2. **zh-CN short URLs and the root.** Apply every row of
   `dist/seo-redirects.json` as a permanent redirect
   (`/renting/renting-council-tax` → 301 → `/zh-CN/renting/renting-council-tax`,
   and `/` → 301 → `/zh-CN`), keeping the query string. If the host cannot
   redirect, serve the alias HTML that the build also writes: its canonical
   already points at `/zh-CN/…`, so old links keep working and only the
   `/zh-CN/…` URL is indexed. The root has no alias page (`dist/index.html` is
   the app shell); without the redirect it serves the shell, and the app sets
   the `/zh-CN` canonical when it starts. Short URLs and `/` are never sitemap
   entries, and no page links to them.
3. **App-only routes and unknown paths.** `dist/seo-spa-routes.json` lists the
   app-only routes (the root `/`, `/travel` and `/{locale}/travel`,
   `/{locale}/guides`, and Family Visa topic pages only while their content is
   not verified: exact `paths`) and path
   `prefixes` (`/owner/editorial/`). Those return `dist/index.html` with status
   200. **Every other path without a file extension returns `dist/404.html`
   with status 404**: unknown sections, mistyped Guide slugs and Guides not
   published in that locale (every published Guide and hub is a prerendered
   page, rule 1). `404.html` is the app shell with `noindex` and no canonical,
   so the app still shows its localized "not found" page while search engines
   get a real 404 instead of a soft 404. Missing files with an extension
   (`/assets/x.js`) return 404. A host that cannot return a custom status may
   fall back to serving `dist/index.html` with 200; the app then marks the page
   `noindex`, but that is weaker than a real 404.
4. **API and sitemap.** `/api/*`, `/sitemap.xml` and `/robots.txt` are served
   by the Spring Boot backend.
5. **Canonical consistency.** The backend must run with
   `life-in-uk.public-base-url` equal to `PUBLIC_ORIGIN`, so the sitemap,
   robots.txt and every page's canonical/hreflang use the same origin. The
   release build reports a mismatch as a deployment prerequisite.
6. **Caching.** HTML (`index.html` everywhere) must revalidate on every request
   (`Cache-Control: no-cache`) because a Guide update changes its page without
   changing its URL. Hashed files under `/assets/` may be cached for a year
   (`public, max-age=31536000, immutable`).

## When Guides change

Publishing, updating or withdrawing a Guide changes the inventory. Run
`npm run build:release` again and deploy the whole `dist/` (removing files that
are no longer present), so withdrawn or untranslated pages disappear and the
validator's "unexpected page" check stays meaningful.

## Structured data

Every prerendered Guide page carries one `<script type="application/ld+json">`
(an `Article` and a `BreadcrumbList`, built by `src/seo/structuredData.ts`
from the published title, summary, language, `publishedAt`/`updatedAt` and the
canonical URL). The app writes the same graph when it renders a Guide and
removes it on navigation. Topic hubs, home pages and 404 pages have none. The
release build validates that each Guide's JSON-LD matches the page.

## Launch checklist

The production host is S3 + CloudFront with a generated viewer-request
function (`docs/deploy-cloudfront.md`); it implements rule 3 without CloudFront
custom error responses, so API JSON errors are never replaced by `404.html`.
Before pointing the public domain at it, confirm each item against the
deployed site: `npm run verify:site -- --base https://lifeinuk.info --production`
automates rows 1–8 and 10–12 (the reference host `npm run preview:release`
and the edge emulator `npm run edge:emulate` show the expected answers).

| # | Requirement | How to verify after deployment |
|---|---|---|
| 1 | **HTTPS public origin.** The site answers only on `PUBLIC_ORIGIN` (`https://lifeinuk.info`). `http://` and any other host name (for example `www.`) redirect 301 to the same path on that origin. The app writes canonicals from `window.location.origin`, so a page served on another host would name that host. | `curl -sI http://lifeinuk.info/en/renting` → 301 to `https://lifeinuk.info/en/renting` |
| 2 | **Prerendered pages** (rule 1): all 290 sitemap URLs (250 Guide pages, 30 topic hubs, 5 home pages, 5 Family Visa topic pages) return 200 with their own HTML, with or without a trailing slash. | `curl -s https://lifeinuk.info/en/renting \| grep '<h1'` |
| 3 | **zh-CN short URLs and root** (rule 2): the 58 rows of `seo-redirects.json` (57 short URLs and `/` → `/zh-CN`) are 301s that keep the query string. | `curl -sI 'https://lifeinuk.info/renting?x=1'` → `Location: /zh-CN/renting?x=1`; `curl -sI https://lifeinuk.info/` → `Location: /zh-CN` |
| 4 | **SPA route allowlist and real 404s** (rule 3): only `seo-spa-routes.json` paths get the app shell with 200; every other extensionless path gets `404.html` with status 404; missing assets 404. | `curl -so /dev/null -w '%{http_code}' https://lifeinuk.info/en/renting/no-such-guide` → 404 |
| 5 | **Static asset caching** (rule 6): `/assets/*` `public, max-age=31536000, immutable`. | `curl -sI https://lifeinuk.info/assets/<entry>.js` |
| 6 | **HTML revalidation** (rule 6): every HTML response, including `404.html` and the app shell, `Cache-Control: no-cache`; a deploy replaces the whole `dist/` (removed pages must disappear). | `curl -sI https://lifeinuk.info/en/renting` |
| 7 | **API routing** (rule 4): `/api/*` reaches the Guide API on the same origin (the app calls relative `/api/...` URLs). | `curl -s https://lifeinuk.info/api/guides \| head -c 100` |
| 8 | **API compression.** The Spring Boot API answers uncompressed (a Guide detail is ~58 kB, ~14 kB gzipped; a Guide page loads ~190 kB of JSON). Enable gzip or Brotli for `application/json`, `application/xml` and `text/*` at the proxy, or `server.compression.enabled=true` with those MIME types in Spring. HTML, JS and CSS from `dist/` should also be compressed. | `curl -sI -H 'Accept-Encoding: gzip' https://lifeinuk.info/api/guides` → `Content-Encoding: gzip` |
| 9 | **API caching.** The API sends `Cache-Control: no-store`. This is safe (publishing shows immediately) but means every visit re-downloads Guide JSON. Keep it unless a short shared cache with purge-on-publish is added deliberately. | header check |
| 10 | **Backend public base URL** (rule 5): `life-in-uk.public-base-url=https://lifeinuk.info`, so robots.txt and every sitemap `<loc>`/hreflang use the public origin. `build:release` prints a "Deployment prerequisite" line while it does not. | `curl -s https://lifeinuk.info/robots.txt` → `Sitemap: https://lifeinuk.info/sitemap.xml` |
| 11 | **Sitemap and robots exposure** (rule 4): `/sitemap.xml` (290 URLs, `application/xml`) and `/robots.txt` are public and served from the backend. | Submit the sitemap in Google Search Console; check "Pages" and "Sitemaps" reports |
| 12 | **Owner editorial screen.** `/owner/editorial` is a local owner tool (docs/owner-editorial-local.md). The app marks it `noindex`, but its shell is served with 200. On the public host either do not expose it, or protect it, and do not enable the owner editorial API without HTTPS and the session settings in that document. | `curl -so /dev/null -w '%{http_code}' https://lifeinuk.info/api/owner/editorial` |
