import { useId, useState } from "react";
import type { RefObject } from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileCheck2,
  Info,
  PartyPopper,
  RotateCcw,
} from "lucide-react";
import type {
  Progress,
  ResolvedSection,
  ResolvedTask,
} from "../../../guides/familyVisaChecklist";
import { computeProgress } from "../../../guides/familyVisaChecklist";
import type {
  Accommodation,
  Answers,
  ResolvedStage,
  Step,
} from "../../../guides/familyVisaJourney";
import { formatUkDate } from "../../../guides/format";
import { EvidencePanel } from "../../guides/EvidencePanel";
import { emphasis } from "../emphasis";
import { AnswerSummary, JourneyStageList } from "../navigator/JourneyResults";
import "./FamilyVisaChecklist.css";

export type SaveState =
  | { choice: "device"; expiresAt: string }
  | { choice: "none"; unavailable: boolean };

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  answers: Answers;
  sections: ResolvedSection[];
  stages: ResolvedStage[];
  progress: Progress;
  save: SaveState;
  listFailed: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onNotApplicable: (id: string, excluded: boolean) => void;
  onAccommodation: (value: Accommodation) => void;
  onEdit: (step: Step) => void;
  onRestart: () => void;
  onSaveOnDevice: () => void;
  onDeleteSaved: () => void;
};

const KIND_LABEL = {
  required: "必需",
  conditional: "视情况",
  supporting: "补充材料",
} as const;

function badge(task: ResolvedTask): { text: string; tone: string } {
  if (task.status === "pending") return { text: "待核对", tone: "pending" };
  if (task.status === "suggestion")
    return { text: "常见材料 · 待核对", tone: "pending" };
  return { text: KIND_LABEL[task.kind], tone: task.kind };
}

/** The personalised, tick-off preparation checklist. */
export function ChecklistView({
  headingRef,
  answers,
  sections,
  stages,
  progress,
  save,
  listFailed,
  onToggle,
  onNotApplicable,
  onAccommodation,
  onEdit,
  onRestart,
  onSaveOnDevice,
  onDeleteSaved,
}: Props) {
  const summary = computeProgress(sections, progress);
  const percent =
    summary.total === 0 ? 0 : Math.round((summary.done / summary.total) * 100);
  const [rulesOpen, setRulesOpen] = useState(false);
  // The first section not yet complete starts open.
  const firstOpen = summary.sections.find((s) => !s.complete)?.id ?? null;

  return (
    <div className="checklist">
      <div className="checklist-head">
        <h3 ref={headingRef} tabIndex={-1} className="checklist-title">
          你的材料清单
        </h3>
        <p className="checklist-disclaimer">
          这是根据你的回答整理的准备清单，<strong>不是签证资格判断</strong>
          ，也不代表签证一定获批。
        </p>
        <AnswerSummary answers={answers} onEdit={onEdit} />
      </div>

      <div className="checklist-progress-card">
        <div className="checklist-progress-row">
          <p className="checklist-progress-text" aria-live="polite">
            已完成 <strong>{summary.done}</strong> / {summary.total} 项
          </p>
          <span className="checklist-progress-percent" aria-hidden="true">
            {percent}%
          </span>
        </div>
        <div
          className="checklist-progress-bar"
          role="progressbar"
          aria-label="准备进度"
          aria-valuemin={0}
          aria-valuemax={summary.total}
          aria-valuenow={summary.done}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <SaveStatus
          save={save}
          onSaveOnDevice={onSaveOnDevice}
          onDeleteSaved={onDeleteSaved}
        />
      </div>

      {listFailed && (
        <p className="checklist-alert" role="status">
          指南暂时无法加载，清单里的具体说明会显示为“待核对”。请稍后再试。
        </p>
      )}

      {summary.complete && (
        <div className="checklist-complete" role="status">
          <PartyPopper size={22} aria-hidden="true" />
          <div>
            <p className="checklist-complete-title">清单上的材料都准备好了！</p>
            <p>
              这表示你的<strong>准备清单</strong>
              已经完成，不代表签证一定获批。提交前，请再对照一次官方说明。
            </p>
          </div>
        </div>
      )}

      <ol className="checklist-sections">
        {sections.map((section, index) => (
          <li key={section.id}>
            <ChecklistSectionCard
              section={section}
              number={index + 1}
              stats={summary.sections[index]}
              defaultOpen={section.id === firstOpen}
              answers={answers}
              progress={progress}
              onToggle={onToggle}
              onNotApplicable={onNotApplicable}
              onAccommodation={onAccommodation}
            />
          </li>
        ))}
      </ol>

      <p className="checklist-special-link">
        <Info size={15} aria-hidden="true" />
        <span>
          情况比较特殊？例如和亲友同住、孩子来自上一段关系，
          <a href="#special-circumstances">看看特殊情况</a>。
        </span>
      </p>

      <section
        className="checklist-rules"
        aria-labelledby="checklist-rules-title"
      >
        <h4 id="checklist-rules-title">
          <button
            type="button"
            className="checklist-rules-toggle"
            aria-expanded={rulesOpen}
            aria-controls="checklist-rules-panel"
            onClick={() => setRulesOpen((open) => !open)}
          >
            想了解这些要求背后的规则？
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </h4>
        <div id="checklist-rules-panel" hidden={!rulesOpen}>
          <p className="checklist-rules-intro">
            按申请顺序整理的规则说明，每一步都附有法律依据。
          </p>
          <JourneyStageList stages={stages} />
        </div>
      </section>

      <div className="checklist-footer">
        <button
          type="button"
          className="navigator-button navigator-button-quiet"
          onClick={onRestart}
        >
          <RotateCcw size={16} aria-hidden="true" />
          重新开始
        </button>
      </div>
    </div>
  );
}

