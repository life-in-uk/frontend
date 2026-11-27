import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { getGuides, startupGuides } from "../../../guides/api";
import {
  domainGuides,
  FAMILY_VISA_GUIDE_DOMAIN,
} from "../../../guides/domains";
import { familyVisaTopicPath } from "../../../router";
import type { FamilyVisaTopicId } from "../../../router";
import { FamilyVisaLocaleContext } from "../../../guides/familyVisaI18n";
import { GUIDE_LOCALES, guideRoutePath } from "../../../guides/locales";
import type { GuideLocale } from "../../../guides/locales";
import { applyGuideSeo, clearGuideSeo } from "../../../guides/seo";
import { useLocalizedJourneyGuides } from "../localizedJourney";
import { Link } from "../../Link";
import { TaskDetail } from "../checklist/ChecklistView";
import { useFamilyVisaContent, useJourneyGuides } from "../useJourneyGuides";
import type { GuideListState } from "../useJourneyGuides";
import { resolveTopic } from "./topicContent";
import "../../guides/Guide.css";
import "../FamilyVisa.css";
import "../navigator/FamilyVisaNavigator.css";
import "../checklist/FamilyVisaChecklist.css";
import "./FamilyVisaTopic.css";

/**
 * Head tags once the content is known: verified content is indexable with a
 * canonical URL and its five language versions (the same tags as the
 * prerendered page); otherwise noindex. While loading, the prerendered tags
 * (if any) stay.
 */
function useTopicSeo(
  topic: FamilyVisaTopicId,
  locale: GuideLocale,
  title: string,
  description: string,
  state: "loading" | "verified" | "pending",
) {
  useEffect(() => {
    if (state === "loading") return;
    const origin = window.location.origin;
    applyGuideSeo({
      locale,
      title: `${title} · Life in UK`,
      description,
      ...(state === "verified"
        ? {
            canonical: new URL(familyVisaTopicPath(locale, topic), origin).href,
            alternates: GUIDE_LOCALES.map((alt) => ({ locale: alt, href: new URL(familyVisaTopicPath(alt, topic), origin).href })),
          }
        : // Not indexable until the reviewed Guide behind it is published.
          { canonical: null, noIndex: true }),
    });
    return () => clearGuideSeo(locale);
  }, [topic, locale, title, description, state]);
}

/**
 * A special-circumstances topic page. Its content is the verified checklist
 * material for the situation, shown only when the Guide behind it is
 * published and still the reviewed version. Until then the page shows a
 * neutral "being reviewed" state and is marked noindex.
 */
export function FamilyVisaTopicPage({
  topic,
  locale = "zh-CN",
}: {
  topic: FamilyVisaTopicId;
  locale?: GuideLocale;
}) {
  // On a prerendered page main.tsx fetched the data first, so the first render shows the content.
  const [list, setList] = useState<GuideListState>(() => {
    const ready = startupGuides("zh-CN");
    return ready
      ? { status: "ready", guides: domainGuides(ready, FAMILY_VISA_GUIDE_DOMAIN) }
      : { status: "loading" };
  });

  useEffect(() => {
    const controller = new AbortController();
    getGuides(controller.signal)
      .then((guides) =>
        setList({
          status: "ready",
          guides: domainGuides(guides, FAMILY_VISA_GUIDE_DOMAIN),
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setList({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  const availability = useJourneyGuides(list, true);
  const localized = useLocalizedJourneyGuides(locale, availability);
  const { content, strings, loaded } = useFamilyVisaContent(locale);
  const { t, title, description, intro, section, verified: shown } = useMemo(
    () => resolveTopic(topic, locale, availability, localized, content, strings),
    [topic, locale, availability, localized, content, strings],
  );
  const fvLocale = useMemo(() => ({ locale, t }), [locale, t]);
  const loading =
    !loaded ||
    list.status === "loading" ||
    availability.children.status === "loading";
  // Shown only when the Guide is verified AND reviewed wording is available.
  const verified = !loading && shown;
  // A failed list request leaves the head tags alone, as while loading: the page's own
  // (prerendered) tags stay and it is not marked noindex as unverified.
  useTopicSeo(topic, locale, title, description,
    loading || list.status === "error" ? "loading" : verified ? "verified" : "pending");

  return (
    <FamilyVisaLocaleContext.Provider value={fvLocale}>
      <main id="main" className="family-visa-page family-topic">
        <Link
          to={guideRoutePath(locale, "family-visa")}
          className="family-topic-back"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("回到家庭与签证")}
        </Link>
        <article className="family-topic-article" aria-labelledby="topic-title">
          <span className="eyebrow family-eyebrow">
            {t("家庭与签证 · 特殊情况")}
          </span>
          <h1 id="topic-title">{title}</h1>

          {loading && (
            <p className="family-topic-status" role="status">
              {t("正在加载…")}
            </p>
          )}

          {!loading && !verified && (
            <div className="family-topic-pending" role="status">
              <p className="family-topic-pending-title">
                {t("这个专题还在核对中")}
              </p>
              <p>
                {t(
                  "专题内容需要经过核对后才会公开。在那之前，请先看英国政府的官方说明；情况复杂的，建议咨询在 Immigration Advice Authority（IAA）注册的移民顾问或律师。",
                )}
              </p>
              <a
                className="family-official-link"
                href="https://www.gov.uk/uk-family-visa/your-child"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("GOV.UK：孩子随家庭签证申请")}
                <ExternalLink size={14} aria-hidden="true" />
                <span className="sr-only">{t("（在新窗口打开）")}</span>
              </a>
            </div>
          )}

          {verified && section && (
            <>
              <p className="family-topic-intro">{intro}</p>
              <p className="family-topic-note">
                {t("这是一般信息，不是签证资格判断，也不是法律意见。")}
              </p>
              <ol className="family-topic-tasks">
                {section.tasks.map((task) => (
                  <li key={task.id} className="family-topic-task">
                    <h2>{task.title}</h2>
                    {task.label && (
                      <p className="checklist-task-condition">{task.label}</p>
                    )}
                    <div className="checklist-task-detail">
                      <TaskDetail task={task} idPrefix={`topic-${task.id}`} />
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="family-topic-cta">
            <p>{t("想按你的情况生成完整的材料清单？")}</p>
            <Link
              to={guideRoutePath(locale, "family-visa")}
              className="navigator-button navigator-button-primary"
            >
              {t("生成我的材料清单")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </main>
    </FamilyVisaLocaleContext.Provider>
  );
}
