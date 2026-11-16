# Hosting the SEO release build

The deployable site is produced only by:

```
PUBLIC_ORIGIN=https://lifeinuk.info API_BASE=<Guide API> npm run build:release
```

It builds the app, prerenders every published Guide and topic hub from the
Guide API, writes `dist/seo-redirects.json`, validates everything against the
published inventory and the backend sitemap, and exits nonzero on any problem.
`npm run build` (app only) and `npm run build:static` (local origin) are for
development and must not be deployed.

`scripts/seo/static-host.mjs` is a dependency-free reference implementation of
the rules below (`npm run preview:release` serves `dist/` on port 4174), and
`tests/seo-release.test.mjs` checks it. Any static host or reverse proxy that
behaves the same way is suitable; no particular provider is assumed.

## Required behaviour

1. **Directory index, with or without a trailing slash.** `/en/renting/renting-council-tax`
   and `/en/renting/renting-council-tax/` must both return
   `dist/en/renting/renting-council-tax/index.html` with status 200 (for
   example `try_files $uri $uri/index.html …`). The canonical URL has no
   trailing slash; do not redirect the canonical form to a slash form.
2. **zh-CN short URLs.** Apply every row of `dist/seo-redirects.json` as a
   permanent redirect (`/renting/renting-council-tax` → 301 →
   `/zh-CN/renting/renting-council-tax`), keeping the query string. If the
   host cannot redirect, serve the alias HTML that the build also writes: its
   canonical already points at `/zh-CN/…`, so old links keep working and only
   the `/zh-CN/…` URL is indexed. Short URLs are never sitemap entries.
3. **SPA fallback.** Any other path without a file extension (for example
   `/travel`, `/`, `/en`) returns `dist/index.html` with status 200 so the app
   routes it. Missing files with an extension (`/assets/x.js`) return 404.
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
