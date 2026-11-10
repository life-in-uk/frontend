import { Clock3 } from "lucide-react";
import { formatUkDateTimeZh } from "../../travel/format";
import type { Freshness } from "../../travel/freshness";

type StaleNoticeProps = {
  freshness: Exclude<Freshness, { state: "fresh" }>;
  /** What is being withheld, e.g. "地铁线路运行状态". */
  subject: string;
  limitMinutes: number;
  /** Plain-language name of the official fallback, e.g. "TfL 官方运行状态". */
  fallback: string;
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
}: StaleNoticeProps) {
  return (
    <div className="travel-stale" role="status">
      <Clock3 size={20} aria-hidden="true" />
      <div>
        <p className="travel-stale-title">暂无最新的{subject}</p>
        {freshness.state === "stale" ? (
          <p>
            最近一次来源数据观测于{" "}
            <time dateTime={freshness.observedAt}>
              {formatUkDateTimeZh(freshness.observedAt)}
            </time>
            （英国时间），已超过 {limitMinutes} 分钟，情况可能已经变化，因此不显示。
          </p>
        ) : (
          <p>来源数据缺少有效的观测时间，无法确认是否为最新，因此不显示。</p>
        )}
        <p>请查看下方的 {fallback}。</p>
      </div>
    </div>
  );
}
