import { memo } from "react";
import styles from "./SetupFooterActions.module.css";
import type { SetupFooterActionsProps } from "./SetupFooterActions.types";

function SetupFooterActionsComponent({
  hasInput,
  hasOutput,
  isCopying,
  loadStatusText,
  outputStats,
  onLoadToViewer,
  onCopy
}: SetupFooterActionsProps) {
  return (
    <div className={styles.footer}>
      <div className={styles.footerLane}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onLoadToViewer}
          disabled={!hasInput}
        >
          Load to Viewer
        </button>
        {loadStatusText && <span className={styles.meta}>{loadStatusText}</span>}
      </div>

      <div className={`${styles.footerLane} ${styles.footerLaneRight}`}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onCopy}
          disabled={!hasOutput || isCopying}
        >
          Copy Output
        </button>
        <span className={styles.meta}>{outputStats}</span>
      </div>
    </div>
  );
}

export const SetupFooterActions = memo(SetupFooterActionsComponent);
