import test from "node:test";
import assert from "node:assert/strict";
import { getDisruptions } from "../src/rail/api.ts";

test("loads disruptions using the backend only", async (t) => {
  const board = { stationName: "Sheffield", crs: "SHF", generatedAt: null, direction: "arrivals", unknownTimingCount: 0, disruptions: [] };
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "/api/rail/stations/SHF/disruptions?direction=arrivals");
    return new Response(JSON.stringify(board));
  });
  assert.deepEqual(await getDisruptions("SHF", "arrivals", new AbortController().signal), board);
});
test("distinguishes unavailable or malformed responses from an empty board", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("private upstream error", { status: 502 }));
  await assert.rejects(getDisruptions("SHF", "departures", new AbortController().signal), /Rail data unavailable/);
});

test("station directory contains the National Rail CRS stations and handles quoted names", async () => {
  const { readFile } = await import("node:fs/promises");
  const { parseStations } = await import("../src/rail/stations.ts");
  const data = await readFile(new URL("../public/rail/stations.csv", import.meta.url), "utf8");
  const stations = parseStations(data);
  assert.ok(stations.length > 2500);
  assert.ok(stations.some(station => station.name === "Sheffield" && station.crs === "SHF"));
  assert.deepEqual(parseStations('stationName,lat,long,crsCode\n"Station, Town",0,0,ABC\n'), [{ name: "Station, Town", crs: "ABC" }]);
});

test("rejects mismatched station and direction and malformed disruption records", async (t) => {
  const valid = { stationName: "Sheffield", crs: "SHF", generatedAt: null, direction: "arrivals", unknownTimingCount: 0, disruptions: [] };
  const disruption = { status: "delayed", delayMinutes: 15, scheduledTime: "10:00", estimatedTime: "10:15", locations: [], platform: null, operator: null, reason: null, checkDelayRepay: true, affectedStops: [] };
  let body = valid;
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(body)));
  for (const invalid of [
    { ...valid, crs: "KGX" }, { ...valid, direction: "departures" },
    { ...valid, disruptions: [{ ...disruption, status: "unknown" }] },
    { ...valid, disruptions: [{ ...disruption, delayMinutes: "15" }] },
    { ...valid, disruptions: [{ ...disruption, affectedStops: [{ name: 42, crs: "DBY" }] }] },
    { ...valid, disruptions: [{ ...disruption, checkDelayRepay: null }] },
    { ...valid, disruptions: [{ ...disruption, locations: "Leeds" }] },
  ]) {
    body = invalid;
    await assert.rejects(getDisruptions("SHF", "arrivals", new AbortController().signal), /Invalid rail data/);
  }
  body = { ...valid, disruptions: [disruption] };
  assert.deepEqual(await getDisruptions("SHF", "arrivals", new AbortController().signal), body);
});
