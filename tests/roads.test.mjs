import test from "node:test";
import assert from "node:assert/strict";
import {
  getRoads,
  isRoadsResponse,
  roadsUrl,
  RoadsUnavailableError,
} from "../src/roads/api.ts";
import {
  describeDisruption,
  formatDistance,
  formatRoadsTime,
  humaniseCode,
} from "../src/roads/presentation.ts";

// Authored test facts in the backend #30 shape; never imported by the application.
const disruption = (overrides = {}) => ({
  situationId: "signs/M1-S2996A",
  recordId: "record-1",
  recordVersion: "1",
  descriptions: ["laneClosures"],
  type: { value: "laneClosures", extendedValue: null },
  cause: {
    type: "roadOrCarriagewayOrLaneManagement",
    managementType: { value: "laneClosures", extendedValue: null },
  },
  status: "active",
  startTime: "2026-10-04T11:56:19.190Z",
  endTime: "2026-10-04T12:11:19.190Z",
  distanceMeters: 0,
  locations: [
    {
      description: "M1 northbound within J15",
      roads: [
        { name: "M1", direction: "northBound", relativeDirection: "aligned" },
      ],
      coordinates: [{ latitude: 52.193516, longitude: -0.90838 }],
    },
  ],
  ...overrides,
});
const fixture = () => ({
  snapshotAt: "2026-10-04T12:37:37.802125Z",
  relevanceRadiusMeters: 15000.0,
  disruptions: [
    disruption(),
    disruption({
      situationId: "s-2",
      recordId: "record-2",
      recordVersion: null,
      descriptions: [],
      type: null,
      cause: null,
      status: null,
      startTime: null,
      endTime: null,
      distanceMeters: 1276.380340910437,
      locations: [
        {
          description: null,
          roads: [{ name: null, direction: null, relativeDirection: null }],
          coordinates: [],
        },
      ],
    }),
  ],
});
const respond = (t, body, init) =>
  t.mock.method(globalThis, "fetch", async () =>
    typeof body === "string"
      ? new Response(body, init)
      : new Response(JSON.stringify(body), init),
  );

test("accepts the backend contract, including null optional values, unchanged and in order", async (t) => {
  const data = fixture();
  const before = structuredClone(data);
  const fetch = respond(t, data);
  const accepted = await getRoads(52.193516, -0.90838);
  assert.deepEqual(accepted, before);
  assert.deepEqual(
    accepted.disruptions.map((d) => d.recordId),
    ["record-1", "record-2"],
  );
  assert.equal(fetch.mock.callCount(), 1);
});

test("builds only the relative Roads URL with the exact supplied coordinates", async (t) => {
  assert.equal(
    roadsUrl(51.501009, -0.141588),
    "/api/travel/roads?lat=51.501009&lon=-0.141588",
  );
  const fetch = respond(t, fixture());
  const controller = new AbortController();
  await getRoads(51.501009, -0.141588, controller.signal);
  const [url, init] = fetch.mock.calls[0].arguments;
  assert.equal(url, "/api/travel/roads?lat=51.501009&lon=-0.141588");
  assert.equal(init.signal, controller.signal);
});

test("rejects malformed payloads anywhere rather than accepting partially trusted data", () => {
  const broken = [
    null,
    [],
    {},
    { ...fixture(), snapshotAt: "2026-10-04 12:37:37" },
    { ...fixture(), snapshotAt: "2026-02-30T12:00:00Z" },
    { ...fixture(), relevanceRadiusMeters: "15000" },
    { ...fixture(), relevanceRadiusMeters: 0 },
    { ...fixture(), disruptions: null },
    { ...fixture(), disruptions: [disruption({ situationId: "" })] },
    { ...fixture(), disruptions: [disruption({ recordId: 7 })] },
    { ...fixture(), disruptions: [disruption({ descriptions: [null] })] },
    { ...fixture(), disruptions: [disruption({ type: { value: "" } })] },
    { ...fixture(), disruptions: [disruption({ status: 3 })] },
    { ...fixture(), disruptions: [disruption({ endTime: "tomorrow" })] },
    { ...fixture(), disruptions: [disruption({ distanceMeters: -1 })] },
    { ...fixture(), disruptions: [disruption({ distanceMeters: "0" })] },
    { ...fixture(), disruptions: [disruption({ locations: [{}] })] },
    {
      ...fixture(),
      disruptions: [
        disruption({
          locations: [
            {
              description: null,
              roads: [],
              coordinates: [{ latitude: 91, longitude: 0 }],
            },
          ],
        }),
      ],
    },
    // A missing field is not the same as the backend's explicit null.
    (() => {
      const value = fixture();
      delete value.disruptions[0].endTime;
      return value;
    })(),
  ];
  for (const value of broken)
    assert.equal(isRoadsResponse(value), false, JSON.stringify(value));
});

