import { memo, useEffect, useMemo, useState } from "react";
import { useRegionDialogLayout } from "../../hooks/useRegionDialogLayout";
import { createPortal } from "react-dom";
import { EntityPicker } from "../EntityPicker/EntityPicker";
import { SpanEditorPopover } from "../SpanEditorPopover/SpanEditorPopover";
import styles from "./RegionEditorModal.module.css";
import type { RegionEditorModalProps } from "./RegionEditorModal.types";

const MIN_SNIPPET_ZOOM = 0.5;
const MAX_SNIPPET_ZOOM = 4;
const SNIPPET_ZOOM_STEP = 0.25;

function clampSnippetZoom(value: number): number {
  return Math.min(MAX_SNIPPET_ZOOM, Math.max(MIN_SNIPPET_ZOOM, value));
}

function RegionEditorModalComponent({
  activeRegion,
  snippet,
  dialogDraftLabel,
  dialogDraftText,
  dialogTextDirection,
  dialogLabelOptions,
  pendingSelection,
  pendingEntity,
  pickerSelection,
  spanEditor,
  entityWarning,
  textSegments,
  normalizedDraftEntities,
  anonymizationEntityLabels,
  canAnonymizeSelection,
  hasPreviousRegion,
  hasNextRegion,
  currentRegionOrder,
  totalRegionsOnPage,
  dialogTextareaRef,
  dialogPreviewRef,
  buildEntityPalette,
  coerceEntityLabel,
  onClose,
  onLabelChange,
  onToggleDirection,
  onAnonymize,
  onGoPreviousRegion,
  onGoNextRegion,
  onPendingEntityChange,
  onApplyPickerEntity,
  onCancelPicker,
  onEditorInput,
  onEditorSelect,
  onEditorMouseUp,
  onEditorKeyUp,
  onOpenSpanEditor,
  onSpanEditorEntityChange,
  onApplySpanEditor,
  onRemoveSpan,
  onCancelSpanEditor,
  onSave,
  onReset,
  onDelete
}: RegionEditorModalProps) {
  const [snippetZoom, setSnippetZoom] = useState(1);
  const {
    modalShellStyle,
    rightPaneWidth,
    isCompactLayout,
    isDragging,
    separatorAriaMin,
    separatorAriaMax,
    onSeparatorPointerDown,
    onSeparatorKeyDown
  } = useRegionDialogLayout();

  useEffect(() => {
    setSnippetZoom(1);
  }, [activeRegion?.id, snippet?.imageUrl]);

  const snippetZoomPercent = useMemo(() => Math.round(snippetZoom * 100), [snippetZoom]);

  if (!activeRegion) {
    return null;
  }
  const modalContent = (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="region-editor-title">
      <div
        className={`${styles.modalShell} ${isDragging ? styles.modalShellDragging : ""}`}
        style={modalShellStyle}
      >
        <aside className={styles.snippetPane}>
          <header className={styles.snippetHeader}>
            <h2 id="region-editor-title">Region Context</h2>
            <div className={styles.snippetMeta}>
              <span>P{activeRegion.metadata.pageNumber ?? "?"}</span>
              <span>R{activeRegion.metadata.regionId ?? "?"}</span>
              <span>
                {currentRegionOrder && totalRegionsOnPage > 0
                  ? `${currentRegionOrder}/${totalRegionsOnPage}`
                  : "-"}
              </span>
            </div>
          </header>

          <div className={styles.snippetControls}>
            <div className={styles.snippetNavButtons}>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={onGoPreviousRegion}
                disabled={!hasPreviousRegion}
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={onGoNextRegion}
                disabled={!hasNextRegion}
              >
                Next
              </button>
            </div>
            <div className={styles.snippetZoomControls}>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => {
                  setSnippetZoom((previous) => clampSnippetZoom(previous - SNIPPET_ZOOM_STEP));
                }}
                disabled={snippetZoom <= MIN_SNIPPET_ZOOM}
                aria-label="Zoom out snippet"
              >
                -
              </button>
              <span className={styles.snippetZoomValue}>{snippetZoomPercent}%</span>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => {
                  setSnippetZoom((previous) => clampSnippetZoom(previous + SNIPPET_ZOOM_STEP));
                }}
                disabled={snippetZoom >= MAX_SNIPPET_ZOOM}
                aria-label="Zoom in snippet"
              >
                +
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => {
                  setSnippetZoom(1);
                }}
                disabled={snippetZoom === 1}
              >
                Reset
              </button>
            </div>
          </div>

          <div
            className={styles.snippetViewport}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
          >
            {snippet?.imageUrl ? (
              <img
                className={styles.snippetImage}
                src={snippet.imageUrl}
                alt="PDF snippet for selected region"
                draggable={false}
                onDragStart={(event) => {
                  event.preventDefault();
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                }}
                style={{ width: `${snippetZoomPercent}%` }}
              />
            ) : (
              <p className={styles.snippetFallback}>Snippet unavailable for this region.</p>
            )}
          </div>
        </aside>

        {!isCompactLayout ? (
          <div
            className={`${styles.paneSeparator} ${isDragging ? styles.paneSeparatorDragging : ""}`}
            role="separator"
            tabIndex={0}
            aria-label="Resize region dialog columns"
            aria-orientation="vertical"
            aria-valuemin={separatorAriaMin}
            aria-valuemax={separatorAriaMax}
            aria-valuenow={rightPaneWidth}
            onPointerDown={onSeparatorPointerDown}
            onKeyDown={onSeparatorKeyDown}
          />
        ) : null}

        <section className={styles.modalCard}>
          <header className={styles.modalHeader}>
            <h3>Edit Region</h3>
            <button
              type="button"
              className={styles.dialogCloseButton}
              onClick={onClose}
              aria-label="Close region editor"
            >
              <span className={styles.dialogCloseGlyph} aria-hidden="true" />
            </button>
          </header>

          <div className={styles.dialogBody}>
            <div className={styles.controlsRow}>
              <label className={styles.inlineLabel} htmlFor="overlay-label-select">
                Label
              </label>
              <select
                id="overlay-label-select"
                className={styles.select}
                value={dialogDraftLabel}
                onChange={(event) => onLabelChange(event.currentTarget.value)}
              >
                {dialogLabelOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`${styles.buttonGhost} ${styles.directionToggle}`}
                onClick={onToggleDirection}
              >
                {dialogTextDirection === "rtl" ? "RTL" : "LTR"}
              </button>
              <button
                type="button"
                className={`${styles.buttonSecondary} ${styles.anonymizeButton}`}
                onClick={onAnonymize}
                disabled={false}
                aria-disabled={Boolean(!pendingSelection && !canAnonymizeSelection)}
                title={!pendingSelection && !canAnonymizeSelection ? "Select text to anonymize" : undefined}
              >
                Anonymize
              </button>
              <EntityPicker
                selection={pickerSelection}
                pendingEntity={pendingEntity}
                entityLabels={anonymizationEntityLabels}
                coerceEntityLabel={coerceEntityLabel}
                onPendingEntityChange={onPendingEntityChange}
                onApply={onApplyPickerEntity}
                onCancel={onCancelPicker}
              />
            </div>

            <div className={styles.editorGrid}>
              <div className={styles.editorColumn}>
                <div className={styles.previewLabel}>Text</div>
                <textarea
                  id="overlay-text-content"
                  className={styles.textInput}
                  dir={dialogTextDirection}
                  ref={dialogTextareaRef}
                  value={dialogDraftText}
                  role="textbox"
                  aria-label="Text"
                  onChange={onEditorInput}
                  onSelect={onEditorSelect}
                  onMouseUp={onEditorMouseUp}
                  onKeyUp={onEditorKeyUp}
                />
              </div>
              <div className={styles.editorColumn}>
                <div className={styles.previewLabel}>Preview</div>
                <div ref={dialogPreviewRef} className={styles.textPreview} dir={dialogTextDirection}>
                  {textSegments.map((segment, index) => {
                    if (segment.entityIndex === null || !segment.entity) {
                      return (
                        <span key={`plain-${index}`} className={styles.segment}>
                          {segment.text}
                        </span>
                      );
                    }

                    const palette = buildEntityPalette(segment.entity);
                    return (
                      <span
                        key={`entity-${segment.entityIndex}-${index}`}
                        className={styles.entitySpan}
                        style={{
                          background: palette.background,
                          color: palette.text,
                          borderColor: palette.border
                        }}
                        title={`${segment.entity} [${segment.start ?? "?"}-${segment.end ?? "?"}]`}
                        onDoubleClick={(event) => {
                          if (segment.entityIndex === null) {
                            return;
                          }
                          event.preventDefault();
                          event.stopPropagation();
                          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                          onOpenSpanEditor(segment.entityIndex, rect.left, rect.bottom + 6);
                        }}
                      >
                        {segment.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <details className={styles.metadata}>
              <summary>Metadata</summary>
              <dl>
                <div>
                  <dt>Page</dt>
                  <dd>{activeRegion.metadata.pageNumber ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Region ID</dt>
                  <dd>{activeRegion.metadata.regionId ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Entities</dt>
                  <dd>{normalizedDraftEntities.length}</dd>
                </div>
                {snippet?.width && snippet?.height ? (
                  <div>
                    <dt>Snippet</dt>
                    <dd>
                      {snippet.width}x{snippet.height}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </details>

            {entityWarning && <p className={styles.statusLineError}>{entityWarning}</p>}
          </div>

          <div className={styles.dialogActions}>
            <button type="button" className={styles.buttonSecondary} onClick={onSave}>
              Save
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={onReset}>
              Reset
            </button>
            <button type="button" className={styles.buttonDanger} onClick={onDelete}>
              Delete
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={onClose}>
              Close
            </button>
          </div>
        </section>
      </div>

      <SpanEditorPopover
        spanEditor={spanEditor}
        entityLabels={anonymizationEntityLabels}
        coerceEntityLabel={coerceEntityLabel}
        onEntityChange={onSpanEditorEntityChange}
        onSave={onApplySpanEditor}
        onRemove={onRemoveSpan}
        onCancel={onCancelSpanEditor}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}

export const RegionEditorModal = memo(RegionEditorModalComponent);


