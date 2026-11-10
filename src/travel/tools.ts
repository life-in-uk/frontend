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
 * Rail is not released: its data licence, augmentation conditions,
 * credentials and rate limiting still need review. Production builds never
 * include the Rail tool. In development it can be previewed with
 * `?rail-preview`; Vite replaces `import.meta.env.DEV` with `false` in
 * production, so this is always false there.
 */
export function railPreviewEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("rail-preview")
  );
}
