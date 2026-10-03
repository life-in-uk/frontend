import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  LINE_COLOURS,
  PRESENTATION_LABELS,
  classifyStatus,
  hasMeaningfulReason,
  lineColour,
  summariseLines,
} from "../src/underground/presentation.ts";

// TfL Colour standard, Issue 11, section 5 (RGB references for screens).
const officialColours = {
  bakerloo: [178, 99, 0],
  central: [220, 36, 31],
  circle: [255, 200, 10],
  district: [0, 125, 50],
  "hammersmith-city": [245, 137, 166],
  jubilee: [131, 141, 147],
  metropolitan: [155, 0, 88],
  northern: [0, 0, 0],
  piccadilly: [0, 25, 168],
  victoria: [3, 155, 229],
  "waterloo-city": [118, 208, 189],
};
const hex = ([r, g, b]) =>
  "#" +
  [r, g, b]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

test("every supported backend lineId maps to its official TfL identity colour", () => {
  assert.deepEqual(
    Object.keys(LINE_COLOURS).sort(),
    Object.keys(officialColours).sort(),
  );
  for (const [lineId, rgb] of Object.entries(officialColours))
    assert.equal(lineColour(lineId), hex(rgb), lineId);
});

test("unknown, display-name or prototype line ids get the intentional neutral marker", () => {
  for (const lineId of [
    "elizabeth",
    "Central",
    "central ",
    "",
    "toString",
    "__proto__",
  ])
    assert.equal(lineColour(lineId), null, JSON.stringify(lineId));
});

test("classifies only TfL-defined Tube severity/description pairs", () => {
  const cases = [
    [10, "Good Service", "normal"],
    [9, "Minor Delays", "disruption"],
    [6, "Severe Delays", "severe"],
    [3, "Part Suspended", "severe"],
    [2, "Suspended", "severe"],
    [5, "Part Closure", "severe"],
    [4, "Planned Closure", "severe"],
    // Case/whitespace differences in the same TfL wording still match.
    [10, " good service ", "normal"],
  ];
  for (const [severity, description, expected] of cases)
    assert.equal(
      classifyStatus({ severity, description }),
      expected,
      description,
    );
});

test("unknown statuses and mismatched severity/description pairs stay unknown", () => {
  for (const status of [
    { severity: 9, description: "Good Service" }, // number alone never decides
    { severity: 10, description: "Minor Delays" },
    { severity: 7, description: "Reduced Service" },
    { severity: 1, description: "Closed" },
    { severity: 20, description: "Service Closed" },
    { severity: 18, description: "No Issues" },
    { severity: 0, description: "Special Service" },
    { severity: 99, description: "Something new" },
    { severity: -2, description: "Status B" },
  ])
    assert.equal(classifyStatus(status), "unknown", JSON.stringify(status));
});

test("each presentation state has a text label, so colour is never the only signal", () => {
  for (const state of ["normal", "disruption", "severe", "unknown"])
    assert.ok(PRESENTATION_LABELS[state].trim().length > 0, state);
  assert.equal(new Set(Object.values(PRESENTATION_LABELS)).size, 4);
});

test("summary counts affected and unclassified lines deterministically", () => {
  const s = (severity, description) => ({
    severity,
    description,
    reason: null,
  });
  assert.deepEqual(
    summariseLines([
      { statuses: [s(10, "Good Service")] },
      { statuses: [s(9, "Minor Delays")] },
      { statuses: [s(10, "Good Service"), s(5, "Part Closure")] },
      { statuses: [s(7, "Reduced Service")] },
      { statuses: [] },
      { statuses: [s(9, "Minor Delays"), s(9, "Minor Delays")] },
    ]),
    { affected: 3, unclassified: 2 },
  );
  assert.deepEqual(summariseLines([]), { affected: 0, unclassified: 0 });
});

test("only reasons with visible text earn a disclosure", () => {
  assert.equal(hasMeaningfulReason(null), false);
  assert.equal(hasMeaningfulReason(""), false);
  assert.equal(hasMeaningfulReason(" \n\t "), false);
  assert.equal(hasMeaningfulReason("  Reason: café\n"), true);
});

test("LED animation is disabled under prefers-reduced-motion and unknown LEDs are unlit", async () => {
  const css = await readFile(
    new URL("../src/components/UndergroundCard.css", import.meta.url),
    "utf8",
  );
  const reduced = css.match(
    /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
  );
  assert.ok(reduced, "reduced-motion block present");
  assert.match(reduced[1], /\.underground-led::after\s*\{\s*animation: none;/);
  assert.match(css, /\.underground-led-unknown::after\s*\{\s*content: none;/);
  // A slow breathing glow, not blinking.
  assert.match(
    css,
    /animation: underground-led-breathe 4\.8s ease-in-out infinite/,
  );
});
