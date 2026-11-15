import { ArrowRight, Coins, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "../Link";
import type { GuideLocale } from "../../guides/locales";
import { SITE_UI } from "../../guides/siteUi";

export type QuestionLink = { question: string; href: string };

export type QuestionGroup = {
  id: string;
  title: string;
  icon: "health" | "money";
  note: string;
  questions: QuestionLink[];
  hub: { href: string; label: string };
};

const ICONS: Record<QuestionGroup["icon"], ReactNode> = {
  health: <HeartPulse size={22} aria-hidden="true" />,
  money: <Coins size={22} aria-hidden="true" />,
};

/** Common questions that lead to published Guides or reviewed answers. */
export function CommonQuestions({ groups, locale = "zh-CN" }: { groups: QuestionGroup[]; locale?: GuideLocale }) {
  const ui = SITE_UI[locale].questions;
  const shown = groups.filter((group) => group.questions.length > 0);
  if (shown.length === 0) return null;
  return (
    <section className="home-container home-section" aria-labelledby="questions-title">
      <div className="home-section-head">
        <h2 id="questions-title">{ui.title}</h2>
        <p>{ui.text}</p>
      </div>
      <div className="question-grid">
        {shown.map((group) => (
          <section
            key={group.id}
            className={`question-group question-${group.icon}`}
            aria-labelledby={`questions-${group.id}`}
          >
            <div className="question-group-head">
              {ICONS[group.icon]}
              <h3 id={`questions-${group.id}`}>{group.title}</h3>
              <span>{group.note}</span>
            </div>
            <ul>
              {group.questions.map((item) => (
                <li key={item.question}>
                  <Link to={item.href}>
                    <span>{item.question}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link to={group.hub.href} className="home-more-link">
              {group.hub.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        ))}
      </div>
    </section>
  );
}
