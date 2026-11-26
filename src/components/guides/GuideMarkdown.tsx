import { Fragment } from "react";
import type { ReactNode } from "react";
import { Check, ExternalLink, FileCheck2 } from "lucide-react";
import type { GuideEvidence, GuideSource } from "../../guides/api";
import { isSafeExternalUrl } from "../../guides/api";
import type { Block, Inline, ListBlock } from "../../guides/markdown";
import {
  EVIDENCE_PREFIX,
  evidenceKeys,
  inlineText,
} from "../../guides/markdown";
import type { GuideDomain } from "../../guides/domains";
import { GUIDE_UI, guideRoutePath, type GuideLocale } from "../../guides/locales";
import { NO_REFERENCES, splitTitleReferences, type TitleReferences } from "../../guides/titleReferences";
import { Link } from "../Link";
import { EvidencePanel } from "./EvidencePanel";

type Props = {
  /** The domain the article renders in; reference links stay inside it. */
  domain: GuideDomain;
  locale?: GuideLocale;
  /** Published Guides this article may link by title (see titleReferences.ts). */
  references?: TitleReferences;
  blocks: Block[];
  evidence: Map<string, GuideEvidence>;
  sources: Map<string, GuideSource>;
  open: ReadonlySet<string>;
  onToggle: (occurrenceId: string) => void;
  /** Anchor ids for top-level section headings (guideSections), for the "On this page" list. */
  sectionIds?: ReadonlyMap<Block, string>;
};

/**
 * Renders parsed Guide Markdown as React elements. Each evidence link (its
 * label comes from the content) becomes a disclosure button; its panel opens
 * right after the paragraph or list item that contains it.
 */
export function GuideMarkdown({
  domain,
  locale = "zh-CN",
  references = NO_REFERENCES,
  blocks,
  evidence,
  sources,
  open,
  onToggle,
  sectionIds,
}: Props) {
  const ui = GUIDE_UI[locale];
  // Occurrence ids are assigned in document order so repeated keys stay distinct.
  let counter = 0;
  const nextId = (key: string) => `evidence-${key}-${counter++}`;

  function renderInline(nodes: Inline[], ids: string[]): ReactNode[] {
    return nodes.map((node, index) => {
      switch (node.type) {
        case "text":
          return (
            <Fragment key={index}>
              {linkTitleReferences(node.value, references, (slug) => guideRoutePath(locale, domain.id, slug))}
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
                {inlineText(node.children) || ui.evidenceLink}
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
                <span className="sr-only">{ui.newWindow}</span>
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
            locale={locale}
          />
        );
      });
    return { ids, panels };
  }

  /**
   * Lists, with one nested level. Task items are a read-only checklist: a
   * drawn marker, never a form control, since nothing is saved.
   */
  function renderList(block: ListBlock, key: number): ReactNode {
    const items = block.items.map((item, itemIndex) => {
      const { ids, panels } = idsFor(item.children);
      return (
        <li
          key={itemIndex}
          className={item.task ? `task-item task-${item.task}` : undefined}
        >
          {item.task && (
            <span className="task-marker" aria-hidden="true">
              {item.task === "done" && <Check size={12} strokeWidth={3} />}
            </span>
          )}
          {item.task === "done" && <span className="sr-only">{locale === "en" ? "(checked)" : locale === "ur" ? "(مکمل)" : locale === "hi" ? "(चिह्नित)" : "（已勾选）"}</span>}
          {renderInline(item.children, ids)}
          {panels}
          {item.sublist && renderList(item.sublist, 0)}
        </li>
      );
    });
    const className = block.items.every((item) => item.task)
      ? "task-list"
      : undefined;
    return block.ordered ? (
      <ol
        key={key}
        className={className}
        start={block.start === 1 ? undefined : block.start}
      >
        {items}
      </ol>
    ) : (
      <ul key={key} className={className}>
        {items}
      </ul>
    );
  }

  function renderBlocks(list: Block[]): ReactNode[] {
    return list.map((block, index) => {
      switch (block.type) {
        case "heading": {
          const { ids, panels } = idsFor(block.children);
          const Tag = block.level <= 2 ? "h2" : block.level === 3 ? "h3" : "h4";
          return (
            <Fragment key={index}>
              <Tag id={sectionIds?.get(block)}>{renderInline(block.children, ids)}</Tag>
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
        case "list":
          return renderList(block, index);
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
function linkTitleReferences(
  text: string,
  references: TitleReferences,
  path: (slug: string) => string,
): ReactNode {
  const parts = splitTitleReferences(text, references);
  if (parts.length === 1 && typeof parts[0] === "string") return text;
  return parts.map((part, index) =>
    typeof part === "string" ? (
      part
    ) : (
      <Link key={index} to={path(part.slug)} className="guide-reference">
        {part.text}
      </Link>
    ),
  );
}
