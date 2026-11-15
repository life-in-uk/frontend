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
 * Rail is not released publicly: the RDM Schedule 2 policies, commercial
 * Departure use and quota still need review. Local development shows the Rail
 * tool by default (the backend's RAIL_ACCESS_ENABLED guard and rate limits
 * still apply). Vite replaces `import.meta.env.DEV` with `false` in
 * production builds, so they never include the Rail tool and always show the
 * "not yet available" notice instead.
 */
export function railToolEnabled(): boolean {
  return import.meta.env.DEV;
}
