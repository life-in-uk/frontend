import test from "node:test";
import assert from "node:assert/strict";
import {
  evidenceKeys,
  inlineText,
  parseInline,
  parseMarkdown,
} from "../src/guides/markdown.ts";

test("parses headings, paragraphs, lists, ordered lists, blockquotes and rules", () => {
  const blocks = parseMarkdown(
    [
      "# 标题",
      "",
      "> 这篇讲的是**英格兰**。",
      "> 第二行",
      "",
      "## 小节",
      "第一行",
      "接着一行",
      "",
      "- 甲",
      "- 乙",
      "  续行",
      "",
      "3. 三",
      "4. 四",
      "",
      "---",
      "### 三级",
    ].join("\n"),
  );
  assert.deepEqual(
    blocks.map((b) => b.type),
    [
      "heading",
      "blockquote",
      "heading",
      "paragraph",
      "list",
      "list",
      "rule",
      "heading",
    ],
  );
  assert.equal(blocks[0].level, 1);
  assert.equal(
    inlineText(blocks[1].children[0].children),
    "这篇讲的是英格兰。 第二行",
  );
  assert.equal(inlineText(blocks[3].children), "第一行 接着一行");
  assert.equal(blocks[4].ordered, false);
  assert.equal(inlineText(blocks[4].items[1].children), "乙 续行");
  assert.equal(blocks[5].ordered, true);
  assert.equal(blocks[5].start, 3);
  assert.equal(blocks[7].level, 3);
});

test("a blockquote at the start of content terminates (regression)", () => {
  const blocks = parseMarkdown("> only a quote");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "blockquote");
});

test("parses emphasis, inline code, links and escapes", () => {
  assert.deepEqual(parseInline("a **b** *c* `d` \\*e"), [
    { type: "text", value: "a " },
    { type: "strong", children: [{ type: "text", value: "b" }] },
    { type: "text", value: " " },
    { type: "em", children: [{ type: "text", value: "c" }] },
    { type: "text", value: " " },
    { type: "code", value: "d" },
    { type: "text", value: " *e" },
  ]);
  assert.deepEqual(parseInline("[NHS](https://www.nhs.uk/)"), [
    {
      type: "link",
      href: "https://www.nhs.uk/",
      children: [{ type: "text", value: "NHS" }],
    },
  ]);
});

test("autolinks bare URLs without swallowing trailing punctuation", () => {
  const nodes = parseInline(
    "见 https://www.nhs.uk/a/b。然后 https://gov.uk/x).",
  );
  const links = nodes.filter((n) => n.type === "link").map((n) => n.href);
  assert.deepEqual(links, ["https://www.nhs.uk/a/b", "https://gov.uk/x"]);
});

test("raw HTML stays plain text", () => {
  const nodes = parseInline("<script>alert(1)</script>");
  assert.deepEqual(nodes, [
    { type: "text", value: "<script>alert(1)</script>" },
  ]);
});

test("collects evidence keys in document order, including nested ones", () => {
  const nodes = parseInline(
    "甲 [查看官方依据](#guide-evidence-one) **乙 [查看官方依据](#guide-evidence-two)** [外链](https://x.uk)",
  );
  assert.deepEqual(evidenceKeys(nodes), ["one", "two"]);
});

test("indented continuation lines still join their list item (regression)", () => {
  const [list] = parseMarkdown("- 甲\n  接着写\n    再一行\n- 乙");
  assert.equal(list.items.length, 2);
  assert.equal(inlineText(list.items[0].children), "甲 接着写 再一行");
  assert.equal(list.items[0].sublist, undefined);
  assert.equal(list.items[0].task, undefined);
});

test("one level of nested unordered items under unordered and ordered parents", () => {
  const blocks = parseMarkdown(
    [
      "- 一些例子：",
      "  - 甲 [查看依据](#guide-evidence-a)",
      "    续行",
      "  - 乙",
      "- 后面",
      "",
      "3. **找**替代：",
      "   - 丙；",
      "   - 丁",
      "4. 下一步",
    ].join("\n"),
  );
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["list", "list"],
  );
  const [unordered, ordered] = blocks;
  assert.equal(unordered.items.length, 2);
  assert.equal(inlineText(unordered.items[0].children), "一些例子：");
  const nested = unordered.items[0].sublist;
  assert.equal(nested.ordered, false);
  assert.deepEqual(
    nested.items.map((item) => inlineText(item.children)),
    ["甲 查看依据 续行", "乙"],
  );
  assert.deepEqual(evidenceKeys(nested.items[0].children), ["a"]);
  assert.equal(inlineText(unordered.items[1].children), "后面");
  assert.equal(ordered.ordered, true);
  assert.equal(ordered.start, 3);
  assert.equal(ordered.items.length, 2);
  assert.deepEqual(
    ordered.items[0].sublist.items.map((item) => inlineText(item.children)),
    ["丙；", "丁"],
  );
  // No literal markers leak into item text.
  for (const item of [...unordered.items, ...ordered.items])
    assert.doesNotMatch(inlineText(item.children), /(^|\s)- /);
});

test("task-list items parse as read-only open/done items, others stay plain", () => {
  const [list] = parseMarkdown(
    "- [ ] 我要申请的是**哪家银行**？\n- [x] 已经确认\n- [X] 大写也算\n- 普通一项\n- [链接](https://x.uk) 不是任务",
  );
  assert.deepEqual(
    list.items.map((item) => item.task),
    ["open", "done", "done", undefined, undefined],
  );
  assert.equal(inlineText(list.items[0].children), "我要申请的是哪家银行？");
  assert.equal(list.items[0].children[1].type, "strong");
  assert.equal(list.items[4].children[0].type, "link");
});

test("a different list marker type starts a new list", () => {
  const blocks = parseMarkdown("- a\n1. b\n2. c");
  assert.deepEqual(
    blocks.map((b) => [b.type, b.ordered, b.items.length]),
    [
      ["list", false, 1],
      ["list", true, 2],
    ],
  );
});
