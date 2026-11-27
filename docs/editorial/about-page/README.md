# Multilingual About and editorial policy — Claude handoff

**Draft copy for owner and frontend review.** This addresses F12 alongside the separate F5 content review. It is aligned with the site's Guide editorial policy. Since the existing About links target the home-page `#about` section, the next implementation needs actual localized static destinations. The current About links and routes remain untouched in this copy PR. [SEO audit](https://claude.ai/artifact/SRSt4eaxTKsngPVMCESGZG) · [Existing backend editorial policy](https://github.com/life-in-uk/backend/blob/1bdc1a1a4ba35a02997c2853bdd45b63786537e0/docs/guide-editorial-policy.md)

| Locale | Draft | Proposed canonical path |
|---|---|---|
| Simplified Chinese | [zh-CN](zh-CN.md) | `/zh-CN/about` |
| Traditional Chinese | [zh-TW](zh-TW.md) | `/zh-TW/about` |
| English | [en](en.md) | `/en/about` |
| Urdu | [ur](ur.md) | `/ur/about` |
| Hindi | [hi](hi.md) | `/hi/about` |

## Proposed delivery through the existing frontend

- Render the title, localized description and body in static HTML. Add real localized About links in the shared navigation or footer and keep existing home anchors working. Keep one canonical URL per locale, reciprocal hreflang including en-GB, and x-default per site convention. Check the page and navigation in the prerendered and hydrated versions, with mobile widths, Urdu RTL and keyboard navigation.
- The About routes are frontend editorial pages outside the backend Guide inventory. Agree with Claude how these pages enter the approved sitemap so crawlers see only deployed HTTP 200 routes. Keep this decision separate from PR #50's transient API failure handling and from the layout/copy fixes tracked under F5.
- **Owner decision needed before implementation release:** supply one confirmed public correction contact. No public correction address was found in the current site copy. “Use the correction contact on this page” is conditional draft wording and may ship only with a working, approved channel. Use the existing channel if one is available. Avoid an invented inbox or collection of documents. No response time is promised.
- Correction triage should capture the URL, locale, passage and source only. Check current evidence, mark any material correction in the version record and use the existing approval path for Guide replacement. Tell the owner if an urgent correction may require a separate withdrawal decision. Treat low-confidence medical and finance issues as requiring appropriate review rather than handling personal cases.
- The copy describes AI-assisted work, owner authorization, existing automated checks and independence from covered organizations. It makes no claims of professional credentials or actual independent financial, clinical, legal or fluent human-language review. Urdu and Hindi still need an independent fluent read before owner approval, should the owner require that sign-off.
