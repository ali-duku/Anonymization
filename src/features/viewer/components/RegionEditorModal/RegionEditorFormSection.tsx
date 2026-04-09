import type { ChangeEventHandler, KeyboardEventHandler, RefObject } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import type { PendingSelectionRange } from "../../utils/textEntities";
import type { RegionPreviewModel } from "../../utils/previewModel";
import { EntityPicker } from "../EntityPicker/EntityPicker";
import { RegionEditorPreviewPane } from "./RegionEditorPreviewPane";
import styles from "./RegionEditorModal.module.css";
import type { RegionEditorModalProps, RegionEditorSnippet } from "./RegionEditorModal.types";

interface RegionEditorFormSectionProps {
  activeRegion: OverlayRegion;
  snippet: RegionEditorSnippet | null;
  dialogDraftLabel: string;
  dialogDraftText: string;
  dialogTextDirection: "rtl" | "ltr";
  dialogLabelOptions: readonly string[];
  pendingSelection: PendingSelectionRange | null;
  pendingEntity: string;
  pickerSelection: PendingSelectionRange | null;
  entityWarning: string | null;
  previewModel: RegionPreviewModel;
  normalizedDraftEntities: Array<{ start: number; end: number; entity: string }>;
  anonymizationEntityLabels: readonly string[];
  canAnonymizeSelection: boolean;
  dialogTextareaRef: RefObject<HTMLTextAreaElement>;
  dialogPreviewRef: RefObject<HTMLDivElement>;
  modalCardRef: RefObject<HTMLElement>;
  dialogActionsRef: RefObject<HTMLDivElement>;
  pickerRef: RefObject<HTMLDivElement>;
  buildEntityPalette: (entity: string) => { background: string; text: string; border: string };
  coerceEntityLabel: (value: unknown) => string;
  spanBoundaryControls: RegionEditorModalProps["spanBoundaryControls"];
  hasCopiedBbox: boolean;
  isRawTextEditingEnabled: boolean;
  isTextCopyEnabled: boolean;
  isBboxStructuralEditingEnabled: boolean;
  onClose: () => void;
  onLabelChange: (nextLabel: string) => void;
  onToggleDirection: () => void;
  onAnonymize: () => void;
  onPendingEntityChange: (nextEntity: string) => void;
  onCancelPicker: () => void;
  onEditorInput: ChangeEventHandler<HTMLTextAreaElement>;
  onEditorSelect: () => void;
  onEditorMouseUp: () => void;
  onEditorKeyUp: KeyboardEventHandler<HTMLTextAreaElement>;
  onOpenSpanEditor: (index: number, anchorX: number, anchorY: number) => void;
  onCopyRegion: (region: OverlayRegion) => void;
  onPasteRegionFromClipboard: () => void;
  onCopyRegionText: (region: OverlayRegion) => void;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
}

export function RegionEditorFormSection({
  activeRegion,
  snippet,
  dialogDraftLabel,
  dialogDraftText,
  dialogTextDirection,
  dialogLabelOptions,
  pendingSelection,
  pendingEntity,
  pickerSelection,
  entityWarning,
  previewModel,
  normalizedDraftEntities,
  anonymizationEntityLabels,
  canAnonymizeSelection,
  dialogTextareaRef,
  dialogPreviewRef,
  modalCardRef,
  dialogActionsRef,
  pickerRef,
  buildEntityPalette,
  coerceEntityLabel,
  spanBoundaryControls,
  hasCopiedBbox,
  isRawTextEditingEnabled,
  isTextCopyEnabled,
  isBboxStructuralEditingEnabled,
  onClose,
  onLabelChange,
  onToggleDirection,
  onAnonymize,
  onPendingEntityChange,
  onCancelPicker,
  onEditorInput,
  onEditorSelect,
  onEditorMouseUp,
  onEditorKeyUp,
  onOpenSpanEditor,
  onCopyRegion,
  onPasteRegionFromClipboard,
  onCopyRegionText,
  onSave,
  onReset,
  onDelete
}: RegionEditorFormSectionProps) {
  return (
    <section ref={modalCardRef} className={styles.modalCard}>
      <header className={styles.modalHeader}>
        <h3>Edit Region</h3>
        <button type="button" className={styles.dialogCloseButton} onClick={onClose} aria-label="Close region editor">
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
            disabled={!isBboxStructuralEditingEnabled}
            title={!isBboxStructuralEditingEnabled ? "BBox structural editing is disabled." : undefined}
          >
            {dialogLabelOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <button type="button" className={`${styles.buttonGhost} ${styles.directionToggle}`} onClick={onToggleDirection}>
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
            containerRef={pickerRef}
            selection={pickerSelection}
            pendingEntity={pendingEntity}
            entityLabels={anonymizationEntityLabels}
            coerceEntityLabel={coerceEntityLabel}
            onPendingEntityChange={onPendingEntityChange}
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
              aria-readonly={!isRawTextEditingEnabled}
              readOnly={!isRawTextEditingEnabled}
              onChange={onEditorInput}
              onSelect={onEditorSelect}
              onMouseUp={onEditorMouseUp}
              onKeyUp={onEditorKeyUp}
            />
          </div>
          <div className={styles.editorColumn}>
            <div className={styles.previewLabel}>Preview</div>
            <RegionEditorPreviewPane
              dialogPreviewRef={dialogPreviewRef}
              dialogTextDirection={dialogTextDirection}
              dialogDraftTextLength={dialogDraftText.length}
              previewModel={previewModel}
              buildEntityPalette={buildEntityPalette}
              onOpenSpanEditor={onOpenSpanEditor}
              spanBoundaryControls={spanBoundaryControls}
            />
          </div>
        </div>
        <details className={styles.metadata}>
          <summary>Metadata</summary>
          <dl>
            <div><dt>Page</dt><dd>{activeRegion.metadata.pageNumber ?? "N/A"}</dd></div>
            <div><dt>Region ID</dt><dd>{activeRegion.metadata.regionId ?? "N/A"}</dd></div>
            <div><dt>Entities</dt><dd>{normalizedDraftEntities.length}</dd></div>
            {snippet?.width && snippet?.height ? (
              <div><dt>Snippet</dt><dd>{snippet.width}x{snippet.height}</dd></div>
            ) : null}
          </dl>
        </details>
        {entityWarning && <p className={styles.statusLineError}>{entityWarning}</p>}
      </div>
      <div ref={dialogActionsRef} className={styles.dialogActions}>
        <button type="button" className={styles.buttonSecondary} onClick={() => onCopyRegion(activeRegion)} disabled={!isBboxStructuralEditingEnabled}>
          Copy BBox
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onPasteRegionFromClipboard} disabled={!isBboxStructuralEditingEnabled || !hasCopiedBbox}>
          Paste BBox
        </button>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => onCopyRegionText(activeRegion)}
          disabled={!isTextCopyEnabled}
          title={!isTextCopyEnabled ? "Text copy is disabled." : undefined}
        >
          Copy Text
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onSave}>Save</button>
        <button type="button" className={styles.buttonSecondary} onClick={onReset}>Reset</button>
        <button type="button" className={styles.buttonDanger} onClick={onDelete} disabled={!isBboxStructuralEditingEnabled}>
          Delete
        </button>
        <button type="button" className={styles.buttonPrimary} onClick={onClose}>Close</button>
      </div>
    </section>
  );
}
