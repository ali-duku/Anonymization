import { memo } from "react";
import styles from "./SetupInputPane.module.css";
import type { SetupInputPaneProps } from "./SetupInputPane.types";

function SetupInputPaneComponent({ textareaRef, onChange }: SetupInputPaneProps) {
  return (
    <div className={styles.column}>
      <label className={styles.label} htmlFor="json-input">
        Input JSON
      </label>
      <textarea
        id="json-input"
        ref={textareaRef}
        className={styles.textarea}
        placeholder='Paste JSON here, for example: {"result":"..."}'
        defaultValue=""
        onChange={onChange}
        wrap="off"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
      />
    </div>
  );
}

export const SetupInputPane = memo(SetupInputPaneComponent);
