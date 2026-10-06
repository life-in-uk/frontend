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
  | { type: "list"; ordered: boolean; start: number; items: Inline[][] }
  | { type: "blockquote"; children: Block[] }
  | { type: "rule" };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const UNORDERED = /^\s{0,3}[-*+]\s+(.*)$/;
const ORDERED = /^\s{0,3}(\d{1,9})[.)]\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const RULE = /^\s{0,3}(?:-\s*){3,}$|^\s{0,3}(?:\*\s*){3,}$/;

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
    const unordered = UNORDERED.exec(line);
    const ordered = ORDERED.exec(line);
    if (unordered || ordered) {
      const isOrdered = !unordered;
      const pattern = isOrdered ? ORDERED : UNORDERED;
      const items: string[] = [];
      const start = ordered ? Number(ordered[1]) : 1;
      while (index < lines.length) {
        const current = lines[index];
        const match = pattern.exec(current);
        if (match) {
          items.push(isOrdered ? match[2] : match[1]);
          index++;
        } else if (
          items.length > 0 &&
          current.trim() !== "" &&
          /^\s{2,}\S/.test(current)
        ) {
          // Indented continuation of the previous item.
          items[items.length - 1] += " " + current.trim();
          index++;
        } else break;
      }
      blocks.push({
        type: "list",
        ordered: isOrdered,
        start,
        items: items.map((item) => parseInline(item)),
      });
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
