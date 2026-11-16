# Source review (content freshness)

A manual, local check that the official pages the published Guides cite have
not moved, been withdrawn or changed the wording a Guide quotes. It produces a
review queue for the owner. It never edits, translates or publishes anything.

## Commands

```
npm run sources:inventory                  # which Guides and locales cite each source (no source requests)
npm run sources:check                      # check every allowlisted source, ~1.5 s apart (~5 minutes)
npm run sources:check -- --risk high       # only sources used by high-priority Guides
npm run sources:check -- --only gov.uk/eta --limit 10 --delay 2000
npm run sources:check -- --all             # include commercial pages (banks), normally skipped
```

`API_BASE` (default `http://127.0.0.1:8188`) is the published Guide API, read
with GET only. Output goes to `SOURCE_REVIEW_DIR` (default
`~/.local/state/life-in-uk/source-review/`): `review-<time>.md` (the queue),
`review-<time>.json` (the same, machine-readable) and `baseline.json` (one
text hash per source, updated only by successful reads). Nothing is scheduled;
run it when you want a review, for example monthly or after a Statement of
Changes to the Immigration Rules.

## What it uses

Only records the Guides already publish: each source's URL and recorded access
date (`accessedAt`), the evidence items and verbatim excerpts that cite it, and
each Guide's revision and publication dates in all five locales. All five
locales of a Guide share one set of sources and excerpts, so a source alert
lists every locale it affects. There is no separate content database.

## Signals

| Signal | Meaning | Queue |
|---|---|---|
| `moved` / `gone` | GOV.UK now redirects or has withdrawn the page | review |
| `excerpt-missing` | a sentence a Guide quotes is no longer on the page, while other quoted sentences still are | review |
| `updated-since-accessed` | GOV.UK records a major update (`public_updated_at`) after the Guide's recorded access | review |
| `text-changed` | the page text differs from the last run (weak: layout and unrelated wording change it too) | note |
| `excerpts-unverifiable` | none of the quoted sentences matched; the page may be read differently or rewritten | note |
| `not-readable` | a PDF, CSV or GOV.UK publication page whose text is in an attachment | note |
| unavailable | the request failed or returned an error; not a change | separate |

No signal proves a rule changed. GOV.UK pages are read through the GOV.UK
Content API; other pages by their visible `<main>` text.

## Priorities

`scripts/sources/risk.mjs` assigns each Guide a maintenance priority (high:
immigration, ETA, fees, thresholds, rental law and application procedures;
medium: administrative processes, NHS eligibility, bills and banking; lower:
stable practical guidance), with named exceptions. Priorities order the queue
only. A Guide is never marked out of date because time has passed.

## After a review item

The owner decides. If a Guide needs changing, use the normal editorial
pipeline (generator → draft → batch → review → publish), which creates a new
revision and moves `updatedAt`. A source check on its own never changes
`dateModified`, the sitemap or any page; rebuilding the site from the same
published Guides produces identical pages.
