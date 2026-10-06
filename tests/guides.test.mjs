import test from "node:test";
import assert from "node:assert/strict";
import {
  getGuide,
  getGuides,
  GuideNotFoundError,
  isGuideDetail,
  isGuideList,
  isSafeExternalUrl,
} from "../src/guides/api.ts";
import {
  formatUkDate,
  groupForSlug,
  groupHealthGuides,
  HEALTH_HUB_GROUPS,
  HEALTH_INTENTS,
  HEALTH_QUICK_LINKS,
  isExampleSource,
  RELATED_GUIDES,
  shortGuideTitle,
} from "../src/guides/catalog.ts";
import { matchRoute } from "../src/router.ts";

const meta = (slug, overrides = {}) => ({
  slug,
  category: "health-nhs",
  title: `标题 ${slug}`,
  summary: "摘要",
  publishedAt: "2026-10-05T06:17:00Z",
  updatedAt: "2026-10-05T06:17:00Z",
  ...overrides,
});
const detail = (slug = "nhs-dentist-england", overrides = {}) => ({
  ...meta(slug),
  content: "# 标题\n\n正文 [查看官方依据](#guide-evidence-fees)",
  sources: [
    {
      key: "nhs-fees",
      organisation: "NHS",
      title: "NHS dental charges",
      url: "https://www.nhs.uk/nhs-services/dentists/dental-costs/",
      accessedAt: "2026-10-05T06:11:45Z",
    },
  ],
  evidence: [
    {
      key: "fees",
      statement: "Band 1 收费",
      supports: [
        {
          sourceKey: "nhs-fees",
          locator: "Band 1",
          excerpt: null,
          note: "说明",
        },
      ],
    },
  ],
  ...overrides,
});
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("accepts the published list and detail shapes, with nullable support fields", () => {
  assert.equal(isGuideList([meta("a-b"), meta("c")]), true);
  assert.equal(isGuideList([]), true);
  assert.equal(isGuideDetail(detail()), true);
  const allNull = detail();
  allNull.evidence[0].supports[0] = {
    sourceKey: "nhs-fees",
    locator: null,
    excerpt: null,
    note: null,
  };
  assert.equal(isGuideDetail(allNull), true);
});

test("rejects malformed metadata", () => {
  for (const bad of [
    null,
    {},
    [meta("x")],
    meta("Bad Slug"),
    meta("../etc"),
    meta("x", { title: " " }),
    meta("x", { summary: 1 }),
    meta("x", { updatedAt: "2026-10-05" }),
    meta("x", { publishedAt: "not a date" }),
  ]) {
    assert.equal(isGuideList([bad]), false);
  }
  assert.equal(isGuideList({ guides: [] }), false);
});

test("rejects malformed detail, sources, evidence and unsafe source URLs", () => {
  const cases = [
    detail(undefined, { content: "" }),
    detail(undefined, { sources: null }),
    detail(undefined, { evidence: {} }),
  ];
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "/relative",
    "",
  ]) {
    const d = detail();
    d.sources[0].url = url;
    cases.push(d);
  }
  const noStatement = detail();
  noStatement.evidence[0].statement = "";
  cases.push(noStatement);
  const badSupport = detail();
  badSupport.evidence[0].supports[0].locator = 3;
  cases.push(badSupport);
  for (const value of cases) assert.equal(isGuideDetail(value), false);
  assert.equal(isSafeExternalUrl("https://www.gov.uk/"), true);
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
});

test("getGuides requests /api/guides, preserves backend order and passes the signal", async (t) => {
  const list = [meta("z-last"), meta("a-first")];
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    return json(list);
  });
  const controller = new AbortController();
  const guides = await getGuides(controller.signal);
  assert.deepEqual(
    guides.map((g) => g.slug),
    ["z-last", "a-first"],
  );
  assert.equal(calls[0].url, "/api/guides");
  assert.equal(calls[0].init.signal, controller.signal);
});

test("getGuides throws on HTTP errors and invalid payloads, with no fallback", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    json({ code: "GUIDES_READ_FAILED" }, 500),
  );
  await assert.rejects(getGuides(), /Guides unavailable/);
  fetchMock.mock.mockImplementation(async () => json([{ slug: "x" }]));
  await assert.rejects(getGuides(), /Invalid Guides response/);
});

test("getGuides propagates aborts", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    init.signal.throwIfAborted();
    return json([]);
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(getGuides(controller.signal), { name: "AbortError" });
});

test("getGuide fetches by slug and distinguishes not found from other failures", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "/api/guides/nhs-dentist-england");
    return json(detail());
  });
  const guide = await getGuide("nhs-dentist-england");
  assert.equal(guide.evidence[0].key, "fees");

  fetchMock.mock.mockImplementation(async () =>
    json({ code: "GUIDE_NOT_FOUND", message: "Guide not found." }, 404),
  );
  await assert.rejects(getGuide("nhs-dentist-england"), GuideNotFoundError);

  fetchMock.mock.mockImplementation(async () => json({}, 500));
  await assert.rejects(getGuide("nhs-dentist-england"), (error) => {
    assert.equal(error instanceof GuideNotFoundError, false);
    return true;
  });

  // A response for a different slug is not accepted.
  fetchMock.mock.mockImplementation(async () => json(detail("other-guide")));
  await assert.rejects(
    getGuide("nhs-dentist-england"),
    /Invalid Guide response/,
  );
});

