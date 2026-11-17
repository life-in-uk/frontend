# Production edge: S3 + CloudFront

How the release build (`npm run build:release`, see `docs/seo-hosting.md`) is
served at `https://lifeinuk.info`. The backend side (EC2, Docker Compose,
nginx, PostgreSQL) is described in the backend repository's `deploy/RUNBOOK.md`.

```
Viewer ─HTTPS─► CloudFront  lifeinuk.info + www.lifeinuk.info (ACM certificate, us-east-1)
                 │  viewer-request function on every behaviour (scripts/edge/viewer-request.mjs)
                 ├─ default            → S3 site bucket (private, Origin Access Control)
                 ├─ /api/*             ┐
                 ├─ /sitemap.xml       ├→ origin.lifeinuk.info:443 (HTTPS only) → nginx → Spring Boot
                 └─ /robots.txt        ┘
```

## Distribution settings

| Setting | Value |
|---|---|
| Alternate domain names | `lifeinuk.info`, `www.lifeinuk.info` |
| Viewer protocol policy | Redirect HTTP to HTTPS (all behaviours) |
| Default behaviour (S3) | Managed `CachingOptimized`; compression on; GET/HEAD |
| `/api/*`, `/sitemap.xml`, `/robots.txt` | Origin `origin.lifeinuk.info`, protocol **HTTPS only**, TLSv1.2; cache policy `lifeinuk-api-no-cache` (TTL 0/0/1 s, gzip + Brotli enabled so `Accept-Encoding` reaches the origin, all query strings, no headers, no cookies); origin request policy `lifeinuk-api` (all query strings, header `CloudFront-Viewer-Address`, no cookies); custom origin header `X-Origin-Verify: <secret>`; methods GET/HEAD (OPTIONS not needed: same origin) |
| Function associations | `lifeinuk-viewer-request` (viewer request) on all three behaviours |
| **Custom error responses** | **None.** See below. |
| Response headers policy | Managed `SecurityHeadersPolicy` |
| Price class | `PriceClass_200` |
| Default root object | none (the function handles `/`) |

The S3 bucket policy allows the distribution (OAC, `AWS:SourceArn`)
`s3:GetObject` on the objects **and `s3:ListBucket` on the bucket**, so a
missing key is a 404, not a 403.

## Why there are no custom error responses

CloudFront custom error responses apply to the whole distribution, including
`/api/*`. A rule "404 → `/404.html`" would replace the backend's JSON error
bodies (for example `{"code":"GUIDE_NOT_FOUND"}`) with the HTML 404 page.
Instead the viewer-request function knows the release's page set and answers
unknown paths itself with status 404 and the release's `404.html` as the body.
API responses, including errors, pass through untouched. S3 only ever sees
keys of real pages, the shell, or files with an extension (a missing one is
S3's own 404).

## The viewer-request function

Generated per release from `dist/` (`npm run edge:function`). It embeds the
localized page set (as locale bitmasks), the app-only routes and `404.html`,
and derives the zh-CN short URLs from the zh-CN pages. The generator runs the
function against every page, redirect and app-only route of the build and
fails if any disagrees with `seo-redirects.json` / `seo-spa-routes.json`, or
if the code exceeds the 10 KB CloudFront Functions quota (warning above 9 KB).
The current release is about 6.3 KB; each additional five-locale Guide adds
about 40 bytes. When the warning appears, move `PAGES` to a CloudFront
KeyValueStore.

Differences from the reference host (`scripts/seo/static-host.mjs`), by design:
`/owner/**`, `/api/owner/**` and `/api/editorial/**` are 404 (owner tools are
never public), and any host other than `lifeinuk.info` gets a 301 to it.

## Deploying a release

```
PUBLIC_ORIGIN=https://lifeinuk.info API_BASE=<Guide API> npm run build:release   # writes release/build.json
npm run deploy:site -- --bucket <bucket> --distribution <id> --function lifeinuk-viewer-request            # dry run
npm run deploy:site -- --bucket <bucket> --distribution <id> --function lifeinuk-viewer-request --execute
npm run verify:site -- --base https://lifeinuk.info --production
```

`deploy:site` refuses a `dist/` that is not a validated release of the current,
committed source for `https://lifeinuk.info`. It uploads assets, then other
files, then HTML (each with explicit `Content-Type` and `Cache-Control`),
updates the function, runs `test-function` on sample events in the real
CloudFront runtime and compares the results with the local function before
publishing, deletes objects that are not in the release, and invalidates `/*`.

The `API_BASE` used for the build must serve the same published content as
production (after a content release, build against production through the SSH
tunnel described in the backend runbook, or against the local backend that
was just promoted from).

## Verifying

`npm run verify:site` checks, from the release in `dist/`: all canonical URLs
(with and without trailing slash, byte-identical to the release files, `no-cache`),
the five locale home pages (`lang`, canonical, hreflang), every redirect with
its query string, app-only routes, real 404s (unknown sections, mistyped and
untranslated Guides, owner paths) with the noindex page, missing assets, asset
caching, the API on the same origin (every localized Guide detail; JSON error
bodies intact), `sitemap.xml` and `robots.txt`, and host canonicalization.
`--production` also requires API compression, the public origin in the
sitemap and robots.txt, and the HTTP → HTTPS and `www` → apex redirects.

Before DNS points at CloudFront, run it against an edge IP:
`--base https://lifeinuk.info --connect <CloudFront edge IP> --production`
(the HTTP and `www` checks then also go to that IP).

Locally, `npm run edge:emulate` serves `dist/` exactly as the distribution
would (function + S3 rules + API pass-through to `API_BASE`, default the
local backend), and `npm run verify:site -- --base http://127.0.0.1:4180 --host lifeinuk.info`
checks it.
