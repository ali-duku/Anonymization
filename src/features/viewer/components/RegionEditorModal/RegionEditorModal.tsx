import { memo } from "react";
import { EntityPicker } from "../EntityPicker/EntityPicker";
import { SpanEditorPopover } from "../SpanEditorPopover/SpanEditorPopover";
import styles from "./RegionEditorModal.module.css";
import type { RegionEditorModalProps } from "./RegionEditorModal.types";

function RegionEditorModalComponent({
  activeRegion,
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
  dialogTextareaRef,
  dialogPreviewRef,
  buildEntityPalette,
  coerceEntityLabel,
  onClose,
  onLabelChange,
  onToggleDirection,
  onAnonymize,
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
  if (!activeRegion) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="region-editor-title">
      <div className={styles.modalCard}>
        <header className={styles.modalHeader}>
          <h2 id="region-editor-title">Edit Region</h2>
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
          <label className={styles.textLabel} htmlFor="overlay-label-select">
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

          <div className={styles.textHeader}>
            <label className={styles.textLabel} htmlFor="overlay-text-content">
              Text
            </label>
            <div className={styles.textControls}>
              <button
                type="button"
                className={`${styles.buttonGhost} ${styles.directionToggle}`}
                onClick={onToggleDirection}
              >
                {dialogTextDirection === "rtl" ? "Switch to LTR" : "Switch to RTL"}
              </button>
              <button
                type="button"
                className={`${styles.buttonSecondary} ${styles.anonymizeButton}`}
                onClick={onAnonymize}
                disabled={!pendingSelection || !canAnonymizeSelection}
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
          </div>

          <div className={styles.editorGrid}>
            <div className={styles.editorColumn}>
              <div className={styles.previewLabel}>Text Input</div>
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
              <div className={styles.previewLabel}>Anonymization Preview</div>
              <div
                ref={dialogPreviewRef}
                className={styles.textPreview}
                dir={dialogTextDirection}
              >
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
                        const previewRect = dialogPreviewRef.current?.getBoundingClientRect();
                        onOpenSpanEditor(
                          segment.entityIndex,
                          previewRect ? rect.left - previewRect.left : rect.left,
                          previewRect ? rect.bottom - previewRect.top + 6 : rect.bottom + 6
                        );
                      }}
                    >
                      {segment.text}
                    </span>
                  );
                })}
              </div>
            </div>
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

          {entityWarning && <p className={styles.statusLineError}>{entityWarning}</p>}

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
            </dl>
          </details>
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export const RegionEditorModal = memo(RegionEditorModalComponent);
