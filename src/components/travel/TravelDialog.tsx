import { lazy, Suspense, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { ArrowUpRight, TrainFront, X } from "lucide-react";
import { railPreviewEnabled, TRAVEL_TOOLS } from "../../travel/tools";
import type { TravelToolId } from "../../travel/tools";
import "./TravelDialog.css";

// Each tool is loaded only when its tab is first shown.
const UndergroundCard = lazy(() =>
  import("../UndergroundCard").then((m) => ({ default: m.UndergroundCard })),
);
const RoadsCard = lazy(() =>
  import("../RoadsCard").then((m) => ({ default: m.RoadsCard })),
);
// Production builds never contain the Rail tool (see railPreviewEnabled).
const RailCard = import.meta.env.DEV
  ? lazy(() => import("../RailCard").then((m) => ({ default: m.RailCard })))
  : null;

type TravelDialogProps = {
  /** The tool to show, or null when the dialog is closed. */
  tool: TravelToolId | null;
  onSelect: (tool: TravelToolId) => void;
  onClose: () => void;
};

/**
 * One accessible modal for the first-party travel tools: native <dialog>
 * (inert background, Esc to close) with WAI-ARIA tabs. Tool content mounts
 * only while the dialog is open, so closing aborts any pending request.
 */
export function TravelDialog({ tool, onSelect, onClose }: TravelDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<Partial<Record<TravelToolId, HTMLButtonElement | null>>>(
    {},
  );
  const [visited, setVisited] = useState<ReadonlySet<TravelToolId>>(new Set());
  const id = useId();
  const open = tool !== null;

  // Tabs already shown stay mounted (keeping a Roads search) until close.
  if (tool && !visited.has(tool)) setVisited(new Set(visited).add(tool));
  if (!tool && visited.size > 0) setVisited(new Set());

  // Show/close the native modal and lock page scrolling synchronously on
  // commit, so the page state never lags behind the dialog.
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    if (!element.open) element.showModal();
    const root = document.documentElement;
    root.classList.add("travel-dialog-open");
    return () => {
      root.classList.remove("travel-dialog-open");
      if (element.open) element.close();
    };
  }, [open]);

  useLayoutEffect(() => {
    if (tool) tabs.current[tool]?.focus();
  }, [tool]);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!tool) return;
    const index = TRAVEL_TOOLS.findIndex((t) => t.id === tool);
    const last = TRAVEL_TOOLS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    onSelect(TRAVEL_TOOLS[next].id);
  }

  // A click on the backdrop lands on the <dialog> element itself.
  function onBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialog.current) onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="travel-dialog"
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={onBackdrop}
    >
      {open && (
        <div className="travel-dialog-frame">
          <div className="travel-dialog-head">
            <h2 id={`${id}-title`}>交通出行</h2>
            <button
              type="button"
              className="travel-dialog-close"
              onClick={onClose}
              aria-label="关闭交通出行"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="travel-tabs" role="tablist" aria-label="出行工具">
            {TRAVEL_TOOLS.map((item) => (
              <button
                key={item.id}
                ref={(element) => {
                  tabs.current[item.id] = element;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${item.id}`}
                aria-selected={tool === item.id}
                aria-controls={`${id}-panel-${item.id}`}
                tabIndex={tool === item.id ? 0 : -1}
                className="travel-tab"
                onClick={() => onSelect(item.id)}
                onKeyDown={onTabKey}
              >
                {item.name}
                {item.id === "rail" && !railPreviewEnabled() && (
                  <span className="travel-tab-badge">暂未开放</span>
                )}
              </button>
            ))}
          </div>
          <div className="travel-dialog-body">
            {TRAVEL_TOOLS.map((item) =>
              visited.has(item.id) ? (
                <div
                  key={item.id}
                  role="tabpanel"
                  id={`${id}-panel-${item.id}`}
                  aria-labelledby={`${id}-tab-${item.id}`}
                  hidden={tool !== item.id}
                  className="travel-panel"
                  data-tool={item.id}
                >
                  <Suspense
                    fallback={
                      <p className="travel-loading" role="status">
                        正在打开{item.name}工具…
                      </p>
                    }
                  >
                    {toolContent(item.id, tool === item.id)}
                  </Suspense>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

function toolContent(tool: TravelToolId, active: boolean): ReactNode {
  if (tool === "underground") return <UndergroundCard active={active} />;
  if (tool === "roads") return <RoadsCard />;
  if (RailCard && railPreviewEnabled()) return <RailCard />;
  return <RailUnavailable />;
}

/** Production Rail panel: clearly not available, with the official fallback. */
function RailUnavailable() {
  return (
    <section
      className="information-card travel-rail-unavailable"
      aria-labelledby="rail-unavailable-title"
    >
      <span className="category">
        <TrainFront size={18} aria-hidden="true" />
        出行
      </span>
      <h2 id="rail-unavailable-title">
        铁路延误查询 <span className="travel-tab-badge">暂未开放</span>
      </h2>
      <p>
        我们的铁路查询工具还在完成数据授权和使用条件的审核，审核完成前不提供查询，也不显示任何列车信息。
      </p>
      <p>
        出行前请查看{" "}
        <a href="https://www.nationalrail.co.uk/status-and-disruptions/">
          <span lang="en">National Rail</span> 官方延误信息
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        ，或联系你的列车运营商。
      </p>
    </section>
  );
}
