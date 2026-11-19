// Travel section (/travel): routes, navigation, five-locale tool text and the
// honest "Rail not configured" contract. Browser behaviour is covered by
// tests/travel-page.browser.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { localeSwitchPath, matchRoute, pageRoute } from "../src/router.ts";
import { availableHomeTopics, HOME_TOPICS, launchedTopics, topicHref } from "../src/home/topics.ts";
import { GUIDE_LOCALES } from "../src/guides/locales.ts";
import { OFFICIAL_STATUS, TRAVEL_UI } from "../src/travel/i18n.ts";
import { RAIL_UI } from "../src/travel/railI18n.ts";
import { travelPath } from "../src/travel/routes.ts";
import { formatDistanceIn, formatDistanceZh } from "../src/travel/format.ts";
import {
  getDisruptions,
  RailNotConfiguredError,
} from "../src/rail/api.ts";

test("/travel and /{locale}/travel are the Travel page; deeper paths are not found", () => {
  assert.deepEqual(matchRoute("/travel"), { name: "travel" });
  assert.deepEqual(matchRoute("/travel/"), { name: "travel" });
  for (const locale of ["zh-TW", "en", "ur", "hi"])
    assert.deepEqual(matchRoute(`/${locale}/travel`), { name: "travel", locale });
  assert.deepEqual(pageRoute(matchRoute("/zh-CN/travel")), { name: "travel" });
  assert.deepEqual(matchRoute("/travel/rail"), { name: "not-found" });
  assert.deepEqual(matchRoute("/en/travel/rail"), { name: "not-found", locale: "en" });
});

test("language switching keeps the Travel page", () => {
  assert.equal(localeSwitchPath(matchRoute("/travel"), "ur"), "/ur/travel");
  assert.equal(localeSwitchPath(matchRoute("/hi/travel"), "zh-CN"), "/zh-CN/travel");
  assert.equal(localeSwitchPath(matchRoute("/en/travel"), "zh-TW"), "/zh-TW/travel");
  assert.equal(travelPath("en", "roads"), "/en/travel#roads");
  assert.equal(travelPath("zh-CN"), "/zh-CN/travel");
});

test("the Travel topic is linked in every locale but never counted or searched as Guides", () => {
  const travel = HOME_TOPICS.find((topic) => topic.id === "travel");
  assert.equal(travel?.page, "travel");
  assert.equal(travel?.domain, undefined);
  assert.equal(topicHref(travel, "zh-CN"), "/zh-CN/travel");
  assert.equal(topicHref(travel, "ur"), "/ur/travel");
  assert.ok(!launchedTopics().some((topic) => topic.id === "travel"));
  // Upcoming sections stay unlinked.
  assert.equal(topicHref(availableHomeTopics(false).find((topic) => topic.id === "education"), "en"), undefined);
});

function shape(value) {
  if (typeof value === "function") return "fn";
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape(value[key])]));
  return typeof value;
}

test("every Travel string exists in all five locales with the same shape", () => {
  const reference = shape(TRAVEL_UI["zh-CN"]);
  for (const locale of GUIDE_LOCALES) {
    assert.deepEqual(shape(TRAVEL_UI[locale]), reference, locale);
    const walk = (value, path) => {
      if (typeof value === "string") {
        // Grammatical joins (e.g. an empty "after" part) may be blank; titles may not.
        if (!/(After|Before)$/.test(path)) assert.ok(value.trim(), `${locale} ${path}`);
      } else if (value && typeof value === "object")
        for (const [key, inner] of Object.entries(value)) walk(inner, `${path}.${key}`);
    };
    walk(TRAVEL_UI[locale], "");
    assert.deepEqual(shape(RAIL_UI[locale]), shape(RAIL_UI["zh-CN"]), `${locale} rail`);
    walk(RAIL_UI[locale], "rail");
  }
});

test("English, Urdu and Hindi Travel text contains no Chinese", () => {
  const sample = (ui) =>
    JSON.stringify(ui, (_key, value) =>
      typeof value === "function" ? value.length === 1 ? value("X") : value(1, 2, 0) : value,
    );
  for (const locale of ["en", "ur", "hi"]) {
    assert.doesNotMatch(sample(TRAVEL_UI[locale]), /[一-鿿]/, locale);
    assert.doesNotMatch(sample(RAIL_UI[locale]), /[一-鿿]/, `${locale} rail`);
  }
});

test("provider names stay in English in every locale", () => {
  for (const locale of GUIDE_LOCALES) {
    assert.match(TRAVEL_UI[locale].underground.fallback, /TfL/);
    assert.match(TRAVEL_UI[locale].roads.fallback, /National Highways/);
    assert.match(RAIL_UI[locale].notConfigured, /National Rail/);
  }
  assert.deepEqual(Object.keys(OFFICIAL_STATUS).sort(), ["rail", "roads", "underground"]);
  for (const { href } of Object.values(OFFICIAL_STATUS)) assert.match(href, /^https:\/\//);
});

test("localized distances keep the Chinese formatter's rounding", () => {
  for (const metres of [50, 1609.344, 5000, 25_000]) {
    const zh = formatDistanceZh(metres);
    assert.equal(formatDistanceIn(metres, TRAVEL_UI["zh-CN"].roads), zh);
  }
  assert.equal(formatDistanceIn(25_000, TRAVEL_UI.en.roads), "16 miles");
  assert.equal(formatDistanceIn(50, TRAVEL_UI.hi.roads), "0.1 मील से कम");
});

async function railWith(status, body) {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  try {
    return await getDisruptions("SHF", "arrivals", new AbortController().signal).then(
      () => "ok",
      (error) => error,
    );
  } finally {
    globalThis.fetch = original;
  }
}

test("Rail 503 RAIL_NOT_CONFIGURED or RAIL_DISABLED is 'not configured', not an empty board", async () => {
  for (const code of ["RAIL_NOT_CONFIGURED", "RAIL_DISABLED"]) {
    const error = await railWith(503, { code, message: "Rail information is not available." });
    assert.ok(error instanceof RailNotConfiguredError, code);
  }
  const upstream = await railWith(503, "upstream error");
  assert.ok(upstream instanceof Error && !(upstream instanceof RailNotConfiguredError));
  const other = await railWith(502, { code: "RAIL_UPSTREAM_FAILED" });
  assert.ok(other instanceof Error && !(other instanceof RailNotConfiguredError));
});
