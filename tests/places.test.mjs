import test from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceSearchResponse,
  MAX_PLACE_QUERY_LENGTH,
  normalisePlaceQuery,
  PlaceQueryInvalidError,
  placeSearchUrl,
  PlacesUnavailableError,
  searchPlaces,
} from "../src/places/api.ts";

// Authored test facts in the backend #32 shape; never imported by the application.
const place = (overrides = {}) => ({
  id: "osgb4000000074813508",
  label: "Sheffield, South Yorkshire, Yorkshire and the Humber",
  name: "Sheffield",
  type: "city",
  area: null,
  region: "Yorkshire and the Humber",
  country: "England",
  latitude: 53.381129,
  longitude: -1.470085,
  ...overrides,
});
const fixture = () => ({
  query: "Sheffield",
  places: [
    place(),
    place({
      id: "osgb2",
      label: "Sheffield Park, Wealden",
      name: "Sheffield Park",
      type: "hamlet",
      area: "Wealden",
      region: null,
      country: null,
      latitude: 50.99,
      longitude: 0.02,
    }),
  ],
  attribution: "Contains OS data © Crown copyright and database right 2026",
});
const respond = (t, body, init) =>
  t.mock.method(globalThis, "fetch", async () =>
    typeof body === "string"
      ? new Response(body, init)
      : new Response(JSON.stringify(body), init),
  );

test("accepts the backend contract unchanged, in provider order, with optional nulls", async (t) => {
  const data = fixture();
  const before = structuredClone(data);
  respond(t, data);
  const accepted = await searchPlaces("Sheffield");
  assert.deepEqual(accepted, before);
  assert.deepEqual(
    accepted.places.map((p) => p.id),
    ["osgb4000000074813508", "osgb2"],
  );
  for (const type of [
    "postcode",
    "city",
    "town",
    "village",
    "hamlet",
    "suburb",
    "settlement",
  ])
    assert.equal(
      isPlaceSearchResponse({ ...fixture(), places: [place({ type })] }),
      true,
      type,
    );
  assert.equal(isPlaceSearchResponse({ ...fixture(), places: [] }), true);
});

test("calls only the relative place-search path with the encoded query", async (t) => {
  assert.equal(placeSearchUrl("S70 2TA"), "/api/places/search?q=S70+2TA");
  assert.equal(
    placeSearchUrl("Ashby-de-la-Zouch & café"),
    "/api/places/search?q=Ashby-de-la-Zouch+%26+caf%C3%A9",
  );
  const fetch = respond(t, fixture());
  const controller = new AbortController();
  await searchPlaces("Sheffield", controller.signal);
  const [url, init] = fetch.mock.calls[0].arguments;
  assert.equal(url, "/api/places/search?q=Sheffield");
  assert.equal(init.signal, controller.signal);
});

test("queries are trimmed; blank input is not submitted", () => {
  assert.equal(normalisePlaceQuery("  Sheffield  "), "Sheffield");
  assert.equal(normalisePlaceQuery("\tS70 2TA\n"), "S70 2TA");
  assert.equal(normalisePlaceQuery(""), null);
  assert.equal(normalisePlaceQuery("   \n\t "), null);
  assert.equal(MAX_PLACE_QUERY_LENGTH, 100);
});

test("rejects malformed payloads rather than trusting part of them", () => {
  const broken = [
    null,
    [],
    {},
    { ...fixture(), query: null },
    { ...fixture(), attribution: "" },
    { ...fixture(), attribution: null },
    { ...fixture(), places: null },
    { ...fixture(), places: [place({ id: "" })] },
    { ...fixture(), places: [place({ label: 3 })] },
    { ...fixture(), places: [place({ name: null })] },
    { ...fixture(), places: [place({ type: "road" })] },
    { ...fixture(), places: [place({ type: "City" })] },
    { ...fixture(), places: [place({ area: "" })] },
    { ...fixture(), places: [place({ region: 1 })] },
    { ...fixture(), places: [place({ latitude: "53.38" })] },
    { ...fixture(), places: [place({ latitude: 91 })] },
    { ...fixture(), places: [place({ longitude: Number.NaN })] },
    { ...fixture(), places: [place(), {}] },
    (() => {
      const value = fixture();
      delete value.places[0].country;
      return value;
    })(),
  ];
  for (const value of broken)
    assert.equal(isPlaceSearchResponse(value), false, JSON.stringify(value));
});

test("maps bounded backend errors to distinct states without exposing bodies", async (t) => {
  respond(t, { code: "PLACE_QUERY_INVALID", message: "x" }, { status: 400 });
  await assert.rejects(searchPlaces("x"), PlaceQueryInvalidError);
  t.mock.restoreAll();
  for (const status of [502, 503]) {
    respond(t, { code: "PLACES_UNAVAILABLE" }, { status });
    await assert.rejects(searchPlaces("x"), PlacesUnavailableError);
    t.mock.restoreAll();
  }
  for (const status of [404, 500]) {
    respond(t, { code: "PLACES_SEARCH_FAILED" }, { status });
    await assert.rejects(searchPlaces("x"), (error) => {
      assert.equal(error instanceof PlaceQueryInvalidError, false);
      assert.equal(error instanceof PlacesUnavailableError, false);
      return true;
    });
    t.mock.restoreAll();
  }
  respond(t, "{", { headers: { "Content-Type": "application/json" } });
  await assert.rejects(searchPlaces("x"));
  t.mock.restoreAll();
  respond(t, { ...fixture(), places: [{}] });
  await assert.rejects(searchPlaces("x"), /Invalid place search response/);
});

test("aborting the signal rejects the search", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason)),
      ),
  );
  const controller = new AbortController();
  const pending = searchPlaces("Sheffield", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
