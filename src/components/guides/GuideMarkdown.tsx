import { Fragment } from "react";
import type { ReactNode } from "react";
import { ExternalLink, FileCheck2 } from "lucide-react";
import type { GuideEvidence, GuideSource } from "../../guides/api";
import { isSafeExternalUrl } from "../../guides/api";
import type { Block, Inline } from "../../guides/markdown";
import {
  EVIDENCE_PREFIX,
  evidenceKeys,
  inlineText,
} from "../../guides/markdown";
import type { GuideDomain } from "../../guides/domains";
import { guidePath } from "../../guides/domains";
import { Link } from "../Link";
import { EvidencePanel } from "./EvidencePanel";

type Props = {
  /** The domain the article renders in; resolves its 《title》 references. */
  domain: GuideDomain;
  blocks: Block[];
  evidence: Map<string, GuideEvidence>;
  sources: Map<string, GuideSource>;
  open: ReadonlySet<string>;
  onToggle: (occurrenceId: string) => void;
};

/**
 * Renders parsed Guide Markdown as React elements. Each "查看官方依据" link
 * becomes a disclosure button; its panel opens right after the paragraph or
 * list item that contains it.
 */
export function GuideMarkdown({
  domain,
  blocks,
  evidence,
  sources,
  open,
  onToggle,
}: Props) {
  // Occurrence ids are assigned in document order so repeated keys stay distinct.
  let counter = 0;
  const nextId = (key: string) => `evidence-${key}-${counter++}`;

  function renderInline(nodes: Inline[], ids: string[]): ReactNode[] {
    return nodes.map((node, index) => {
      switch (node.type) {
        case "text":
          return (
            <Fragment key={index}>
              {linkTitleReferences(node.value, domain)}
            </Fragment>
          );
        case "code":
          return <code key={index}>{node.value}</code>;
        case "strong":
          return (
            <strong key={index}>{renderInline(node.children, ids)}</strong>
          );
        case "em":
          return <em key={index}>{renderInline(node.children, ids)}</em>;
        case "link": {
          if (node.href.startsWith(EVIDENCE_PREFIX)) {
            const id =
              ids.shift() ?? nextId(node.href.slice(EVIDENCE_PREFIX.length));
            const expanded = open.has(id);
            return (
              <button
                key={index}
                type="button"
                className="evidence-toggle"
                aria-expanded={expanded}
                aria-controls={expanded ? id : undefined}
                onClick={() => onToggle(id)}
              >
                <FileCheck2 size={14} aria-hidden="true" />
                {inlineText(node.children) || "查看官方依据"}
              </button>
            );
          }
          if (node.href.startsWith("/"))
            return (
              <Link key={index} to={node.href}>
                {renderInline(node.children, ids)}
              </Link>
            );
          if (isSafeExternalUrl(node.href))
            return (
              <a
                key={index}
                href={node.href}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                {renderInline(node.children, ids)}
                <ExternalLink size={13} aria-hidden="true" />
                <span className="sr-only">（在新窗口打开）</span>
              </a>
            );
          return (
            <Fragment key={index}>{renderInline(node.children, ids)}</Fragment>
          );
        }
      }
    });
  }

  /** Assigns occurrence ids for the evidence links inside one container. */
  function idsFor(nodes: Inline[]): { ids: string[]; panels: ReactNode[] } {
    const ids = evidenceKeys(nodes).map((key) => nextId(key));
    const panels = ids
      .filter((id) => open.has(id))
      .map((id) => {
        const key = id.replace(/^evidence-/, "").replace(/-\d+$/, "");
        return (
          <EvidencePanel
            key={id}
            id={id}
            evidence={evidence.get(key)}
            sources={sources}
            isExampleSource={domain.isExampleSource}
          />
        );
      });
    return { ids, panels };
  }

  function renderBlocks(list: Block[]): ReactNode[] {
    return list.map((block, index) => {
      switch (block.type) {
        case "heading": {
          const { ids, panels } = idsFor(block.children);
          const Tag = block.level <= 2 ? "h2" : block.level === 3 ? "h3" : "h4";
          return (
            <Fragment key={index}>
              <Tag>{renderInline(block.children, ids)}</Tag>
              {panels}
            </Fragment>
          );
        }
        case "paragraph": {
          const { ids, panels } = idsFor(block.children);
          return (
            <Fragment key={index}>
              <p>{renderInline(block.children, ids)}</p>
              {panels}
            </Fragment>
          );
        }
        case "list": {
          const items = block.items.map((item, itemIndex) => {
            const { ids, panels } = idsFor(item);
            return (
              <li key={itemIndex}>
                {renderInline(item, ids)}
                {panels}
              </li>
            );
          });
          return block.ordered ? (
            <ol key={index} start={block.start === 1 ? undefined : block.start}>
              {items}
            </ol>
          ) : (
            <ul key={index}>{items}</ul>
          );
        }
        case "blockquote":
          return (
            <blockquote key={index}>{renderBlocks(block.children)}</blockquote>
          );
        case "rule":
          return <hr key={index} />;
      }
    });
  }

  return <>{renderBlocks(blocks)}</>;
}

/**
 * Turns 《title》 references to this domain's Guides into internal links under
 * the same domain; text is unchanged. Titles from other domains stay text.
 */
function linkTitleReferences(text: string, domain: GuideDomain): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /《([^》]+)》/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const slug = Object.hasOwn(domain.titleReferences, match[1])
      ? domain.titleReferences[match[1]]
      : undefined;
    if (!slug) continue;
    const start = match.index ?? 0;
    parts.push(text.slice(last, start), "《");
    parts.push(
      <Link
        key={start}
        to={guidePath(domain, slug)}
        className="guide-reference"
      >
        {match[1]}
      </Link>,
    );
    parts.push("》");
    last = start + match[0].length;
  }
  if (parts.length === 0) return text;
  parts.push(text.slice(last));
  return parts;
}
