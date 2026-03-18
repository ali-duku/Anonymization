import { memo } from "react";
import styles from "./ViewerToolbar.module.css";
import type { ViewerToolbarProps } from "./ViewerToolbar.types";

function ViewerToolbarComponent({
  hasPdf,
  currentPage,
  totalPages,
  zoom,
  isCreateMode,
  canCreateBbox,
  recordSummary,
  overlayCount,
  showOverlayCount,
  saveIndicatorText,
  isSaving,
  fileInputRef,
  onFilePick,
  onFileChange,
  onMovePage,
  onPageInput,
  onToggleCreateMode,
  onZoomOut,
  onZoomIn,
  onFitToWidth
}: ViewerToolbarProps) {
  return (
    <header className={styles.viewerTopline}>
      <h2>Viewer</h2>
      <div className={styles.viewerToolbar}>
        <button type="button" className={styles.buttonPrimary} onClick={onFilePick}>
          {hasPdf ? "Replace PDF" : "Upload PDF"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onFileChange}
          className={styles.hiddenInput}
        />

        <div className={styles.toolbarGroup}>
          <button type="button" className={styles.buttonSecondary} onClick={() => onMovePage(-1)} disabled={!hasPdf}>
            Prev
          </button>
          <label className={styles.compactField}>
            Page
            <input
              type="number"
              min={1}
              max={Math.max(1, totalPages)}
              value={currentPage}
              onChange={onPageInput}
              disabled={!hasPdf}
            />
          </label>
          <span className={styles.totalPages}>/ {totalPages || 0}</span>
          <button type="button" className={styles.buttonSecondary} onClick={() => onMovePage(1)} disabled={!hasPdf}>
            Next
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={`${styles.buttonSecondary} ${isCreateMode ? styles.buttonSecondaryActive : ""}`}
            onClick={onToggleCreateMode}
            disabled={!hasPdf || !canCreateBbox}
            aria-pressed={isCreateMode}
          >
            {isCreateMode ? "Cancel Add BBox" : "Add BBox"}
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={onZoomOut} disabled={!hasPdf}>
            -
          </button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button type="button" className={styles.buttonSecondary} onClick={onZoomIn} disabled={!hasPdf}>
            +
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={onFitToWidth} disabled={!hasPdf}>
            Fit Width
          </button>
        </div>

        {recordSummary && <span className={styles.viewerInlineMeta}>{recordSummary}</span>}
        {showOverlayCount && (
          <span className={styles.viewerInlineMeta}>Page {currentPage}: {overlayCount} overlays</span>
        )}
        {saveIndicatorText && (
          <span
            className={`${styles.viewerInlineMeta} ${
              isSaving ? styles.viewerSaveIndicatorSaving : styles.viewerSaveIndicatorSaved
            }`}
          >
            {saveIndicatorText}
          </span>
        )}
      </div>
    </header>
  );
}

export const ViewerToolbar = memo(ViewerToolbarComponent);
