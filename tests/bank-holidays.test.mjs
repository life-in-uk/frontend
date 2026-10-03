import test from "node:test";
import assert from "node:assert/strict";
import {
  isCalendarDate,
  isBankHolidaysResponse,
  getBankHolidays,
  nextEnglandAndWalesHoliday,
  londonCalendarDate,
  formatHolidayDate,
  formatObservationTime,
} from "../src/bank-holidays/api.ts";

const event = (date, title = "Christmas Day") => ({
  title,
  date,
  notes: "",
  bunting: true,
});
const response = (events = [event("2026-12-25")]) => ({
  evidence: {
    artifactId: "12345678-1234-1234-1234-123456789abc",
    observedAt: "2026-10-03T12:11:04.878793Z",
  },
  divisions: [
    { division: "scotland", events: [event("2026-11-30", "St Andrew’s Day")] },
    { division: "england-and-wales", events },
    {
      division: "northern-ireland",
      events: [event("2026-10-04", "Other-region fixture")],
    },
  ],
});

test("accepts the DTO, preserves provenance, empty events/notes and source facts", () => {
  const data = response([event("2026-12-25", " Christmas Day ")]);
  assert.equal(isBankHolidaysResponse(data), true);
  assert.equal(data.divisions[1].events[0].title, " Christmas Day ");
  assert.equal(isBankHolidaysResponse(response([])), true);
  assert.equal(data.evidence.observedAt, "2026-10-03T12:11:04.878793Z");
});

test("rejects malformed, missing, duplicate and unknown divisions", () => {
  for (const value of [
    null,
    [],
    {},
    { evidence: {} },
    { ...response(), divisions: [] },
  ]) {
    assert.equal(isBankHolidaysResponse(value), false);
  }
  for (const division of ["england-and-wales", "unknown", null]) {
    const data = response();
    data.divisions[0].division = division;
    assert.equal(isBankHolidaysResponse(data), false);
  }
});

test("rejects invalid evidence identity and observation timestamps", () => {
  for (const evidence of [
    null,
    {},
    { artifactId: "invalid", observedAt: "2026-10-03T12:11:04Z" },
    { ...response().evidence, observedAt: "2026-02-30T12:11:04Z" },
    { ...response().evidence, observedAt: "2026-10-03" },
    { ...response().evidence, observedAt: "2026-10-03T25:00:00Z" },
    { ...response().evidence, observedAt: "not a date" },
  ])
    assert.equal(isBankHolidaysResponse({ ...response(), evidence }), false);
});

test("validates every event in every region, without coercion", () => {
  for (const invalid of [
    null,
    {},
    { ...event("2026-12-25"), title: " " },
    { ...event("2026-12-25"), date: "2026-02-30" },
    { ...event("2026-12-25"), notes: null },
    { ...event("2026-12-25"), bunting: "true" },
  ]) {
    const data = response();
    data.divisions[0].events = [invalid];
    assert.equal(isBankHolidaysResponse(data), false);
  }
});

test("validates calendar dates including leap centuries", () => {
  for (const date of ["2026-12-25", "2024-02-29", "2000-02-29"])
    assert.equal(isCalendarDate(date), true);
  for (const date of [
    "2026-02-29",
    "1900-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "0000-01-01",
    "2026-1-01",
    "2026-12-25T00:00:00Z",
    null,
  ]) {
    assert.equal(isCalendarDate(date), false);
  }
});

test("deliberately selects England and Wales, ignores earlier other-region holidays", () => {
  assert.equal(
    nextEnglandAndWalesHoliday(response(), "2026-10-03").title,
    "Christmas Day",
  );
  assert.equal(
    nextEnglandAndWalesHoliday(response([]), "2026-10-03"),
    undefined,
  );
});

test("selects earliest on/after today independent of ordering, retaining equal-date source order", () => {
  const events = [
    event("2027-01-01", "Later"),
    event("2026-12-25", "First"),
    event("2026-01-01", "Past"),
    event("2026-12-25", "Tie"),
  ];
  const before = structuredClone(events);
  const data = response(events);
  assert.equal(nextEnglandAndWalesHoliday(data, "2026-12-25").title, "First");
  assert.equal(nextEnglandAndWalesHoliday(data, "2026-12-26").title, "Later");
  assert.equal(nextEnglandAndWalesHoliday(data, "2027-01-02"), undefined);
  assert.deepEqual(events, before);
  assert.throws(() => nextEnglandAndWalesHoliday(data, "not a date"));
});

test("formats factual dates identically across timezones without Date parsing", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of [
      "UTC",
      "America/Los_Angeles",
      "Pacific/Kiritimati",
      "Europe/London",
    ]) {
      process.env.TZ = zone;
      assert.equal(formatHolidayDate("2026-12-25"), "25 December 2026");
      assert.equal(formatHolidayDate("2024-02-29"), "29 February 2024");
    }
    assert.throws(() => formatHolidayDate("2026-02-30"));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("today uses UK calendar date, including BST midnight and winter", () => {
  assert.equal(
    londonCalendarDate(new Date("2026-10-02T23:30:00Z")),
    "2026-10-03",
  );
  assert.equal(
    londonCalendarDate(new Date("2026-12-24T23:30:00Z")),
    "2026-12-24",
  );
  assert.equal(
    londonCalendarDate(new Date("2026-12-25T00:00:00Z")),
    "2026-12-25",
  );
  assert.match(formatObservationTime("2026-10-03T12:11:04.878793Z"), /13:11/);
});

test("fetches only the relative Life in UK endpoint, forwards cancellation and validates JSON", async (t) => {
  const data = response();
  const signal = new AbortController().signal;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/bank-holidays");
    assert.equal(options.signal, signal);
    return new Response(JSON.stringify(data));
  });
  assert.deepEqual(await getBankHolidays(signal), data);
});

for (const status of [404, 500, 503]) {
  test(`HTTP ${status} fails closed without leaking backend diagnostics`, async (t) => {
    t.mock.method(
      globalThis,
      "fetch",
      async () => new Response("internal diagnostics", { status }),
    );
    await assert.rejects(getBankHolidays(), {
      message: "Bank Holidays unavailable",
    });
  });
}

test("network failure rejects instead of substituting fixture facts", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("offline");
  });
  await assert.rejects(getBankHolidays());
});

test("malformed JSON and invalid DTO fail closed", async (t) => {
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("{"),
  );
  await assert.rejects(getBankHolidays());
  mock.mock.mockImplementation(
    async () => new Response(JSON.stringify({ divisions: [] })),
  );
  await assert.rejects(getBankHolidays(), {
    message: "Invalid Bank Holidays response",
  });
});
