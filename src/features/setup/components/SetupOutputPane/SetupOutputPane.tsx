import { memo } from "react";
import styles from "./SetupOutputPane.module.css";
import type { SetupOutputPaneProps } from "./SetupOutputPane.types";

function SetupOutputPaneComponent({ textareaRef }: SetupOutputPaneProps) {
  return (
    <div className={styles.column}>
      <label className={styles.label} htmlFor="json-output">
        Generated JSON (read-only)
      </label>
      <textarea
        id="json-output"
        ref={textareaRef}
        className={styles.textarea}
        readOnly
        defaultValue=""
        wrap="off"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
      />
    </div>
  );
}

export const SetupOutputPane = memo(SetupOutputPaneComponent);
