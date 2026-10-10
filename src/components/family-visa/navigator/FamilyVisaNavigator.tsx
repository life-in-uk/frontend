import { useCallback, useEffect, useRef, useState } from "react";
import { ListChecks, RotateCcw, Trash2 } from "lucide-react";
import {
  applicableTaskIdsFor,
  buildChecklist,
  CHECKLIST_SECTIONS,
  OPTIONAL_TASK_IDS,
  pruneProgress,
} from "../../../guides/familyVisaChecklist";
import type { Progress } from "../../../guides/familyVisaChecklist";
import {
  deleteSaved,
  deviceStorage,
  loadSaved,
  saveChecklist,
} from "../../../guides/familyVisaChecklistStorage";
import type {
  LoadResult,
  SavedChecklist,
  StorageLike,
} from "../../../guides/familyVisaChecklistStorage";
import {
  buildJourney,
  JOURNEY_GUIDES,
  JOURNEY_STAGES,
  readHistoryState,
  resolveStep,
  writeHistoryState,
} from "../../../guides/familyVisaJourney";
import type {
  Accommodation,
  Answers,
  NavigatorState,
  Step,
} from "../../../guides/familyVisaJourney";
import { formatUkDate } from "../../../guides/format";
import { ChecklistView } from "../checklist/ChecklistView";
import type { SaveState } from "../checklist/ChecklistView";
import { SavePrompt } from "../checklist/SavePrompt";
import { NavigatorQuestion } from "./NavigatorQuestion";
import { useFamilyVisaContent, useJourneyGuides } from "../useJourneyGuides";
import type { GuideListState } from "../useJourneyGuides";
import "../../guides/Guide.css";
import "./FamilyVisaNavigator.css";

export type { GuideListState };
type SaveChoice = "device" | "none";

const START: NavigatorState = { step: "relationship", answers: {} };
const EMPTY: Progress = { checked: [], notApplicable: [] };
/** The save decision (not progress) rides along in history state. */
const SAVE_KEY = "familyVisaSaveChoice";

/** localStorage for reading only; no probe write until the person opts in. */
function readableStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function historySaveChoice(): SaveChoice | undefined {
  const value = (window.history.state as Record<string, unknown> | null)?.[
    SAVE_KEY
  ];
  return value === "device" || value === "none" ? value : undefined;
}

type Initial = {
  nav: NavigatorState;
  progress: Progress;
  saveChoice: SaveChoice | undefined;
  record: SavedChecklist | null;
  offer: SavedChecklist | null;
  notice: string | null;
};

function initialState(): Initial {
  const entry = readHistoryState(window.history.state);
  const saveChoice = historySaveChoice();
  const loaded: LoadResult = loadSaved(readableStorage());
  const record = loaded.status === "ok" ? loaded.record : null;
  const notice =
    loaded.status === "expired"
      ? "之前保存的准备进度已经超过 30 天，已经自动删除。"
      : loaded.status === "invalid"
        ? "之前保存的准备进度无法读取，已经删除。"
        : null;
  if (entry) {
    // Reload or back/forward into the page: keep going where we were.
    const progress =
      saveChoice === "device" && record
        ? pruneProgress(
            record.progress,
            applicableTaskIdsFor(entry.answers),
            OPTIONAL_TASK_IDS,
          )
        : EMPTY;
    return {
      nav: entry,
      progress,
      saveChoice: saveChoice === "device" && !record ? undefined : saveChoice,
      record: saveChoice === "device" ? record : null,
      offer: null,
      notice,
    };
  }
  return {
    nav: START,
    progress: EMPTY,
    saveChoice: undefined,
    record: null,
    offer: record,
    notice,
  };
}

/**
 * The guided checklist: a few questions, an optional save choice, then a
 * personalised tick-off list. Answers live in this page's history entries;
 * checklist progress stays in memory unless the person saves it on this
 * device. Guide requests are the same fixed slugs whatever the answers.
 */
