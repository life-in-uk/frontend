# Final coordinated release plan (SEO remediation, About, F5 revisions, Money)

Status: **stage 0 complete (27 Nov 2026); stages 1–4 each await their own
protected approval.** A stage starts only when the previous one is accepted.
Nothing is published in the backend before stage 2 is accepted. Nothing in
production changes without the approval for that stage.

## Approval gates

| Gate | Stage | What changes in production | Who | Rollback |
|---|---|---|---|---|
| #1 | 1: frontend release R1 (code only) | Site bucket, edge function, invalidations, `release-pages.json` | Owner (workflow `production` environment) | `rollback_run_id=45990262568` (R0) |
| #2 | 2: CloudFront sitemap switch | One cache behaviour (`/sitemap.xml`) removed | Owner (own AWS profile) | `update-distribution` with `cf-before.json` |
| #3 | 3: backend publication (F5 revisions, Money) | Backend Guide content | Sol and owner | Sol's revision process |
| #4 | 4: frontend release R2 (content) | Site bucket, edge function, sitemap, page list | Owner (workflow `production` environment) | `rollback_run_id=<R1 run>` |

Each gate is approved separately. Approving one gate never implies approval of
the next.

## Stage 0: merge (owner, GitHub) — complete

Merged in this order on 27 Nov 2026. Before each merge, `main` was merged into
the branch (no force-push), the PR retargeted to `main`, and CI passed on the
exact head that was merged.

| Order | PR | Scope | Merge commit |
|---|---|---|---|
| 1 | #50 | F1/F7: temporary API failures never noindex | `12d3f60` |
| 2 | #54 | F2: 2 API calls per Guide; Guides readable during outages | `969c2ca` |
| 3 | #59 | Rendered-SEO test in CI; hub hreflang fix | `2fe6fa0` |
| 4 | #56 | F3: language links; orphan and cross-language checks | `1b03ea1` |
| 5 | #52 | F6: related links for the four new Work Visa Guides | `aabc2b0` |
| 6 | #57 | F4/F9: frontend sitemap, two-phase publication, CI pipefail | `9699a0a` |
| 7 | #58 | F8: prerendered Guides index (the two conflicts with #56 in `validate.mjs` and `LocalizedGuideIndex.tsx` resolved by keeping both sides) | `8f85ad8` |
| 8 | #60 | F10 capacity plan (docs) | `9174150` |
| 9 | #61 | F10 option A: hashed page set | `d376a3e` |
| 10 | #62 | Catalogue consistency: release page list | `2583493` |
| 11 | #63 | F12: About and editorial policy; Organization publisher | `069402d` |

Verified figures (CI on the #63 head `c5d137c`, identical in content to
`main` at `069402d`, release built from the production Guide API):
- **Tests:** 385 unit and release tests, 378 pass, 0 fail, 7 skipped; lint
  clean; the CI rendered-SEO test passes (15 pages × 4 API states,
  withdrawal, in-app failure, catalogue consistency); the emulator hosting
  contract passes (930 canonical-page checks, redirects, 404s, sitemap and
  robots).
- **Release build of the current catalogue:** 465 canonical URLs (405 Guide
  variants, 40 topic hubs, 5 homes, 5 Family Visa topic pages, 5 Guides
  indexes, 5 About pages), 93 redirects, 557 HTML files.
- **Edge function:** 6,285 bytes of 10,240, 465 pages. Routing of the hashed
  function was compared with the previous generator on the real release:
  15,556 requests, 0 differences.
- **About pages:** all five indexable, self-canonical, reciprocal hreflang
  (five languages + `x-default` → `/zh-CN/about`), copy identical to
  `docs/editorial/about-page/` (`b54d18c`), and linked from every page.

## Stage 1: frontend release R1, code only (protected approval #1)

- **Content:** `main` after stage 0. No new backend content.
- **Before:** production is run `45990262568` (`2154a21`, bundle
  `index-h_29Elbc.js`). Record it as R0. Confirmed read-only on 27 Nov 2026
  after stage 0: the public bundle is `index-h_29Elbc.js`,
  `/release-pages.json` is 404, and `/sitemap.xml` is served by the backend.
- **Deploy** (the workflow, unchanged in shape):
  1. Sitemap and page-list phase 1. This does nothing on the first run,
     because neither file is live in the bucket yet.
  2. Upload and edge-function test. CloudFront `test-function` must match the
     local result before the function is published (this gate covers the
     hashed page set in the real runtime).
  3. Delete stale objects; invalidate.
  4. Verify the site (`--sitemap-partial`).
  5. Phase 2 uploads `sitemap.xml` and `release-pages.json`. The page list is
     public immediately. The sitemap is not yet public: the backend still
     serves `/sitemap.xml`.
