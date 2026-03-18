import { memo } from "react";
import styles from "./ViewerStatus.module.css";
import type { ViewerStatusProps } from "./ViewerStatus.types";

function ViewerStatusComponent({ hasPdf, loadStatus, statusText, onFilePick }: ViewerStatusProps) {
  return (
    <>
      {!hasPdf && loadStatus !== "loading" && (
        <div className={styles.emptyView}>
          <h3>No PDF uploaded yet</h3>
          <p>Upload one PDF to start. This tool restores only your most recently uploaded file.</p>
          <button type="button" className={styles.buttonPrimary} onClick={onFilePick}>
            Upload PDF
          </button>
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
