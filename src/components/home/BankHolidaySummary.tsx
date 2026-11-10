import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import {
  formatObservationTime,
  getBankHolidays,
  londonCalendarDate,
  nextEnglandAndWalesHoliday,
} from "../../bank-holidays/api";
import type { BankHolidaysResponse } from "../../bank-holidays/api";
import { formatHolidayDateZh } from "../../home/featured";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: BankHolidaysResponse };

const GOV_UK_BANK_HOLIDAYS = "https://www.gov.uk/bank-holidays";

/**
 * Compact homepage summary of the next England & Wales bank holiday, from
 * the same persisted GOV.UK evidence as the full Bank Holidays card.
 */
export function BankHolidaySummary() {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    getBankHolidays(controller.signal)
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const data = state.status === "ready" ? state.data : undefined;
  const holiday = data && nextEnglandAndWalesHoliday(data, londonCalendarDate());

  return (
    <section
      className="home-panel holiday-panel"
      aria-labelledby="holiday-title"
      aria-busy={state.status === "loading"}
    >
      <div className="home-panel-head">
        <CalendarDays size={24} aria-hidden="true" />
        <h2 id="holiday-title">英国公共假期</h2>
        <span className="home-chip" lang="en">
          England &amp; Wales
        </span>
      </div>
      <div className="holiday-body">
        <div className="holiday-text">
          {state.status === "loading" && (
            <p className="holiday-message" role="status">
              正在加载英格兰和威尔士的银行假日…
            </p>
          )}
          {state.status === "unavailable" && (
            <p className="holiday-message" role="status">
              银行假日信息暂时无法加载，请稍后再试，或查看 GOV.UK 官方原文。
            </p>
          )}
          {data && !holiday && (
            <p className="holiday-message">
              当前来源数据中没有今天或之后的英格兰和威尔士银行假日，请查看 GOV.UK
              官方原文。
            </p>
          )}
          {holiday && (
            <>
              <p className="holiday-name" lang="en">
                {holiday.title}
              </p>
              <p className="holiday-date">
                下一个银行假日：
                <time dateTime={holiday.date}>
                  {formatHolidayDateZh(holiday.date)}
                </time>
                {holiday.notes && <span lang="en"> · {holiday.notes}</span>}
              </p>
            </>
          )}
        </div>
        <a className="home-button-soft" href={GOV_UK_BANK_HOLIDAYS}>
          查看全年假期
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <p className="home-panel-meta">
        来源：<span lang="en">GOV.UK</span>
        {data && (
          <>
            {" · 来源观测于 "}
            <time dateTime={data.evidence.observedAt}>
              {formatObservationTime(data.evidence.observedAt)}
            </time>
            （英国时间）
          </>
        )}
      </p>
    </section>
  );
}
