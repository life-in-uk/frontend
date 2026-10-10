// Family & Visa wording fixtures for public tests.
//
// `syntheticContent()` builds placeholder wording for every passage, task,
// section and topic, reviewed for the current Guide versions. It exercises
// the publication and version gates without any real (unpublished) wording.
//
// `localContent()` returns the gitignored local wording file when present,
// for tests that must check it; such tests skip explicitly without it.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CHECKLIST_SECTIONS } from "../../src/guides/familyVisaChecklist.ts";
import {
  allPassages,
  JOURNEY_GUIDES,
} from "../../src/guides/familyVisaJourney.ts";
import { FAMILY_VISA_TOPICS } from "../../src/router.ts";

export function syntheticContent() {
  return {
    reviewedFor: Object.fromEntries(
      Object.entries(JOURNEY_GUIDES).map(([id, g]) => [
        id,
        g.reviewedUpdatedAt,
      ]),
    ),
    passages: Object.fromEntries(
      allPassages().map((p) => [p.id, { text: [`示例文字 ${p.id}`] }]),
    ),
    tasks: Object.fromEntries(
      CHECKLIST_SECTIONS.flatMap((s) => s.tasks).map((t) => [
        t.id,
        { summary: `示例说明 ${t.id}`, steps: [`示例步骤 ${t.id}`] },
      ]),
    ),
    sections: Object.fromEntries(
      CHECKLIST_SECTIONS.map((s) => [s.id, { intro: `示例介绍 ${s.id}` }]),
    ),
    topics: Object.fromEntries(
      FAMILY_VISA_TOPICS.map((id) => [id, { intro: `示例专题 ${id}` }]),
    ),
  };
}

export const LOCAL_CONTENT_PATH = fileURLToPath(
  new URL("../../dev/familyVisaDraftContent.ts", import.meta.url),
);

/** The local wording file's content, or null when it is not present. */
export async function localContent() {
  if (!existsSync(LOCAL_CONTENT_PATH)) return null;
  const module = await import(LOCAL_CONTENT_PATH);
  return module.FAMILY_VISA_DRAFT_CONTENT;
}
