# Edge function capacity: options (SEO audit F10)

Status: **Option A approved and implemented** (PR "Edge: hashed page set").
Measured on the 460-page release, the function went from 8,603 to 6,094
bytes; the page set went from 3,973 bytes to 736 (8 per entry). Option B
(KeyValueStore) is not introduced.

## The limit

The viewer-request function (`scripts/edge/viewer-request.mjs`) embeds the
release's page set, because it decides which paths are pages and which get a
real 404. CloudFront Functions have a hard limit of **10,240 bytes** per
function; it cannot be raised.

Measured on the release build with F8, 27 Nov 2026:

| Part | Bytes |
|---|---|
| Page set (92 entries: `section/slug` → locale bitmask) | 3,973 (43 bytes per entry; average key 37 characters) |
| Everything else (routing code, redirects, 404 page, app routes) | 4,630 |
| **Total** | **8,603** |

- Each new Guide adds about 43 bytes, whatever the number of languages, so
  there's room for about **35 more Guides** (about 14 before the generator's
  9,216-byte warning).
- At the limit, the generator refuses to build the function and **the deploy
  stops before changing anything**. The site keeps running, but no release can
  ship until the encoding changes.

## Options

### A. Hashed page set (code only, no AWS change)

Replace each `section/slug` key with a 32-bit FNV-1a hash of the full path
(8 hex characters, about 13 bytes per entry with the bitmask). The function
hashes the request path the same way.

- **Capacity:** about 3.3× smaller per entry, so room for roughly 400 Guides
  in total (about 330 more) at the current size of everything else.
- **Correctness:**
  - The build fails if two real pages share a hash, so this is checked and
    never silent.
  - An unknown path whose hash equals a real page's (probability about 2×10⁻⁸
    per random path) is sent to S3, which answers with its own 403/404
    instead of the site's 404 page. That's harmless: it's still not a 200 and
    still not indexable.
- **Operations:** none. The deploy is unchanged and rollback is unchanged
  (the function comes from the restored release).
- **Cost:** none. **IAM:** none.
- **Tests:** the edge emulator and `edge.test.mjs` already route every page,
  redirect and app route through the generated function.
- **Complexity:** low (about 40 lines in the generator and function).

### B. CloudFront KeyValueStore (KVS)

Move the page set into a KVS associated with the function. The function reads
it per request (`cf.kvs().exists(path)`).

- **Limits:** 5 MB per store, keys up to 512 bytes, values up to 1 KB, up to
  50 keys or 3 MB per update request ([AWS quotas](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html)).
  460 pages take about 30 KB, so effectively no limit for this site.
- **Cost:**
  - Function reads about $0.03 per million, with 2 million reads a month in
    the free tier ([pricing](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go)).
    One read per HTML request is negligible at this site's traffic.
  - API updates are $1 per 1,000 requests. A full sync is about 10
    `UpdateKeys` calls; a diff is usually 1. That's about 1–2 cents per deploy.
- **IAM (deploy role, one new statement scoped to the one store):**
  `cloudfront-keyvaluestore:DescribeKeyValueStore`, `ListKeys` and
  `UpdateKeys`. A one-time owner action creates the store and associates it
  with the function (`cloudfront:CreateKeyValueStore`, `UpdateFunction`).
- **Deployment ordering** (the store and the function are not updated
  atomically; KVS changes reach all edges in seconds, eventually consistent):
  1. Upload objects (as now).
  2. **Add** the new release's page keys. New pages become routable only once
     their objects exist.
  3. Publish the function, if the code changed (rarely, once the page set no
     longer lives in it).
  4. **Remove** the keys of withdrawn pages, then delete their objects.
  5. Invalidate.
  - At no point is a key present whose object is missing. A withdrawn page
    stays routable until step 4, which is the same as today.
- **Sitemap interplay:** the two-phase sitemap (`publish-sitemap.mjs`) is
  unchanged. Phase 1 happens before step 2; phase 2 after verification.
- **Rollback:** redeploying an older artifact syncs the store to that
  artifact's page set by the same steps. If the store itself has to be
  abandoned, publish a function version with the embedded page set: keep the
  generator able to produce both.
- **Consistency risk:** a deploy that fails between steps 2 and 4 leaves extra
  keys whose objects still exist. That's safe; the next deploy reconciles them.
- **Complexity:** medium.
  - A new AWS resource, an async function handler and a sync step with ETag
    handling.
  - Local tests need a KVS stub; the emulator gains a store.
  - Preflight needs a new check.

### C. Rejected

- **Lambda@Edge:** higher cost and latency, a separate deploy pipeline, and
  logs in many regions. Not justified for a set-membership check.
- **CloudFront custom error responses** instead of function 404s: these apply
  to the whole distribution and would replace the API's JSON error bodies,
  which is why the function produces 404s today.
- **Shorter slugs:** they change public URLs. Not acceptable for SEO.

## Recommendation

1. **Option A** before the next large content wave. It's code-only and
   reviewable in one PR, needs no AWS change, and gives about 10 times the
   remaining headroom.
2. **Option B** only if the catalogue approaches about 350 Guides, or if page
   routing ever needs to change without a deploy, which nothing requires
   today.

Approval needed for: A (frontend PR only); B (new AWS resource and IAM
statement, per the ordering above).
