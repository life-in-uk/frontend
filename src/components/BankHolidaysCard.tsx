import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  getBankHolidays,
  londonCalendarDate,
  nextEnglandAndWalesHoliday,
  formatHolidayDate,
  formatObservationTime,
} from "../bank-holidays/api";
import type { BankHolidaysResponse } from "../bank-holidays/api";
import { InformationCard } from "./InformationCard";

const bankHolidaysSource = {
  name: "GOV.UK",
  href: "https://www.gov.uk/bank-holidays",
};

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: BankHolidaysResponse };

export function BankHolidaysCard() {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // A stalled backend must eventually become unavailable, not load forever.
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
  const holiday =
    data && nextEnglandAndWalesHoliday(data, londonCalendarDate());
  const summary =
    state.status === "loading" ? (
      "正在加载英格兰和威尔士的银行假日…"
    ) : state.status === "unavailable" ? (
      "银行假日信息暂时无法加载，请稍后再试，或查看官方原文。"
    ) : holiday ? (
      <>
        <span>下一个银行假日：</span>
        <time dateTime={holiday.date} lang="en">
          {formatHolidayDate(holiday.date)}
        </time>
        {holiday.notes && <span lang="en"> · {holiday.notes}</span>}
      </>
    ) : (
      "当前来源数据中没有今天或之后的英格兰和威尔士银行假日，请查看官方原文。"
    );

  return (
    <InformationCard
      title={holiday?.title ?? "英国银行假日"}
      summary={summary}
      source={bankHolidaysSource}
      region="England & Wales"
      category="日常生活"
      icon={<CalendarDays size={18} aria-hidden="true" />}
      busy={state.status === "loading"}
      freshness={
        data
          ? {
              label: `来源观测于 ${formatObservationTime(data.evidence.observedAt)}（英国时间）`,
              dateTime: data.evidence.observedAt,
            }
          : undefined
      }
      footerNote={data ? "基于已保存的 GOV.UK 来源数据" : "GOV.UK 官方来源"}
    />
  );
}
