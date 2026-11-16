# Search-intent inventory: published Guides

Snapshot of the 47 published Guides, taken from the local Guide API on 16 November 2026 (commit 6fdea14). Every Guide is published in all five locales (zh-CN, zh-TW, en, ur, hi).

**How to read this.** Fields *Slug*, *Title*, *Sections covered*, *Links* and *Evidence* are copied from the published content and the frontend configuration (`src/guides/domains.ts`, `src/guides/topicClusters.ts`). *Main problem*, *Intent* and *Gaps* are editorial judgments made for this analysis; they are not search-demand data. No keyword tool, Search Console or SERP data was used (see `content-gap-backlog.md`, "Evidence").

- **Sections covered**: the Guide's H2 headings in the English translation (numbering removed).
- **Links**: *in-text* = other Guides linked from the article text by title; *related* = curated next-step links shown under the article (cross-section links prefixed with their section).
- **Intent**: primary / secondary. Informational, How-to, Eligibility, Comparison, Service selection.

Gap codes refer to items in `content-gap-backlog.md`.

## Family Visa (5)

### `partner-visa-financial-requirement`

- **Title (en)**: The income requirement for partner visas: how the £29,000 is worked out
- **Title (zh-CN)**: 伴侣签证的收入要求：£29,000 到底怎么算
- **Main problem**: Whether we meet the £29,000 income requirement and how it is calculated
- **Intent**: Eligibility / How-to
- **Sections covered**: How much you need to show; Whose income counts; The sponsor works abroad and is returning to the UK together; How salary is calculated: 6 months or more, and less than 6 months; How savings can be used; Self-employment income; The partner receives disability or carer benefits; Accommodation must also meet the requirements; What if you don't meet the income requirement?; You have to prove it again at each application
- **Links**: in-text 0; related 2 (partner-visa-relationship-evidence, partner-visa-application-process)
- **Evidence**: 24 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `partner-visa-relationship-evidence`

- **Title (en)**: The relationship requirements for partner visas: what the Home Office looks at, and what it doesn't
- **Title (zh-CN)**: 伴侣签证的关系要求：Home Office 看什么，不看什么
- **Main problem**: What relationship evidence the Home Office looks at
- **Intent**: Eligibility / Informational
- **Sections covered**: What the rules themselves require; What "met in person" means; Unmarried partners: two years; A previous marriage has not been dissolved yet; How the Home Office looks at relationship evidence; Extensions and settlement: living together
- **Links**: in-text 0; related 2 (partner-visa-financial-requirement, partner-visa-application-process)
- **Evidence**: 18 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `partner-visa-application-process`

- **Title (en)**: How to apply for a partner visa: steps, fees, document checklist and waiting times
- **Title (zh-CN)**: 伴侣签证怎么申请：步骤、费用、材料清单和等待时间
- **Main problem**: How to apply: where, fees, documents, biometrics, waiting times
- **Intent**: How-to / Informational
- **Sections covered**: Where to apply; Fees; Information and documents to prepare; Who does not need to prove English; After you apply: biometrics and waiting times; After approval; Children applying with you; What to do in practice
- **Links**: in-text 0; related 3 (partner-visa-financial-requirement, partner-visa-dependent-children, settlement/settlement-partner-ilr)
- **Evidence**: 19 cited statements; source sites: www.gov.uk
- **Gaps**: Mentions the healthcare surcharge but does not link the NHS IHS Guide (backlog X1).

### `partner-visa-dependent-children`

- **Title (en)**: Children coming to the UK with a partner visa: start with how the child is related to you both
- **Title (zh-CN)**: 孩子随伴侣签证一起来英国：先看孩子和你们的关系
- **Main problem**: Whether a child can come with the partner applicant
- **Intent**: Eligibility / Informational
- **Sections covered**: Start with three things; Basic requirements every child must meet; The key point: how the child is related to the partner in the UK; What "sole responsibility" means; The other biological parent is still involved in the child's upbringing; What "serious and compelling considerations" means; Adoption, guardianship and other complex relationships; Income and accommodation; Fiancé(e)s, children already in the UK, and situations this guide does not cover; How long is granted, and turning 18; What if the requirements are not met?
- **Links**: in-text 0; related 2 (partner-visa-routes-overview, partner-visa-application-process)
- **Evidence**: 32 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `partner-visa-routes-overview`

- **Title (en)**: Bringing a spouse or partner to the UK: first work out which route applies to you
- **Title (zh-CN)**: 配偶、伴侣来英国：先弄清你走哪条路线
- **Main problem**: Which partner route applies (who counts as a partner, sponsor status, inside vs outside the UK, 5 vs 10 years)
- **Intent**: Eligibility / Informational
- **Sections covered**: Who counts as a "partner"; What status the partner in the UK has; Is the applicant outside or inside the UK?; How long each grant lasts; 5 years or 10 years; English requirements; Rule changes in October 2026; Children: this guide makes no assessment
- **Links**: in-text 0; related 3 (partner-visa-financial-requirement, partner-visa-relationship-evidence, partner-visa-application-process)
- **Evidence**: 24 cited statements; source sites: www.gov.uk
- **Gaps**: No in-text links (content frozen); relies on related links and hub. Extension practicalities are spread across Guides (backlog F1).

## Work Visa (Skilled Worker) (8)

### `skilled-worker-settlement-ilr`

