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
  hasCopiedBbox,
  recordSummary,
  overlayCount,
  showOverlayCount,
  saveIndicatorText,
  isSaving,
  retrievalInputValue,
  retrievalStatus,
  retrievalStatusText,
  canRetryRetrieval,
  onRetrievalInputChange,
  onRetrieveDocument,
  onResetRetrieval,
  onRetryRetrieval,
  onMovePage,
  onPageInput,
  onToggleCreateMode,
  onPasteCopiedBbox,
  onZoomOut,
  onZoomIn,
  onFitToWidth
}: ViewerToolbarProps) {
  return (
    <header className={styles.viewerTopline}>
      <h2>Viewer</h2>
      <div className={styles.viewerToolbar}>
        <form
          className={styles.toolbarGroup}
          onSubmit={(event) => {
            event.preventDefault();
            onRetrieveDocument();
          }}
        >
          <label className={styles.compactField}>
            ID
            <input
              className={styles.retrievalInput}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="123456"
              value={retrievalInputValue}
              onChange={(event) => onRetrievalInputChange(event.currentTarget.value)}
              disabled={retrievalStatus === "loading"}
            />
          </label>
          <button type="submit" className={styles.buttonPrimary} disabled={retrievalStatus === "loading"}>
            {retrievalStatus === "loading" ? "..." : "Retrieve"}
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={onResetRetrieval}>
            Reset
          </button>
          {canRetryRetrieval && retrievalStatus === "error" && (
            <button type="button" className={styles.buttonSecondary} onClick={onRetryRetrieval}>
              Retry
            </button>
          )}
        </form>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={`${styles.buttonSecondary} ${styles.iconButton}`}
            onClick={() => onMovePage(-1)}
            disabled={!hasPdf}
            aria-label="Previous page"
            title="Previous page"
          >
            <span className={styles.iconGlyph} aria-hidden="true">{"\u2190"}</span>
          </button>
          <label className={styles.compactField}>
            Page
            <input
              className={styles.pageInput}
              type="number"
              min={1}
              max={Math.max(1, totalPages)}
              value={currentPage}
              onChange={(event) => onPageInput(Number(event.target.value))}
              disabled={!hasPdf}
            />
          </label>
          <span className={styles.totalPages}>/ {totalPages || 0}</span>
          <button
            type="button"
            className={`${styles.buttonSecondary} ${styles.iconButton}`}
            onClick={() => onMovePage(1)}
            disabled={!hasPdf}
            aria-label="Next page"
            title="Next page"
          >
            <span className={styles.iconGlyph} aria-hidden="true">{"\u2192"}</span>
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
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onPasteCopiedBbox}
            disabled={!hasPdf || !canCreateBbox || !hasCopiedBbox}
          >
            Paste
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={onZoomOut} disabled={!hasPdf}>
            -
          </button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button type="button" className={styles.buttonSecondary} onClick={onZoomIn} disabled={!hasPdf}>
            +
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={onFitToWidth} disabled={!hasPdf}>
            Fit
          </button>
        </div>

        {recordSummary && <span className={styles.viewerInlineMeta}>{recordSummary}</span>}
        {showOverlayCount && (
          <span className={styles.viewerInlineMeta}>Page {currentPage}: {overlayCount} overlays</span>
        )}
        {retrievalStatusText && (
          <span
            className={`${styles.viewerInlineMeta} ${
              retrievalStatus === "error"
                ? styles.viewerInlineMetaError
                : retrievalStatus === "success"
                  ? styles.viewerInlineMetaSuccess
                  : ""
            }`}
          >
            {retrievalStatusText}
          </span>
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


