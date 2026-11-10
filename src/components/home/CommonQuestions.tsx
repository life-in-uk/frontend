import { ArrowRight, Coins, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "../Link";

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
export function CommonQuestions({ groups }: { groups: QuestionGroup[] }) {
  const shown = groups.filter((group) => group.questions.length > 0);
  if (shown.length === 0) return null;
  return (
    <section className="home-container home-section" aria-labelledby="questions-title">
      <div className="home-section-head">
        <h2 id="questions-title">从这些问题开始</h2>
        <p>刚到英国时常遇到的问题，点开直接看对应的指南或简短回答。</p>
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