- **Title (en)**: Skilled Worker settlement (ILR): the current 5-year rules and announced reforms
- **Title (zh-CN)**: Skilled Worker 永居（ILR）：现行 5 年规则和已公布的改革
- **Main problem**: When a Skilled Worker can get ILR and what reforms are announced
- **Intent**: Eligibility / Informational
- **Sections covered**: Who this Guide is for; Basic requirements; How to apply and what it costs; A coming change: English rises to B2 from 26 March 2027; Main points of the reform; What it means for people already in the UK; What is not yet known; Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 20 cited statements; source sites: www.gov.uk
- **Gaps**: Shown in the Settlement hub, but the Guide itself does not link back to Settlement Guides (W1); English B2 date also stated in settlement-english-life-in-uk-test (keep consistent).

### `skilled-worker-dependants`

- **Title (en)**: Bringing your partner and children: Skilled Worker dependant visas
- **Title (zh-CN)**: 带配偶和孩子：Skilled Worker 的家属签证
- **Main problem**: Whether a partner and children can come as dependants
- **Intent**: Eligibility / Informational
- **Sections covered**: Who this Guide is for; First, the main applicant's occupation: can dependants come?; Conditions for a spouse or partner; Conditions for children; Maintenance funds; How to apply and how long the visa lasts; What a dependant visa allows; Settlement for dependants later on; Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 20 cited statements; source sites: www.gov.uk
- **Gaps**: Overlaps with settlement-children-dependants on dependants' settlement; no cross-link (W1).

### `skilled-worker-job-loss-sponsorship-ends`

- **Title (en)**: Losing your job or sponsorship: what it means for your visa
- **Title (zh-CN)**: 丢了工作或担保被撤销：对签证有什么影响
- **Main problem**: What happens to the visa after losing the job or sponsorship
- **Intent**: Informational / How-to
- **Sections covered**: Who this Guide is for; Situations that can lead to cancellation; How the Home Office usually handles it; When the employer's sponsor licence is revoked; What you can do after the job ends; Effect on settlement; Special case: victims of modern slavery; Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 17 cited statements; source sites: www.gov.uk
- **Gaps**: Same unlinked 'Related Guides' list (W1).

### `skilled-worker-occupations-salary`

- **Title (en)**: Occupation codes (SOC) and salary rules: does the job qualify?
- **Title (zh-CN)**: 职业代码（SOC）和工资要求：这份工作够不够格
- **Main problem**: Whether a job's occupation code and salary qualify
- **Intent**: Eligibility / Informational
- **Sections covered**: Who this Guide is for; First, the occupation code; The salary must meet two lines at once; When a lower threshold can apply; What counts as salary, and what does not; The two lists: the Immigration Salary List and the Temporary Shortage List; Transitional arrangements; Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 22 cited statements; source sites: www.gov.uk
- **Gaps**: Same unlinked 'Related Guides' list (W1).

### `skilled-worker-sponsorship-cos`

- **Title (en)**: Employer sponsorship: sponsor licences, CoS and employer duties
- **Title (zh-CN)**: 雇主担保：担保执照、CoS 和雇主的责任
- **Main problem**: How employer sponsorship and the Certificate of Sponsorship work
- **Intent**: Informational / Eligibility
- **Sections covered**: Who this Guide is for; The employer needs a sponsor licence and an A rating; What a CoS is; Costs the employer pays; Jobs that cannot be sponsored; The employer's reporting duties (which can affect your visa); Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 19 cited statements; source sites: www.gov.uk
- **Gaps**: Same unlinked 'Related Guides' list (W1).

### `skilled-worker-switch-extend-change-employer`

- **Title (en)**: Switching, extending and changing employer
- **Title (zh-CN)**: 转签、续签和换雇主
- **Main problem**: How to switch into, extend or change employer on a Skilled Worker visa
- **Intent**: How-to / Eligibility
- **Sections covered**: Who this Guide is for; Switching: from another visa to Skilled Worker; Extending: same employer, same job; Changing job or employer; Extra work and a second job; Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 17 cited statements; source sites: www.gov.uk
- **Gaps**: Same unlinked 'Related Guides' list (W1).

### `skilled-worker-english-documents`

- **Title (en)**: Skilled Worker English requirement and application documents
- **Title (zh-CN)**: Skilled Worker 的英语要求和申请材料
- **Main problem**: How to meet the English requirement and which documents to prepare
- **Intent**: How-to / Eligibility
- **Sections covered**: Who this Guide is for; What level is needed; How you can prove it; Documents to prepare; Points to watch; Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 10 cited statements; source sites: www.gov.uk
- **Gaps**: Same unlinked 'Related Guides' list (W1).

### `skilled-worker-overview`

- **Title (en)**: UK Skilled Worker visa: overall requirements and how to apply
- **Title (zh-CN)**: 英国技术工人签证（Skilled Worker）：整体要求和申请流程
- **Main problem**: What the Skilled Worker visa requires overall and how to apply
- **Intent**: Eligibility / How-to
- **Sections covered**: Who this Guide is for; The core requirement: 70 points; Basic conditions; How the application works, step by step; Fees; What you can and cannot do with the visa; Main changes in 2025–2026 (timeline); Common misunderstandings; Checklist
- **Links**: in-text 0; related 0
- **Evidence**: 19 cited statements; source sites: www.gov.uk, www.legislation.gov.uk
- **Gaps**: Its 'Related Guides' list names seven Guides but none are links; no curated related links (backlog W1).

## Settlement & ILR (12)

### `settlement-british-citizenship`

