import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BusFront,
  Route,
  TrainFront,
  TrainFrontTunnel,
} from "lucide-react";

type TransportMode = {
  id: string;
  name: string;
  operator: string;
  icon: ReactNode;
  officialLabel: string;
  href: string;
};

// No service data is shown here. Stored transport snapshots are not current
// and Rail data is pending provider approval, so each mode states that live
// status is not yet available and links to the operator's official page.
const MODES: readonly TransportMode[] = [
  {
    id: "underground",
    name: "伦敦地铁",
    operator: "TfL",
    icon: <TrainFrontTunnel size={26} aria-hidden="true" />,
    officialLabel: "TfL 官方运行状态",
    href: "https://tfl.gov.uk/tube-dlr-overground/status/",
  },
  {
    id: "rail",
    name: "铁路",
    operator: "National Rail",
    icon: <TrainFront size={26} aria-hidden="true" />,
    officialLabel: "National Rail 官方运行信息",
    href: "https://www.nationalrail.co.uk/status-and-disruptions/",
  },
  {
    id: "roads",
    name: "道路",
    operator: "National Highways",
    icon: <Route size={26} aria-hidden="true" />,
    officialLabel: "National Highways 官方路况",
    href: "https://nationalhighways.co.uk/travel-updates/",
  },
];

export function TransportSummary() {
  return (
    <section className="home-panel transport-panel" aria-labelledby="transport-title">
      <div className="home-panel-head">
        <BusFront size={24} aria-hidden="true" />
        <h2 id="transport-title">交通出行信息</h2>
      </div>
      <ul className="transport-list">
        {MODES.map((mode) => (
          <li key={mode.id}>
            <a href={mode.href} className="transport-item">
              <span className="transport-icon">{mode.icon}</span>
              <span className="transport-text">
                <span className="transport-name">
                  {mode.name} <span lang="en">{mode.operator}</span>
                </span>
                <span className="transport-status">实时状态暂未接入</span>
                <span className="sr-only">
                  ，查看{mode.officialLabel}（外部网站）
                </span>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <p className="home-panel-meta">
        接入并核对实时数据之前，这里不显示任何运行状态。点击可前往运营方官方页面，出行前请以官方信息为准。
      </p>
    </section>
  );
}
