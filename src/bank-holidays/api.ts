export type BankHolidayDivision =
  "england-and-wales" | "scotland" | "northern-ireland";

export type BankHolidayEvent = {
  title: string;
  date: string;
  notes: string;
  bunting: boolean;
};

export type BankHolidaysResponse = {
  evidence: { artifactId: string; observedAt: string };
  divisions: { division: BankHolidayDivision; events: BankHolidayEvent[] }[];
};

const divisions: BankHolidayDivision[] = [
  "england-and-wales",
  "scotland",
  "northern-ireland",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Calendar dates stay as strings: never parse a holiday with new Date(date).
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
  );
}

function isEvent(value: unknown): value is BankHolidayEvent {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    isCalendarDate(value.date) &&
    typeof value.notes === "string" &&
    typeof value.bunting === "boolean"
  );
}

export function isBankHolidaysResponse(
  value: unknown,
): value is BankHolidaysResponse {
  if (!isRecord(value) || !isRecord(value.evidence)) return false;
  const { artifactId, observedAt } = value.evidence;
  if (
    typeof artifactId !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      artifactId,
    ) ||
    typeof observedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(
      observedAt,
    ) ||
    !isCalendarDate(observedAt.slice(0, 10)) ||
    !Number.isFinite(Date.parse(observedAt))
  )
    return false;
  if (
    !Array.isArray(value.divisions) ||
    value.divisions.length !== divisions.length
  )
    return false;
  const seen = new Set<string>();
  for (const group of value.divisions) {
    if (
      !isRecord(group) ||
      !divisions.some((division) => division === group.division) ||
      typeof group.division !== "string" ||
      seen.has(group.division) ||
      !Array.isArray(group.events) ||
      !group.events.every(isEvent)
    )
      return false;
    seen.add(group.division);
  }
  return true;
}

export async function getBankHolidays(
  signal?: AbortSignal,
): Promise<BankHolidaysResponse> {
  const response = await fetch("/api/bank-holidays", { signal });
  if (!response.ok) throw new Error("Bank Holidays unavailable");
  const data: unknown = await response.json();
  if (!isBankHolidaysResponse(data))
    throw new Error("Invalid Bank Holidays response");
  return data;
}

export function londonCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((value) => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Include today's holiday. For equal dates, retain the upstream ordering.
export function nextEnglandAndWalesHoliday(
  data: BankHolidaysResponse,
  today: string,
): BankHolidayEvent | undefined {
  if (!isCalendarDate(today)) throw new Error("Invalid selection date");
  const events =
    data.divisions.find((group) => group.division === "england-and-wales")
      ?.events ?? [];
  return events.reduce<BankHolidayEvent | undefined>(
    (next, event) =>
      event.date >= today && (!next || event.date < next.date) ? event : next,
    undefined,
  );
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatHolidayDate(date: string): string {
  if (!isCalendarDate(date)) throw new Error("Invalid holiday date");
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

export function formatObservationTime(observedAt: string): string {
  // Evidence observation is an instant, unlike the holiday's calendar date.
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(observedAt));
}
