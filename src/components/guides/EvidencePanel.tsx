import { ExternalLink } from "lucide-react";
import type { GuideEvidence, GuideSource } from "../../guides/api";
import { formatUkDate, sourceTextLang } from "../../guides/format";

type Props = {
  id: string;
  evidence: GuideEvidence | undefined;
  sources: Map<string, GuideSource>;
  /** Domain rule for sources cited only as non-official examples. */
  isExampleSource?: (source: GuideSource) => boolean;
};

/**
 * The basis behind one sentence, with its sources in API order. Source
 * titles, locators and excerpts may be in any language (GOV.UK guidance,
 * legislation, judgments…), so each gets a language hint from its own text.
 */
export function EvidencePanel({
  id,
  evidence,
  sources,
  isExampleSource,
}: Props) {
  if (!evidence) {
    return (
      <div
        className="evidence-panel"
        id={id}
        role="region"
        aria-label="这句话的依据"
      >
        <p className="evidence-missing">
          这条依据暂时无法显示。文末列出了本文使用的全部来源。
        </p>
      </div>
    );
  }
  return (
    <div
      className="evidence-panel"
      id={id}
      role="region"
      aria-label="这句话的依据"
    >
      <p className="evidence-label">这句话的依据</p>
      <p className="evidence-statement">{evidence.statement}</p>
      {evidence.supports.length === 0 ? (
        <p className="evidence-missing">这条依据暂时没有可显示的来源。</p>
      ) : (
        <ol className="evidence-supports">
          {evidence.supports.map((support, index) => {
            const source = sources.get(support.sourceKey);
            const example =
              source && isExampleSource ? isExampleSource(source) : false;
            return (
              <li
                key={`${support.sourceKey}-${index}`}
                className="evidence-support"
              >
                {source ? (
                  <>
                    <div className="evidence-source-head">
                      <span className="evidence-organisation">
                        {source.organisation}
                      </span>
                      {example && (
                        <span className="evidence-example-tag">
                          价格举例 · 非官方资料
                        </span>
                      )}
                    </div>
                    <a
                      className="evidence-source-link"
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span lang={sourceTextLang(source.title)}>
                        {source.title}
                      </span>
                      <ExternalLink size={14} aria-hidden="true" />
                      <span className="sr-only">（在新窗口打开）</span>
                    </a>
                  </>
                ) : (
                  <p className="evidence-missing">来源信息暂缺。</p>
                )}
                <dl className="evidence-details">
                  {support.locator && (
                    <div>
                      <dt>原文位置</dt>
                      <dd lang={sourceTextLang(support.locator)}>
                        {support.locator}
                      </dd>
                    </div>
                  )}
                  {support.excerpt && (
                    <div>
                      <dt>原文摘录</dt>
                      <dd>
                        <blockquote lang={sourceTextLang(support.excerpt)}>
                          {support.excerpt}
                        </blockquote>
                      </dd>
                    </div>
                  )}
                  {support.note && (
                    <div>
                      <dt>说明</dt>
                      <dd>{support.note}</dd>
                    </div>
                  )}
                  {source && (
                    <div>
                      <dt>查阅日期</dt>
                      <dd>
                        <time dateTime={source.accessedAt}>
                          {formatUkDate(source.accessedAt)}
                        </time>
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
