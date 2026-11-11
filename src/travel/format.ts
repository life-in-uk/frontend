// Chinese display helpers for travel tools. Times are shown in UK time.

const METRES_PER_MILE = 1609.344;

/** An instant in UK time, e.g. "2026年10月3日 16:47". */
export function formatUkDateTimeZh(instant: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}年${Number(part("month"))}月${Number(part("day"))}日 ${part("hour")}:${part("minute")}`;
}

/**
 * Straight-line distance in miles, as on UK road signs, with the same
 * rounding as the English formatter: under 0.1, one decimal under 10, else whole.
 */
export function formatDistanceZh(distanceMeters: number): string {
  const miles = distanceMeters / METRES_PER_MILE;
  if (miles < 0.1) return "不到 0.1 英里";
  const tenths = Math.round(miles * 10) / 10;
  if (tenths < 10) return `${tenths.toFixed(1)} 英里`;
  return `${Math.round(miles)} 英里`;
}
