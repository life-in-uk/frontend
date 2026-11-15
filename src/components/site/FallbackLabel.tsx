import type { ReactNode } from "react";
import { textDirection, type GuideLocale } from "../../guides/locales";

/**
 * Text of a Guide shown in another language than the page (a Simplified
 * Chinese fallback), marked so screen readers and bidi layout treat it as
 * Chinese, left-to-right.
 */
export function ForeignText({ lang, children }: { lang?: string; children: ReactNode }) {
  if (!lang) return <>{children}</>;
  return (
    <span lang={lang} dir={textDirection(lang as GuideLocale) === "rtl" ? "rtl" : "ltr"}>
      {children}
    </span>
  );
}

/** "Not yet translated · Simplified Chinese" label; renders nothing without a label. */
export function FallbackBadge({ label }: { label: string | false | undefined }) {
  return label ? <span className="fallback-badge">{label}</span> : null;
}
