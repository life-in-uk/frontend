// Optional, guest-only saving of the Family & Visa checklist on this device.
//
// Saved only when the person chooses "保存在这台设备上（30 天）". The record
// holds answers (categories only) and which checklist tasks are ticked or
// marked not applicable — never names, document numbers, amounts or files.
// It expires 30 days after it was first saved (a fixed window, not renewed on
// each change). Expired, malformed or older-schema records are removed.

import { validateAnswers } from "./familyVisaJourney.ts";
import type { Answers } from "./familyVisaJourney.ts";
import type { Progress } from "./familyVisaChecklist.ts";

export const STORAGE_KEY = "lifeinuk.familyVisa.checklist";
export const SCHEMA_VERSION = 1;
export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const ID = /^[a-z0-9-]{1,80}$/;

export type SavedChecklist = {
  schema: typeof SCHEMA_VERSION;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  answers: Answers;
  /** Applicable task ids when last saved (informational; recomputed on load). */
  applicable: string[];
  progress: { checked: string[]; notApplicable: string[] };
};

export type LoadResult =
  | { status: "none" }
  | { status: "ok"; record: SavedChecklist }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "unavailable" };

/** The Storage API subset used here; injectable for tests. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** localStorage, or null when it is missing or throws (privacy modes). */
export function deviceStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}.probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

const ids = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((v): v is string => typeof v === "string" && ID.test(v)),
        ),
      ]
    : [];

function isInstant(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/** A validated record, or null when anything is missing or malformed. */
export function parseRecord(raw: string): SavedChecklist | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (record.schema !== SCHEMA_VERSION) return null;
  if (
    !isInstant(record.createdAt) ||
    !isInstant(record.expiresAt) ||
    !isInstant(record.updatedAt)
  )
    return null;
  // The window is fixed: anything longer than 30 days is not trusted.
  if (
    Date.parse(record.expiresAt) - Date.parse(record.createdAt) !==
    RETENTION_DAYS * DAY_MS
  )
    return null;
  const progress =
    typeof record.progress === "object" && record.progress !== null
      ? (record.progress as Record<string, unknown>)
      : {};
  return {
    schema: SCHEMA_VERSION,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    updatedAt: record.updatedAt,
    answers: validateAnswers(record.answers),
    applicable: ids(record.applicable),
    progress: {
      checked: ids(progress.checked),
      notApplicable: ids(progress.notApplicable),
    },
  };
}

export function loadSaved(
  storage: StorageLike | null,
  now: Date = new Date(),
): LoadResult {
  if (!storage) return { status: "unavailable" };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (raw === null) return { status: "none" };
  const record = parseRecord(raw);
  if (!record) {
    return { status: deleteSaved(storage) ? "invalid" : "unavailable" };
  }
  if (Date.parse(record.expiresAt) <= now.getTime()) {
    return { status: deleteSaved(storage) ? "expired" : "unavailable" };
  }
  return { status: "ok", record };
}

/**
 * Saves answers and progress. A new record starts a 30-day window; an
 * existing valid record keeps its original creation and expiry dates.
 * Returns the saved record, or null if the device refused to store it.
 */
export function saveChecklist(
  storage: StorageLike | null,
  data: { answers: Answers; applicable: readonly string[]; progress: Progress },
  now: Date = new Date(),
): SavedChecklist | null {
  if (!storage) return null;
  const existing = loadSaved(storage, now);
  const createdAt =
    existing.status === "ok" ? existing.record.createdAt : now.toISOString();
  const record: SavedChecklist = {
    schema: SCHEMA_VERSION,
    createdAt,
    expiresAt: new Date(
      Date.parse(createdAt) + RETENTION_DAYS * DAY_MS,
    ).toISOString(),
    updatedAt: now.toISOString(),
    answers: validateAnswers(data.answers),
    applicable: ids(data.applicable),
    progress: {
      checked: ids(data.progress.checked),
      notApplicable: ids(data.progress.notApplicable),
    },
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

export function deleteSaved(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
