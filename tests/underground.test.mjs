import test from "node:test";
import assert from "node:assert/strict";
import {
  getUnderground,
  isUndergroundResponse,
  formatUndergroundObservation,
} from "../src/underground/api.ts";

// Authored test facts only; never imported by the application.
const fixture = () => ({
  observedAt: "2026-10-03T15:47:08.441419123Z",
  lines: [
    {
      lineId: "central",
      lineName: "  Central — 地铁  ",
      statuses: [
        { severity: 10, description: " Status A! ", reason: null },
        {
          severity: -2,
          description: "Status B — “notice”",
          reason: "  Reason: café / 雨。\nSecond line.  ",
        },
        { severity: 10, description: " Status A! ", reason: "" },
      ],
    },
    { lineId: "bakerloo", lineName: "Bakerloo", statuses: [] },
  ],
});

test("accepts every source fact including repeats, backend ordering, wording and reason presence", async (t) => {
  const data = fixture();
  const before = structuredClone(data);
  assert.equal(isUndergroundResponse(data), true);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(data)),
  );
  const accepted = await getUnderground();
  assert.deepEqual(accepted, before);
  assert.deepEqual(
    accepted.lines.map((line) => line.lineId),
    ["central", "bakerloo"],
  );
  assert.deepEqual(
    accepted.lines[0].statuses.map((status) => status.description),
    [" Status A! ", "Status B — “notice”", " Status A! "],
  );
  assert.deepEqual(
    accepted.lines[0].statuses.map((status) => status.severity),
    [10, -2, 10],
  );
  assert.deepEqual(
    accepted.lines[0].statuses.map((status) => status.reason),
    [null, "  Reason: café / 雨。\nSecond line.  ", ""],
  );
  assert.deepEqual(data, before);
});

test("rejects malformed fields anywhere rather than accepting a partially valid observation", () => {
  for (const value of [
    null,
    [],
    {},
    { observedAt: fixture().observedAt, lines: null },
  ])
    assert.equal(isUndergroundResponse(value), false);
  const mutations = [
    (d) => {
      d.observedAt = null;
    },
    (d) => {
      d.observedAt = "not a timestamp";
    },
    (d) => {
      d.observedAt = "2026-02-30T15:47:08Z";
    },
    (d) => {
      d.observedAt = "2026-10-03";
    },
    (d) => {
      d.observedAt = "2026-10-03T25:00:00Z";
    },
    (d) => {
      d.lines[1].lineId = 42;
    },
    (d) => {
      d.lines[1].lineName = null;
    },
    (d) => {
      d.lines[1].lineName = " ";
    },
    (d) => {
      d.lines[1].statuses = {};
    },
    (d) => {
      d.lines[0].statuses[2].severity = "10";
    },
    (d) => {
      d.lines[0].statuses[2].severity = 1.5;
    },
    (d) => {
      d.lines[0].statuses[2].description = null;
    },
    (d) => {
      d.lines[0].statuses[2].description = "";
    },
    (d) => {
      d.lines[0].statuses[2].reason = false;
    },
    (d) => {
      delete d.lines[0].statuses[2].reason;
    },
    (d) => {
      d.lines[0].statuses.push(null);
    },
    (d) => {
      d.lines.push(null);
    },
  ];
  for (const mutate of mutations) {
    const data = fixture();
    mutate(data);
    assert.equal(isUndergroundResponse(data), false);
  }
});

test("severity follows signed Java int contract without guessed thresholds or coercion", () => {
  for (const severity of [-2147483648, -1, 0, 10, 2147483647]) {
    const data = fixture();
    data.lines[0].statuses[0].severity = severity;
    assert.equal(isUndergroundResponse(data), true);
  }
  for (const severity of [-2147483649, 2147483648, Infinity, NaN, null]) {
    const data = fixture();
    data.lines[0].statuses[0].severity = severity;
    assert.equal(isUndergroundResponse(data), false);
  }
});

test("a persisted empty snapshot is valid and retains its observation timestamp", async (t) => {
  const data = { observedAt: fixture().observedAt, lines: [] };
  assert.equal(isUndergroundResponse(data), true);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(data)),
  );
  assert.deepEqual(await getUnderground(), data);
});

test("requests only the relative backend path and forwards cancellation", async (t) => {
  const signal = new AbortController().signal;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push(url);
    assert.equal(options.signal, signal);
    return new Response(JSON.stringify(fixture()));
  });
  await getUnderground(signal);
  assert.deepEqual(requests, ["/api/travel/underground"]);
});

test("404/500/other non-success responses fail without source fallback or backend diagnostics", async (t) => {
  for (const status of [404, 500, 503]) {
    const mock = t.mock.method(
      globalThis,
      "fetch",
      async () => new Response("private diagnostics", { status }),
    );
    await assert.rejects(getUnderground(), {
      message: "Underground unavailable",
    });
    mock.mock.restore();
  }
});

test("network and abort failures reject without substituting facts", async (t) => {
  for (const error of [
    new TypeError("network error"),
    new DOMException("Aborted", "AbortError"),
  ]) {
    const mock = t.mock.method(globalThis, "fetch", async () => {
      throw error;
    });
    await assert.rejects(getUnderground());
    mock.mock.restore();
  }
});

test("invalid JSON and malformed DTO are rejected at the fetch boundary", async (t) => {
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("{"),
  );
  await assert.rejects(getUnderground());
  mock.mock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ ...fixture(), observedAt: "invalid" })),
  );
  await assert.rejects(getUnderground(), {
    message: "Invalid Underground response",
  });
});

test("formats the instant in Europe/London in summer and winter; preserves nanosecond source string", () => {
  const observedAt = fixture().observedAt;
  assert.equal(
    formatUndergroundObservation(observedAt),
    "3 October 2026 at 16:47",
  );
  assert.equal(
    formatUndergroundObservation("2026-12-03T15:47:08Z"),
    "3 December 2026 at 15:47",
  );
  assert.equal(observedAt, "2026-10-03T15:47:08.441419123Z");
});
