import { test } from "node:test";
import assert from "node:assert/strict";
import { getMarketIndices, parseMarketIndices } from "../src/markets/api.ts";
import { formatLevel, formatMarketTime, formatSigned, indexView, LIVE_MAX_AGE_SECONDS, UK_SYMBOLS, US_SYMBOLS } from "../src/markets/present.ts";
import { LIVE_SERVICES_UI } from "../src/home/liveServicesI18n.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";
import { marketIndices, TEST_ATTRIBUTION } from "./fixtures/market-indices.mjs";

const NOW = Date.parse("2026-11-20T15:30:00Z");
const views = (data) => Object.fromEntries(data.indices.map((i) => [i.symbol, indexView(i)]));

test("parse: the backend response with all four symbols and its attribution", () => {
  const data = parseMarketIndices(marketIndices(NOW));
  assert.ok(data);
  assert.equal(data.attribution, TEST_ATTRIBUTION);
  assert.deepEqual(data.indices.map((i) => i.symbol), ["UKX", "SPX", "IXIC", "DJI"]);
  assert.deepEqual([...US_SYMBOLS, ...UK_SYMBOLS].sort(), ["DJI", "IXIC", "SPX", "UKX"]);
});

test("parse: refuses mock data, missing attribution, missing or duplicate symbols, bad numbers", () => {
  const cases = {
    "mock source": (m) => { m.indices[1].source = "mock"; },
    "empty attribution": (m) => { m.attribution = " "; },
    "no attribution": (m) => { delete m.attribution; },
    "three symbols": (m) => { m.indices.pop(); },
    "duplicate symbol": (m) => { m.indices[3].symbol = "SPX"; },
    "unknown symbol": (m) => { m.indices[0].symbol = "MCX"; },
    "number instead of decimal string": (m) => { m.indices[0].value = 8123.45; },
    "exponent": (m) => { m.indices[0].value = "8.1e3"; },
    "unknown freshness": (m) => { m.indices[0].freshness.status = "LIVE"; },
    "bad generatedAt": (m) => { m.generatedAt = "yesterday"; },
  };
  for (const [name, change] of Object.entries(cases)) {
    const m = marketIndices(NOW);
    change(m);
    assert.equal(parseMarketIndices(m), null, name);
  }
  assert.equal(parseMarketIndices(null), null);
  assert.equal(parseMarketIndices({ code: "MARKET_INDICES_DISABLED" }), null);
});

test("view: follows the backend's rating and never shows a stale or time-less value", () => {
  const v = views(parseMarketIndices(marketIndices(NOW)));
  assert.deepEqual(v.SPX, { symbol: "SPX", name: "S&P 500", status: "live", value: "5,985.25", change: "+25.25",
    changePercent: "+0.42%", direction: "up", delayMinutes: 2, observedAt: "2026-11-20T15:28:00Z" });
  assert.equal(v.IXIC.delayMinutes, null, "only Live carries a delay note");
  assert.equal(v.IXIC.status, "delayed");
  assert.equal(v.IXIC.change, "−89.90");
  assert.equal(v.IXIC.direction, "down");
  assert.equal(v.UKX.status, "closed");
  assert.equal(v.UKX.direction, "flat");
  assert.equal(v.UKX.change, "0.00");
  // STALE: no number, no change, no time.
  assert.deepEqual([v.DJI.status, v.DJI.value, v.DJI.change, v.DJI.observedAt], ["stale", null, null, null]);

  const m = marketIndices(NOW);
  // A collector-stamped time is never a market time: nothing is shown, whatever the rating says.
  m.indices[1].provenance.observedAtSource = "COLLECTOR";
  m.indices[1].freshness.status = "MARKET_TIME_UNKNOWN";
  // Market status unknown: the value with its market time, labelled as unknown (never open or closed).
  m.indices[2].freshness.status = "MARKET_STATUS_UNKNOWN";
  // No data at all.
  m.indices[0] = { ...m.indices[0], value: null, previousClose: null, change: null, changePercent: null, provenance: null,
    freshness: { ...m.indices[0].freshness, status: "UNAVAILABLE" } };
  const w = views(parseMarketIndices(m));
  assert.deepEqual([w.SPX.status, w.SPX.value, w.SPX.observedAt], ["unavailable", null, null]);
  assert.deepEqual([w.IXIC.status, w.IXIC.value], ["unknown", "19,410.10"]);
  assert.deepEqual([w.UKX.status, w.UKX.value], ["unavailable", null]);
  // Even a FRESH rating with a collector time shows nothing.
  const c = marketIndices(NOW);
  c.indices[1].provenance.observedAtSource = "COLLECTOR";
  assert.equal(views(parseMarketIndices(c)).SPX.value, null);
});

