import type { RefObject } from "react";
import { HardDrive, ShieldCheck } from "lucide-react";

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSave: () => void;
  onSkip: () => void;
};

/** Asked once, before the checklist starts. Registration is never needed. */
export function SavePrompt({ headingRef, onSave, onSkip }: Props) {
  return (
    <div className="save-prompt">
      <h3 ref={headingRef} tabIndex={-1} className="save-prompt-title">
        要不要帮你保存准备进度？
      </h3>
      <p className="save-prompt-lead">
        不需要注册。保存后，下次在这台设备上打开，可以接着勾选。
      </p>
      <ul className="save-prompt-facts">
        <li>
          <ShieldCheck size={16} aria-hidden="true" />
          只保存你的选择和勾选情况，不保存姓名、证件号码、金额或任何文件。
        </li>
        <li>
          <HardDrive size={16} aria-hidden="true" />
          只存在这台设备的浏览器里，30 天后自动失效，随时可以删除。
        </li>
      </ul>
      <div className="navigator-actions">
        <button
          type="button"
          className="navigator-button navigator-button-primary"
          onClick={onSave}
        >
          保存在这台设备上（30 天）
        </button>
        <button
          type="button"
          className="navigator-button navigator-button-quiet"
          onClick={onSkip}
        >
          不保存，直接开始
        </button>
      </div>
    </div>
  );
}