function SaveStatus({
  save,
  onSaveOnDevice,
  onDeleteSaved,
}: {
  save: SaveState;
  onSaveOnDevice: () => void;
  onDeleteSaved: () => void;
}) {
  if (save.choice === "device")
    return (
      <p className="checklist-save">
        <span>
          进度保存在这台设备上，
          <time dateTime={save.expiresAt}>{formatUkDate(save.expiresAt)}</time>
          前有效。
        </span>
        <button
          type="button"
          className="checklist-link-button"
          onClick={onDeleteSaved}
        >
          删除本设备上的进度
        </button>
      </p>
    );
  if (save.unavailable)
    return (
      <p className="checklist-save">
        这个浏览器现在不能保存进度（可能开启了隐私模式），勾选只会保留到关闭页面。
      </p>
    );
  return (
    <p className="checklist-save">
      <span>没有保存：关闭页面后，勾选会消失。</span>
      <button
        type="button"
        className="checklist-link-button"
        onClick={onSaveOnDevice}
      >
        改为保存在这台设备上（30 天）
      </button>
    </p>
  );
}

const ACCOMMODATION_OPTIONS: { value: Accommodation; label: string }[] = [
  { value: "owned", label: "自己的房子（自有房产）" },
  { value: "rented", label: "租的房子" },
  { value: "other", label: "和亲友同住，或其他情况" },
];