test("status: Live for a fresh quote a few minutes behind; Delayed, out of date and Closed otherwise", () => {
  const spx = (freshness, ageSeconds, session = "OPEN") => {
    const m = marketIndices(NOW);
    m.indices[1].freshness = { ...m.indices[1].freshness, status: freshness, ageSeconds };
    m.indices[1].market.session = session;
    return indexView(parseMarketIndices(m).indices[1]);
  };
  // Live: FRESH within the Live limit, whatever the 1-3 minute source lag; the provider time is kept.
  for (const [age, minutes] of [[30, null], [60, 1], [120, 2], [170, 3], [LIVE_MAX_AGE_SECONDS, 5]]) {
    const view = spx("FRESH", age);
    assert.deepEqual([view.status, view.delayMinutes, view.value], ["live", minutes, "5,985.25"], `age ${age}`);
    assert.equal(view.observedAt, "2026-11-20T15:28:00Z");
  }
  // FRESH but past the Live limit, or without an age: Delayed, never Live.
  assert.equal(spx("FRESH", LIVE_MAX_AGE_SECONDS + 1).status, "delayed");
  assert.equal(spx("FRESH", null).status, "delayed");
  // The backend's own ratings are never upgraded.
  assert.deepEqual([spx("DELAYED", 1500).status, spx("DELAYED", 1500).value], ["delayed", "5,985.25"]);
  assert.deepEqual([spx("STALE", 7200).status, spx("STALE", 7200).value], ["stale", null]);
  assert.deepEqual([spx("MARKET_CLOSED", 5400, "CLOSED").status, spx("MARKET_CLOSED", 5400, "CLOSED").delayMinutes], ["closed", null]);
  assert.equal(spx("UNAVAILABLE", null).status, "unavailable");
  // A negative or non-numeric age is malformed.
  const bad = marketIndices(NOW);
  bad.indices[1].freshness.ageSeconds = -5;
  assert.equal(parseMarketIndices(bad), null);
});

test("format: levels, signed changes and the market time in UK time", () => {
  assert.equal(formatLevel("8123.4500"), "8,123.45");
  assert.equal(formatLevel("43445.1"), "43,445.10");
  assert.equal(formatSigned("23.33", 2), "+23.33");
  assert.equal(formatSigned("-0.004", 2), "0.00");
  assert.equal(formatSigned("-1234.5", 2), "−1,234.50");
  // Same UK day: time only. BST/GMT handled by the time zone (20 Nov is GMT).
  assert.equal(formatMarketTime("2026-11-20T14:35:00Z", "en-GB", NOW), "14:35");
  assert.equal(formatMarketTime("2026-07-01T14:35:00Z", "en-GB", Date.parse("2026-07-01T16:00:00Z")), "15:35");
  // Another UK day: with the date.
  assert.equal(formatMarketTime("2026-11-19T21:00:00Z", "en-GB", NOW), "19 Nov 21:00");
  assert.match(formatMarketTime("2026-11-19T21:00:00Z", "zh-CN", NOW), /^11月19日 21:00$/);
});

test("getMarketIndices: 404 means display is off; errors and invalid data throw (placeholders stay)", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: "MARKET_INDICES_DISABLED" }), { status: 404 });
    assert.deepEqual(await getMarketIndices(), { kind: "disabled" });
    globalThis.fetch = async () => new Response("{}", { status: 503 });
    await assert.rejects(getMarketIndices());
    globalThis.fetch = async () => Response.json({ ...marketIndices(NOW), attribution: "" });
    await assert.rejects(getMarketIndices());
    let url;
    globalThis.fetch = async (u) => { url = u; return Response.json(marketIndices(NOW)); };
    const result = await getMarketIndices();
    assert.equal(url, "/api/market-indices/latest");
    assert.equal(result.kind, "ready");
    assert.equal(result.data.indices.length, 4);
  } finally {
    globalThis.fetch = original;
  }
});

test("copy: every market string in all five locales", () => {
  for (const locale of GUIDE_LOCALES) {
    const m = LIVE_SERVICES_UI[locale].markets;
    for (const value of [m.us, m.uk, m.change, ...Object.values(m.status)]) assert.ok(value.trim(), `${locale}: empty`);
    assert.deepEqual(Object.keys(m.status).sort(), ["closed", "delayed", "live", "stale", "unavailable", "unknown"]);
    assert.match(m.delayNote(2), /2/);
    assert.ok(m.delayNote(null).trim());
    assert.match(m.asOf("14:35"), /14:35/);
  }
  assert.equal(LIVE_SERVICES_UI.en.markets.asOf("14:35"), "14:35 UK time");
  assert.deepEqual([LIVE_SERVICES_UI.en.markets.status.live, LIVE_SERVICES_UI.en.markets.delayNote(2), LIVE_SERVICES_UI.en.markets.delayNote(null)],
    ["Live", "~2 min delay", "Quotes may be delayed"]);
  assert.deepEqual(GUIDE_LOCALES.map((l) => LIVE_SERVICES_UI[l].markets.status.live), ["实时", "即時", "Live", "لائیو", "लाइव"]);
});
