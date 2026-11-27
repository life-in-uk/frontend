// Records the Guide API responses used by tests/seo-rendered.ci.mjs from a live
// API (read-only GETs), trimmed to a few Guides so the fixture stays small:
//
//   node tests/fixtures/record-seo-api.mjs https://lifeinuk.info > tests/fixtures/seo-api.json
//
// Lists keep only the chosen Guides; the other locales (zh-TW, hi) are empty.
const api = process.argv[2] || "https://lifeinuk.info";
const SLUGS = ["renting-deposits-fees", "renting-tenancy-agreement", "graduate-visa-uk"];
const LOCALES = ["zh-CN", "en", "ur"];
const get = async (path) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(api + path);
    if (response.status === 429) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }
  throw new Error(`${path}: rate limited`);
};
const responses = {};
for (const locale of ["zh-CN", "zh-TW", "en", "ur", "hi"]) {
  const path = locale === "zh-CN" ? "/api/guides" : `/api/guides/locales/${locale}`;
  const list = LOCALES.includes(locale) ? (await get(path)).filter((guide) => SLUGS.includes(guide.slug)) : [];
  responses[path] = list;
  for (const guide of list) {
    const detail = locale === "zh-CN" ? `/api/guides/${guide.slug}` : `/api/guides/${guide.slug}/locales/${locale}`;
    responses[detail] = await get(detail);
  }
}
process.stdout.write(JSON.stringify({ recordedFrom: api, recordedAt: new Date().toISOString(), responses }, null, 1) + "\n");
