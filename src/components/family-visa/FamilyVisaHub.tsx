import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Users,
} from "lucide-react";
import { getGuides, getLocalizedGuides } from "../../guides/api";
import type { GuideMetadata } from "../../guides/api";
import { domainGuides, FAMILY_VISA_GUIDE_DOMAIN } from "../../guides/domains";
import { formatUkDateFor } from "../../guides/format";
import {
  familyVisaText,
  FamilyVisaLocaleContext,
} from "../../guides/familyVisaI18n";
import { GUIDE_LOCALE_LANG, guideRoutePath } from "../../guides/locales";
import type { GuideLocale } from "../../guides/locales";
import { Link } from "../Link";
import { FamilyVisaHeroArt, FamilyVisaNotebookArt } from "./FamilyVisaArt";
import { FamilyVisaNavigator } from "./navigator/FamilyVisaNavigator";
import { GuideLanguageSelect } from "../guides/GuideLanguageSelect";
import { SettlementCrossLink } from "../settlement/SettlementCrossLink";
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
 * not linked from navigation. The guided journey comes first; the full list
 * of Guides stays available as a secondary, collapsed reference. Every Guide
 * shown comes from the Guide API.
 */
export function FamilyVisaHub({ locale = "zh-CN" }: { locale?: GuideLocale }) {
  const [state, setState] = useState<State>({ status: "loading" });
  // The page-language list for "全部指南"; the navigator keeps the Simplified
  // Chinese list, which its integrity checks are made against.
  const [shown, setShown] = useState<State>({ status: "loading" });
  const [listOpen, setListOpen] = useState(false);
  const t = useMemo(() => familyVisaText(locale), [locale]);
  const fvLocale = useMemo(() => ({ locale, t }), [locale, t]);

  useEffect(() => {
    if (locale === "zh-CN") return;
    const controller = new AbortController();
    getLocalizedGuides(locale, controller.signal)
      .then((guides) =>
        setShown({
          status: "ready",
          guides: domainGuides(guides, FAMILY_VISA_GUIDE_DOMAIN),
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setShown({ status: "error" });
      });
    return () => controller.abort();
  }, [locale]);
  const listed = locale === "zh-CN" ? state : shown;

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
    <FamilyVisaLocaleContext.Provider value={fvLocale}>
      <main id="main" className="family-visa-page family-hub">
        <div className="guide-toolbar">
          <GuideLanguageSelect locale={locale} domain="family-visa" />
        </div>
        <section className="family-hero" aria-labelledby="family-title">
          <div className="family-hero-copy">
            <span className="eyebrow family-eyebrow">
              <Users size={15} aria-hidden="true" />
              {t("家庭与签证 · 伴侣签证材料清单")}
            </span>
            <h1 id="family-title">{t("一份清单，理清每一步。")}</h1>
            <p className="family-hero-lead">
              {t("从第一份材料，到最后一个勾选，让签证准备更简单。")}
            </p>
            <p className="family-hero-note">
              {t(
                "Life in UK 是独立的中文生活信息服务，不隶属于英国政府或 UK Visas and Immigration。",
              )}
            </p>
          </div>
          <div className="family-hero-media">
            <FamilyVisaHeroArt />
          </div>
        </section>

        <FamilyVisaNavigator list={state} />

        <section
          id="special-circumstances"
          className="family-special"
          aria-labelledby="family-special-title"
        >
          <h2 id="family-special-title">{t("特殊情况")}</h2>
          <p className="family-special-lead">
            {t("这些情况不在标准清单里，要准备的材料因人而异。")}
          </p>
          <ul className="family-special-list">
            <li>
              <Link
                to={`${guideRoutePath(locale, "family-visa")}/topics/children-from-previous-relationship`}
              >
                {t("孩子来自上一段关系，如何准备英国签证材料？")}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <span className="family-special-item">
                {t("和亲友同住，或住处不是自有、也不是租的")}
              </span>
              <span className="family-special-meta">
                {t(
                  "专题整理中。请先看 GOV.UK 的材料说明，或咨询在 Immigration Advice Authority（IAA）注册的移民顾问或律师。",
                )}
              </span>
            </li>
            <li>
              <span className="family-special-item">
                {t("孩子涉及收养或监护")}
              </span>
              <span className="family-special-meta">
                {t(
                  "情况因人而异，建议先咨询在 Immigration Advice Authority（IAA）注册的移民顾问或律师。",
                )}
              </span>
            </li>
          </ul>
        </section>

        <section
          className="family-guides"
          aria-labelledby="family-guides-title"
        >
          <div className="family-section-heading">
            <h2 id="family-guides-title">
              <button
                type="button"
                className="family-guides-toggle"
                aria-expanded={listOpen}
                aria-controls="family-guides-panel"
                onClick={() => setListOpen((open) => !open)}
              >
                {t("全部指南")}
                <ChevronDown size={20} aria-hidden="true" />
              </button>
            </h2>
            {listed.status === "ready" && listed.guides.length > 0 && (
              <p>{t("{count} 篇已发布", { count: listed.guides.length })}</p>
            )}
          </div>
          <div id="family-guides-panel" hidden={!listOpen}>
            {listed.status === "loading" && (
              <div className="family-skeleton">
                <p className="sr-only" role="status">
                  {t("正在加载家庭与签证指南…")}
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

            {listed.status === "error" && (
              <div className="family-panel family-error" role="status">
                <h3>{t("指南暂时无法加载")}</h3>
                <p>{t("请稍后再试。")}</p>
              </div>
            )}

            {listed.status === "ready" && listed.guides.length === 0 && (
              <div className="family-panel family-empty" role="status">
                <FamilyVisaNotebookArt />
                <div className="family-empty-copy">
                  <h3>{t("指南正在整理中")}</h3>
                  <p>
                    {t(
                      "家庭与签证的中文指南还在编写和核对，发布后会显示在这里。",
                    )}
                  </p>
                  <p className="family-empty-hint">
                    {t("在那之前，具体要求请以英国政府官方网站上的信息为准。")}
                  </p>
                  <a
                    className="family-official-link"
                    href="https://www.gov.uk/browse/visas-immigration"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span lang="en">GOV.UK · Visas and immigration</span>
                    <ExternalLink size={14} aria-hidden="true" />
                    <span className="sr-only">{t("（在新窗口打开）")}</span>
                  </a>
                </div>
              </div>
            )}

            {listed.status === "ready" && listed.guides.length > 0 && (
              <ul className="family-guide-list">
                {listed.guides.map((guide, index) => (
                  <li
                    key={guide.slug}
                    className={`family-guide-card family-tone-${CARD_TONES[index % CARD_TONES.length]}`}
                  >
                    <Link
                      to={guideRoutePath(locale, "family-visa", guide.slug)}
                      className="family-guide-link"
                    >
                      <h3>{guide.title}</h3>
                      <p className="family-guide-summary">{guide.summary}</p>
                      <span className="family-guide-meta">
                        <CalendarDays size={14} aria-hidden="true" />
                        {t("更新于")}{" "}
                        <time dateTime={guide.updatedAt}>
                          {formatUkDateFor(
                            guide.updatedAt,
                            GUIDE_LOCALE_LANG[locale],
                          )}
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
          </div>
        </section>
        <SettlementCrossLink locale={locale} />
      </main>
    </FamilyVisaLocaleContext.Provider>
  );
}
