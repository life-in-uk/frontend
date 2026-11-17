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

## Review log

Outcomes of review items, so a recurring alert can be recognised as already
reviewed. The queue keeps raising an item until the Guide is revised or its
recorded access date moves on; that is intended.

### 2026-11-16: first run, three review items (reviewed 2026-11-17)

Only the three cited sources were re-read (GOV.UK, read-only). No Guide,
translation, baseline or queue file was changed.

| Source | Guide (revision) | Finding | Outcome |
|---|---|---|---|
| Home Office "Family life (as a partner or parent), private life and exceptional circumstances", updated 5 Nov 2026 (Version 30.0; cited as 29.0, accessed 8 Oct 2026) | `partner-visa-relationship-evidence` (`a59e2657`, frozen); statements `met-in-person-meaning`, `undissolved-marriage` | Only change note: Family Returns Process / Appendix FM valid application. Every quoted phrase in "Met in person" and "Previous relationships" is still present. | **Closed as reviewed.** Statements accurate. Cosmetic: refresh the "Version 29.0" source title when the Family Visa Guides are next revised; no reason to reopen them for this. |
| Immigration Rules Part Suitability (SUI 16.1), last updated 8 Oct 2026 (HC 584); the 29 Oct 2026 collection update touched only the religious worker appendices | `nhs-ihs-costs-england` (`27dca22d`), statement `nhs-debt-reporting-and-refusal`; `visiting-parents-healthcare-england` (`5e789f75`), statement `nhs-debt-discretionary-refusal` | SUI 16.1 still says an application "may be refused" where NHS charges of at least £500 are outstanding. Appendix V (V 3.1) applies Part Suitability to visitors. The other points are cited from the Home Office NHS debt guidance, DHSC charging guidance and the NHS page. | **Closed as reviewed.** Statements accurate; citations are the binding rule and stay. |
| GOV.UK "Banned and restricted goods" (`/duty-free-goods/banned-and-restricted-goods`), now 301 to `/bringing-goods-into-uk-personal-use/banned-and-restricted-goods` | `medicines-prescriptions-england` (`4c528296`), statement `herbal-products-and-imports` | Destination section still bans personal imports of "meat and dairy products from most non-EU countries" and says a CITES permit may be needed for "some medicines". The old link redirects correctly. | **Citation update pending, owner's timing.** At the Guide's next revision: URL → the new section URL; title → "Bringing goods into the UK for personal use: Banned and restricted goods"; locator → "Banned and restricted goods; Check if you need a CITES permit". Statement unchanged. |

### 2026-11-17: pre-launch audit run (open item)

A full `sources:check` (203 sources, run against a copy of the state
directory, so the owner's baseline and queue were not changed) raised the
same three review items as above (no new review signals), 18 weak notes, and
one unavailable source that the 2026-11-16 runs had already listed but the
review above did not cover:

| Source | Guides (revision, citations) | Finding | Outcome |
|---|---|---|---|
| NHS England "Primary medical services policy and guidance manual (PGM)", `https://www.england.nhs.uk/long-read/primary-medical-services-policy-and-guidance-manual-pgm-2/` | `registering-with-a-gp-england` (`9ca7a5bc`, 9), `visiting-parents-healthcare-england` (`5e789f75`, 3), `chinese-medical-records-vaccinations-england` (`56a308dc`, 1); all five locales | The cited page returns HTTP 404. NHS England republished the PGM as version 7 on 16 November 2026, split into parts listed at `https://www.england.nhs.uk/publication/primary-medical-care-policy-and-guidance-manual-pgm/` (see "Summary of key changes v7"). The quoted excerpts have not yet been checked against version 7. | **Open, owner review.** Check each of the 13 citations' excerpts against the version 7 part that now holds it; then update URL, title and locator (and wording only if version 7 changed a rule) through the normal editorial pipeline. Readers following the old links get a 404 until then. |

### 2026-11-17: NHS England PGM version 7 checked (citation update proposed, awaiting owner approval)

Version 7.0 (published 16 November 2026) splits the manual into Parts A–D.
Chapters 3 and 4 (managing patient lists; GP patient registration standard
operating principles) are now in **Part B: General contract management**,
`https://www.england.nhs.uk/long-read/primary-medical-services-pgm-part-b-general-contract-management/`.
Each cited paragraph was compared word for word with version 6 (August 2025,
the version the Guides cite, read from the Internet Archive capture of the old
URL dated 23 June 2026): **all 20 cited paragraphs are identical**
(§3.2.4, §4.4.1, §4.4.2, §4.4.7–4.4.9, §4.5.1–4.5.2, old §4.9.1–4.9.9 and
§4.10.1–4.10.3). Version 7 only renumbered the documentary-information
section (§4.9 → §4.10) and the refusal section (§4.10 → §4.11), after the
new §4.8 on the national online registration service. The version 7 change
summary lists no other Chapter 3–4 change (§4.7.5 clarifies refusal grounds
already stated in §4.11.2; §4.8 is new and is not cited). All 13 citations
(9 + 3 + 1) and the quoted wording in their notes stay supported; no
statement, excerpt or note needs to change.

Proposed citation-only update, identical in all five locales of the three
Guides (no other text changes):

| Field | Now | Proposed |
|---|---|---|
| Source `nhs-england-pgm` URL, and the same URL in each Guide's source list | `…/long-read/primary-medical-services-policy-and-guidance-manual-pgm-2/` | `…/long-read/primary-medical-services-pgm-part-b-general-contract-management/` |
| Source `nhs-england-pgm` accessed date | 4–5 Oct / 13 Nov 2026 | the date of the update |
| Locator | `Chapter 4, §4.9.8–4.9.9` | `Chapter 4, §4.10.8–4.10.9` |
| Locator | `Chapter 4, §4.9.4–4.9.8 (page labels §4.9.4 as 4.94)` | `Chapter 4, §4.10.4–4.10.8` |
| Locator | `Chapter 4, §4.9.6–4.9.8` | `Chapter 4, §4.10.6–4.10.8` |
| Locator | `Chapter 4, §4.9.4–4.9.8` | `Chapter 4, §4.10.4–4.10.8` |
| Locator | `Chapter 4, §4.9.1–4.9.3 and §4.9.8; §4.10` | `Chapter 4, §4.10.1–4.10.3 and §4.10.8; §4.11` |
| Locator | `Chapter 4, §4.10.3` | `Chapter 4, §4.11.3` |
| Locators `§4.4.2`, `§4.4.7–4.4.8`, `§4.4.8`, `§4.4.9`, `§4.4.9；Chapter 3, §3.2.4`, `§4.5.1–4.5.2` | unchanged | unchanged |

The source title ("Primary medical services policy and guidance manual
(PGM)") and the source-list wording ("Chapters 3–4" / "Chapter 4") stay
correct. Publishing goes through the normal batch workflow (new batch per
Guide, five locales, owner approval, publish with
`expectCurrentPublicationId`); whether the Guides' displayed "updated" date
changes for a citation-only revision is the owner's call. **Status: not
published; waiting for owner approval.** Until then readers following the
old link get NHS England's 404.