- **Title (en)**: Applying for British citizenship after ILR
- **Title (zh-CN)**: 拿到永居以后怎么申请入籍
- **Main problem**: How to apply for citizenship after ILR
- **Intent**: Eligibility / How-to
- **Sections covered**: Who this Guide is for; Two situations; Other requirements; If you have too many absences; Points to watch on good character; How to apply, the cost and how long it takes; How the reform proposals affect citizenship; Checklist
- **Links**: in-text 6 (settlement-children-dependants, settlement-earned-settlement-tracker, settlement-after-ilr, settlement-ilr-overview, settlement-english-life-in-uk-test, settlement-continuous-residence-absences); related 2 (settlement-after-ilr, settlement-english-life-in-uk-test)
- **Evidence**: 17 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-earned-settlement-tracker`

- **Title (en)**: Earned Settlement reform tracker: current rules compared with the proposals
- **Title (zh-CN)**: 积分式定居（Earned Settlement）改革追踪：现行规则和改革方案对照
- **Main problem**: What the Earned Settlement reform proposes versus current law
- **Intent**: Informational / Comparison
- **Sections covered**: Status as of 15 November 2026; What is current law and what is only proposed; The basic framework of the proposals; What time would count under the proposals; Groups that keep separate arrangements under the proposals; Transitional arrangements: what is known and unknown; What this means for people already in the UK; How to follow developments
- **Links**: in-text 4 (settlement-ilr-overview, settlement-long-residence, settlement-children-dependants, settlement-other-routes); related 2 (settlement-ilr-overview, settlement-continuous-residence-absences)
- **Evidence**: 21 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-after-ilr`

- **Title (en)**: After you get ILR: rights, eVisa proof of status, travel and losing ILR
- **Title (zh-CN)**: 拿到永居以后：权利、eVisa 身份证明、出境和永居失效
- **Main problem**: Rights after ILR, eVisa proof, travel and losing ILR
- **Intent**: Informational / How-to
- **Sections covered**: What you can do; Proof of status: your eVisa; How long you can be away before ILR lapses; If your ILR has lapsed: the Returning Resident visa; When ILR can be taken away; Should you become a British citizen?; Common misunderstandings
- **Links**: in-text 4 (settlement-british-citizenship, settlement-ilr-overview, settlement-continuous-residence-absences, settlement-other-routes); related 2 (settlement-british-citizenship, settlement-continuous-residence-absences)
- **Evidence**: 22 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-other-routes`

- **Title (en)**: Other settlement routes: UK Ancestry, Global Talent, Innovator Founder, BN(O), EUSS, refugees and private life
- **Title (zh-CN)**: 其他永居路线：UK Ancestry、Global Talent、Innovator Founder、BN(O)、EUSS、难民和私人生活
- **Main problem**: Settlement rules for other routes (Ancestry, Global Talent, BN(O), EUSS, refugees, private life)
- **Intent**: Eligibility / Informational
- **Sections covered**: UK Ancestry; Global Talent; Innovator Founder; Hong Kong BN(O); EU Settlement Scheme (settled status); Refugees and humanitarian protection; Private life; Other routes
- **Links**: in-text 5 (settlement-ilr-overview, settlement-children-dependants, settlement-continuous-residence-absences, settlement-english-life-in-uk-test, settlement-earned-settlement-tracker); related 2 (settlement-ilr-overview, settlement-documents-evidence)
- **Evidence**: 27 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-children-dependants`

- **Title (en)**: How children and dependants apply for settlement
- **Title (zh-CN)**: 孩子和家属怎么申请永居
- **Main problem**: How children and dependants apply for settlement
- **Intent**: Eligibility / How-to
- **Sections covered**: Who this Guide is for; General rules for children applying for settlement (Appendix Children); Skilled Worker partners and children; Children on the family route (partner visa); Children on the Hong Kong BN(O) route; Children born in the UK; No dependants on the long residence route; What the reform proposals say (not yet in force); Common mistakes
- **Links**: in-text 5 (settlement-earned-settlement-tracker, settlement-partner-ilr, settlement-other-routes, settlement-documents-evidence, settlement-british-citizenship); related 2 (settlement-partner-ilr, settlement-documents-evidence)
- **Evidence**: 19 cited statements; source sites: www.gov.uk
- **Gaps**: Overlaps with skilled-worker-dependants (settlement of dependants); no cross-link (W1).

### `settlement-application-process`

- **Title (en)**: Applying for settlement: when to apply, fees, waiting times and refusals
- **Title (zh-CN)**: 申请永居的流程：什么时候申请、费用、等待期间和被拒以后
- **Main problem**: When and how to apply for ILR, fees, waiting times, refusals
- **Intent**: How-to / Informational
- **Sections covered**: When to apply; How to apply; Fees (fee table of 8 October 2026); How long it takes; Can you travel abroad while waiting?; Outcomes; After a refusal; Common mistakes
- **Links**: in-text 5 (settlement-documents-evidence, settlement-after-ilr, settlement-ilr-overview, settlement-continuous-residence-absences, settlement-earned-settlement-tracker); related 2 (settlement-documents-evidence, settlement-after-ilr)
- **Evidence**: 19 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-documents-evidence`

- **Title (en)**: What documents to prepare for a settlement application
- **Title (zh-CN)**: 申请永居要准备哪些材料
- **Main problem**: Which documents to prepare for an ILR application
- **Intent**: How-to / Eligibility
- **Sections covered**: What almost everyone needs; Skilled Worker: key documents; Spouses and partners: key documents; Long residence: key documents; Your record of absences; Common mistakes
- **Links**: in-text 5 (settlement-application-process, settlement-english-life-in-uk-test, settlement-continuous-residence-absences, settlement-children-dependants, settlement-partner-ilr); related 2 (settlement-application-process, settlement-continuous-residence-absences)
- **Evidence**: 9 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-english-life-in-uk-test`

