// The first-party travel tools opened from the homepage transport panel.

export type TravelToolId = "underground" | "roads" | "rail";

export type TravelTool = {
  id: TravelToolId;
  /** Tab and homepage label. */
  name: string;
  /** Provider name, shown in English. */
  operator: string;
  /** One line describing the tool (not a status). */
  description: string;
};

/** Dialog tab order. */
export const TRAVEL_TOOLS: readonly TravelTool[] = [
  {
    id: "underground",
    name: "伦敦地铁",
    operator: "TfL",
    description: "线路运行状态",
  },
  {
    id: "roads",
    name: "道路",
    operator: "National Highways",
    description: "按地点查附近道路异常",
  },
  {
    id: "rail",
    name: "铁路",
    operator: "National Rail",
    description: "车站延误查询",
  },
];

/**
 * Rail is released (owner decision, 2026-11-18). Production builds include
 * the Rail tool unless built with VITE_RAIL_TOOL=off, which compiles it out
 * and shows the "not yet available" notice instead. Whether boards are served
 * is decided at runtime by the backend (RAIL_ACCESS_ENABLED, per-viewer and
 * per-instance limits): while Rail is off there, the tool says so and links
 * to National Rail.
 */
export function railToolEnabled(): boolean {
  return import.meta.env.VITE_RAIL_TOOL !== "off";
}
