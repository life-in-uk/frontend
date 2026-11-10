import { useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BusFront,
  Route,
  TrainFront,
  TrainFrontTunnel,
} from "lucide-react";
import { TravelDialog } from "../travel/TravelDialog";
import { railPreviewEnabled, TRAVEL_TOOLS } from "../../travel/tools";
import type { TravelToolId } from "../../travel/tools";

// Homepage order of the approved design.
const HOME_ORDER: readonly TravelToolId[] = ["underground", "rail", "roads"];

const ICONS: Record<TravelToolId, ReactNode> = {
  underground: <TrainFrontTunnel size={26} aria-hidden="true" />,
  rail: <TrainFront size={26} aria-hidden="true" />,
  roads: <Route size={26} aria-hidden="true" />,
};

/**
 * Compact homepage entry to the first-party travel tools. It shows no
 * service data itself and makes no requests: each entry opens the travel
 * dialog, which loads its tool only when shown.
 */
export function TransportSummary() {
  const [tool, setTool] = useState<TravelToolId | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  function openTool(id: TravelToolId, button: HTMLButtonElement) {
    trigger.current = button;
    setTool(id);
  }
  function close() {
    setTool(null);
    // Return focus to the entry that opened the dialog.
    const button = trigger.current;
    window.requestAnimationFrame(() => button?.focus());
  }

  return (
    <section
      className="home-panel transport-panel"
      aria-labelledby="transport-title"
    >
      <div className="home-panel-head">
        <BusFront size={24} aria-hidden="true" />
        <h2 id="transport-title">交通出行信息</h2>
      </div>
      <ul className="transport-list">
        {HOME_ORDER.map((id) => {
          const mode = TRAVEL_TOOLS.find((item) => item.id === id)!;
          const unavailable = id === "rail" && !railPreviewEnabled();
          return (
            <li key={id}>
              <button
                type="button"
                className="transport-item"
                aria-haspopup="dialog"
                data-tool={id}
                onClick={(event) => openTool(id, event.currentTarget)}
              >
                <span className="transport-icon">{ICONS[id]}</span>
                <span className="transport-text">
                  <span className="transport-name">
                    {mode.name} <span lang="en">{mode.operator}</span>
                  </span>
                  <span className="transport-status">
                    {unavailable ? "暂未开放" : mode.description}
                  </span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="home-panel-meta">
        点击打开查询工具。数据过期或无法获取时不显示运行状态，并提供运营方官方信息链接。
      </p>
      <TravelDialog tool={tool} onSelect={setTool} onClose={close} />
    </section>
  );
}
