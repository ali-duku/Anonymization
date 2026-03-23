import { memo } from "react";
import styles from "./ViewerStatus.module.css";
import type { ViewerStatusProps } from "./ViewerStatus.types";

function ViewerStatusComponent({ hasPdf, loadStatus, statusText, onManualFilePick }: ViewerStatusProps) {
  return (
    <>
      {!hasPdf && loadStatus !== "loading" && (
        <div className={styles.emptyView}>
          <h3>No PDF loaded</h3>
          <p>Enter a file ID in the toolbar or upload a local PDF manually.</p>
          {onManualFilePick && (
            <button type="button" className={styles.buttonPrimary} onClick={onManualFilePick}>
              Upload PDF
            </button>
          )}
        </div>
      )}

      {statusText && (
        <p
          className={`${styles.statusLine} ${loadStatus === "error" ? styles.statusLineError : ""}`}
          role="status"
        >
          {statusText}
        </p>
      )}
    </>
  );
}

export const ViewerStatus = memo(ViewerStatusComponent);
