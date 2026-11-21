# Content-gap backlog (SEO Phase 3)

Planning document, 16 November 2026. Based on the published inventory in
`search-intent-inventory.md` (47 Guides, all five locales) and the frontend
configuration at commit 6fdea14. **Nothing here is implemented**: the owner
approves priorities first.

## Evidence

| Level | Meaning | Used here |
|---|---|---|
| A. Observed demand | Keyword tool, Search Console, or identifiable search-result evidence | **None.** No keyword tool, Search Console property or SERP research was available or performed. |
| B. Plausible demand | Grounded in official processes, real user journeys and common decision points, without volume data | Most items |
| C. Hypothesis | Editorial idea needing validation | Marked per item |

No search volumes, keyword difficulty, rankings, click-through rates or traffic
estimates are given anywhere in this document, because none were measured.
Priority scores are **editorial judgments**, not search metrics. When Search
Console data exists for the deployed site, re-check every B and C item against
real queries before writing.

Official-source URLs marked ✓ were confirmed to exist on 16 November 2026
(GOV.UK via its Content API, others by HTTP request); "to confirm" means the
page could not be checked automatically and must be found at drafting time.

## Scoring model (100 points)

User need and urgency **30** · Existing coverage gap **25** · Authoritative-source
verifiability **20** · Fit with existing topic clusters **15** · Natural affiliate
relevance **10** (optional; never overrides accuracy).

## Summary

| ID | Opportunity | Classification | Evidence | Score | Action |
|---|---|---|---|---|---|
| R1 | Moving out: ending a tenancy, check-out and getting the deposit back | NEW GUIDE CANDIDATE | B | **85** | New Guide (Renting) |
| W1 | Work Visa Guides list related Guides that are not linked | DISCOVERABILITY GAP | B | **79** | Configuration only |
| M1 | Getting a National Insurance number as a newcomer | NEW GUIDE CANDIDATE | B | **79** | New Guide (Money) |
| F2 | Visitor visas for parents and family coming to stay | NEW GUIDE CANDIDATE | B | **76** | New Guide (Family Visa) |
| F1 | Extending a partner visa inside the UK | PARTIAL GAP | B | **71** | Improve existing Guide (owner decision: content frozen) |
| M2 | Building a UK credit history as a newcomer | FIVE-LOCALE DRAFT REVIEWED | B | **70** | Owner review and private Money batch pending |
| R2 | Repairs, damp and mould during a tenancy | NEW GUIDE CANDIDATE | B | **69** | New Guide (Renting) |
| W2 | Health and Care Worker visa | NEW GUIDE CANDIDATE | C | **68** | Validate demand first |
| X1 | Visa Guides mention the IHS and bank accounts without linking those Guides | DISCOVERABILITY GAP | B | **65** | Configuration only |
| X2 | Health and Money Guides framed for Chinese readers in every locale | PARTIAL GAP | B | **63** | Editorial review of ur/hi framing |
| W3 | Graduate visa | NEW GUIDE CANDIDATE | C | **63** | Validate demand and section fit |
| M3 | Bank account versus e-money account | PARTIAL GAP | B | **62** | Improve existing Guide |
| H1 | Maternity care and NHS charges for newcomers on visas | NEW GUIDE CANDIDATE | C | **61** | Validate demand first |
| F3 | Adult Dependent Relative visa | NEW GUIDE CANDIDATE | C | **59** | Low priority |
| M4 | Sending money abroad safely | NEW GUIDE CANDIDATE | C | **59** | Low priority; affiliate-sensitive |
| R3 | Contents insurance for tenants | NEW GUIDE CANDIDATE | C | **56** | Low priority; affiliate-sensitive |

Counts (16 scored): DISCOVERABILITY GAP 2 · PARTIAL GAP 3 · NEW GUIDE CANDIDATE 11.
Also investigated: 25 questions found **COVERED** and 4 **OUT OF SCOPE** (tables below).

## Recommended first batch (max. five)

**Quick improvements (no new content, configuration only):**

1. **W1** Link the Work Visa Guides' existing "Related Guides" lists and add curated
   and cross-section links (score 79).
2. **X1** Add cross-section links from visa Guides to the NHS IHS and bank-account
   Guides (score 65); same mechanism as W1, so one small change.

