import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, MapPin, Search, TrainFront } from "lucide-react";
import { getDisruptions, RailNotConfiguredError } from "../rail/api";
import { GUIDE_LOCALE_LANG, type GuideLocale } from "../guides/locales";
import { TRAVEL_UI } from "../travel/i18n";
import { RAIL_UI } from "../travel/railI18n";
import { loadStations } from "../rail/stations";
import type { Board, Direction } from "../rail/api";
import type { Station } from "../rail/stations";
import "./RailCard.css";

type State = { status: "idle" | "loading" | "error" | "notConfigured" } | { status: "ready"; board: Board };
export function RailCard({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const lang = GUIDE_LOCALE_LANG[locale];
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<Station[] | null>(null);
  const [directoryError, setDirectoryError] = useState(false);
  const [station, setStation] = useState<Station | null>(null);
  const [direction, setDirection] = useState<Direction>("arrivals");
  const [request, setRequest] = useState<{ crs: string; direction: Direction; id: number } | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const t = RAIL_UI[locale];
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let active = true;
    getDisruptions(request.crs, request.direction, controller.signal).then(board => { if (active) setState({ status: "ready", board }); }).catch((error: unknown) => { if (active) setState({ status: error instanceof RailNotConfiguredError ? "notConfigured" : "error" }); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [request]);
  function check() {
    if (!station) return;
    setState({ status: "loading" });
    setRequest({ crs: station.crs, direction, id: Date.now() });
  }
  function changeDirection(value: Direction) { setDirection(value); setRequest(null); setState({ status: "idle" }); }
  const matches = !station && query.trim().length >= 2 ? stations?.filter(s => (s.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) || s.crs.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 20) ?? [] : [];
  return <section className="information-section rail-section" aria-labelledby="rail-heading">
    <article className="information-card rail-card" aria-busy={state.status === "loading"}>
      <header className="rail-header">
        <span className="rail-header-icon"><TrainFront size={24} aria-hidden="true" /></span>
        <div><span className="rail-eyebrow">{TRAVEL_UI[locale].common.category}</span><h2 id="rail-heading">{t.title}</h2><p>{t.subtitle}</p></div>
      </header>
      <div className="rail-form">
        <div className="rail-search-field">
          <label htmlFor="rail-station">{t.station}</label>
          <div className="rail-search-input"><Search size={19} aria-hidden="true" /><input id="rail-station" value={query} onFocus={() => { if (!stations) loadStations().then(data => { setStations(data); setDirectoryError(false); }).catch(() => setDirectoryError(true)); }} onChange={e => { setQuery(e.target.value); setStation(null); setRequest(null); setState({ status: "idle" }); }} autoComplete="off" /></div>
          <small>{directoryError ? t.stationError : t.stationHint}</small>
          {matches.length > 0 && <ul className="rail-station-results" aria-label={t.station}>{matches.map(s => <li key={s.crs}><button type="button" onClick={() => { setStation(s); setQuery(s.name); }}>{s.name}<ArrowRight size={15} aria-hidden="true" /></button></li>)}</ul>}
        </div>
        <div className="rail-controls">
          <label>{t.direction}<select value={direction} onChange={e => changeDirection(e.target.value as Direction)}><option value="arrivals">{t.arr}</option><option value="departures">{t.dep}</option></select></label>
          <button className="rail-check" type="button" onClick={check} disabled={!station}>{state.status === "ready" ? t.refresh : t.check}<ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="rail-results" aria-live="polite">
        {state.status === "loading" && <div className="rail-state rail-state-loading" role="status"><Clock3 size={20} aria-hidden="true" /><p>{t.loading}</p></div>}
        {state.status === "error" && <div className="rail-state rail-state-error" role="status"><AlertCircle size={21} aria-hidden="true" /><p>{t.error}</p></div>}
        {state.status === "notConfigured" && <div className="rail-state rail-state-error" role="status"><AlertCircle size={21} aria-hidden="true" /><p>{t.notConfigured} <a href="https://www.nationalrail.co.uk/status-and-disruptions/"><span lang="en">National Rail</span></a></p></div>}
        {state.status === "ready" && <>
          <div className="rail-results-heading"><div><span className="rail-results-label">{direction === "arrivals" ? t.arr : t.dep}</span><h3><MapPin size={19} aria-hidden="true" />{state.board.stationName}</h3></div>
            <p>{t.updated}<br />{state.board.generatedAt ? <time dateTime={state.board.generatedAt}>{new Date(state.board.generatedAt).toLocaleString(lang.startsWith("zh") ? lang : lang === "en" ? "en-GB" : lang, { timeZone: "Europe/London" })}</time> : t.unknownTime}</p></div>
          <p className="rail-coverage">{t.coverage}</p>
          {state.board.disruptions.length === 0 && <div className="rail-state rail-state-empty"><CheckCircle2 size={21} aria-hidden="true" /><p>{t.empty}</p></div>}
          {state.board.unknownTimingCount > 0 && <p className="rail-unknown">{t.unknown} {state.board.unknownTimingCount}</p>}
          {state.board.disruptions.length > 0 && <ul className="rail-list">{state.board.disruptions.map((item, i) => <li key={i}>
            <div className="rail-item-top"><strong className={`rail-status rail-status-${item.status}`}><AlertCircle size={16} aria-hidden="true" />{item.status === "cancelled" ? t.cancelled : item.status === "partially_cancelled" ? t.partial : t.delayed}{item.delayMinutes != null && item.delayMinutes >= 10 && item.status !== "cancelled" ? ` · ${item.status === "partially_cancelled" ? `${t.delayed} ` : ""}${item.delayMinutes} ${t.minutes}` : ""}</strong>{item.platform && <span className="rail-platform">{t.platform} {item.platform}</span>}</div>
            <p className="rail-destination">{direction === "departures" ? t.destination : t.origin}: {item.locations?.map(location => location.name).filter(Boolean).join(", ") || t.unknownTime}</p>
            <p className="rail-times">{t.scheduled}: <strong>{item.scheduledTime || t.unknownTime}</strong><span aria-hidden="true"> · </span>{t.estimated}: <strong>{item.estimatedTime || t.unknownTime}</strong></p>
            {item.affectedStops.some(stop => stop.name?.trim() || stop.crs?.trim()) ? <p>{t.stops}: {item.affectedStops.map(stop => stop.name?.trim() || stop.crs?.trim()).filter(Boolean).join(", ")}</p> : item.status === "partially_cancelled" && <p>{t.stopsUnknown}</p>}
            {item.operator && <p className="rail-operator">{item.operator}</p>}{item.reason && <p>{item.reason}</p>}
            {item.checkDelayRepay && <p className="rail-repay"><a href="https://www.nationalrail.co.uk/help-and-assistance/compensation-and-refunds/">{t.repay}</a>. {t.repayInfo}</p>}
          </li>)}</ul>}
        </>}
      </div>
      <footer className="rail-notes"><p className="rail-disclaimer">{t.disclaimerBefore}<a href="https://www.nationalrail.co.uk/">National Rail</a>{t.disclaimerAfter}</p>
        <p><a href="https://github.com/davwheat/uk-railway-stations">{t.directory}</a> <a href="https://github.com/trainline-eu/stations#licence">{t.sources}</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a> · <a href="/rail/NOTICE.txt">{t.notice}</a></p></footer>
    </article>
  </section>;
}
