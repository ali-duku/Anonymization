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
  retrievalInputValue,
  retrievalStatus,
  retrievalStatusText,
  canRetryRetrieval,
  onRetrievalInputChange,
  onRetrieveDocument,
  onResetRetrieval,
  onRetryRetrieval,
  manualFileInputRef,
  onManualFilePick,
  onManualFileChange,
  manualUploadStatusText,
  manualUploadStatusTone = "neutral",
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
          {onManualFilePick && onManualFileChange && (
            <>
              <button type="button" className={styles.buttonSecondary} onClick={onManualFilePick}>
                {hasPdf ? "Replace PDF" : "Upload PDF"}
              </button>
              <input
                ref={manualFileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={onManualFileChange}
                className={styles.hiddenInput}
              />
            </>
          )}
        </form>

        <div className={styles.toolbarGroup}>
          <button type="button" className={styles.buttonSecondary} onClick={() => onMovePage(-1)} disabled={!hasPdf}>
            Prev
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
        {manualUploadStatusText && (
          <span
            className={`${styles.viewerInlineMeta} ${
              manualUploadStatusTone === "error"
                ? styles.viewerInlineMetaError
                : manualUploadStatusTone === "success"
                  ? styles.viewerInlineMetaSuccess
                  : ""
            }`}
          >
            {manualUploadStatusText}
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
