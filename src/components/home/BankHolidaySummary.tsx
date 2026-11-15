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
import { GUIDE_LOCALE_LANG, type GuideLocale } from "../../guides/locales";
import { formatHolidayDate, SITE_UI } from "../../guides/siteUi";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; data: BankHolidaysResponse };

const GOV_UK_BANK_HOLIDAYS = "https://www.gov.uk/bank-holidays";

/**
 * Compact homepage summary of the next England & Wales bank holiday, from
 * the same persisted GOV.UK evidence as the full Bank Holidays card.
 */
export function BankHolidaySummary({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const ui = SITE_UI[locale].holidays;
  const lang = GUIDE_LOCALE_LANG[locale];
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
        <h2 id="holiday-title">{ui.title}</h2>
        <span className="home-chip" lang="en">
          England &amp; Wales
        </span>
      </div>
      <div className="holiday-body">
        <div className="holiday-text">
          {state.status === "loading" && (
            <p className="holiday-message" role="status">
              {ui.loading}
            </p>
          )}
          {state.status === "unavailable" && (
            <p className="holiday-message" role="status">
              {ui.unavailable}
            </p>
          )}
          {data && !holiday && (
            <p className="holiday-message" role="status">
              {ui.none}
            </p>
          )}
          {holiday && (
            <>
              <h3 className="holiday-name" lang="en">
                {holiday.title}
              </h3>
              <p className="holiday-date">
                {ui.next}
                <time dateTime={holiday.date}>
                  {locale === "zh-CN" ? formatHolidayDateZh(holiday.date) : formatHolidayDate(holiday.date, lang)}
                </time>
                {holiday.notes && <span lang="en"> · {holiday.notes}</span>}
              </p>
            </>
          )}
        </div>
        <a className="home-button-soft" href={GOV_UK_BANK_HOLIDAYS}>
          {ui.all}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <p className="home-panel-meta">
        {ui.source}<span lang="en">GOV.UK</span>
        {data && (
          <>
            {ui.observed}
            <time dateTime={data.evidence.observedAt}>
              {locale === "zh-CN"
                ? formatObservationTime(data.evidence.observedAt)
                : new Intl.DateTimeFormat(lang, { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" }).format(new Date(data.evidence.observedAt))}
            </time>
            {ui.ukTime}
          </>
        )}
      </p>
    </section>
  );
}
