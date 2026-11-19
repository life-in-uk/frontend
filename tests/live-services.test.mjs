import { test } from "node:test";
import assert from "node:assert/strict";
import { LIVE_SERVICES_UI } from "../src/home/liveServicesI18n.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";
import { MET_OFFICE_CODES, WEATHER_CONDITIONS, weatherCodeInfo } from "../src/weather/codes.ts";
import { DEFAULT_WEATHER_CITY, WEATHER_CITIES, isWeatherCity } from "../src/weather/cities.ts";
import {
  MET_OFFICE_ATTRIBUTION,
  WEATHER_CLOCK_SKEW_MS,
  WEATHER_MIN_GAP_MS,
  WEATHER_NEXT_HOUR_DELAY_MS,
  WEATHER_RETRY_MS,
  getWeather,
  isCurrentStep,
  nextWeatherReadAt,
  isWeatherResponse,
} from "../src/weather/api.ts";

const filled = (value) => typeof value === "string" && value.trim().length > 0;

test("Live Services copy: owner-approved headings and every string in all five locales", () => {
  assert.equal(LIVE_SERVICES_UI["zh-CN"].title, "实时服务");
  assert.equal(LIVE_SERVICES_UI["zh-CN"].subtitle, "您的一站式英国实时生活信息中心");
  assert.equal(LIVE_SERVICES_UI.en.title, "Live Services");
  assert.equal(LIVE_SERVICES_UI.en.subtitle, "Your one-stop hub for live UK information.");
  assert.deepEqual(Object.keys(LIVE_SERVICES_UI).sort(), [...GUIDE_LOCALES].sort());
  for (const locale of GUIDE_LOCALES) {
    const ui = LIVE_SERVICES_UI[locale];
    for (const value of [ui.title, ui.subtitle, ui.comingSoon, ui.headline.label, ui.markets.us, ui.markets.uk,
      ui.weather.name, ui.weather.checking, ui.weather.unavailable])
      assert.ok(filled(value), `${locale}: empty string`);
    assert.deepEqual(Object.keys(ui.weather.cities).sort(), [...WEATHER_CITIES].sort(), `${locale}: cities`);
    assert.deepEqual(Object.keys(ui.weather.conditions).sort(), [...WEATHER_CONDITIONS].sort(), `${locale}: conditions`);
    for (const value of [...Object.values(ui.weather.cities), ...Object.values(ui.weather.conditions)])
      assert.ok(filled(value), `${locale}: empty city or condition`);
    // Templates keep their argument and name the source and UK time.
    // The forecast label names the step's hour and when the forecast was issued, both in UK time.
    const label = ui.weather.forecastFor("14:00", "11:00");
    assert.match(label, /14:00/);
    assert.match(label, /11:00/);
    assert.ok(label.indexOf("14:00") < label.indexOf("11:00"), `${locale}: hour before issue time`);
    assert.match(label, /Met Office/);
    assert.match(ui.weather.feelsLike("5°C"), /5°C/);
    for (const value of [ui.weather.automatic, ui.weather.autoTag]) assert.ok(filled(value), `${locale}: empty city label string`);
    // The city is plain text now: no selector strings remain.
    for (const key of ["city", "changeCity", "chooseCity", "search", "noMatch"]) assert.equal(ui.weather[key], undefined, `${locale}: ${key}`);
    assert.match(ui.weather.rainChance(30), /30%/);
    // Translated locales really are translated.
    if (locale !== "en") assert.notEqual(ui.title, LIVE_SERVICES_UI.en.title, `${locale}: title untranslated`);
  }
});

test("Met Office codes: every published code except 'Not used' maps to a condition; anything else has none", () => {
  for (let code = -1; code <= 30; code++) {
    if (code === 4) assert.equal(weatherCodeInfo(code), null);
    else assert.ok(WEATHER_CONDITIONS.includes(weatherCodeInfo(code)?.condition), `code ${code}`);
  }
  assert.equal(Object.keys(MET_OFFICE_CODES).length, 31);
  assert.deepEqual(weatherCodeInfo(0), { condition: "clear", night: true });
  assert.deepEqual(weatherCodeInfo(1), { condition: "sunny", night: false });
  assert.deepEqual(weatherCodeInfo(28), { condition: "thunderShowers", night: true });
  for (const value of [31, -2, 7.5, null, undefined, "7", Number.NaN]) assert.equal(weatherCodeInfo(value), null);
  // Every condition is reachable from some code.
  const used = new Set(Object.values(MET_OFFICE_CODES).map((info) => info.condition));
  assert.deepEqual([...used].sort(), [...WEATHER_CONDITIONS].sort());
});

test("weather cities: the fixed backend list, London by default", () => {
  assert.deepEqual(WEATHER_CITIES, ["london", "birmingham", "manchester", "leeds", "glasgow", "edinburgh", "cardiff", "belfast"]);
  assert.equal(DEFAULT_WEATHER_CITY, "london");
  for (const value of ["London", "paris", "", null, 1]) assert.equal(isWeatherCity(value), false);
});

const valid = () => ({
  city: "london",
  forecastTime: "2026-11-19T08:00:00Z",
  modelRunAt: "2026-11-19T05:00:00Z",
  fetchedAt: "2026-11-19T08:20:00Z",
  temperatureC: 7.4,
  feelsLikeC: 4.9,
  weatherCode: 7,
  precipitationProbability: 12,
  attribution: MET_OFFICE_ATTRIBUTION,
});