function ChecklistSectionCard({
  section,
  number,
  stats,
  defaultOpen,
  answers,
  progress,
  onToggle,
  onNotApplicable,
  onAccommodation,
}: Pick<
  Props,
  "answers" | "progress" | "onToggle" | "onNotApplicable" | "onAccommodation"
> & {
  section: ResolvedSection;
  number: number;
  stats: { done: number; total: number; complete: boolean };
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const checked = new Set(progress.checked);
  const excluded = new Set(progress.notApplicable);
  return (
    <section
      className={`checklist-section${stats.complete ? " is-complete" : ""}`}
      aria-labelledby={`${panelId}-title`}
    >
      <h4 id={`${panelId}-title`} className="checklist-section-heading">
        <button
          type="button"
          className="checklist-section-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="checklist-section-number" aria-hidden="true">
            {stats.complete ? <Check size={16} /> : number}
          </span>
          <span className="checklist-section-name">{section.title}</span>
          <span className="checklist-section-count">
            {stats.complete ? "已完成" : `${stats.done} / ${stats.total}`}
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </h4>
      <div id={panelId} className="checklist-section-body" hidden={!open}>
        {section.intro && (
          <p className="checklist-section-intro">{section.intro}</p>
        )}
        {section.id === "accommodation" && (
          <AccommodationChooser
            value={answers.accommodation}
            onChange={onAccommodation}
          />
        )}
        <ul className="checklist-tasks">
          {section.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              checked={checked.has(task.id)}
              excluded={excluded.has(task.id)}
              onToggle={onToggle}
              onNotApplicable={onNotApplicable}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function AccommodationChooser({
  value,
  onChange,
}: {
  value: Accommodation | undefined;
  onChange: (value: Accommodation) => void;
}) {
  const id = useId();
  return (
    <fieldset
      className="checklist-accommodation"
      aria-labelledby={`${id}-legend`}
    >
      <p id={`${id}-legend`} className="checklist-accommodation-legend">
        你们在英国住的地方是：
      </p>
      <div className="checklist-chips">
        {ACCOMMODATION_OPTIONS.map((option) => (
          <label key={option.value} className="checklist-chip">
            <input
              type="radio"
              name={`${id}-accommodation`}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {value === "other" && (
        <p className="checklist-note">
          和亲友同住等情况不在标准清单里，要准备的材料因情况而不同。
          <a href="#special-circumstances">看看特殊情况</a>。
        </p>
      )}
    </fieldset>
  );
}

function TaskItem({
  task,
  checked,
  excluded,
  onToggle,
  onNotApplicable,
}: {
  task: ResolvedTask;
  checked: boolean;
  excluded: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onNotApplicable: (id: string, excluded: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { text, tone } = badge(task);
  return (
    <li
      className={`checklist-task${checked ? " is-done" : ""}${excluded ? " is-excluded" : ""}`}
    >
      <div className="checklist-task-row">
        <label className="checklist-check">
          <input
            type="checkbox"
            checked={checked && !excluded}
            disabled={excluded}
            onChange={(event) => onToggle(task.id, event.currentTarget.checked)}
          />
          <span className="checklist-task-title">{task.title}</span>
        </label>
        <span className={`checklist-badge checklist-badge-${tone}`}>
          {text}
        </span>
      </div>
      {(task.label || task.condition) && (
        <p className="checklist-task-condition">
          {task.label && <span>{task.label}</span>}
          {task.condition && <span>适用于：{task.condition}</span>}
        </p>
      )}
      <div className="checklist-task-actions">
        <button
          type="button"
          className="checklist-link-button"
          aria-expanded={open}
          aria-controls={`${id}-detail`}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "收起" : "怎么准备"}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {task.optional && (
          <button
            type="button"
            className="checklist-link-button checklist-quiet"
            onClick={() => onNotApplicable(task.id, !excluded)}
          >
            {excluded ? "恢复这一项" : "这项不适用于我"}
          </button>
        )}
      </div>
      <div id={`${id}-detail`} className="checklist-task-detail" hidden={!open}>
        <TaskDetail task={task} idPrefix={id} />
      </div>
    </li>
  );
}

/** A task's practical detail, legal basis and official links (reused by topic pages). */
export function TaskDetail({
  task,
  idPrefix,
}: {
  task: ResolvedTask;
  idPrefix: string;
}) {
  const [evidenceShown, setEvidenceShown] = useState(false);
  const id = idPrefix;
  return (
    <>
      {task.status === "pending" || !task.wording ? (
        <p className="checklist-pending">
          这一项的具体说明还在核对，请先看官方说明。
        </p>
      ) : (
        <>
          <p>{emphasis(task.wording.summary)}</p>
          {task.wording.steps && task.wording.steps.length > 0 && (
            <ol className="checklist-steps">
              {task.wording.steps.map((step) => (
                <li key={step}>{emphasis(step)}</li>
              ))}
            </ol>
          )}
          {task.wording.examples && task.wording.examples.length > 0 && (
            <div className="checklist-examples">
              <p className="checklist-examples-label">
                常见的准备材料（举例，待核对；以官方清单为准）
              </p>
              <ul>
                {task.wording.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </div>
          )}
          {task.wording.advice && (
            <p className="journey-advice">
              <Info size={15} aria-hidden="true" />
              <span>{task.wording.advice}</span>
            </p>
          )}
          {task.special && (
            <p className="checklist-note">
              <a href="#special-circumstances">看看特殊情况</a>
            </p>
          )}
        </>
      )}
      <ul className="checklist-official">
        {task.official.map((link) => (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
              <ExternalLink size={13} aria-hidden="true" />
              <span className="sr-only">（在新窗口打开）</span>
            </a>
          </li>
        ))}
      </ul>
      {task.status === "verified" && task.sources && (
        <>
          <button
            type="button"
            className="evidence-toggle"
            aria-expanded={evidenceShown}
            aria-controls={evidenceShown ? `${id}-evidence` : undefined}
            onClick={() => setEvidenceShown((value) => !value)}
          >
            <FileCheck2 size={14} aria-hidden="true" />
            查看法律依据（{task.evidence.length} 条）
          </button>
          {evidenceShown && (
            <div id={`${id}-evidence`} className="journey-evidence">
              {task.evidence.map((item) => (
                <EvidencePanel
                  key={item.key}
                  id={`${id}-evidence-${item.key}`}
                  evidence={item}
                  sources={task.sources!}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
