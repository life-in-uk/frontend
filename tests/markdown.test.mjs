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
  assert.equal(inlineText(blocks[4].items[1]), "乙 续行");
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