test("weather response validation: only the backend contract with Met Office attribution is accepted", () => {
  assert.equal(isWeatherResponse(valid()), true);
  assert.equal(isWeatherResponse({ ...valid(), temperatureC: null, feelsLikeC: null, weatherCode: null, precipitationProbability: null }), true);
  for (const change of [
    { city: "paris" },
    { forecastTime: "2026-11-19T08:00" },
    { forecastTime: "2026-02-30T08:00:00Z" },
    { fetchedAt: null },
    { temperatureC: "7" },
    { temperatureC: 99 },
    { weatherCode: 31 },
    { weatherCode: 7.5 },
    { precipitationProbability: 101 },
    { attribution: "Powered by someone else" },
    { attribution: undefined },
  ])
    assert.equal(isWeatherResponse({ ...valid(), ...change }), false, JSON.stringify(change));
  assert.equal(isWeatherResponse(null), false);
  assert.equal(isWeatherResponse([]), false);
});

test("a forecast step is shown only during its own hour (5-minute clock allowance), never a neighbouring hour", () => {
  const step = Date.parse("2026-11-19T08:00:00Z");
  assert.equal(isCurrentStep("2026-11-19T08:00:00Z", step), true);
  assert.equal(isCurrentStep("2026-11-19T08:00:00Z", step + 59 * 60_000), true);
  assert.equal(isCurrentStep("2026-11-19T08:00:00Z", step + 60 * 60_000 + WEATHER_CLOCK_SKEW_MS - 1), true);
  assert.equal(isCurrentStep("2026-11-19T08:00:00Z", step + 60 * 60_000 + WEATHER_CLOCK_SKEW_MS), false);
  assert.equal(isCurrentStep("2026-11-19T08:00:00Z", step + 90 * 60_000), false);
  assert.equal(isCurrentStep("2026-11-19T08:00:00Z", step - WEATHER_CLOCK_SKEW_MS), true);
  assert.equal(isCurrentStep("2026-11-19T08:00:00Z", step - WEATHER_CLOCK_SKEW_MS - 1), false);
  assert.equal(isCurrentStep("not a time", step), false);
});

test("a long-open page reads again just after the shown hour ends, 10 minutes after a failure, never within a minute", () => {
  const read = Date.parse("2026-11-19T08:20:00Z");
  // Shown 08:00 step: next read at 09:01, once.
  assert.equal(nextWeatherReadAt("2026-11-19T08:00:00Z", read), Date.parse("2026-11-19T09:00:00Z") + WEATHER_NEXT_HOUR_DELAY_MS);
  // Failed or unusable read: 10 minutes later (the backend backs off for as long).
  assert.equal(nextWeatherReadAt(null, read), read + WEATHER_RETRY_MS);
  assert.equal(nextWeatherReadAt("garbage", read), read + WEATHER_RETRY_MS);
  // A step whose hour is already over (clock difference) does not cause a burst of reads.
  assert.equal(nextWeatherReadAt("2026-11-19T06:00:00Z", read), read + WEATHER_MIN_GAP_MS);
  // Reads in one day of an open, visible tab: at most one an hour (plus the first).
  let at = Date.parse("2026-11-19T00:10:00Z");
  let count = 1;
  while (at < Date.parse("2026-11-20T00:10:00Z")) {
    const hour = new Date(Math.floor(at / 3_600_000) * 3_600_000).toISOString().replace(/\.\d{3}/, "");
    at = nextWeatherReadAt(hour, at);
    count += 1;
  }
  assert.ok(count <= 26, `${count} reads a day`);
});

test("getWeather without a city asks the backend to pick (no city parameter) and keeps its choice and source", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(url);
    return new Response(JSON.stringify({ ...valid(), city: "manchester", citySource: "detected" }), { status: 200 });
  });
  const data = await getWeather(null);
  assert.deepEqual(urls, ["/api/weather/current"]);
  assert.equal(data.city, "manchester");
  assert.equal(data.citySource, "detected");
  t.mock.restoreAll();
  // An older backend without citySource: automatic answers count as the default city.
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(valid()), { status: 200 }));
  assert.equal((await getWeather(null)).citySource, "default");
  assert.equal((await getWeather("london")).citySource, "requested");
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ ...valid(), citySource: "guessed" }), { status: 200 }));
  await assert.rejects(getWeather(null));
});

test("getWeather: one GET to the backend; errors and mismatched cities are failures", async (t) => {
  const calls = [];
  const respond = (status, body) => {
    t.mock.method(globalThis, "fetch", async (url, init) => {
      calls.push([url, init?.signal instanceof AbortSignal]);
      return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    });
  };
  respond(200, valid());
  const data = await getWeather("london", new AbortController().signal);
  assert.equal(data.temperatureC, 7.4);
  assert.deepEqual(calls, [["/api/weather/current?city=london", true]]);
  t.mock.restoreAll();
  respond(200, valid());
  await assert.rejects(getWeather("leeds"));
  t.mock.restoreAll();
  respond(503, { code: "WEATHER_NOT_CONFIGURED" });
  await assert.rejects(getWeather("london"));
  t.mock.restoreAll();
  respond(200, { ...valid(), attribution: "" });
  await assert.rejects(getWeather("london"));
});