**New Guide candidates:**

3. **R1** Moving out and getting the deposit back (score 85).
4. **M1** National Insurance number for newcomers (score 79).
5. **F2** Visitor visas for visiting parents and family (score 76).

F1 (partner-visa extensions, 71) would come next but needs the owner's decision
because the Family Visa Guides were frozen when that workstream closed.

---

## Backlog items

### R1. Moving out: ending a tenancy, check-out and getting the deposit back

- **User question**: "How do I end my tenancy and get my deposit back?" / 退租要提前多久通知、押金怎么拿回来？
- **Audience**: tenants in England renting through a letting agent, especially students at the end of a year and newcomers moving on.
- **Existing Guides**: `renting-letting-agent-overview` (two months' notice, one sentence), `renting-deposits-fees` (deposit protection), `renting-moving-in-inventory` (records to keep, check-out), `renting-council-tax`, `renting-energy`, `renting-water` (closing accounts).
- **Classification**: NEW GUIDE CANDIDATE. The pieces exist but no Guide answers the end-of-tenancy question as a whole; it is a distinct, time-bound task and the natural counterpart of the move-in Guide, without duplicating it.
- **Evidence**: B. Every tenancy ends; the official process has fixed steps (tenant notice on assured periodic tenancies, deposit return and dispute).
- **Status**: implemented 2026-11-16 (Phase 3B): Guide `renting-moving-out-deposit`, published locally in five locales; Renting hub "moving out" group, related links and a separate moving-out stage in the Renting Journey.
- **Recommended action**: one new Renting Guide (notice, check-out, final readings and accounts, deposit return, disputes), linked from the move-in Guide and added as a final Journey step later.
- **Score 85**: need 27 (time-critical, money at stake) · gap 22 (scattered, no single answer) · verifiability 18 (GOV.UK and Shelter pages already used) · fit 15 (completes the Renting cluster) · affiliate 3 (removals could fit, but not needed).
- **Official sources**: ✓ https://www.gov.uk/assured-periodic-tenancies-tenants · ✓ https://www.gov.uk/tenancy-deposit-protection · ✓ https://england.shelter.org.uk/housing_advice/tenancy_deposits (and Shelter "What to do when you leave your rented home", already a Phase 2 source).
- **Scope and accuracy**: England, tenant perspective, letting-agent lets only. State the post-1 May 2026 rules for assured periodic tenancies; treat any older fixed-term arrangements as transitional and qualify them; no individual advice on disputes.

### W1. Work Visa Guides list related Guides that are not linked

- **User question**: readers of any Skilled Worker Guide looking for the next step (sponsorship → salary → English → switching → settlement).
- **Audience**: Skilled Worker applicants and their families.
- **Existing Guides**: all eight Work Visa Guides. Each ends with a "Related Guides" list naming the others by title, but the section has no title-reference or related-Guide configuration, so none of these are links (0 in-text links, 0 related links). `skilled-worker-settlement-ilr` and `skilled-worker-dependants` overlap with Settlement Guides and do not link to them.
- **Classification**: DISCOVERABILITY GAP.
- **Evidence**: B (observed in the published content and `src/guides/domains.ts`; demand itself is not measured).
- **Status**: implemented 2026-11-16 (Phase 3A): Work Visa title references and curated related Guides in `src/guides/domains.ts`; Skilled Worker ↔ Settlement links in `CROSS_SECTION_RELATED`. Work Visa was not made a topic cluster (hub unchanged).
- **Recommended action**: add the Work Visa title references (as for Renting and Settlement) so the existing lists become links, curated `relatedGuides`, and cross-section links: `skilled-worker-settlement-ilr` ↔ `settlement-ilr-overview` / `settlement-continuous-residence-absences`; `skilled-worker-dependants` ↔ `settlement-children-dependants`. Optionally make Work Visa a topic cluster. No content change.
- **Score 79**: need 24 · gap 20 · verifiability 20 (no new claims) · fit 15 · affiliate 0.
- **Official sources**: none needed (navigation only).
- **Scope and accuracy**: none; links only.

### M1. Getting a National Insurance number as a newcomer

- **User question**: "Do I need a National Insurance number and how do I get one?" / 刚到英国怎么申请 National Insurance number？
- **Audience**: new arrivals who will work (Skilled Worker, partners with work rights, students working part-time).
- **Existing Guides**: mentioned in five Guides (`partner-visa-financial-requirement`, `partner-visa-application-process`, `settlement-after-ilr`, `skilled-worker-occupations-salary`, `open-uk-bank-account-new-arrival`) but explained in none.
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: B (an official GOV.UK application process exists and is a standard newcomer step).
- **Status**: implemented 2026-11-16 (Phase 3B): Money Guide `national-insurance-number-newcomers`, published locally in five locales; listed on the Money hub; related links with the bank account Guide, from the Skilled Worker salary Guide and on to the Skilled Worker overview.
- **Recommended action**: one Money Guide: who needs one, whether you may already have one, how to apply, starting work before it arrives, what it is not (not proof of right to work). Also strengthens the one-Guide Money section.
- **Score 79**: need 26 · gap 24 · verifiability 19 · fit 10 (Money section is thin; also linked from Work Visa) · affiliate 0.
- **Official sources**: ✓ https://www.gov.uk/apply-national-insurance-number · ✓ https://www.gov.uk/national-insurance
- **Scope and accuracy**: verify at drafting which visa holders already have a number and how it is shown now that BRPs have been replaced by eVisas; do not state that a number is needed before starting work unless GOV.UK says so.

### F2. Visitor visas for parents and family coming to stay

- **User question**: "How can my parents visit me in the UK?" / 父母来英国探亲怎么办签证？
- **Audience**: residents (especially Chinese-speaking families) inviting parents or relatives for a visit.
- **Existing Guides**: `visiting-parents-healthcare-england` covers healthcare during a visit, not the visa; `nhs-ihs-costs-england` explains visitors do not pay the IHS.
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: B (the existing health Guide already shows this audience exists; the visa is a prior step).
- **Status**: implemented 2026-11-16 (Phase 3B): Guide `visiting-family-uk-visitor-visa-eta` (category family-visa, separate "Family visits (not a family visa)" subtopic on the Family Visa hub), published locally in five locales; related links to the partner routes overview and both ways with `visiting-parents-healthcare-england`. Frozen partner-visa Guides unchanged.
- **Recommended action**: one Guide in the Family Visa section on the Standard Visitor route for family visits: eligibility, invitation and supporting documents, length of stay, what visitors cannot do; link both ways with the healthcare Guide.
- **Score 76**: need 23 · gap 23 · verifiability 18 · fit 10 (new subtopic for the Family Visa cluster) · affiliate 2 (travel insurance is relevant, already discussed in the health Guide).
- **Official sources**: ✓ https://www.gov.uk/standard-visitor (Immigration Rules Appendix Visitor for rules).
- **Scope and accuracy**: general information only; no assessment of an individual's chances; clearly separate visitor rules from the partner route and from the Adult Dependent Relative route (F3).

### F1. Extending a partner visa inside the UK

- **User question**: "How do I extend my spouse visa after two and a half years?" / 配偶签证到期怎么续签？
- **Audience**: partners already in the UK on the 5-year route.
- **Existing Guides**: covered in pieces: `partner-visa-routes-overview` (grant lengths; applying inside the UK), `partner-visa-financial-requirement` ("you have to prove it again at each application"), `partner-visa-relationship-evidence` (extensions: living together), `partner-visa-application-process` (inside-UK applications, English exemption after 5 years); `settlement-partner-ilr` covers the next stage.
- **Classification**: PARTIAL GAP (no single answer to the extension question; a separate Guide would partly duplicate `partner-visa-application-process`).
- **Evidence**: B.
- **Recommended action**: preferred: add an "Extending inside the UK" section to `partner-visa-application-process` and a related link to `settlement-partner-ilr` (already present). Requires the owner to reopen the frozen Family Visa content.
- **Score 71**: need 24 · gap 14 · verifiability 18 · fit 15 · affiliate 0.
- **Official sources**: ✓ https://www.gov.uk/uk-family-visa (extension part) · Immigration Rules Appendix FM.
- **Scope and accuracy**: keep 5-year and 10-year routes distinct; do not present Earned Settlement proposals as law.

### M2. Building a UK credit history as a newcomer

- **User question**: "Why can't I get credit / pass referencing, and how do I build a UK credit history?"
- **Audience**: new arrivals, students.
- **Existing coverage**: Renting and bank account Guides mention UK credit history at the point of application. The public catalogue and protected draft inventory contained no dedicated credit history Guide on 21 November 2026.
- **Editorial status**: source and translation review completed for the five-locale draft `uk-credit-history-and-credit-score`. Owner review, private import and publication approval are pending. [Backend draft PR #80](https://github.com/life-in-uk/backend/pull/80)
- **Evidence**: B (repeated decision point across Renting and Money Guides). The draft records 20 sources, including [MoneyHelper on statutory reports](https://www.moneyhelper.org.uk/en/everyday-money/credit/how-to-check-your-credit-report), [ICO on credit files](https://ico.org.uk/for-the-public/credit/) and the [Electoral Commission](https://www.electoralcommission.org.uk/voting-and-elections/register-vote).
- **Score 70**: need 22 · gap 20 · verifiability 12 (scoring is proprietary and official guidance is general) · fit 12 · affiliate 4.
- **Release dependency**: the Money & Finance hub lists published Money Guides automatically. The existing frontend release build generates the five canonical detail pages from the published inventory.
- **Scope and accuracy**: explain eligibility, affordability and credit-file corrections without promising a score or recommending a credit product.

### R2. Repairs, damp and mould during a tenancy

- **User question**: "My letting agent won't fix the damp. What can I do?"
- **Audience**: tenants in England renting through agents.
- **Existing Guides**: `renting-moving-in-inventory` (reporting repairs at move-in); `renting-tenancy-agreement` (rights in law, one line).
- **Classification**: NEW GUIDE CANDIDATE (ongoing-tenancy problem distinct from move-in).
- **Evidence**: B.
- **Recommended action**: one Renting Guide on reporting repairs, reasonable time, damp and mould, council environmental health, and protection from retaliation.
- **Score 69**: need 22 · gap 17 · verifiability 15 (rules are changing; must separate law in force from announcements) · fit 15 · affiliate 0.
- **Official sources**: ✓ https://www.gov.uk/private-renting · ✓ https://england.shelter.org.uk/housing_advice/repairs/damp_and_mould_in_rented_homes
- **Scope and accuracy**: England only; do not present requirements announced for the private rented sector (for example, extending social-housing hazard rules) as in force unless they are on the date checked.

### W2. Health and Care Worker visa

- **User question**: "How is the Health and Care Worker visa different from Skilled Worker?"
- **Audience**: NHS and care-sector recruits.
- **Existing Guides**: mentioned in `skilled-worker-overview` and `nhs-ihs-costs-england` only.
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: C (plausible but sector-specific; validate with real queries first).
- **Recommended action**: hold; validate demand, then consider one Work Visa Guide focused on what differs from Skilled Worker (to avoid duplicating it).
- **Score 68**: need 18 · gap 21 · verifiability 17 · fit 12 · affiliate 0.
- **Official sources**: ✓ https://www.gov.uk/health-care-worker-visa
- **Scope and accuracy**: care-worker recruitment rules have changed repeatedly; date-stamp and qualify.

### X1. Visa Guides mention the IHS and bank accounts without linking those Guides

- **User question**: "What does the healthcare surcharge give me?" when reading a visa Guide.
- **Audience**: visa applicants.
- **Existing Guides**: `partner-visa-application-process` and `skilled-worker-overview` mention the immigration health surcharge; `nhs-ihs-costs-england` explains it but is not linked. `renting-referencing-checks` and `open-uk-bank-account-new-arrival` both deal with having no UK history, without linking each other.
- **Classification**: DISCOVERABILITY GAP.
- **Evidence**: B (observed in content).
- **Status**: implemented 2026-11-16 (Phase 3A): `skilled-worker-overview`, `skilled-worker-dependants` and `partner-visa-application-process` → `nhs-ihs-costs-england`; `renting-referencing-checks` ↔ `open-uk-bank-account-new-arrival`.
- **Recommended action**: add these as cross-section related links (`CROSS_SECTION_RELATED` in `src/guides/topicClusters.ts`), with W1. No content change.
- **Score 65**: need 18 · gap 15 · verifiability 20 · fit 12 · affiliate 0.
- **Official sources**: none needed.
- **Scope and accuracy**: none.

### X2. Health and Money Guides framed for Chinese readers in every locale

- **User question**: Urdu and Hindi readers asking the same questions (interpreters, overseas medical records, opening a bank account).
- **Audience**: ur and hi readers.
- **Existing Guides**: `nhs-interpreter-language-help-england` (title asks about a Chinese interpreter), `chinese-medical-records-vaccinations-england` (records from China), `open-uk-bank-account-new-arrival` (written for Chinese passport holders). The translations faithfully keep this framing.
- **Classification**: PARTIAL GAP (the rules are general; the framing narrows them).
- **Evidence**: B (observed in the published translations).
- **Recommended action**: owner decision: either keep these as Chinese-audience Guides and say so in the ur/hi summaries, or add neutral wording where the rule is language-neutral. Do not create separate per-language copies.
- **Score 63**: need 20 · gap 14 · verifiability 17 · fit 12 · affiliate 0.
- **Official sources**: existing sources of each Guide (NHS England interpreting guidance, NHS records guidance, FCA/FSCS).
- **Scope and accuracy**: country-specific points (for example Chinese medicines or ID documents) must stay accurate if wording is generalised.

### W3. Graduate visa

- **User question**: "What can I do after my degree on the Graduate visa?"
- **Audience**: international students finishing degrees.
- **Existing Guides**: `skilled-worker-switch-extend-change-employer` (switching from Graduate to Skilled Worker), mentions in Settlement Guides.
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: C (no student section exists; validate fit before adding).
- **Recommended action**: hold; decide whether a student/graduate topic belongs on the site first.
- **Score 63**: need 19 · gap 18 · verifiability 18 · fit 8 · affiliate 0.
- **Official sources**: ✓ https://www.gov.uk/graduate-visa
- **Scope and accuracy**: Graduate visa length has been the subject of announced changes; check what is in force.

### M3. Bank account versus e-money account

- **User question**: "Is an app account (e-money) the same as a bank account? Is my money protected?"
- **Audience**: newcomers choosing their first account.
- **Existing Guides**: `open-uk-bank-account-new-arrival` (one bullet: e-money is not FSCS-protected).
- **Classification**: PARTIAL GAP.
- **Evidence**: B.
- **Recommended action**: add a short comparison section to the existing Guide (protection, safeguarding, typical limits); no new page, to avoid cannibalising the bank-account Guide.
- **Score 62**: need 15 · gap 12 · verifiability 17 · fit 12 · affiliate 6 (account comparison; keep neutral).
- **Official sources**: ✓ https://www.fscs.org.uk/check/check-your-money-is-protected/ · FCA consumer information on e-money and safeguarding (URL to confirm; the guessed page returned 404).
- **Scope and accuracy**: do not rank providers.

### H1. Maternity care and NHS charges for newcomers on visas

- **User question**: "I'm pregnant and on a visa: what NHS maternity care do I get and do I pay?"
- **Audience**: newly arrived partners and workers.
- **Existing Guides**: `nhs-ihs-costs-england` (IHS coverage in general).
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: C.
- **Recommended action**: validate demand; if confirmed, one Health Guide on registering, booking maternity care and charging rules by status.
- **Score 61**: need 18 · gap 17 · verifiability 17 · fit 9 · affiliate 0.
- **Official sources**: ✓ https://www.gov.uk/guidance/nhs-entitlements-migrant-health-guide
- **Scope and accuracy**: charging depends on immigration status; general information only.

### F3. Adult Dependent Relative visa

- **User question**: "Can my elderly parent live with me permanently?"
- **Audience**: settled residents with dependent parents.
- **Existing Guides**: none (the visitor route is F2).
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: C.
- **Recommended action**: low priority; the route is narrow and requirements are strict, so any Guide must be clear about how few applicants qualify. Consider only after F2.
- **Score 59**: need 10 · gap 22 · verifiability 17 · fit 10 · affiliate 0.
- **Official sources**: ✓ https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-adult-dependent-relative
- **Scope and accuracy**: no individual assessments; refer complex cases to IAA-registered advisers or solicitors.

### M4. Sending money abroad safely

- **User question**: "What is the safe way to send money home?"
- **Audience**: newcomers supporting family abroad.
- **Existing Guides**: none.
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: C.
- **Recommended action**: low priority; only with neutral, regulator-based guidance (checking a firm is authorised, fees and exchange rates shown, scams).
- **Score 59**: need 15 · gap 21 · verifiability 11 · fit 6 · affiliate 6 (high commercial interest; must not drive the content).
- **Official sources**: FCA Financial Services Register and consumer guidance (URL to confirm; no GOV.UK page found at the guessed path).
- **Scope and accuracy**: no provider rankings or price claims; currency rules of the destination country are out of scope.

### R3. Contents insurance for tenants

- **User question**: "Do I need contents insurance when renting?"
- **Audience**: tenants.
- **Existing Guides**: mentioned as optional in `renting-deposits-fees` and `renting-letting-agent-overview`.
- **Classification**: NEW GUIDE CANDIDATE.
- **Evidence**: C.
- **Recommended action**: low priority; if pursued, a short neutral section rather than a Guide may be enough. A future affiliate slot would be natural here (see `src/guides/recommendations.ts`), but only with disclosure and never as a requirement.
- **Score 56**: need 10 · gap 18 · verifiability 10 (few official sources) · fit 10 · affiliate 8.
- **Official sources**: MoneyHelper insurance guidance (URL to confirm).
- **Scope and accuracy**: never imply insurance is legally required or that an agent can make you buy it (the Tenant Fees Act limits what can be required).

---

## Investigated and found COVERED (no action)

These candidate questions were checked against the published text; an existing Guide answers each adequately.

| Question | Covered by |
|---|---|
| Renting without a UK credit history | `renting-referencing-checks` (section 4), `renting-guarantors` (section 5) |
| What documents letting agents ask for | `renting-referencing-checks` (Right to Rent; referencing) |
| Student guarantors and alternatives | `renting-guarantors` |
| Council Tax when students share | `renting-council-tax` (Students) |
| Setting up electricity, water and broadband | `renting-energy`, `renting-water`, `renting-broadband` (+ Renting Journey) |
| Deposit protection and tenancy rights | `renting-deposits-fees`, `renting-tenancy-agreement` |
| Rent increases | `renting-tenancy-agreement` (once a year, Form 4A) |
| Partner visa financial requirement and evidence | `partner-visa-financial-requirement`, `partner-visa-application-process` |
| Applying from outside vs inside the UK | `partner-visa-routes-overview` (section 3), `partner-visa-application-process` (section 1) |
| Relationship evidence | `partner-visa-relationship-evidence` |
| Children and dependants (partner route) | `partner-visa-dependent-children` |
| Fiancé(e)s | Partner Guides (routes, application, relationship) |
| Partner settlement (5 vs 10 years) | `settlement-partner-ilr` |
| Five-year routes vs proposed reforms | `settlement-earned-settlement-tracker`, `settlement-ilr-overview`, `skilled-worker-settlement-ilr` |
| Continuous residence and absences | `settlement-continuous-residence-absences` |
| Life in the UK Test | `settlement-english-life-in-uk-test` (booking, fee, format, ID) |
| English requirement for ILR | `settlement-english-life-in-uk-test` |
| When to apply for ILR and documents | `settlement-application-process`, `settlement-documents-evidence` |
| Opening a bank account without proof of address | `open-uk-bank-account-new-arrival` (section 5) |
| Registering with a GP | `registering-with-a-gp-england` |
| NHS eligibility and charges | `nhs-ihs-costs-england` |
| Urgent care | `where-to-go-when-ill-england`, `urgent-dental-care-england` |
| Sponsor licence and Certificate of Sponsorship | `skilled-worker-sponsorship-cos` |
| Salary and occupation requirements | `skilled-worker-occupations-salary` |
| Changing employer; dependants | `skilled-worker-switch-extend-change-employer`, `skilled-worker-dependants` |

## OUT OF SCOPE (not scored)

| Question | Reason |
|---|---|
| Renting directly from a private landlord | Renting is limited to letting-agency lets |
| Renting in Scotland, Wales or Northern Ireland | England only |
| Student halls, lodgers, council or housing-association housing | Outside the Renting scope (the Journey already redirects these readers) |
| "Will my application be approved?" style questions | Individual legal advice; refer to IAA-registered advisers or solicitors |
