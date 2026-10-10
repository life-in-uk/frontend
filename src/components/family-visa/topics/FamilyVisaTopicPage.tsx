import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { getGuides } from "../../../guides/api";
import {
  buildChecklist,
  CHECKLIST_SECTIONS,
} from "../../../guides/familyVisaChecklist";
import {
  JOURNEY_GUIDES,
  reviewedWording,
} from "../../../guides/familyVisaJourney";
import type { Answers } from "../../../guides/familyVisaJourney";
import {
  domainGuides,
  FAMILY_VISA_GUIDE_DOMAIN,
} from "../../../guides/domains";
import type { FamilyVisaTopicId } from "../../../router";
import { Link } from "../../Link";
import { TaskDetail } from "../checklist/ChecklistView";
import { useFamilyVisaContent, useJourneyGuides } from "../useJourneyGuides";
import type { GuideListState } from "../useJourneyGuides";
import "../../guides/Guide.css";
import "../FamilyVisa.css";
import "../navigator/FamilyVisaNavigator.css";
import "../checklist/FamilyVisaChecklist.css";
import "./FamilyVisaTopic.css";

type Topic = {
  title: string;
  description: string;
  /** The situation the topic's checklist content is built for. */
  answers: Answers;
};

const TOPICS: Record<FamilyVisaTopicId, Topic> = {
  "children-from-previous-relationship": {
    title: "孩子来自上一段关系，如何准备英国签证材料？",
    description:
      "伴侣签证路线下，孩子来自上一段关系、英国伴侣不是孩子的父母时，要准备哪些材料，以及“单方负责”是什么意思。",
    answers: {
      relationship: "married",
      children: "yes",
      childRelations: ["not-parent"],
      location: "unsure",
    },
  },
};

/** Sets <title>, description and robots; restores them when leaving. */
function useTopicMeta(title: string, description: string, indexable: boolean) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Life in UK`;
    const set = (name: string, content: string) => {
      let meta = document.querySelector<HTMLMetaElement>(
        `meta[name="${name}"]`,
      );
      const created = !meta;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.append(meta);
      }
      const before = meta.content;
      meta.content = content;
      return () => {
        if (created) meta.remove();
        else meta.content = before;
      };
    };
    const undo = [
      set("description", description),
      // Not indexable until the reviewed Guide behind it is published.
      ...(indexable ? [] : [set("robots", "noindex, nofollow")]),
    ];
    return () => {
      document.title = previous;
      undo.forEach((fn) => fn());
    };
  }, [title, description, indexable]);
}

/**
 * A special-circumstances topic page. Its content is the verified checklist
 * material for the situation, shown only when the Guide behind it is
 * published and still the reviewed version. Until then the page shows a
 * neutral "being reviewed" state and is marked noindex.
 */
export function FamilyVisaTopicPage({ topic }: { topic: FamilyVisaTopicId }) {
  const config = TOPICS[topic];
  const [list, setList] = useState<GuideListState>({ status: "loading" });

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
  const { content, loaded } = useFamilyVisaContent();
  const section = buildChecklist(
    config.answers,
    availability,
    JOURNEY_GUIDES,
    CHECKLIST_SECTIONS,
    content,
  ).find((s) => s.id === "children");
  const intro =
    reviewedWording(content, "children", (c) => c.topics, topic)?.intro ?? null;
  const loading =
    !loaded ||
    list.status === "loading" ||
    availability.children.status === "loading";
  // Shown only when the Guide is verified AND reviewed wording is available.
  const verified =
    !loading &&
    Boolean(section?.open) &&
    intro !== null &&
    Boolean(section?.tasks.some((task) => task.status === "verified"));
  useTopicMeta(config.title, config.description, verified);

  return (
    <main id="main" className="family-visa-page family-topic">
      <Link to="/family-visa" className="family-topic-back">
        <ArrowLeft size={16} aria-hidden="true" />
        回到家庭与签证
      </Link>
      <article className="family-topic-article" aria-labelledby="topic-title">
        <span className="eyebrow family-eyebrow">家庭与签证 · 特殊情况</span>
        <h1 id="topic-title">{config.title}</h1>

        {loading && (
          <p className="family-topic-status" role="status">
            正在加载…
          </p>
        )}

        {!loading && !verified && (
          <div className="family-topic-pending" role="status">
            <p className="family-topic-pending-title">这个专题还在核对中</p>
            <p>
              专题内容需要经过核对后才会公开。在那之前，请先看英国政府的官方说明；情况复杂的，建议咨询在
              Immigration Advice Authority（IAA）注册的移民顾问或律师。
            </p>
            <a
              className="family-official-link"
              href="https://www.gov.uk/uk-family-visa/your-child"
              target="_blank"
              rel="noopener noreferrer"
            >
              GOV.UK：孩子随家庭签证申请
              <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only">（在新窗口打开）</span>
            </a>
          </div>
        )}

        {verified && section && (
          <>
            <p className="family-topic-intro">{intro}</p>
            <p className="family-topic-note">
              这是一般信息，不是签证资格判断，也不是法律意见。
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
          <p>想按你的情况生成完整的材料清单？</p>
          <Link
            to="/family-visa"
            className="navigator-button navigator-button-primary"
          >
            生成我的材料清单
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>
    </main>
  );
}
