# Life in UK design foundation

## Brand language

**Illustrated Everyday Britain.** Cute and warm on the outside; rigorous and trustworthy underneath. A knowledgeable Chinese neighbour, with everyday British surroundings rather than fantasy or flag branding. This foundation is awaiting owner visual review.

### Colour and surfaces

Warm paper (#F7F5EE) grounds the page; porcelain (#FFFDF9) lifts information cards. Hedge green (#315C49) is the primary brand/action colour; brick terracotta (#A34F37) adds restrained personality. Ink (#28372F) carries primary text; stone green (#60695F) carries secondary text. Reviewed green (#38634B on #EAF0E6) and warning amber (#805B18 on #F7EEDB) distinguish supplied states. Dividers use #DADDD2. Soft borders are decorative, not the sole indicator of an interactive control.

Use the dark colours for readable text, not pale illustration colours. State text and icons accompany colour. Warmth should come from composition and illustration, not reduced contrast. One light elevation distinguishes cards; no stacked floating panels.

### Chinese-first type and rhythm

Use a contemporary system sans stack, prioritising available Chinese fonts (PingFang SC, Microsoft YaHei, Noto Sans CJK SC). No external font requests. Actual glyph appearance depends on the operating system; review on Chinese-capable macOS and Windows as well as Linux.

Display headings scale from 32–48px, section/card headings use 24px, secondary headings 20px, body 16px with 1.8 line height, and metadata 14px. Small 12–13px annotations are limited to review labels and supplementary explanations. Core information is never placed in these annotations. Heading weight is 600; body weight 400. Mark English source names and regions with their language. Dates remain readable text, with machine-readable timestamps.

A 4px base supports 16/24/32px content spacing. Controls use 10px radius, cards 20px. Illustration can be softer; information remains ordered and uncluttered. These concepts can inform a future native design system without sharing DOM, CSS or components.

### Trust hierarchy

Information order: category and supplied review state → Chinese title → concise summary → upstream source → geographic applicability → supplied update time → original-source action.

Source authority and Life in UK review state are independent. Official-source presentation is used only when the caller supplies an authoritative source. The current `reviewed` / `pending` tones are visual variants, not a backend workflow contract. Labels are supplied by the caller. Do not default every item to reviewed, derive verification from a source URL, or claim live freshness. The showcase explicitly labels its state and fixed timestamp as examples. The GOV.UK link is an ordinary outbound navigation, not an integration.

### Illustration convention

Use mature editorial studies of real everyday Britain: restrained detail, slightly irregular strokes, natural flat washes and optional subtle texture. Leave whitespace around practical information. Avoid fantasy characters, childish clip-art, stock photography and extensive animation.

The original neighbourhood SVG is a lightweight composition study, not the final illustration library. Future assets should be local SVG or optimised raster files with explicit dimensions. Keep decorative artwork hidden from assistive technology; give informative artwork concise Chinese alternative text. Artwork must never contain essential trust metadata. Do not embed labels in images. This issue introduces no animation.

## Web implementation

- `src/index.css`: semantic Tailwind v4 `@theme` variables, global typography and focus treatment.
- `src/App.css`: showcase layout and component presentation; 800px and 480px breakpoints are web-specific choices.
- `src/components/InformationCard.tsx`: typed source, supplied trust state, freshness and geographic primitives plus the specific information-card composition. It has no fetching, state inference or timers.
- `src/components/Button.tsx`: small native button/Radix Slot composition. `asChild` accepts one native anchor for navigation. Native buttons retain disabled behaviour; use anchors only for navigation. It is intentionally not a generic component factory.
- `src/components/Neighbourhood.tsx`: decorative inline SVG, hidden from assistive technology.
- `src/App.tsx`: explicitly internal review composition with local fixtures, trust explanations, palette and type samples.

At narrow widths, columns stack and metadata wraps without truncation. Controls have at least 44px height, visible focus outlines and native keyboard semantics. A skip link reaches the main content. Source links have text labels and 44px hit height. Icons are decorative and state meaning is carried by text. No motion needs a reduced-motion override.

No shadcn scaffolding was added: native controls with Radix Slot cover the current needs. Add further Radix/shadcn primitives only when actual interaction warrants them, retaining this brand language.
