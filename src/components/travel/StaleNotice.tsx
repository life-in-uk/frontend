import { Clock3 } from "lucide-react";
import { formatUkDateTime } from "../../travel/format";
import type { Freshness } from "../../travel/freshness";
import { GUIDE_LOCALE_LANG, type GuideLocale } from "../../guides/locales";
import { TRAVEL_UI } from "../../travel/i18n";

type StaleNoticeProps = {
  freshness: Exclude<Freshness, { state: "fresh" }>;
  /** What is being withheld, e.g. "地铁线路运行状态". */
  subject: string;
  limitMinutes: number;
  /** Plain-language name of the official fallback, e.g. "TfL 官方运行状态". */
  fallback: string;
  locale?: GuideLocale;
};

/**
 * Shown instead of every current-status claim when a stored snapshot is too
 * old (or has no usable timestamp). It states when the source was observed
 * and points to the official source; it never shows the stale facts.
 */
export function StaleNotice({
  freshness,
  subject,
  limitMinutes,
  fallback,
  locale = "zh-CN",
}: StaleNoticeProps) {
  const t = TRAVEL_UI[locale].common;
  return (
    <div className="travel-stale" role="status">
      <Clock3 size={20} aria-hidden="true" />
      <div>
        <p className="travel-stale-title">{t.staleTitle(subject)}</p>
        {freshness.state === "stale" ? (
          <p>
            {t.staleBefore}
            <time dateTime={freshness.observedAt}>
              {formatUkDateTime(freshness.observedAt, GUIDE_LOCALE_LANG[locale])}
            </time>
            {t.staleAfter(limitMinutes)}
          </p>
        ) : (
          <p>{t.invalid}</p>
        )}
        <p>{t.seeOfficial(fallback)}</p>
      </div>
    </div>
  );
}
