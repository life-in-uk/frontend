# Frontend-owned sitemap: change plan (SEO audit F4, F9)

Status: **code in this PR; the one AWS change below needs owner approval.**
Until that change is made, nothing public changes. Deploys upload the new
sitemap to the bucket, but CloudFront keeps serving the backend's.

## Problem

`/sitemap.xml` is served live by the backend (`no-store`). A Guide is listed
the moment it is published. Its page exists only after the next frontend
deploy, and until then it is a real 404. On 27 Nov this happened to 10 URLs
for 3 h 50 min and to 10 more for 1 h 52 min. The backend sitemap has no
`<lastmod>`.

## Design

- **Source of truth.** The sitemap is derived from the deployed HTML
  (`scripts/seo/sitemap.mjs`).
  - Every canonical prerendered page is listed once, with the hreflang
    alternates the page declares.
  - Guides get `<lastmod>` from the Article `dateModified` the page shows.
    Hubs and homes get none, because no single reliable date describes them.
  - Any release artifact yields exactly the sitemap of the pages it serves,
    including an older one restored by a rollback.
  - `build:release` writes `dist/sitemap.xml` and fails if it does not list
    exactly the canonical inventory. The existing check against the backend
    sitemap stays as a publication-consistency check at build time.
- **Two-phase publication** (`scripts/edge/publish-sitemap.mjs`), run by the
  deploy workflow from its own commit, so rollbacks to older releases get the
  same handling:
  1. *Before* the edge function switches: if the public sitemap is served from
     the bucket, replace it with the URLs that both the live release and the
     new one serve.
     - Withdrawn pages leave before they stop being served.
     - New pages wait.
  2. *After* the public site is verified: the full sitemap, then a check that
     the public `/sitemap.xml` is exactly it (polls for up to 5 min).
  - The deploy itself never uploads or deletes the sitemap.
- **Freshness.** `Cache-Control: no-cache`, plus an invalidation of
  `/sitemap.xml` in each phase.
- **Security.** The deploy role is unchanged.
  - The live sitemap is read over HTTPS, so no `s3:GetObject` is needed.
  - Writing uses the existing `s3:PutObject` and
    `cloudfront:CreateInvalidation` permissions.
- **robots.txt** stays on the backend (it already names
  `https://lifeinuk.info/sitemap.xml`).

## Guarantee and its limits

At every point the public sitemap lists only URLs the live edge serves:

| Moment | Public sitemap | Every listed URL served? |
|---|---|---|
| Before phase 1 | old release's | yes (old function) |
| After phase 1, before the switch | old ∩ new | yes (both functions serve them) |
| Switch propagating (minutes) | old ∩ new | yes |
| After verification, phase 2 | new release's | yes (verified) |
| Deploy fails after phase 1 | old ∩ new | yes |
| Rollback to an older release | the same phases with that release's pages | yes |

The one remaining case is a rollback to a release older than this change.
That release's deploy deletes `sitemap.xml` from the bucket as a stale object,
so `/sitemap.xml` returns 404 for the minutes until phase 2 publishes the
restored release's sitemap. A missing sitemap is harmless: crawlers retry.

## Tested (`tests/sitemap.test.mjs`, runs in CI)

- **Publication:** a new page is absent after phase 1 and present after phase 2.
- **Withdrawal:** a removed page leaves in phase 1.
- **Failed deploy:** the phase-1 sitemap is a subset of both releases.
- **Rollback:**
  - to an older release, including one older than this change: only its own
    pages;
  - phase 1 removes the newer release's pages first.
- **Before the CloudFront switch:** phase 1 does nothing and phase 2 uploads
  without comparing.
- **Public mismatch after phase 2:** the step fails, so the workflow fails
  visibly.
- **Headers and uploads:** the sitemap is `no-cache`, never in the bulk upload,
  and never deleted as stale.
- **Against production data:** a release build of the current catalogue gives
  455 URLs and 405 `lastmod` values. Its URLs and every alternate are
  identical to the backend sitemap.

## The AWS change (for approval)

**Delete the CloudFront cache behaviour `/sitemap.xml`** on distribution
`E2VQEY0DI83CFH`. It currently sends the path to the backend origin.

- The default behaviour (S3 through OAC, with the viewer-request function)
  then serves the `sitemap.xml` object.
- The function already leaves `/sitemap.xml` unchanged, so no function change
  is needed.
- No IAM, DNS, certificate, bucket policy or backend change.

**Order:**

1. Merge this PR. Run a normal frontend deploy: phase 2 uploads the sitemap to
   the bucket; the backend still serves it publicly.
2. Check the object:
   ```
   aws s3api head-object --bucket lifeinuk-site-919693204623-eu-west-2 --key sitemap.xml
   ```
   Expect `ContentType` `application/xml` and `CacheControl` `no-cache`.
3. Save the current configuration (this is the rollback file):
   ```
   aws cloudfront get-distribution-config --id E2VQEY0DI83CFH > cf-before.json
   ```
4. Remove the `/sitemap.xml` item from `CacheBehaviors` (Quantity − 1) and
   apply it:
   ```
   aws cloudfront update-distribution --id E2VQEY0DI83CFH --if-match <ETag> --distribution-config file://cf-after.json
   ```
   Wait for `Deployed`.
5. Invalidate `/sitemap.xml`. Check:
   - `curl -sI https://lifeinuk.info/sitemap.xml`: `server: AmazonS3`, 200,
     `application/xml`;
   - the URL count equals the release's canonical pages (455 today);
   - `verify-site --production` passes.
6. Resubmit the sitemap in Search Console. Watch "Sitemaps → Discovered pages"
   and the 404 report over the observation period.

**Rollback:**
- Re-apply `cf-before.json` (`update-distribution` with the new ETag) and
  invalidate `/sitemap.xml`. The backend sitemap is public again within
  minutes.
- The deploy scripts need no change for either direction.

## Public catalogue links during publication and rollback (review)

The sitemap is not the only place where a published-but-not-deployed Guide
appears.

- **In-app lists** (hubs, the Guides index, related links) come from the live
  API. A Guide published after the last frontend deploy is linked in the app
  before its page exists. A visitor following that link gets the app's
  rendering through the 404 page, and a crawler gets a 404.
- **On a rollback,** the API still lists Guides that the restored release has
  no page for.
- **Prerendered HTML** (what non-rendering crawlers follow) only links pages
  of its own release, so it is consistent.

**Proposed** (small frontend change, separate PR, after approval of this plan):
1. The release publishes its page list (`/release-pages.json`, `no-cache`).
2. The app shows a Guide from an API list only if that list contains it.
3. If the list cannot be loaded, the app shows everything, as today.

With that, publication and rollback are consistent on every public surface.

**Process (no code):** after a backend publication, dispatch the frontend
deploy straight away. Approval latency is then the only gap, and with the
sitemap and the page list in place, the gap no longer exposes 404s.

## Coordination

The four new Money Guides should be published by Sol only:
- after this PR and its AWS change are live, or
- with a frontend deploy dispatched immediately after the publication, the
  procedure used on 27 Nov.