test("404 is a distinct unavailable state; other failures reject without fallback facts", async (t) => {
  respond(t, { code: "ROADS_UNAVAILABLE", message: "x" }, { status: 404 });
  await assert.rejects(getRoads(52, -1), RoadsUnavailableError);
  t.mock.restoreAll();
  for (const status of [400, 500, 503]) {
    respond(t, { code: "ROADS_READ_FAILED" }, { status });
    await assert.rejects(getRoads(52, -1), (error) => {
      assert.equal(error instanceof RoadsUnavailableError, false);
      return true;
    });
    t.mock.restoreAll();
  }
  respond(t, "{", { headers: { "Content-Type": "application/json" } });
  await assert.rejects(getRoads(52, -1));
  t.mock.restoreAll();
  respond(t, { ...fixture(), disruptions: [{}] });
  await assert.rejects(getRoads(52, -1), /Invalid Roads response/);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("network down");
  });
  await assert.rejects(getRoads(52, -1), TypeError);
});

test("aborting the signal rejects the request", async (t) => {
  t.mock.method(globalThis, "fetch", (_url, { signal }) => {
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason)),
    );
  });
  const controller = new AbortController();
  const pending = getRoads(52, -1, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("distance is straight-line proximity in readable miles", () => {
  assert.equal(formatDistance(0), "Under 0.1 miles");
  assert.equal(formatDistance(160), "Under 0.1 miles");
  assert.equal(formatDistance(161), "0.1 miles");
  assert.equal(formatDistance(1276.380340910437), "0.8 miles");
  assert.equal(formatDistance(1609.344), "1.0 mile");
  assert.equal(formatDistance(15000), "9.3 miles");
  assert.equal(formatDistance(16_050), "10 miles");
  assert.equal(formatDistance(24_140.16), "15 miles");
});

test("provider times are shown in Europe/London in summer and winter", () => {
  assert.equal(
    formatRoadsTime("2026-10-04T12:11:19.190Z"),
    "4 October 2026 at 13:11",
  );
  assert.equal(
    formatRoadsTime("2026-12-04T12:11:19.190Z"),
    "4 December 2026 at 12:11",
  );
});

test("provider codes become plain words without changing them", () => {
  assert.equal(humaniseCode("laneClosures"), "Lane closures");
  assert.equal(humaniseCode("northBound"), "Northbound");
  assert.equal(humaniseCode("southBound"), "Southbound");
  assert.equal(humaniseCode("suspended"), "Suspended");
  assert.equal(
    humaniseCode("roadOrCarriagewayOrLaneManagement"),
    "Road or carriageway or lane management",
  );
  // Ordinary text is left exactly as supplied.
  assert.equal(humaniseCode("Lane 1 closed"), "Lane 1 closed");
  assert.equal(humaniseCode("M1 J15"), "M1 J15");
});

test("selects the useful facts; nulls stay absent rather than invented", () => {
  const view = describeDisruption(
    disruption({
      descriptions: [
        "laneClosures",
        "Recovery in progress",
        "Recovery in progress",
      ],
      locations: [
        {
          description: "M1 northbound between J14 and J15",
          roads: [
            { name: "M1", direction: "northBound", relativeDirection: null },
          ],
          coordinates: [],
        },
        {
          description: "M1 northbound between J14 and J15",
          roads: [
            { name: "M1", direction: "northBound", relativeDirection: null },
          ],
          coordinates: [],
        },
      ],
    }),
  );
  assert.deepEqual(view, {
    roads: ["M1"],
    directions: ["Northbound"],
    locations: ["M1 northbound between J14 and J15"],
    kind: "Lane closures",
    // The bare "laneClosures" code repeats the kind and is not shown again.
    comments: ["Recovery in progress"],
    status: "Active",
    endTime: "2026-10-04T12:11:19.190Z",
    distance: "Under 0.1 miles",
  });
  assert.deepEqual(describeDisruption(fixture().disruptions[1]), {
    roads: [],
    directions: [],
    locations: [],
    kind: null,
    comments: [],
    status: null,
    endTime: null,
    distance: "0.8 miles",
  });
  // Cause management type stands in only when the type is absent.
  assert.equal(
    describeDisruption(disruption({ type: null })).kind,
    "Lane closures",
  );
});
