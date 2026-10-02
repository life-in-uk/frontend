# Life in UK public design system

Internal review showcase for Issue #1, **Illustrated Everyday Britain**. This is not the production homepage. Content, review states and timestamps are local demonstration data; nothing is fetched from GOV.UK or a backend.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Review at 1440px and 390px widths. See [design conventions](docs/design-system.md) for brand decisions and web implementation details.

Validation:

```sh
npm run lint
npx tsc -b
npm run build
```

React, TypeScript and Vite remain the application foundation. Tailwind uses the v4 Vite plugin and CSS theme configuration. Lucide supplies UI icons. Radix Slot supports the button's `asChild` link composition; no additional UI framework or complex widget is required.
