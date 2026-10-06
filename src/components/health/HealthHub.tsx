import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Moon,
  Phone,
  Pill,
  PoundSterling,
  Signpost,
  Users,
} from "lucide-react";
import { getGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import {
  groupHealthGuides,
  healthGuidePath,
  HEALTH_INTENTS,
  HEALTH_QUICK_LINKS,
  shortGuideTitle,
} from "../../guides/catalog";
import { Link } from "../Link";
import { CategoryArt } from "./CategoryArt";
import "./Health.css";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; guides: GuideMetadata[] };

const REQUEST_DEADLINE_MS = 10_000;

// Desktop rhythm for the category grid: wide/narrow, then narrow/wide.
const CARD_SHAPES = ["is-wide", "is-narrow", "is-narrow", "is-wide"];

/** Placeholder layout while the Guide list loads; purely decorative. */
function HubSkeleton() {
  return (
    <div className="hub-skeleton">
      <p className="sr-only" role="status">
        正在加载健康指南…
      </p>
      <div className="hub-skeleton-chips" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skeleton skeleton-chip" />
        ))}
      </div>
      <div className="category-cards" aria-hidden="true">
        {CARD_SHAPES.map((shape, i) => (
          <div key={i} className={`skeleton skeleton-card ${shape}`}>
            <span className="skeleton-line skeleton-title" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-short" />
          </div>
        ))}
      </div>
    </div>
  );
}

const INTENT_ICONS: Record<string, LucideIcon> = {
  signpost: Signpost,
  clipboard: ClipboardList,
  pill: Pill,
  moon: Moon,
  users: Users,
  pound: PoundSterling,
};

export function HealthHub() {
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
        if (active) setState({ status: "ready", guides });
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

  const sections =
    state.status === "ready" ? groupHealthGuides(state.guides) : [];
  const available = new Set(
    sections.flatMap((section) => section.guides.map((guide) => guide.slug)),
  );
  // Shortcuts only appear for Guides that are actually published.
  const intents = HEALTH_INTENTS.filter((intent) => available.has(intent.slug));
  const quickLinks = HEALTH_QUICK_LINKS.filter((link) =>
    available.has(link.slug),
  );

  return (
    <main id="main" className="health-page health-hub">
      <section className="health-hero" aria-labelledby="health-title">
        <div className="health-hero-copy">
          <span className="eyebrow">
            <HeartPulse size={15} aria-hidden="true" />
            HEALTH &amp; NHS · 英格兰
          </span>
          <h1 id="health-title">健康与 NHS</h1>
          <p className="health-hero-lead">
            刚到英国，看病的规矩跟国内很不一样。这里的指南讲的是英格兰的情况，每篇都附上了英国官方依据。
          </p>
          <div className="health-hero-actions">
            {/* tel: opens the dialler with 999 filled in; it never dials by itself. */}
            <a href="tel:999" className="health-hero-action health-emergency">
              <span className="health-hero-action-icon">
                <Phone size={15} aria-hidden="true" />
              </span>
              <span>
                危及生命请拨打 <strong>999</strong>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link
              to={healthGuidePath("where-to-go-when-ill-england")}
              className="health-hero-action health-hero-unsure"
            >
              <span className="health-hero-action-icon">
                <Signpost size={15} aria-hidden="true" />
              </span>
              <span>不确定该去哪？</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="health-hero-note">
            Life in UK 是独立的中文生活信息服务，不隶属于 NHS。
          </p>
        </div>
        <div className="health-hero-media">
          <img
            className="health-hero-image"
            src="/images/health/health-nhs-hero.png"
            alt=""
            width={1672}
            height={941}
            decoding="async"
          />
        </div>
      </section>

      {intents.length > 0 && (
        <section className="health-intents" aria-labelledby="intents-title">
          <div className="health-section-heading">
            <h2 id="intents-title">按你的情况选择</h2>
            <p>选一个最接近你现在情况的问题，直接看对应的指南。</p>
          </div>
          <ul className="intent-chips">
            {intents.map((intent) => {
              const Icon = INTENT_ICONS[intent.icon] ?? ArrowRight;
              return (
                <li key={intent.slug}>
                  <Link
                    to={healthGuidePath(intent.slug)}
                    className="intent-chip"
                  >
                    <Icon size={16} aria-hidden="true" />
                    {intent.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {state.status === "loading" && <HubSkeleton />}
      {state.status === "error" && (
        <p className="health-status" role="status">
          健康指南暂时无法加载，请稍后再试。
        </p>
      )}
      {state.status === "ready" && sections.length === 0 && (
        <p className="health-status" role="status">
          目前还没有发布的健康指南。
        </p>
      )}

      {sections.length > 0 && (
        <section
          className="health-categories"
          aria-labelledby="categories-title"
        >
          <h2 id="categories-title" className="sr-only">
            健康话题
          </h2>
          <ul className="category-cards">
            {sections.map(({ group, guides }, index) => {
              const lead = guides[0];
              return (
                <li
                  key={group.id}
                  className={`category-card tone-${group.tone} ${CARD_SHAPES[index % CARD_SHAPES.length]}`}
                  data-category={group.id}
                >
                  <div className="category-card-inner">
                    <div className="category-card-visual">
                      <CategoryArt id={group.id} />
                    </div>
                    <div className="category-card-body">
                      <h3 id={`group-${group.id}`}>
                        <Link
                          to={healthGuidePath(lead.slug)}
                          className="category-card-link"
                        >
                          {group.title}
                          <span className="sr-only">
                            ，从《{shortGuideTitle(lead.title)}》开始读
                          </span>
                        </Link>
                      </h3>
                      {group.description && (
                        <p className="category-card-description">
                          {group.description}
                        </p>
                      )}
                      <ul
                        className="category-guides"
                        aria-labelledby={`group-${group.id}`}
                      >
                        {guides.map((guide) => (
                          <li key={guide.slug}>
                            <Link
                              to={healthGuidePath(guide.slug)}
                              title={guide.title}
                            >
                              <span>
                                {shortGuideTitle(guide.title)}
                                {guides.length === 1 && (
                                  <span className="category-guide-summary">
                                    {guide.summary}
                                  </span>
                                )}
                              </span>
                              <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <p className="category-card-count">
                        {guides.length} 篇指南
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {quickLinks.length > 0 && (
        <section className="quick-answers" aria-labelledby="quick-title">
          <div className="health-section-heading">
            <h2 id="quick-title">快速解答</h2>
            <p>常见问题，点开就是对应的完整指南。</p>
          </div>
          <ul>
            {quickLinks.map((link) => (
              <li key={link.question}>
                <Link to={healthGuidePath(link.slug)}>
                  <span>{link.question}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
