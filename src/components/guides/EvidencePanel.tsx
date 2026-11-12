import { ExternalLink } from "lucide-react";
import type { GuideEvidence, GuideSource } from "../../guides/api";
import { formatUkDate, sourceTextLang } from "../../guides/format";
import { GUIDE_UI, type GuideLocale } from "../../guides/locales";

type Props = {
  id: string;
  evidence: GuideEvidence | undefined;
  sources: Map<string, GuideSource>;
  /** Domain rule for sources cited only as non-official examples. */
  isExampleSource?: (source: GuideSource) => boolean;
  locale?: GuideLocale;
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
  locale = "zh-CN",
}: Props) {
  const ui = GUIDE_UI[locale];
  if (!evidence) {
    return (
      <div
        className="evidence-panel"
        id={id}
        role="region"
        aria-label={ui.evidenceLabel}
      >
        <p className="evidence-missing">
          {ui.evidenceMissing}
        </p>
      </div>
    );
  }
  return (
    <div
      className="evidence-panel"
      id={id}
      role="region"
      aria-label={ui.evidenceLabel}
    >
      <p className="evidence-label">{ui.evidenceLabel}</p>
      <p className="evidence-statement">{evidence.statement}</p>
      {evidence.supports.length === 0 ? (
        <p className="evidence-missing">{ui.noSource}</p>
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
                        <span className="evidence-example-tag">{ui.exampleSource}</span>
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
                      <span className="sr-only">{ui.newWindow}</span>
                    </a>
                  </>
                ) : (
                  <p className="evidence-missing">{ui.sourceMissing}</p>
                )}
                <dl className="evidence-details">
                  {support.locator && (
                    <div>
                      <dt>{ui.locator}</dt>
                      <dd lang={sourceTextLang(support.locator)}>
                        {support.locator}
                      </dd>
                    </div>
                  )}
                  {support.excerpt && (
                    <div>
                          <dt>{ui.excerpt}</dt>
                      <dd>
                        <blockquote lang={sourceTextLang(support.excerpt)}>
                          {support.excerpt}
                        </blockquote>
                      </dd>
                    </div>
                  )}
                  {support.note && (
                    <div>
                      <dt>{ui.note}</dt>
                      <dd>{support.note}</dd>
                    </div>
                  )}
                  {source && (
                    <div>
                      <dt>{ui.accessed}</dt>
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
