# Life in UK public design system

Internal review showcase for Issue #1, **Illustrated Everyday Britain**. This is not the production homepage. Issue #3 connects its existing Bank Holidays card to the Life in UK backend. Adjacent trust/type samples remain labelled demonstration data. The browser never fetches GOV.UK data.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Review at 1440px and 390px widths. See [design conventions](docs/design-system.md) for brand decisions and web implementation details.

Validation:

```sh
npm test
npm run lint
npx tsc -b
npm run build
```

React, TypeScript and Vite remain the application foundation. Tailwind uses the v4 Vite plugin and CSS theme configuration. Lucide supplies UI icons. Radix Slot supports the button's `asChild` link composition; no additional UI framework or complex widget is required.

## Bank Holidays integration (Issue #3)

The card requests only `GET /api/bank-holidays`. The endpoint-specific typed boundary in `src/bank-holidays/api.ts` validates the accepted DTO: evidence artifact UUID and UTC observation timestamp, plus exactly one group for each supported division with title, calendar date, notes and bunting. It retains all divisions and provenance, but the card deliberately selects **England and Wales**.

Selection includes today in **Europe/London**, chooses the earliest event on or after that date, and preserves source order for equal dates. Empty/exhausted calendars display an explicit message. Holiday dates are validated calendar strings and formatted from their numeric components (e.g. `25 December 2026`), never parsed as instants. Evidence observation time is an instant and is displayed in UK time, labelled as observation rather than a new acquisition or editorial review.

The card loads independently, aborts on unmount and has a 10-second request deadline. Network errors, non-success HTTP responses (including 404/500), invalid JSON and malformed DTOs all show a fixed unavailable message with the existing official-source link. No fake fallback, raw errors, acquisition or inferred verification state is used.

### Local connection

Run the accepted backend against the existing development database using its normal setup, without invoking acquisition. Vite proxies the Bank Holidays and Underground paths to `http://127.0.0.1:8080` by default. For a backend on another port:

```sh
BANK_HOLIDAYS_API_TARGET=http://127.0.0.1:8081 npm run dev
```

Alternatively put that non-secret setting in a git-ignored `.env.local`. It is server-side Vite configuration, not a `VITE_` browser variable. No CORS change is needed. Production hosting must forward `/api/bank-holidays` to the backend on the same origin; the Vite development proxy is not production routing. The request target does not appear in presentation components.

### Focused tests

`npm test` uses Node's built-in test runner with TypeScript stripping (Node 22.18+). No test dependencies are installed. It covers request/validation, all divisions, deterministic selection, leap-date validation, UK-day boundaries, timezone-independent holiday formatting, provenance, malformed responses and network/HTTP failures.

Repeatable browser checks use an externally available Playwright installation with Chromium. Set `PLAYWRIGHT_MODULE` to its module file if it is outside this repository, and `FRONTEND_URL` to the running Vite URL:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs FRONTEND_URL=http://127.0.0.1:5176 npm run test:browser
```

This checks pending/loading, title/date rendering, regional isolation, network/404/500/invalid responses, exhausted calendars, request deadline and the surrounding UI at 1440px and 390px. Fixtures are test-only. Add `REAL_BACKEND=1` to perform the final unmocked backend/browser check using already persisted evidence. It makes GET requests only and writes screenshots to `/tmp/life-uk-bank-holidays-review` (override with `SCREENSHOT_DIR`). Unit tests remain runnable without browsers, a backend or a database.

## Underground Current State (Issue #5)

The focused London Underground component reads only `GET /api/travel/underground` and can display persisted Current State. The frontend does not acquire, parse raw TfL data, poll, or project a snapshot. There are no other transport modes, location filtering, translations, Change History or freshness classifications.

`src/underground/api.ts` explicitly models `observedAt`, lines and statuses. Every field is validated before any facts render. Severity must be a signed 32-bit integer, matching the accepted backend Java `int`; it is retained without colour/ranking semantics. The accepted DTO always emits `reason: string | null` (missing source reasons become null). Invalid JSON/DTO and non-success responses fail closed.

All lines and statuses render in backend order, including repeated statuses. Keys include source positions; nothing is deduplicated or selected as primary/worst/best. Source names, descriptions and meaningful reasons retain their exact wording and whitespace. Null, empty or whitespace-only reasons add no fabricated explanation. Valid lines with no statuses still show their name without invented service information.

`Source observed: … UK time` formats the UTC instant in Europe/London; the exact timestamp is retained in the model and `<time datetime>`. It does not claim live service. A valid `200` with `lines: []` shows a neutral empty-observation message and timestamp. A `404`, `500`, network failure, request deadline or malformed response shows a distinct local unavailable message without fake facts. Loading is local, with a 10-second deadline and abort-on-unmount cleanup. Transport for London is identified through a normal attribution/navigation link, never a data request.

The new endpoint shares the existing server-side `BANK_HOLIDAYS_API_TARGET` backend setting, despite that setting's original endpoint-specific name. Both paths default to port 8080. For a separately running accepted backend:

```sh
BANK_HOLIDAYS_API_TARGET=http://127.0.0.1:8082 npm run dev
```

Production must route both relative API paths on the same origin. No CORS or backend configuration change is introduced by this frontend issue.

Validation:

```sh
node --test tests/underground.test.mjs
node --test tests/bank-holidays.test.mjs
npm test
npm run lint
npx tsc -b
npm run build
git diff --check
```

Use the same external Playwright/Chromium setup described above to run `npm run test:underground:browser`, setting `FRONTEND_URL` to the running Vite address. Default mode uses authored response fixtures to verify rendering, repeats, ordering, exact text, reasons, malformed/non-success responses, local loading, persisted-empty behaviour, no polling, cancellation and long-text wrapping at 1440px/390px. `REAL_BACKEND=1` instead performs an unmocked backend/browser verification and requires already persisted line facts. Set `REAL_BACKEND=unavailable` to verify a real development backend currently returning 404 without inserting a snapshot; this verifies the integration path and safe unavailable UI, not real line rendering. Neither mode triggers acquisition or changes evidence. Screenshots go to `/tmp/life-uk-underground-review`. The Bank Holidays browser regression suite isolates the new endpoint with a test-only empty response.

## Compact Underground status (Issue #7)

Presentation-only refinement of the same `GET /api/travel/underground` data. Each line is one compact row: a short rail in the line's TfL identity colour, the exact line name, and per status a small PCB-style LED beside the exact status text. Line colour and LED colour are independent systems.

`src/underground/presentation.ts` documents both frontend-local V1 rules:

- Line colours, keyed by backend `lineId`, are the RGB references from the TfL Colour standard, Issue 11 (https://content.tfl.gov.uk/tfl-colour-standard.pdf). Unknown ids get a neutral outlined marker.
- A status is classified only when its severity and description match the same Tube entry in TfL's severity metadata and that status is defined on https://tfl.gov.uk/status-updates/status-definitions: Good Service → normal; Minor Delays → disruption; Severe Delays, Suspended, Part Suspended, Planned Closure, Part Closure → severe. Anything else is shown as an unlit "not classified" LED.

LEDs breathe slowly (no blinking); `prefers-reduced-motion: reduce` keeps them static. Meaningful reasons are collapsed behind a button carrying `aria-expanded`, and reveal the exact source text. On wide screens the backend sequence fills two independent columns, the first half down the left and the rest down the right, so revealing a reason only lengthens its own column. Narrow screens use one column in backend order.
