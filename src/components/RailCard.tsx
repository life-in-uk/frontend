import { useEffect, useState } from "react";
import { TrainFront } from "lucide-react";
import { getDisruptions } from "../rail/api";
import { loadStations } from "../rail/stations";
import type { Board, Direction } from "../rail/api";
import type { Station } from "../rail/stations";
import "./RailCard.css";

type State = { status: "idle" | "loading" | "error" } | { status: "ready"; board: Board };
const copy = {
  en: { title: "Rail disruptions", station: "Search station", stationHint: "Select a station from the search results.", stationError: "Station directory unavailable. Please try again.", direction: "Board", dep: "Departures", arr: "Arrivals", check: "Check disruptions", refresh: "Refresh", loading: "Loading rail information…", error: "Rail information is unavailable. Please try again later.", empty: "No reported delays of 10 minutes or more or cancellations in the available station board.", coverage: "Results cover only the services returned on the station board, not every train or the entire day.", unknown: "Services have unconfirmed timing and are not included in this list:", scheduled: "Scheduled", estimated: "Estimated", platform: "Platform", destination: "To", origin: "From", cancelled: "Cancelled", partial: "Partially cancelled", stops: "Affected stops", stopsUnknown: "Affected stops are not available.", delayed: "Delayed", minutes: "min", updated: "Data last updated", unknownTime: "Unavailable", repay: "Check Delay Repay", repayInfo: "Eligibility varies by operator and normally depends on your actual delay at your final destination; a predicted delay does not guarantee compensation.", source: "Data: National Rail", directory: "Station data: davwheat, Trainline EU and their sources (ODbL). Great Britain National Rail stations; Northern Ireland services are not included." },
  zh: { title: "铁路延误与取消", station: "搜索车站", stationHint: "请从搜索结果中选择车站。", stationError: "车站目录暂不可用，请重试。", direction: "车次方向", dep: "出发", arr: "到达", check: "查询延误", refresh: "刷新", loading: "正在加载铁路信息…", error: "铁路信息暂不可用，请稍后重试。", empty: "当前车站看板中没有报告延误 10 分钟或以上的列车或取消的列车。", coverage: "结果仅涵盖车站看板返回的车次，不包括所有列车或全天车次。", unknown: "以下数量的列车时间尚未确认，未列入此列表：", scheduled: "计划时间", estimated: "预计时间", platform: "站台", destination: "目的地", origin: "出发地", cancelled: "已取消", partial: "部分停站取消", stops: "受影响车站", stopsUnknown: "暂无受影响车站信息。", delayed: "延误", minutes: "分钟", updated: "数据更新时间", unknownTime: "暂无", repay: "查询延误赔偿", repayInfo: "赔偿资格因运营商而异，通常取决于您到达最终目的地的实际延误；预计延误不代表一定有赔偿。", source: "数据来源：National Rail", directory: "车站数据：davwheat、Trainline EU 及其来源（ODbL）。仅涵盖大不列颠 National Rail 车站，不包括北爱尔兰铁路。" },
};
export function RailCard() {
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<Station[] | null>(null);
  const [directoryError, setDirectoryError] = useState(false);
  const [station, setStation] = useState<Station | null>(null);
  const [direction, setDirection] = useState<Direction>("arrivals");
  const [request, setRequest] = useState<{ crs: string; direction: Direction; id: number } | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const t = copy[language];
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    let active = true;
    getDisruptions(request.crs, request.direction, controller.signal).then(board => { if (active) setState({ status: "ready", board }); }).catch(() => { if (active) setState({ status: "error" }); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [request]);
  function check() {
    if (!station) return;
    setState({ status: "loading" });
    setRequest({ crs: station.crs, direction, id: Date.now() });
  }
  function changeDirection(value: Direction) { setDirection(value); setRequest(null); setState({ status: "idle" }); }
  const matches = !station && query.trim().length >= 2 ? stations?.filter(s => (s.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) || s.crs.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 20) ?? [] : [];
  return <section className="information-section" lang={language === "zh" ? "zh-Hans" : "en"} aria-labelledby="rail-heading">
    <article className="information-card rail-card" aria-busy={state.status === "loading"}>
      <header><span className="category"><TrainFront size={18} aria-hidden="true" /> Travel / 交通</span><h2 id="rail-heading">{t.title}</h2></header>
      <div className="rail-controls">
        <label>Language / 语言 <select value={language} onChange={e => setLanguage(e.target.value as "en" | "zh")}><option value="en">English</option><option value="zh">中文</option></select></label>
        <label>{t.station} <input value={query} onFocus={() => { if (!stations) loadStations().then(data => { setStations(data); setDirectoryError(false); }).catch(() => setDirectoryError(true)); }} onChange={e => { setQuery(e.target.value); setStation(null); setRequest(null); setState({ status: "idle" }); }} autoComplete="off" /><small>{directoryError ? t.stationError : t.stationHint}</small></label>
        <label>{t.direction} <select value={direction} onChange={e => changeDirection(e.target.value as Direction)}><option value="arrivals">{t.arr}</option><option value="departures">{t.dep}</option></select></label>
        <button type="button" onClick={check} disabled={!station}>{state.status === "ready" ? t.refresh : t.check}</button>
      </div>
      {matches.length > 0 && <ul className="rail-station-results" aria-label={t.station}>{matches.map(s => <li key={s.crs}><button type="button" onClick={() => { setStation(s); setQuery(s.name); }}>{s.name}</button></li>)}</ul>}
      <p>{t.coverage}</p>
      <div aria-live="polite">
        {state.status === "loading" && <p role="status">{t.loading}</p>}
        {state.status === "error" && <p role="status">{t.error}</p>}
        {state.status === "ready" && <>
          <h3>{state.board.stationName}</h3>
          <p>{t.updated}: {state.board.generatedAt ? <time dateTime={state.board.generatedAt}>{new Date(state.board.generatedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-GB", { timeZone: "Europe/London" })}</time> : t.unknownTime}</p>
          {state.board.disruptions.length === 0 && <p>{t.empty}</p>}
          {state.board.unknownTimingCount > 0 && <p>{t.unknown} {state.board.unknownTimingCount}</p>}
          <ul className="rail-list">{state.board.disruptions.map((item, i) => <li key={i}>
            <strong>{item.status === "cancelled" ? t.cancelled : item.status === "partially_cancelled" ? t.partial : t.delayed}{item.delayMinutes != null && item.delayMinutes >= 10 && item.status !== "cancelled" ? ` · ${item.status === "partially_cancelled" ? `${t.delayed} ` : ""}${item.delayMinutes} ${t.minutes}` : ""}</strong>
            {item.affectedStops.some(stop => stop.name?.trim() || stop.crs?.trim()) ? <p>{t.stops}: {item.affectedStops.map(stop => stop.name?.trim() || stop.crs?.trim()).filter(Boolean).join(", ")}</p> : item.status === "partially_cancelled" && <p>{t.stopsUnknown}</p>}
            <p>{direction === "departures" ? t.destination : t.origin}: {item.locations?.map(location => location.name).filter(Boolean).join(", ") || t.unknownTime}</p>
            <p>{t.scheduled}: {item.scheduledTime || t.unknownTime} · {t.estimated}: {item.estimatedTime || t.unknownTime}{item.platform ? ` · ${t.platform}: ${item.platform}` : ""}</p>
            {item.operator && <p>{item.operator}</p>}{item.reason && <p>{item.reason}</p>}
            {item.checkDelayRepay && <p><a href="https://www.nationalrail.co.uk/help-and-assistance/compensation-and-refunds/">{t.repay}</a>. {t.repayInfo}</p>}
          </li>)}</ul>
        </>}
      </div>
      <p><a href="https://www.nationalrail.co.uk/">{t.source}</a></p>
      <p><a href="https://github.com/davwheat/uk-railway-stations">{t.directory}</a> <a href="https://github.com/trainline-eu/stations#licence">Sources</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a> · <a href="/rail/NOTICE.txt">Station data notice</a></p>
    </article>
  </section>;
}
