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

Run the accepted backend against the existing development database using its normal setup, without invoking acquisition. Vite proxies only the Bank Holidays path to `http://127.0.0.1:8080` by default. For a backend on another port:

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
