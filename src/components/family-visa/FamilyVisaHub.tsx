import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ExternalLink, Users } from "lucide-react";
import { getGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import {
  domainGuides,
  FAMILY_VISA_GUIDE_DOMAIN,
  guidePath,
} from "../../guides/domains";
import { formatUkDate } from "../../guides/format";
import { Link } from "../Link";
import { FamilyVisaHeroArt, FamilyVisaNotebookArt } from "./FamilyVisaArt";
import "./FamilyVisa.css";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: GuideMetadata[] };

const REQUEST_DEADLINE_MS = 10_000;

// Cards cycle through the section palette; there is no editorial grouping
// until the Family & Visa content structure is agreed.
const CARD_TONES = ["slate", "clay", "sage", "sand"];

/**
 * Family & Visa hub. A review surface for now: it is reachable directly but
 * not linked from navigation. Every Guide shown comes from the Guide API.
 */
export function FamilyVisaHub() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_DEADLINE_MS,
    );
    getGuides(controller.signal)
      .then((guides) => {
        if (active)
          setState({
            status: "ready",
            guides: domainGuides(guides, FAMILY_VISA_GUIDE_DOMAIN),
          });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <main id="main" className="family-visa-page family-hub">
      <section className="family-hero" aria-labelledby="family-title">
        <div className="family-hero-copy">
          <span className="eyebrow family-eyebrow">
            <Users size={15} aria-hidden="true" />
            FAMILY &amp; VISA · 英国
          </span>
          <h1 id="family-title">家庭与签证</h1>
          <p className="family-hero-lead">
            和家人一起在英国生活，签证与身份相关的中文指南会整理在这里。已发布的指南都会附上英国官方依据。
          </p>
          <p className="family-hero-note">
            Life in UK 是独立的中文生活信息服务，不隶属于英国政府或 UK Visas and
            Immigration。
          </p>
        </div>
        <div className="family-hero-media">
          <FamilyVisaHeroArt />
        </div>
      </section>

      <section className="family-guides" aria-labelledby="family-guides-title">
        <div className="family-section-heading">
          <h2 id="family-guides-title">指南</h2>
          {state.status === "ready" && state.guides.length > 0 && (
            <p>{state.guides.length} 篇已发布</p>
          )}
        </div>

        {state.status === "loading" && (
          <div className="family-skeleton">
            <p className="sr-only" role="status">
              正在加载家庭与签证指南…
            </p>
            <div className="family-guide-list" aria-hidden="true">
              {CARD_TONES.slice(0, 3).map((tone) => (
                <div key={tone} className="family-skeleton-card">
                  <span className="family-skeleton-line family-skeleton-title" />
                  <span className="family-skeleton-line" />
                  <span className="family-skeleton-line family-skeleton-short" />
                </div>
              ))}
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="family-panel family-error" role="status">
            <h3>指南暂时无法加载</h3>
            <p>请稍后再试。</p>
          </div>
        )}

        {state.status === "ready" && state.guides.length === 0 && (
          <div className="family-panel family-empty" role="status">
            <FamilyVisaNotebookArt />
            <div className="family-empty-copy">
              <h3>指南正在整理中</h3>
              <p>家庭与签证的中文指南还在编写和核对，发布后会显示在这里。</p>
              <p className="family-empty-hint">
                在那之前，具体要求请以英国政府官方网站上的信息为准。
              </p>
              <a
                className="family-official-link"
                href="https://www.gov.uk/browse/visas-immigration"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span lang="en">GOV.UK · Visas and immigration</span>
                <ExternalLink size={14} aria-hidden="true" />
                <span className="sr-only">（在新窗口打开）</span>
              </a>
            </div>
          </div>
        )}

        {state.status === "ready" && state.guides.length > 0 && (
          <ul className="family-guide-list">
            {state.guides.map((guide, index) => (
              <li
                key={guide.slug}
                className={`family-guide-card family-tone-${CARD_TONES[index % CARD_TONES.length]}`}
              >
                <Link
                  to={guidePath(FAMILY_VISA_GUIDE_DOMAIN, guide.slug)}
                  className="family-guide-link"
                >
                  <h3>{guide.title}</h3>
                  <p className="family-guide-summary">{guide.summary}</p>
                  <span className="family-guide-meta">
                    <CalendarDays size={14} aria-hidden="true" />
                    更新于{" "}
                    <time dateTime={guide.updatedAt}>
                      {formatUkDate(guide.updatedAt)}
                    </time>
                    <ArrowRight
                      className="family-guide-arrow"
                      size={16}
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
