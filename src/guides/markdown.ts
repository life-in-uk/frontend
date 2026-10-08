// A small, safe Markdown parser for published Guide content.
// It produces a plain AST; the renderer turns it into React elements, so no
// HTML from content is ever injected into the page.

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { type: "heading"; level: number; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | ListBlock
  | { type: "blockquote"; children: Block[] }
  | { type: "rule" };

export type ListBlock = {
  type: "list";
  ordered: boolean;
  start: number;
  items: ListItem[];
};

export type ListItem = {
  children: Inline[];
  /** A Markdown task item ("[ ]" / "[x]"); presented read-only. */
  task?: "open" | "done";
  /** One level of nested unordered items. */
  sublist?: ListBlock;
};

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const UNORDERED = /^\s{0,3}[-*+]\s+(.*)$/;
const ORDERED = /^\s{0,3}(\d{1,9})[.)]\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const RULE = /^\s{0,3}(?:-\s*){3,}$|^\s{0,3}(?:\*\s*){3,}$/;
// Any list marker at any indent: indent, marker, spacing, text.
const MARKER = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  return parseBlocks(lines);
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index++;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        children: parseInline(heading[2]),
      });
      index++;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ type: "rule" });
      index++;
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && QUOTE.test(lines[index])) {
        quoted.push(QUOTE.exec(lines[index])![1]);
        index++;
      }
      blocks.push({ type: "blockquote", children: parseBlocks(quoted) });
      continue;
    }
    if (UNORDERED.test(line) || ORDERED.test(line)) {
      const parsed = parseList(lines, index);
      blocks.push(parsed.list);
      index = parsed.next;
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !HEADING.test(lines[index]) &&
      !QUOTE.test(lines[index]) &&
      !UNORDERED.test(lines[index]) &&
      !ORDERED.test(lines[index]) &&
      !RULE.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index++;
    }
    blocks.push({
      type: "paragraph",
      children: parseInline(paragraph.join(" ")),
    });
  }
  return blocks;
}

type RawItem = { text: string; nested: string[] };

/**
 * A list starting at `start`. Items share the first item's marker type.
 * Unordered markers indented to the current item's text become one nested
 * level (deeper markers stay at that level); other indented lines continue
 * the previous item. A blank line or unindented text ends the list.
 */
function parseList(
  lines: string[],
  start: number,
): { list: ListBlock; next: number } {
  const first = MARKER.exec(lines[start])!;
  const ordered = /\d/.test(first[2]);
  const items: RawItem[] = [];
  // Column where the current item's text starts; nested markers reach it.
  let contentColumn = Infinity;
  let index = start;
  while (index < lines.length) {
    const current = lines[index];
    const marker = MARKER.exec(current);
    const indent = marker ? marker[1].length : 0;
    const markerOrdered = marker ? /\d/.test(marker[2]) : false;
    if (marker && indent <= 3 && indent < contentColumn) {
      if (markerOrdered !== ordered) break;
      items.push({ text: marker[4], nested: [] });
      contentColumn = indent + marker[2].length + marker[3].length;
    } else if (marker && !markerOrdered && indent >= contentColumn) {
      items[items.length - 1].nested.push(marker[4]);
    } else if (
      items.length > 0 &&
      current.trim() !== "" &&
      /^\s{2,}\S/.test(current)
    ) {
      // Indented continuation of the previous item (or nested item).
      const item = items[items.length - 1];
      if (item.nested.length > 0)
        item.nested[item.nested.length - 1] += " " + current.trim();
      else item.text += " " + current.trim();
    } else break;
    index++;
  }
  return {
    list: {
      type: "list",
      ordered,
      start: ordered ? Number(first[2].slice(0, -1)) : 1,
      items: items.map((item) => ({
        ...listItem(item.text),
        ...(item.nested.length > 0 && {
          sublist: {
            type: "list" as const,
            ordered: false,
            start: 1,
            items: item.nested.map(listItem),
          },
        }),
      })),
    },
    next: index,
  };
}

function listItem(text: string): ListItem {
  const task = TASK.exec(text);
  if (!task) return { children: parseInline(text) };
  return {
    children: parseInline(task[2]),
    task: task[1] === " " ? "open" : "done",
  };
}

// Bare URLs end before whitespace, CJK punctuation or a closing bracket.
const BARE_URL = /^https?:\/\/[^\s<>"'，。；：！？、）》」』【】]+/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) {
      const last = out[out.length - 1];
      if (last && last.type === "text") last.value += buffer;
      else out.push({ type: "text", value: buffer });
      buffer = "";
    }
  };
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (
      char === "\\" &&
      i + 1 < text.length &&
      /[\\`*_[\]()#>+\-.!]/.test(text[i + 1])
    ) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }
    if (char === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ type: "code", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text.startsWith("**", i) || text.startsWith("__", i)) {
      const marker = text.slice(i, i + 2);
      const end = text.indexOf(marker, i + 2);
      if (end > i + 2) {
        flush();
        out.push({
          type: "strong",
          children: parseInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }
    if (
      (char === "*" || char === "_") &&
      text[i + 1] !== char &&
      text[i + 1] !== " "
    ) {
      const end = text.indexOf(char, i + 1);
      if (end > i + 1 && text[end - 1] !== " ") {
        flush();
        out.push({ type: "em", children: parseInline(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (char === "[") {
      const link = matchLink(text, i);
      if (link) {
        flush();
        out.push({
          type: "link",
          href: link.href,
          children: parseInline(link.label),
        });
        i = link.end;
        continue;
      }
    }
    if (char === "h") {
      const url = BARE_URL.exec(text.slice(i));
      if (url) {
        // Do not swallow trailing ASCII punctuation into the URL.
        const value = url[0].replace(/[.,;:!?)]+$/, "");
        flush();
        out.push({
          type: "link",
          href: value,
          children: [{ type: "text", value }],
        });
        i += value.length;
        continue;
      }
    }
    buffer += char;
    i++;
  }
  flush();
  return out;
}

function matchLink(
  text: string,
  start: number,
): { label: string; href: string; end: number } | null {
  let depth = 0;
  let close = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "\\") {
      i++;
      continue;
    }
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0 || text[close + 1] !== "(") return null;
  const end = text.indexOf(")", close + 2);
  if (end < 0) return null;
  const href = text.slice(close + 2, end).trim();
  if (!href || /\s/.test(href)) return null;
  return { label: text.slice(start + 1, close), href, end: end + 1 };
}

/** Plain text of inline nodes, used for comparisons and accessible names. */
export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) =>
      node.type === "text" || node.type === "code"
        ? node.value
        : inlineText(node.children),
    )
    .join("");
}

export const EVIDENCE_PREFIX = "#guide-evidence-";

/** Evidence keys referenced by "查看官方依据" links, in document order. */
export function evidenceKeys(nodes: Inline[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.type === "link" && node.href.startsWith(EVIDENCE_PREFIX))
      keys.push(node.href.slice(EVIDENCE_PREFIX.length));
    else if (
      node.type === "strong" ||
      node.type === "em" ||
      node.type === "link"
    )
      keys.push(...evidenceKeys(node.children));
  }
  return keys;
}
