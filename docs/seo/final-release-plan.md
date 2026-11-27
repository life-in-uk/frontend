# Final coordinated release plan (SEO remediation, About, F5 revisions, Money)

Status: **for owner approval.** Each stage has its own protected approval and
rollback evidence. A stage starts only when the previous one is accepted.
Nothing is published in the backend before stage 2 is accepted.

## Stage 0: merge (owner, GitHub)

Merge in this order. After each merge, Claude merges `main` into the next
branch, retargets it to `main` if needed, and waits for CI to pass.

| Order | PR | Scope |
|---|---|---|
| 1 | #50 | F1/F7: temporary API failures never noindex |
| 2 | #54 | F2: 2 API calls per Guide; Guides readable during outages |
| 3 | #59 | Rendered-SEO test in CI; hub hreflang fix |
| 4 | #56 | F3: language links; orphan and cross-language checks |
| 5 | #52 | F6: related links for the four new Work Visa Guides |
| 6 | #57 | F4/F9: frontend sitemap, two-phase publication, CI pipefail |
| 7 | #58 | F8: prerendered Guides index (known two-line conflict with #56, resolved on the integration branch) |
| 8 | #60 | F10 capacity plan (docs) |
| 9 | #61 | F10 option A: hashed page set |
| 10 | #62 | Catalogue consistency: release page list |
| 11 | #63 | F12: About and editorial policy; Organization publisher |

The integration branch (`integration/seo-remediation`) shows the merged
result.
- **Tests:** unit 377 pass, lint clean; the CI rendered test passes; the
  emulator hosting contract passes with the exact sitemap.
- **Release build of the current catalogue:** 465 canonical URLs; edge
  function 6,094 bytes with #61.

## Stage 1: frontend release R1, code only (protected approval #1)

- **Content:** `main` after stage 0. No new backend content.
- **Before:** production is run `45990262568` (`2154a21`, bundle
  `index-h_29Elbc.js`). Record it as R0.
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
- **Content:**
  - F5 replacement revisions (backend #92, #93, #94; Sol's append-only revision
    process; hashes pinned).
  - The four new Money Guides (backend #90; 20 variants).
- **During the window before stage 4:**
  - The new Money Guides are absent from the public sitemap, from every app
    list (the page list) and from the static HTML. Direct URLs are a real 404
    and are not linked anywhere.
  - For F5 revisions, the API serves the new text and the static HTML still
    shows the old text until stage 4. The app replaces it with the new text
    when it runs. Keep the window short: dispatch stage 4 when Sol's
    publication is verified, not before.
- **Evidence:** Sol's publication run IDs and receipts, and the API hashes of
  the revised variants.
- **Rollback:** Sol's revision process, which restores the previous revision.
  Run stage 4 again afterwards if stage 4 was already deployed.

## Stage 4: frontend release R2, content (protected approval #4)

- **Build:** from the same `main` (or `main` plus nothing). `build:release`
  must show 485 canonical URLs (465 + 20 Money) and the revised summaries and
  titles of the F5 Guides.
- **Deploy:**
  - Phase 1 publishes R1 ∩ R2: the Money pages are not listed yet.
  - Function switch, verification.
  - Phase 2 adds the 20 Money URLs to the sitemap and the page list together.
- **Acceptance:**
  - Everything from stage 1.
  - The 20 Money variants in five languages, the Money hub, and the related
    and language links.
  - F5 revised content in the static HTML of all 50 variants.
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

## Reverse Work Visa links (Sol)

No existing Guide's text mentions the four new Work Visa Guides, so no reverse
related links are added. If Sol adds supporting text in a later revision, the
links are a one-line data change in `src/guides/domains.ts`.