export function FamilyVisaNavigator({ list }: { list: GuideListState }) {
  const [initial] = useState(initialState);
  const [nav, setNav] = useState<NavigatorState>(initial.nav);
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [saveChoice, setSaveChoice] = useState<SaveChoice | undefined>(
    initial.saveChoice,
  );
  const [record, setRecord] = useState<SavedChecklist | null>(initial.record);
  const [offer, setOffer] = useState<SavedChecklist | null>(initial.offer);
  const [notice, setNotice] = useState<string | null>(initial.notice);
  const [unavailable, setUnavailable] = useState(false);
  const answersRef = useRef<Answers>(nav.answers);
  const saveRef = useRef<SaveChoice | undefined>(saveChoice);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const writeHistory = useCallback(
    (next: NavigatorState, push: boolean, choice = saveRef.current) => {
      const state = {
        ...writeHistoryState(window.history.state, next),
        [SAVE_KEY]: choice,
      };
      if (push) window.history.pushState(state, "");
      else window.history.replaceState(state, "");
    },
    [],
  );

  const progressRef = useRef<Progress>(progress);

  /** Saves on this device, only when the person chose to. */
  const persist = useCallback((answers: Answers, next: Progress) => {
    if (saveRef.current !== "device") return;
    const saved = saveChecklist(deviceStorage(), {
      answers,
      applicable: applicableTaskIdsFor(answers),
      progress: next,
    });
    if (saved) setRecord(saved);
    else {
      setUnavailable(true);
      saveRef.current = "none";
      setSaveChoice("none");
    }
  }, []);

  const updateProgress = useCallback(
    (next: Progress, answers: Answers = answersRef.current) => {
      progressRef.current = next;
      setProgress(next);
      persist(answers, next);
    },
    [persist],
  );

  const commit = useCallback(
    (next: NavigatorState, push: boolean) => {
      const changed = next.answers !== answersRef.current;
      answersRef.current = next.answers;
      writeHistory(next, push);
      setNav(next);
      // Keep only progress that still applies to the new answers.
      if (changed)
        updateProgress(
          pruneProgress(
            progressRef.current,
            applicableTaskIdsFor(next.answers),
            OPTIONAL_TASK_IDS,
          ),
          next.answers,
        );
    },
    [writeHistory, updateProgress],
  );

  // Record the first hub entry too, so back and reload can restore it.
  useEffect(() => {
    writeHistory(initial.nav, false, initial.saveChoice);
  }, [initial, writeHistory]);

  // Back/forward within this hub keeps the latest edited answers.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      // The router also receives popstate: never rewrite a destination on
      // another route while this component is waiting to unmount.
      if (window.location.pathname.replace(/\/+$/, "") !== "/family-visa")
        return;
      const entry = readHistoryState(event.state);
      if (!entry) return;
      const answers = answersRef.current;
      const step = resolveStep(entry?.step ?? "relationship", answers);
      moved.current = true;
      writeHistory({ step, answers }, false);
      setNav({ step, answers });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [writeHistory]);

  // Focus the new view's heading after the person moves on.
  const view =
    nav.step === "results" ? `results-${saveChoice ?? "ask"}` : nav.step;
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [view]);

  const go = (step: Step) => {
    moved.current = true;
    commit(
      {
        step: resolveStep(step, answersRef.current),
        answers: answersRef.current,
      },
      true,
    );
  };
  const answer = (answers: Answers) =>
    commit({ step: nav.step, answers }, false);
  const restart = () => {
    moved.current = true;
    progressRef.current = EMPTY;
    commit(START, true);
    updateProgress(EMPTY, START.answers);
  };

  const chooseSave = (choice: SaveChoice) => {
    moved.current = true;
    saveRef.current = choice;
    writeHistory(nav, false, choice);
    if (choice === "device" && !deviceStorage()) {
      setUnavailable(true);
      saveRef.current = "none";
      writeHistory(nav, false, "none");
      setSaveChoice("none");
      return;
    }
    setSaveChoice(choice);
    persist(answersRef.current, progressRef.current);
  };
  const removeSaved = () => {
    if (!deleteSaved(readableStorage())) {
      setNotice("无法删除这台设备上保存的准备进度，请稍后再试。");
      return;
    }
    setRecord(null);
    saveRef.current = "none";
    writeHistory(nav, false, "none");
    setSaveChoice("none");
    setNotice("已删除这台设备上保存的准备进度。");
  };
  const resume = (saved: SavedChecklist) => {
    moved.current = true;
    setOffer(null);
    setRecord(saved);
    saveRef.current = "device";
    setSaveChoice("device");
    answersRef.current = saved.answers;
    const next = {
      step: resolveStep("results", saved.answers),
      answers: saved.answers,
    };
    writeHistory(next, true, "device");
    setNav(next);
    const restored = pruneProgress(
      saved.progress,
      applicableTaskIdsFor(saved.answers),
      OPTIONAL_TASK_IDS,
    );
    progressRef.current = restored;
    setProgress(restored);
  };

  const availability = useJourneyGuides(list, nav.step === "results");
  const { content } = useFamilyVisaContent();

  const toggle = (id: string, checked: boolean) => {
    const current = progressRef.current;
    updateProgress({
      ...current,
      checked: checked
        ? [...new Set([...current.checked, id])]
        : current.checked.filter((item) => item !== id),
    });
  };
  const markNotApplicable = (id: string, excluded: boolean) => {
    const current = progressRef.current;
    updateProgress({
      checked: current.checked.filter((item) => item !== id),
      notApplicable: excluded
        ? [...new Set([...current.notApplicable, id])]
        : current.notApplicable.filter((item) => item !== id),
    });
  };
  const setAccommodation = (accommodation: Accommodation) =>
    answer({ ...nav.answers, accommodation });

  const save: SaveState =
    saveChoice === "device" && record
      ? { choice: "device", expiresAt: record.expiresAt }
      : { choice: "none", unavailable };

  return (
    <section className="family-navigator" aria-labelledby="navigator-title">
      <div className="navigator-intro">
        <span className="navigator-kicker">
          <ListChecks size={15} aria-hidden="true" />
          伴侣签证 · 材料清单
        </span>
        <h2 id="navigator-title">回答几个问题，生成你的材料清单</h2>
        <p>
          按你的情况列出要准备的材料，一项一项勾选。这
          <strong>不是签证资格判断</strong>
          ，不需要注册，也不会上传你的回答。
        </p>
      </div>

      {notice && (
        <p className="navigator-notice" role="status">
          {notice}
          <button
            type="button"
            className="checklist-link-button"
            onClick={() => setNotice(null)}
          >
            知道了
          </button>
        </p>
      )}

      {offer && nav.step !== "results" && (
        <div className="resume-card" role="region" aria-label="继续上次的清单">
          <p className="resume-title">
            欢迎回来！你在这台设备上保存了一份准备清单。
          </p>
          <p className="resume-meta">
            保存到{" "}
            <time dateTime={offer.expiresAt}>
              {formatUkDate(offer.expiresAt)}
            </time>
            ，已勾选 {offer.progress.checked.length} 项。
          </p>
          <div className="navigator-actions">
            <button
              type="button"
              className="navigator-button navigator-button-primary"
              onClick={() => resume(offer)}
            >
              继续上次的清单
            </button>
            <button
              type="button"
              className="navigator-button navigator-button-quiet"
              onClick={() => setOffer(null)}
            >
              <RotateCcw size={16} aria-hidden="true" />
              重新开始
            </button>
            <button
              type="button"
              className="navigator-button navigator-button-link"
              onClick={() => {
                if (!deleteSaved(readableStorage())) {
                  setNotice("无法删除这台设备上保存的准备进度，请稍后再试。");
                  return;
                }
                setOffer(null);
                setNotice("已删除这台设备上保存的准备进度。");
              }}
            >
              <Trash2 size={15} aria-hidden="true" />
              删除保存的进度
            </button>
          </div>
        </div>
      )}

      {nav.step !== "results" ? (
        <NavigatorQuestion
          key={nav.step}
          headingRef={headingRef}
          step={nav.step}
          answers={nav.answers}
          onAnswer={answer}
          onGo={go}
        />
      ) : saveChoice === undefined ? (
        <SavePrompt
          headingRef={headingRef}
          onSave={() => chooseSave("device")}
          onSkip={() => chooseSave("none")}
        />
      ) : (
        <ChecklistView
          headingRef={headingRef}
          answers={nav.answers}
          sections={buildChecklist(
            nav.answers,
            availability,
            JOURNEY_GUIDES,
            CHECKLIST_SECTIONS,
            content,
          )}
          stages={buildJourney(
            nav.answers,
            availability,
            JOURNEY_STAGES,
            content,
          )}
          progress={progress}
          save={save}
          listFailed={list.status === "error"}
          onToggle={toggle}
          onNotApplicable={markNotApplicable}
          onAccommodation={setAccommodation}
          onEdit={go}
          onRestart={restart}
          onSaveOnDevice={() => chooseSave("device")}
          onDeleteSaved={removeSaved}
        />
      )}
    </section>
  );
}
