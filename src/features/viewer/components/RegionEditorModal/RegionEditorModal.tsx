import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRegionDialogContainerBounds } from "../../hooks/useRegionDialogContainerBounds";
import { useRegionDialogLayout } from "../../hooks/useRegionDialogLayout";
import { useRegionDialogPaneMinimums } from "../../hooks/useRegionDialogPaneMinimums";
import { useTopmostDialogDismissal } from "../../hooks/useTopmostDialogDismissal";
import { SpanEditorPopover } from "../SpanEditorPopover/SpanEditorPopover";
import { RegionEditorFormSection } from "./RegionEditorFormSection";
import { RegionEditorSnippetPane } from "./RegionEditorSnippetPane";
import styles from "./RegionEditorModal.module.css";
import type { RegionEditorModalProps } from "./RegionEditorModal.types";

const MIN_SNIPPET_ZOOM = 0.5;
const MAX_SNIPPET_ZOOM = 4;
const SNIPPET_ZOOM_STEP = 0.25;
const DEFAULT_SNIPPET_ZOOM = 0.75;

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
  previewModel,
  normalizedDraftEntities,
  anonymizationEntityLabels,
  canAnonymizeSelection,
  hasPreviousRegion,
  hasNextRegion,
  hasFirstRegion,
  hasLastRegion,
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
  onGoFirstRegion,
  onGoLastRegion,
  onGoPreviousRegion,
  onGoNextRegion,
  onGoRegionByOrder,
  onPendingEntityChange,
  onCancelPicker,
  onEditorInput,
  onEditorSelect,
  onEditorMouseUp,
  onEditorKeyUp,
  onOpenSpanEditor,
  onSpanEditorEntityChange,
  onRemoveSpan,
  onCancelSpanEditor,
  onSave,
  onReset,
  onDelete,
  onCopyRegion,
  isRawTextEditingEnabled,
  isTextCopyEnabled,
  isBboxStructuralEditingEnabled,
  hasCopiedBbox,
  onPasteRegionFromClipboard,
  onCopyRegionText
}: RegionEditorModalProps) {
  const [snippetZoom, setSnippetZoom] = useState(DEFAULT_SNIPPET_ZOOM);
  const pickerRef = useRef<HTMLDivElement>(null);
  const spanEditorRef = useRef<HTMLDivElement>(null);
  const modalShellRef = useRef<HTMLDivElement>(null);
  const snippetPaneRef = useRef<HTMLElement>(null);
  const snippetProtectedRef = useRef<HTMLDivElement>(null);
  const modalCardRef = useRef<HTMLElement>(null);
  const dialogActionsRef = useRef<HTMLDivElement>(null);

  const { availableWidth } = useRegionDialogContainerBounds({
    containerRef: modalShellRef,
    isEnabled: Boolean(activeRegion)
  });

  const { minLeftPaneWidth, minRightPaneWidth } = useRegionDialogPaneMinimums({
    leftPaneRef: snippetPaneRef,
    leftProtectedRef: snippetProtectedRef,
    rightPaneRef: modalCardRef,
    rightProtectedRef: dialogActionsRef,
    isEnabled: Boolean(activeRegion)
  });

  const {
    modalShellStyle,
    rightPaneWidth,
    isDragging,
    separatorAriaMin,
    separatorAriaMax,
    onSeparatorPointerDown,
    onSeparatorKeyDown
  } = useRegionDialogLayout({
    minRightPaneWidth,
    minLeftPaneWidth,
    availableWidth,
    containerRef: modalShellRef
  });

  useEffect(() => {
    setSnippetZoom(DEFAULT_SNIPPET_ZOOM);
  }, [activeRegion?.id, snippet?.imageUrl]);

  const snippetZoomPercent = useMemo(() => Math.round(snippetZoom * 100), [snippetZoom]);

  useTopmostDialogDismissal({
    isParentOpen: Boolean(activeRegion),
    isSpanEditorOpen: Boolean(spanEditor),
    isPickerOpen: Boolean(pickerSelection),
    spanEditorRef,
    pickerRef,
    onDismissSpanEditor: onCancelSpanEditor,
    onDismissPicker: onCancelPicker,
    onDismissParent: onClose
  });

  if (!activeRegion) {
    return null;
  }

  const modalContent = (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="region-editor-title">
      <div
        ref={modalShellRef}
        className={`${styles.modalShell} ${isDragging ? styles.modalShellDragging : ""}`}
        style={modalShellStyle}
      >
        <RegionEditorSnippetPane
          activeRegion={activeRegion}
          snippet={snippet}
          currentRegionOrder={currentRegionOrder}
          totalRegionsOnPage={totalRegionsOnPage}
          snippetZoom={snippetZoom}
          snippetZoomPercent={snippetZoomPercent}
          minSnippetZoom={MIN_SNIPPET_ZOOM}
          maxSnippetZoom={MAX_SNIPPET_ZOOM}
          defaultSnippetZoom={DEFAULT_SNIPPET_ZOOM}
          snippetZoomStep={SNIPPET_ZOOM_STEP}
          hasFirstRegion={hasFirstRegion}
          hasLastRegion={hasLastRegion}
          hasPreviousRegion={hasPreviousRegion}
          hasNextRegion={hasNextRegion}
          snippetPaneRef={snippetPaneRef}
          snippetProtectedRef={snippetProtectedRef}
          onGoFirstRegion={onGoFirstRegion}
          onGoLastRegion={onGoLastRegion}
          onGoPreviousRegion={onGoPreviousRegion}
          onGoNextRegion={onGoNextRegion}
          onGoRegionByOrder={onGoRegionByOrder}
          onSnippetZoomChange={(nextZoom) => {
            setSnippetZoom(clampSnippetZoom(nextZoom));
          }}
        />

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

        <RegionEditorFormSection
          activeRegion={activeRegion}
          snippet={snippet}
          dialogDraftLabel={dialogDraftLabel}
          dialogDraftText={dialogDraftText}
          dialogTextDirection={dialogTextDirection}
          dialogLabelOptions={dialogLabelOptions}
          pendingSelection={pendingSelection}
          pendingEntity={pendingEntity}
          pickerSelection={pickerSelection}
          entityWarning={entityWarning}
          previewModel={previewModel}
          normalizedDraftEntities={normalizedDraftEntities}
          anonymizationEntityLabels={anonymizationEntityLabels}
          canAnonymizeSelection={canAnonymizeSelection}
          dialogTextareaRef={dialogTextareaRef}
          dialogPreviewRef={dialogPreviewRef}
          modalCardRef={modalCardRef}
          dialogActionsRef={dialogActionsRef}
          pickerRef={pickerRef}
          buildEntityPalette={buildEntityPalette}
          coerceEntityLabel={coerceEntityLabel}
          hasCopiedBbox={hasCopiedBbox}
          isRawTextEditingEnabled={isRawTextEditingEnabled}
          isTextCopyEnabled={isTextCopyEnabled}
          isBboxStructuralEditingEnabled={isBboxStructuralEditingEnabled}
          onClose={onClose}
          onLabelChange={onLabelChange}
          onToggleDirection={onToggleDirection}
          onAnonymize={onAnonymize}
          onPendingEntityChange={onPendingEntityChange}
          onCancelPicker={onCancelPicker}
          onEditorInput={onEditorInput}
          onEditorSelect={onEditorSelect}
          onEditorMouseUp={onEditorMouseUp}
          onEditorKeyUp={onEditorKeyUp}
          onOpenSpanEditor={onOpenSpanEditor}
          onCopyRegion={onCopyRegion}
          onPasteRegionFromClipboard={onPasteRegionFromClipboard}
          onCopyRegionText={onCopyRegionText}
          onSave={onSave}
          onReset={onReset}
          onDelete={onDelete}
        />
      </div>

      <SpanEditorPopover
        containerRef={spanEditorRef}
        spanEditor={spanEditor}
        entityLabels={anonymizationEntityLabels}
        coerceEntityLabel={coerceEntityLabel}
        onEntityChange={onSpanEditorEntityChange}
        onRemove={onRemoveSpan}
        onCancel={onCancelSpanEditor}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}

export const RegionEditorModal = memo(RegionEditorModalComponent);