- **Acceptance:**
  - Bundle and invalidation.
  - The verifier.
  - The public page list equals the 465 canonical pages.
  - The 465 static pages are byte-identical to the build.
  - Rendered checks in five languages, mobile and Urdu RTL.
  - API-failure checks (429, 500, network, timeout).
  - About pages and Guides index; language and About links.
  - Markets, crypto and travel smoke tests.
- **Known interim:** the public (backend) sitemap does not yet list the 10
  Guides-index and About URLs. They are linked from every page and are added
  in stage 2.
- **Rollback:** `rollback_run_id=45990262568`. The workflow's own tooling
  publishes R0's sitemap and page list in the same two phases. R0 has no page
  list file, so the app fails open, as today.
- **Evidence to record:** run ID, commit, bundle, invalidation IDs, the page
  list hash, and `head-object` of both files.

## Stage 2: CloudFront sitemap switch (protected approval #2, owner-approved in principle)

Exact sequence, all from the owner's AWS profile. Only step 4 changes
anything.

1. **Pre-checks:**
   ```
   aws s3api head-object --bucket lifeinuk-site-919693204623-eu-west-2 --key sitemap.xml
   ```
   Expect `application/xml`, `no-cache`, and a `LastModified` time at or after
   the R1 deploy. Then:
   ```
   aws s3 cp s3://lifeinuk-site-919693204623-eu-west-2/sitemap.xml - | grep -c '<loc>'
   ```
   It must equal R1's canonical page count (465). Check that each `<loc>`
   answers 200 at the edge: `verify-site` already checks every canonical page.
2. **Save the rollback configuration:**
   ```
   aws cloudfront get-distribution-config --id E2VQEY0DI83CFH > cf-before.json
   ```
   Keep its `ETag`. Archive the file with the release evidence.
3. **Prepare `cf-after.json`:** the `DistributionConfig` with the
   `/sitemap.xml` item removed from `CacheBehaviors.Items`, `Quantity` reduced
   by one. Compare it with `cf-before.json`: it must differ only there.
4. **Apply:**
   ```
   aws cloudfront update-distribution --id E2VQEY0DI83CFH --if-match <ETag> --distribution-config file://cf-after.json
   ```
   Then wait until `Status` is `Deployed`.
5. **Invalidate:** `aws cloudfront create-invalidation --distribution-id E2VQEY0DI83CFH --paths /sitemap.xml`.
6. **Verify:**
   - `curl -sI https://lifeinuk.info/sitemap.xml`: `server: AmazonS3`, 200,
     `application/xml`.
   - The URL count is 465 and equals the page list.
   - `verify-site --production`, without `--sitemap-partial`, passes.
   - `robots.txt` is unchanged (backend) and names the same sitemap URL.
7. **Search Console:** resubmit the sitemap.

**Rollback:** `update-distribution` with `cf-before.json` (and the current
ETag), then invalidate `/sitemap.xml`. The backend sitemap is served again
within minutes. No deploy is needed.

From here on, every deploy and rollback narrows and publishes the public
sitemap in the two phases. A failed deploy leaves only URLs both releases
serve.

## Stage 3: backend publication of reviewed content (protected approval #3, Sol and owner)

- **Precondition:** stages 1 and 2 accepted. This removes the publication gap:
  the public sitemap and the app list only deployed pages, so a backend
  publication can no longer expose a 404 URL.
