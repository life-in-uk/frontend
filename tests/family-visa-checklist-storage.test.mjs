// Optional on-device saving of the Family & Visa checklist.
import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteSaved,
  loadSaved,
  RETENTION_DAYS,
  saveChecklist,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from "../src/guides/familyVisaChecklistStorage.ts";

function memory() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-10-10T09:00:00Z");
const at = (days) => new Date(t0.getTime() + days * DAY);
const data = {
  answers: { relationship: "married", children: "none", location: "outside" },
  applicable: ["rel-met", "id-passport"],
  progress: { checked: ["rel-met"], notApplicable: [] },
};

test("saving writes a versioned record with a fixed 30-day expiry", () => {
  const storage = memory();
  const record = saveChecklist(storage, data, t0);
  assert.equal(record.schema, SCHEMA_VERSION);
  assert.equal(record.createdAt, t0.toISOString());
  assert.equal(record.expiresAt, at(RETENTION_DAYS).toISOString());
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), record);
  // A later change keeps the original window (not a sliding expiry).
  const later = saveChecklist(
    storage,
    {
      ...data,
      progress: { checked: ["rel-met", "id-passport"], notApplicable: [] },
    },
    at(10),
  );
  assert.equal(later.createdAt, t0.toISOString());
  assert.equal(later.expiresAt, at(30).toISOString());
  assert.equal(later.updatedAt, at(10).toISOString());
  assert.deepEqual(later.progress.checked, ["rel-met", "id-passport"]);
});

test("only categories and task ids are stored", () => {
  const storage = memory();
  saveChecklist(
    storage,
    {
      answers: { ...data.answers, name: "Zhang San", passport: "E12345678" },
      applicable: ["rel-met", "<script>", "x".repeat(200)],
      progress: { checked: ["rel-met", "£29,000"], notApplicable: [] },
    },
    t0,
  );
  const raw = storage.getItem(STORAGE_KEY);
  assert.doesNotMatch(raw, /Zhang|E12345678|<script>|£/);
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), [
    "answers",
    "applicable",
    "createdAt",
    "expiresAt",
    "progress",
    "schema",
    "updatedAt",
  ]);
});

test("a record loads until it expires, then is removed", () => {
  const storage = memory();
  saveChecklist(storage, data, t0);
  const loaded = loadSaved(storage, at(29));
  assert.equal(loaded.status, "ok");
  assert.deepEqual(loaded.record.answers, data.answers);
  assert.deepEqual(loaded.record.progress.checked, ["rel-met"]);
  assert.deepEqual(loadSaved(storage, at(30)), { status: "expired" });
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(loadSaved(storage, at(31)), { status: "none" });
});

test("malformed, older-schema or tampered records are removed safely", () => {
  for (const raw of [
    "{not json",
    JSON.stringify({ schema: 99 }),
    JSON.stringify({
      schema: SCHEMA_VERSION,
      createdAt: t0.toISOString(),
      // A longer window than 30 days is not trusted.
      expiresAt: at(365).toISOString(),
      updatedAt: t0.toISOString(),
      answers: {},
      progress: {},
    }),
  ]) {
    const storage = memory();
    storage.setItem(STORAGE_KEY, raw);
    assert.deepEqual(loadSaved(storage, t0), { status: "invalid" });
    assert.equal(storage.getItem(STORAGE_KEY), null);
  }
});

test("unknown answer values and bad ids are dropped on load", () => {
  const storage = memory();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schema: SCHEMA_VERSION,
      createdAt: t0.toISOString(),
      expiresAt: at(30).toISOString(),
      updatedAt: t0.toISOString(),
      answers: { relationship: "married", location: "mars" },
      applicable: ["rel-met"],
      progress: { checked: ["rel-met", 42, "Bad Id"], notApplicable: "x" },
    }),
  );
  const loaded = loadSaved(storage, at(1));
  assert.equal(loaded.status, "ok");
  assert.deepEqual(loaded.record.answers, { relationship: "married" });
  assert.deepEqual(loaded.record.progress, {
    checked: ["rel-met"],
    notApplicable: [],
  });
});

test("unavailable or failing storage never throws", () => {
  assert.deepEqual(loadSaved(null), { status: "unavailable" });
  assert.equal(saveChecklist(null, data, t0), null);
  assert.equal(deleteSaved(null), false);
  const broken = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("denied");
    },
  };
  assert.deepEqual(loadSaved(broken), { status: "unavailable" });
  assert.equal(saveChecklist(broken, data, t0), null);
  assert.equal(deleteSaved(broken), false);
});

test("delete removes the saved record", () => {
  const storage = memory();
  saveChecklist(storage, data, t0);
  assert.equal(deleteSaved(storage), true);
  assert.deepEqual(loadSaved(storage, t0), { status: "none" });
});


test("failed removal never claims expired or invalid records were deleted", () => {
  const storage = memory();
  storage.removeItem = () => { throw new Error("blocked"); };
  storage.map.set(STORAGE_KEY, "malformed");
  assert.deepEqual(loadSaved(storage, t0), { status: "unavailable" });
  assert.equal(storage.getItem(STORAGE_KEY), "malformed");
  const saved = saveChecklist(memory(), data, t0);
  const raw = JSON.stringify(saved);
  storage.map.set(STORAGE_KEY, raw);
  assert.deepEqual(loadSaved(storage, at(31)), { status: "unavailable" });
  assert.equal(deleteSaved(storage), false);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});