- **Title (en)**: English language and the Life in the UK Test for settlement
- **Title (zh-CN)**: 永居的英语要求和 Life in the UK 考试
- **Main problem**: English and Life in the UK Test requirements, exemptions and booking
- **Intent**: Eligibility / How-to
- **Sections covered**: Who this Guide is for; What level of English is required; Ways to prove English; Who is exempt from English and the Life in the UK Test; Taking the Life in the UK Test; Common mistakes; What the reform proposals say (not yet in force); Checklist
- **Links**: in-text 5 (settlement-earned-settlement-tracker, settlement-ilr-overview, settlement-documents-evidence, settlement-application-process, settlement-british-citizenship); related 2 (settlement-documents-evidence, settlement-application-process)
- **Evidence**: 17 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-continuous-residence-absences`

- **Title (en)**: Continuous residence and absences: how they are counted for settlement
- **Title (zh-CN)**: 连续居住和离境天数：申请永居时怎么算
- **Main problem**: How days outside the UK are counted
- **Intent**: Eligibility / How-to
- **Sections covered**: Which routes use these rules; The basic rule: no more than 180 days in any 12 months; Absences that do not count; What "breaks" continuous residence; The older standard on the long residence route; Practical tips; Common misunderstandings
- **Links**: in-text 4 (settlement-partner-ilr, settlement-british-citizenship, settlement-after-ilr, settlement-long-residence); related 2 (settlement-documents-evidence, settlement-application-process)
- **Evidence**: 12 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-long-residence`