- **Content** (authoritative inventory: Sol's verified `EDITORIAL-MANIFEST.json`
  files on backend `main` at `335238e`):
  - **F5 replacements: 9 Guides, 45 localized variants.** Published through
    Sol's existing owner revision process (`docs/editorial/localization-f5/RELEASE.md`),
    never the new-slug publisher:
    - `chinese-medical-records-vaccinations-england`
    - `medicines-prescriptions-england`
    - `nhs-dentist-england`
    - `nhs-ihs-costs-england`
    - `nhs-interpreter-language-help-england`
    - `open-uk-bank-account-new-arrival`
    - `registering-with-a-gp-england`
    - `visiting-parents-healthcare-england`
    - `where-to-go-when-ill-england`

    `urgent-dental-care-england` is **unchanged**. Replacements keep their
    URLs, so they don't change the canonical count.
  - **New Money Guides: 4 Guides, 20 variants** (backend #90):
    - `uk-first-credit-card`
    - `uk-zero-percent-credit-cards`
    - `uk-credit-card-cashback-and-rewards`
    - `uk-personal-loans-apply-and-compare`
- **During the window before stage 4:**
  - The new Money Guides are absent from the public sitemap, from every app
    list (the page list) and from the static HTML. Direct URLs are a real 404
    and are not linked anywhere.
  - For the 9 replaced Guides (45 variants), the API serves the new text and
    the static HTML still shows the old text until stage 4. The app replaces it with the new text
    when it runs. Keep the window short: dispatch stage 4 when Sol's
    publication is verified, not before.
- **Evidence:** Sol's publication records (new and superseded publication IDs),
  and the API hashes of the 45 replaced and 20 new variants compared with the
  manifests.
- **Rollback:** Sol's revision process, which restores the previous revision.
  Run stage 4 again afterwards if stage 4 was already deployed.

## Stage 4: frontend release R2, content (protected approval #4)

- **Build:** from the same `main`. `build:release` must show 485 canonical
  URLs (465 + 20 Money variants; the 45 replaced variants keep their URLs) and
  the revised titles and summaries of the 9 F5 Guides, matching Sol's
  post-publication hashes.
- **Deploy:**
  - Phase 1 publishes R1 ∩ R2: the Money pages are not listed yet.
  - Function switch, verification.
  - Phase 2 adds the 20 Money URLs to the sitemap and the page list together.
- **Acceptance:**
  - Everything from stage 1.
  - The 20 Money variants in five languages, the Money hub, and the related
    and language links.
  - F5 revised content in the static HTML of all 45 replaced variants, and
    `urgent-dental-care-england` unchanged.
  - Public sitemap = page list = 485 canonical URLs.
- **Rollback:** `rollback_run_id=<R1 run>`. Phase 1 removes the Money URLs
  from the sitemap and page list before the switch back, and the app hides the
  Guides again. The backend content stays published, which is safe; unpublish
  it through Sol's process if needed.

## Stage 5: final acceptance and the 26-day baseline

- Refresh the observation baseline (audit report) from the stage 4 release:
  - sitemap and inventory counts;
  - rendered and API-failure results;
  - lab Core Web Vitals and edge function size;
  - Search Console numbers once exported.
- Carry forward these limitations:
  - no independent professional review of the Guides, and no fluent human
    linguistic review (Urdu and Hindi About copy included);
  - WebKit (Safari's engine) not tested;
  - Search Console attribution of the 55 "crawled – currently not indexed" and
    26 noindex URLs still needs the exports.

## Residual limitation: catalogue fallback

Catalogue consistency (#62) limits app lists to the Guides that both the
release that served the page (its embedded page list) and the live release
(`/release-pages.json`) have pages for. Its fallbacks leave these known gaps,
accepted for R1:

- **Live page list unreachable or malformed:** the app uses the embedded list
  alone. A tab opened on an older release can then still list a Guide that a
  later release withdrew, until the live list is readable again (asked again
  every minute). The link leads to the not-found page (noindex), never to an
  indexable error.
- **Rollback to R0:** R0 has no embedded list, so its app does not narrow the
  catalogue (fails open, as production does today). After a rollback to R0,
  Guides published in the backend but absent from R0 can be listed again and
  their URLs are a 404 until a release that has them is deployed. Rolling
  back to R1 or later does not have this gap.
- **Embedded list unreachable:** Guide lists show their error state (never
  unfiltered, never noindex) and ask again later.
- **Withdrawal stays two-step:** withdraw in the backend, then deploy. Until
  the deploy, the static page and sitemap entry remain; the app shows the
  Guide as not found (noindex) and stops listing it.

## Rollback summary

| Stage | Trigger | Action | Time to effect |
|---|---|---|---|
| 1 | R1 acceptance fails | Deploy workflow, `rollback_run_id=45990262568` | One deploy run (~minutes); sitemap and page list follow in two phases |
| 2 | Sitemap not served correctly from S3 | `update-distribution` with `cf-before.json`, invalidate `/sitemap.xml` | Minutes, no deploy |
| 3 | Published content wrong | Sol's revision process; re-run stage 4 if already deployed | Sol's process |
| 4 | R2 acceptance fails | Deploy workflow, `rollback_run_id=<R1 run>` | One deploy run; Money URLs leave the sitemap and page list in phase 1 |

## Reverse Work Visa links (Sol)

No existing Guide's text mentions the four new Work Visa Guides, so no reverse
related links are added. If Sol adds supporting text in a later revision, the
links are a one-line data change in `src/guides/domains.ts`.