test("getGuide rejects malformed slugs without calling the network", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    json(detail()),
  );
  for (const slug of ["../admin", "A", "a b", ""]) {
    await assert.rejects(getGuide(slug), GuideNotFoundError);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("groups health Guides by editorial section and keeps unplaced Guides visible", () => {
  const slugs = HEALTH_HUB_GROUPS.flatMap((group) => group.slugs);
  assert.equal(slugs.length, 9);
  assert.equal(new Set(slugs).size, 9);
  const guides = [
    ...slugs.map((slug) => meta(slug)).reverse(),
    meta("brand-new-guide"),
    meta("transport-guide", { category: "transport" }),
  ];
  const sections = groupHealthGuides(guides);
  assert.deepEqual(
    sections.map((s) => s.group.title),
    [
      "刚来英国？从这里开始",
      "我现在生病了",
      "药和长期疾病",
      "牙齿",
      "更多健康指南",
    ],
  );
  assert.deepEqual(
    sections[0].guides.map((g) => g.slug),
    [
      "nhs-ihs-costs-england",
      "registering-with-a-gp-england",
      "visiting-parents-healthcare-england",
    ],
  );
  assert.deepEqual(
    sections[3].guides.map((g) => g.slug),
    ["nhs-dentist-england", "urgent-dental-care-england"],
  );
  assert.deepEqual(
    sections[4].guides.map((g) => g.slug),
    ["brand-new-guide"],
  );
});

test("omits empty sections when Guides are missing", () => {
  const sections = groupHealthGuides([meta("nhs-dentist-england")]);
  assert.deepEqual(
    sections.map((s) => s.group.id),
    ["dental"],
  );
  assert.deepEqual(groupHealthGuides([]), []);
});

test("navigation data only references known Guide slugs", () => {
  const known = new Set(HEALTH_HUB_GROUPS.flatMap((group) => group.slugs));
  for (const link of HEALTH_QUICK_LINKS)
    assert.ok(known.has(link.slug), link.slug);
  for (const intent of HEALTH_INTENTS)
    assert.ok(known.has(intent.slug), intent.slug);
  for (const [from, targets] of Object.entries(RELATED_GUIDES)) {
    assert.ok(known.has(from), from);
    for (const target of targets) {
      assert.ok(known.has(target), target);
      assert.notEqual(target, from);
    }
  }
});

test("labels clinic price sources as examples and formats dates in UK time", () => {
  assert.equal(
    isExampleSource({
      key: "example-whites-dental-fees",
      title: "Fees（诊所自行公布的价格，仅作举例）",
    }),
    true,
  );
  assert.equal(
    isExampleSource({ key: "nhs-fees", title: "NHS dental charges" }),
    false,
  );
  assert.equal(formatUkDate("2026-10-05T06:11:45Z"), "2026 年 10 月 5 日");
  // 23:30 UTC on 4 October is already 5 October in London (BST).
  assert.equal(formatUkDate("2026-10-04T23:30:00Z"), "2026 年 10 月 5 日");
});

test("matches routes", () => {
  assert.deepEqual(matchRoute("/"), { name: "home" });
  assert.deepEqual(matchRoute("/health"), { name: "health" });
  assert.deepEqual(matchRoute("/health/"), { name: "health" });
  assert.deepEqual(matchRoute("/health/nhs-dentist-england"), {
    name: "guide",
    slug: "nhs-dentist-england",
  });
  assert.deepEqual(matchRoute("/health/a/b"), { name: "not-found" });
  assert.deepEqual(matchRoute("/health/%E0%A4%A"), { name: "not-found" });
  assert.deepEqual(matchRoute("/elsewhere"), { name: "not-found" });
});

test("each category has a distinct visual tone and Guides map back to it", () => {
  assert.deepEqual(
    HEALTH_HUB_GROUPS.map((group) => group.tone),
    ["blue", "coral", "green", "lavender"],
  );
  assert.equal(groupForSlug("urgent-dental-care-england").id, "dental");
  assert.equal(groupForSlug("unknown-guide"), undefined);
});

test("short Guide titles cut only at the first question mark, never inventing text", () => {
  assert.equal(
    shortGuideTitle("刚到英国怎么注册 GP？没有地址证明、NHS Number 也可以吗？"),
    "刚到英国怎么注册 GP？",
  );
  assert.equal(shortGuideTitle("突然牙疼怎么办？"), "突然牙疼怎么办？");
  assert.equal(shortGuideTitle("没有问号的标题"), "没有问号的标题");
});