- **Title (en)**: Settlement on the 10-year long residence route
- **Title (zh-CN)**: 10 年长期居住（Long Residence）申请永居
- **Main problem**: Whether 10 years' lawful residence leads to ILR
- **Intent**: Eligibility / Informational
- **Sections covered**: Who this Guide is for; Which time counts towards the 10 years; The last 12 months must be on the same route; Continuous residence and absences; English and the Life in the UK Test; Family members; Applying, timing and fees; Reform: the long residence route may close in future (not yet in force); Common mistakes
- **Links**: in-text 6 (settlement-other-routes, settlement-continuous-residence-absences, settlement-earned-settlement-tracker, settlement-english-life-in-uk-test, settlement-application-process, settlement-documents-evidence); related 2 (settlement-continuous-residence-absences, settlement-documents-evidence)
- **Evidence**: 21 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-partner-ilr`

- **Title (en)**: Settlement for spouses and partners: the 5-year and 10-year routes
- **Title (zh-CN)**: 配偶和伴侣申请永居：5 年路线和 10 年路线
- **Main problem**: How spouses and partners qualify for ILR on the 5- or 10-year route
- **Intent**: Eligibility / How-to
- **Sections covered**: Who this Guide is for; How to tell which route you are on; Requirements on the 5-year route; Requirements on the 10-year route; If your partner has died or you separated because of domestic abuse; When to apply and which form; Common mistakes
- **Links**: in-text 4 (settlement-continuous-residence-absences, settlement-english-life-in-uk-test, settlement-children-dependants, settlement-earned-settlement-tracker); related 4 (settlement-continuous-residence-absences, settlement-english-life-in-uk-test, settlement-documents-evidence, family-visa/partner-visa-routes-overview)
- **Evidence**: 23 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `settlement-ilr-overview`

- **Title (en)**: UK settlement (ILR) explained: what it is, how it differs from citizenship and which route may apply to you
- **Title (zh-CN)**: 英国永居（ILR）入门：它是什么、和入籍有什么不同、你可能走哪条路线
- **Main problem**: What ILR is and which settlement route may apply
- **Intent**: Informational / Eligibility
- **Sections covered**: Who this Guide is for; What ILR lets you do; How ILR differs from British citizenship; ILR is not granted automatically after a number of years; The main routes at a glance; Requirements that apply on almost every route; The rules are changing: Earned Settlement; Common misunderstandings; Checklist
- **Links**: in-text 11 (settlement-british-citizenship, settlement-partner-ilr, settlement-long-residence, settlement-other-routes, settlement-continuous-residence-absences, settlement-english-life-in-uk-test, settlement-earned-settlement-tracker, settlement-application-process, settlement-documents-evidence, settlement-children-dependants, settlement-after-ilr); related 3 (settlement-partner-ilr, settlement-long-residence, settlement-other-routes)
- **Evidence**: 22 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

## Renting & Moving In (England) (12)

### `renting-broadband`

- **Title (en)**: Broadband and internet: availability, speed guarantees, contracts, installation and moving home
- **Title (zh-CN)**: 宽带和上网：查可用性、速度保证、合约期、安装和搬家
- **Main problem**: How to choose and set up broadband
- **Intent**: Service selection / How-to
- **Sections covered**: Check your tenancy agreement first; Check what is available at your address; Speeds: estimates and a minimum guarantee; Contract length, charges and cooling-off; Installation, routers and engineer visits; Moving home with an existing contract; Comparing without misleading rankings
- **Links**: in-text 1 (renting-moving-in-inventory); related 2 (renting-tv-licence, renting-energy)
- **Evidence**: 18 cited statements; source sites: www.citizensadvice.org.uk, www.ofcom.org.uk
- **Gaps**: None found.

### `renting-tv-licence`

- **Title (en)**: The TV Licence explained: when you need one, shared houses and students
- **Title (zh-CN)**: TV Licence（电视许可证）：什么时候需要、合租和学生怎么办
- **Main problem**: Whether I need a TV Licence
- **Intent**: Eligibility / Informational
- **Sections covered**: When you need a TV Licence; When you do not need one; Shared houses and tenancy agreements; Students; Cost and official routes; Watching without a licence
- **Links**: in-text 1 (renting-moving-in-inventory); related 2 (renting-broadband, renting-council-tax)
- **Evidence**: 12 cited statements; source sites: www.gov.uk
- **Gaps**: None found.

### `renting-water`

- **Title (en)**: Water and sewerage: finding your water company, registering, meters and bills
- **Title (zh-CN)**: 水费和污水费：找到供水公司、登记新住户、水表和账单
- **Main problem**: How to set up and pay for water
- **Intent**: How-to / Informational
- **Sections covered**: Check whether water is included in the rent; Find your regional water company; Register as the new occupier; Metered and unmetered bills; Ways to pay and help if you struggle; Who to tell about leaks; If a bill is from before your tenancy; When you move out
- **Links**: in-text 1 (renting-moving-in-inventory); related 2 (renting-energy, renting-council-tax)
- **Evidence**: 17 cited statements; source sites: www.citizensadvice.org.uk, www.ccw.org.uk
- **Gaps**: None found.

### `renting-energy`

- **Title (en)**: Electricity and gas: finding the supplier, meter readings, setting up an account and paying
- **Title (zh-CN)**: 电和燃气：入住时找到供应商、抄表、开账户和付款方式
- **Main problem**: How to set up electricity and gas after moving in
- **Intent**: How-to / Service selection
- **Sections covered**: Check who pays for electricity and gas; Find the current supplier; Moving-in day: read the meters and contact the current supplier; Changing tariff or supplier (optional); Ways to pay; Prepayment and smart meters; If a bill is for a previous occupier; When you move out
- **Links**: in-text 1 (renting-moving-in-inventory); related 2 (renting-water, renting-council-tax)
- **Evidence**: 22 cited statements; source sites: www.ofgem.gov.uk, www.citizensadvice.org.uk
- **Gaps**: None found.

### `renting-council-tax`

- **Title (en)**: Council Tax after moving in: who pays, student exemptions, single-person discounts and billing problems
- **Title (zh-CN)**: 入住后的 Council Tax：谁要付、学生免除、单人折扣和账单问题
- **Main problem**: Who pays Council Tax, student exemptions, discounts
- **Intent**: Eligibility / How-to
- **Sections covered**: Find the right council; Registering and paying after you move in; Who normally pays; Students; Single-person discount and people who are "disregarded"; If your bill is wrong; When you move out
- **Links**: in-text 0; related 2 (renting-energy, renting-water)
- **Evidence**: 23 cited statements; source sites: www.citizensadvice.org.uk, www.gov.uk, england.shelter.org.uk
- **Gaps**: None found.

### `renting-moving-in-inventory`

- **Title (en)**: Moving in: keys, the inventory and recording the property's condition
- **Title (zh-CN)**: 入住当天：拿钥匙、清单（inventory）和房屋状况记录
- **Main problem**: What to do on moving-in day (keys, inventory, meters, repairs)
- **Intent**: How-to / Informational
- **Sections covered**: Collecting the keys; The inventory and check-in report; Photos and videos; If something is wrong; Meter readings on moving-in day; Reporting repairs; Records to keep for getting your deposit back
- **Links**: in-text 4 (renting-tenancy-agreement, renting-deposits-fees, renting-energy, renting-water); related 3 (renting-council-tax, renting-energy, renting-deposits-fees)
- **Evidence**: 21 cited statements; source sites: england.shelter.org.uk, www.citizensadvice.org.uk, www.ccw.org.uk, www.gov.uk
- **Gaps**: Repairs only covered for the move-in period (backlog R2).

### `renting-deposits-fees`

- **Title (en)**: Holding deposits, tenancy deposits and permitted fees: what you can be asked to pay when renting in England
- **Title (zh-CN)**: 定金、押金和允许收取的费用：英格兰租房要付哪些钱
- **Main problem**: What I can legally be asked to pay
- **Intent**: Eligibility / Informational
- **Sections covered**: The only payments that are allowed; Holding deposit; Rent: none before signing, up to 1 month in advance after; Tenancy deposit; Other permitted fees; Things you cannot be made to pay for; If you are asked for a fee that is not allowed
- **Links**: in-text 2 (renting-letting-agent-overview, renting-referencing-checks); related 2 (renting-tenancy-agreement, renting-moving-in-inventory)
- **Evidence**: 25 cited statements; source sites: www.gov.uk, england.shelter.org.uk
- **Gaps**: None found.

### `renting-tenancy-agreement`

- **Title (en)**: What to check before signing a tenancy agreement in England
- **Title (zh-CN)**: 签租约前要检查什么：英格兰租约和书面信息
- **Main problem**: What to check before signing
- **Intent**: How-to / Informational
- **Sections covered**: What you should get before you sign; What the agreement or written information should say; Other documents to get before the tenancy starts; Points to check line by line (suggestions); If you do not understand it; Changing your mind after signing
- **Links**: in-text 3 (renting-letting-agent-overview, renting-deposits-fees, renting-guarantors); related 2 (renting-deposits-fees, renting-moving-in-inventory)
- **Evidence**: 16 cited statements; source sites: england.shelter.org.uk, www.gov.uk
- **Gaps**: None found.

### `renting-finding-viewing`

- **Title (en)**: Finding a property, contacting agents and viewing: the first steps of renting in England
- **Title (zh-CN)**: 找房、联系中介和看房：英格兰租房第一步
- **Main problem**: How to find, contact agents and view safely
- **Intent**: How-to / Informational
- **Sections covered**: Where to look; Adverts and rent: the current rules; Contacting the agent and viewing; Watch out for scams; Questions to ask at a viewing (suggestions); If something goes wrong
- **Links**: in-text 3 (renting-letting-agent-overview, renting-deposits-fees, renting-referencing-checks); related 2 (renting-referencing-checks, renting-letting-agent-overview)
- **Evidence**: 13 cited statements; source sites: england.shelter.org.uk, www.gov.uk
- **Gaps**: None found.

### `renting-guarantors`

- **Title (en)**: Guarantors: students, newcomers and people without a UK credit history
- **Title (zh-CN)**: 担保人：学生、刚到英国和没有英国信用记录的人怎么办
- **Main problem**: Whether I need a guarantor and what to do without a UK one
- **Intent**: Eligibility / Service selection
- **Sections covered**: Do you have to have a guarantor?; What a guarantor takes on; Take extra care in shared homes; When the guarantee ends; No guarantor in the UK; Guarantee agreements made before May 2026
- **Links**: in-text 1 (renting-referencing-checks); related 2 (renting-referencing-checks, renting-tenancy-agreement)
- **Evidence**: 13 cited statements; source sites: www.gov.uk, www.citizensadvice.org.uk, england.shelter.org.uk
- **Gaps**: None found.

### `renting-referencing-checks`

- **Title (en)**: Tenant referencing: identity, income, credit and rental history
- **Title (zh-CN)**: 租客审查：身份、收入、信用和租房记录
- **Main problem**: What checks agents and landlords run (Right to Rent, income, credit)
- **Intent**: Informational / Eligibility
- **Sections covered**: Two kinds of check: do not mix them up; The Right to Rent check; What agents' referencing usually looks at; No UK credit history, or newly arrived; If checks fail: your holding deposit; Practical tips
- **Links**: in-text 3 (renting-letting-agent-overview, renting-guarantors, renting-deposits-fees); related 2 (renting-guarantors, renting-deposits-fees)
- **Evidence**: 16 cited statements; source sites: england.shelter.org.uk, www.gov.uk
- **Gaps**: None found.

### `renting-letting-agent-overview`

- **Title (en)**: Renting through a letting agent in England: the full process from search to signing
- **Title (zh-CN)**: 在英格兰通过中介租房：从找房到签约的完整流程
- **Main problem**: How renting through an agent works from search to signing
- **Intent**: Informational / How-to
- **Sections covered**: What a tenancy looks like after May 2026; What the agent does and what the landlord does; The whole process, step by step; Four kinds of things to tell apart; Where to get help
- **Links**: in-text 5 (renting-finding-viewing, renting-referencing-checks, renting-guarantors, renting-tenancy-agreement, renting-deposits-fees); related 3 (renting-finding-viewing, renting-deposits-fees, renting-tenancy-agreement)
- **Evidence**: 14 cited statements; source sites: www.gov.uk, england.shelter.org.uk
- **Gaps**: Mentions giving notice to leave, but there is no Guide on ending a tenancy and getting the deposit back (backlog R1).

## NHS / Healthcare (9)

### `registering-with-a-gp-england`

- **Title (en)**: Just arrived in the UK: how do I register with a GP? Can I do it without proof of address or an NHS number?
- **Title (zh-CN)**: 刚到英国怎么注册 GP？没有地址证明、NHS Number 也可以吗？
- **Main problem**: How to register with a GP, with or without proof of address
- **Intent**: How-to / Eligibility
- **Sections covered**: Should I register as soon as I arrive?; How to find a practice and apply; Can I register without proof of address?; Do I need a passport, BRP or eVisa?; So why is reception asking for my documents?; What if I don't have an NHS number?; What if a practice refuses to register me?; Only staying a few months: temporary registration; My English isn't very good. Can I ask for an interpreter?; After you have registered; What to do in practice
- **Links**: in-text 0; related 3 (where-to-go-when-ill-england, nhs-interpreter-language-help-england, chinese-medical-records-vaccinations-england)
- **Evidence**: 18 cited statements; source sites: www.nhs.uk, www.england.nhs.uk, www.gov.uk, www.bma.org.uk
- **Gaps**: None found.

### `nhs-interpreter-language-help-england`

- **Title (en)**: Not confident in English? Can you ask for a Chinese interpreter at the GP, in hospital and on NHS 111?
- **Title (zh-CN)**: 英语不好怎么看病？GP、医院和 NHS 111 可以要求中文口译吗？
- **Main problem**: How to get an interpreter at the GP, 111 or hospital
- **Intent**: How-to / Eligibility
- **Sections covered**: Seeing a GP: say you need an interpreter when you book; Mandarin or Cantonese: be specific; Can a family member interpret?; Children should not interpret; What about calling NHS 111?; What about hospitals and A&E?; You arrive and no interpreter has been arranged; Things to prepare before an appointment
- **Links**: in-text 1 (chinese-medical-records-vaccinations-england); related 3 (registering-with-a-gp-england, chinese-medical-records-vaccinations-england, where-to-go-when-ill-england)
- **Evidence**: 8 cited statements; source sites: www.england.nhs.uk, www.nhs.uk, www.healthwatch.co.uk
- **Gaps**: Title and examples are framed for Chinese speakers in every locale (backlog X2).

### `visiting-parents-healthcare-england`

- **Title (en)**: Parents visiting the UK fall ill: GPs, A&E, NHS charges and insurance
- **Title (zh-CN)**: 父母来英国探亲，生病了怎么办？GP、A&E、NHS 收费和保险怎么处理
- **Main problem**: What happens if visiting parents fall ill
- **Intent**: Informational / Eligibility
- **Sections covered**: Your IHS does not cover your parents; Minor illnesses: they can see a GP; Emergencies: A&E and 999; If they need to be admitted after A&E, things change; Why insurance matters; Regular medicines; What if they don't speak English?; What happens if a bill is not paid?; What to prepare before your parents come
- **Links**: in-text 0; related 3 (where-to-go-when-ill-england, nhs-ihs-costs-england, nhs-interpreter-language-help-england)
- **Evidence**: 22 cited statements; source sites: www.nhs.uk, www.gov.uk, www.england.nhs.uk, www.bma.org.uk, www.healthwatch.co.uk, assets.publishing.service.gov.uk
- **Gaps**: Covers healthcare, not how parents get a visitor visa (backlog F2).

### `urgent-dental-care-england`

- **Title (en)**: Sudden toothache: emergency dentists, NHS 111 and when to go to A&E
- **Title (zh-CN)**: 突然牙疼怎么办？Emergency Dentist、NHS 111 和什么时候去 A&E
- **Main problem**: What to do about sudden toothache
- **Intent**: How-to / Informational
- **Sections covered**: First, check for warning signs; If you have a regular dentist: contact them first; No dentist, or your dentist is closed: use NHS 111; Why a GP is not the answer; When to see a dentist; While you wait to see a dentist; How much does urgent dental care cost?; Remember these steps
- **Links**: in-text 1 (nhs-dentist-england); related 2 (nhs-dentist-england, where-to-go-when-ill-england)
- **Evidence**: 13 cited statements; source sites: www.nhs.uk, faq.nhsbsa.nhs.uk, nhsbsa.nhs.uk
- **Gaps**: None found.

### `nhs-dentist-england`

- **Title (en)**: How do dentists work in the UK? NHS, private, charges and finding a dentist
- **Title (zh-CN)**: 英国牙医到底怎么看？NHS、Private、收费和怎么找牙医
- **Main problem**: How NHS and private dentistry work and cost
- **Intent**: Informational / Comparison
- **Sections covered**: Dentists are not the same as GPs; How to find a dentist that offers NHS treatment; The same practice can offer NHS and private treatment; If I have paid the IHS or I am a student, do I still pay for dental care?; Who gets free NHS dental treatment?; How much does NHS dental treatment cost?; Roughly how much does private dental treatment cost?; Changing dentist; What if I have bad toothache?
- **Links**: in-text 1 (urgent-dental-care-england); related 2 (urgent-dental-care-england, nhs-ihs-costs-england)
- **Evidence**: 11 cited statements; source sites: www.nhs.uk, faq.nhsbsa.nhs.uk, nhsbsa.nhs.uk, www.gdc-uk.org, www.gov.uk, www.whitesdental.co.uk, spadental.co.uk, rodericksdentalpartners.co.uk, www.mydentist.co.uk
- **Gaps**: None found.

### `chinese-medical-records-vaccinations-england`

- **Title (en)**: Coming to the UK with Chinese medical records, vaccination records and a long-term condition: how do you share them with a GP?
- **Title (zh-CN)**: 带着中国病历、疫苗记录和慢性病来到英国，怎么交给 GP？
- **Main problem**: How to share overseas medical and vaccination records with a GP
- **Intent**: How-to / Informational
- **Sections covered**: Register with a GP first, then explain your situation; What to bring: more useful than a whole stack of records; Do Chinese records need translating, and who translates them?; Will UK doctors accept diagnoses and test results from China?; Continuing specialist care: usually through your GP first; Vaccination records: bring them for adults and children; Allergies and past reactions; How to prepare before coming to the UK or soon after arriving
- **Links**: in-text 1 (registering-with-a-gp-england); related 3 (registering-with-a-gp-england, medicines-prescriptions-england, nhs-interpreter-language-help-england)
- **Evidence**: 8 cited statements; source sites: www.england.nhs.uk, www.gov.uk, www.nhs.uk, www.sps.nhs.uk
- **Gaps**: Framed for records from China in every locale (X2).

### `medicines-prescriptions-england`

- **Title (en)**: How do you get medicines in the UK? Prescriptions, Pharmacy First, and the medicines you took back home
- **Title (zh-CN)**: 英国怎么买药？处方、Pharmacy First、国内一直吃的药到了英国怎么办
- **Main problem**: How to get medicines and prescriptions; bringing medicines
- **Intent**: How-to / Informational
- **Sections covered**: Three groups of medicines: supermarket, pharmacy, prescription; If you feel unwell, you can start at a pharmacy; How prescriptions work, and how much they cost; Who gets free prescriptions?; Prescription Prepayment Certificate (PPC); Running low on a regular medicine; The medicines you took regularly in China: what happens in the UK?; Why knowing only the Chinese brand name is not enough; Can you bring medicines from China?; Chinese herbal medicines are different from ordinary tablets; Why won't UK doctors prescribe antibiotics?; What to prepare when you first arrive
- **Links**: in-text 0; related 3 (chinese-medical-records-vaccinations-england, nhs-ihs-costs-england, where-to-go-when-ill-england)
- **Evidence**: 16 cited statements; source sites: www.gov.uk, www.england.nhs.uk, www.nhs.uk, www.nhsbsa.nhs.uk, www.sps.nhs.uk, pthb.nhs.wales
- **Gaps**: None found.

### `nhs-ihs-costs-england`

- **Title (en)**: New to the UK: can I use the NHS? After paying the IHS, what do I still pay for?
- **Title (zh-CN)**: 刚来英国，我能用 NHS 吗？IHS 交了以后哪些还要自己付钱？
- **Main problem**: What the NHS covers after paying the IHS and what still costs money
- **Intent**: Eligibility / Informational
- **Sections covered**: What is the IHS, and who pays it?; After paying the IHS, what is free?; What you still pay for after paying the IHS; If someone has not paid the IHS, can they not use the NHS at all?; Which group do visiting parents fall into?; What paying the IHS really means
- **Links**: in-text 0; related 3 (medicines-prescriptions-england, nhs-dentist-england, visiting-parents-healthcare-england)
- **Evidence**: 19 cited statements; source sites: www.gov.uk, www.legislation.gov.uk, www.nhs.uk, www.nhsbsa.nhs.uk, faq.nhsbsa.nhs.uk, nhsbsa.nhs.uk, assets.publishing.service.gov.uk
- **Gaps**: Visa Guides mention the IHS but do not link here (backlog X1).

### `where-to-go-when-ill-england`

- **Title (en)**: Ill in the UK, where should you go? Choosing between a pharmacy, GP, NHS 111, an urgent treatment centre, A&E and 999
- **Title (zh-CN)**: 在英国生病了该去哪？Pharmacy、GP、NHS 111、Urgent Treatment Centre、A&E 和 999 怎么选
- **Main problem**: Where to go when ill (pharmacy, GP, 111, UTC, A&E, 999)
- **Intent**: Comparison / How-to
- **Sections covered**: For a life-threatening emergency, call 999 straight away; Minor illnesses: start with a pharmacy; Need a doctor, but it isn't urgent: contact your GP; Not sure where to go, or the GP is closed: NHS 111; Urgent, but not life-threatening: an urgent treatment centre; A&E: serious injuries and life-threatening emergencies; How to tell 999 and 111 apart; Evenings and weekends, when the GP is closed; Remember these steps
- **Links**: in-text 1 (registering-with-a-gp-england); related 3 (registering-with-a-gp-england, medicines-prescriptions-england, urgent-dental-care-england)
- **Evidence**: 17 cited statements; source sites: www.nhs.uk, www.england.nhs.uk, www.gov.uk
- **Gaps**: None found.

## Money / Banking (1)

### `open-uk-bank-account-new-arrival`

- **Title (en)**: Just arrived in the UK: how do you open your first bank account?
- **Title (zh-CN)**: 刚到英国，怎么开第一个银行账户？
- **Main problem**: How a newcomer opens a first UK bank account
- **Intent**: How-to / Service selection
- **Sections covered**: First, separate two things: what the law requires and what banks require; Check what you have now; Choosing an account: check "can I apply" before rewards; Apply online or in a branch?; Just arrived and don't have the usual proof of address yet; If you are an international student who has just arrived; If you are coming to work, joining family or planning to settle; What to do if the first bank won't open an account; What a Basic Bank Account is, and when it is worth asking about; Once your money is in: how to check you have FSCS protection; Final checks before you apply
- **Links**: in-text 0; related 0
- **Evidence**: 32 cited statements; source sites: www.legislation.gov.uk, handbook.fca.org.uk, www.gov.uk, www.fscs.org.uk, www.bankofengland.co.uk, www.barclays.co.uk, www.lloydsbank.com, www.natwest.com, www.hsbc.co.uk, www.santander.co.uk, www.nationwide.co.uk, monzo.com, www.starlingbank.com
- **Gaps**: Only Guide in Money; written for Chinese passport holders in every locale (X2); e-money is one bullet (backlog M3); NI number and credit history mentioned but have no Guide (M1, M2).

## Overlaps to keep consistent (potential cannibalisation)

| Topic | Guides | Recommendation |
|---|---|---|
| Skilled Worker settlement | `skilled-worker-settlement-ilr`, `settlement-ilr-overview`, `settlement-documents-evidence` (Skilled Worker documents), `settlement-english-life-in-uk-test` (B2 from 26 March 2027) | Keep `skilled-worker-settlement-ilr` as the route page; the Settlement Guides summarise and should link to it (W1). Keep the B2 date identical in both. |
| Dependants' settlement | `skilled-worker-dependants` (settlement for dependants), `settlement-children-dependants` (Skilled Worker partners and children) | Cross-link (W1); no merge needed: one is the visa, the other the ILR application. |
| Partner 5- vs 10-year route | `partner-visa-routes-overview` (section 5), `settlement-partner-ilr` | Already cross-linked; routes overview explains entry, settlement Guide explains ILR. |
| English requirements | `skilled-worker-english-documents` (visa), `settlement-english-life-in-uk-test` (ILR), `partner-visa-application-process` (English exemptions) | Distinct stages; titles already make the stage clear. |
| Agent process | `renting-letting-agent-overview`, `renting-finding-viewing` | Overview vs first step; distinct. |
| Dentistry | `nhs-dentist-england`, `urgent-dental-care-england` | Routine vs urgent; distinct and cross-linked. |

No two Guides were found answering the same primary question.
