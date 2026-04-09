import {
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import {
  buildEntityPalette,
  coerceEntityLabel,
  hasEntityOverlap,
  normalizeEntitySpansForText
} from "../../../constants/anonymizationEntities";
import { buildRegionLabelOptions } from "../../../constants/regionLabelOptions";
import { hasBboxChanged } from "../utils/overlayDocument";
import { areEntitySpansEqual } from "../utils/textEntities";
import { buildRegionPreviewModel, canApplySelectionToTablePreview } from "../utils/previewModel";
import { resolveActiveRegion } from "./regionEditor/regionEditorActiveRegion";
import { useRegionEditorDraftState } from "./useRegionEditorDraftState";
import { useRegionEditorAnonymization } from "./regionEditor/useRegionEditorAnonymization";
import { useRegionEditorDialogLifecycle } from "./regionEditor/useRegionEditorDialogLifecycle";
import { useRegionEditorDocumentMutations } from "./regionEditor/useRegionEditorDocumentMutations";
import { useRegionEditorEntityHistorySync } from "./regionEditor/useRegionEditorEntityHistorySync";
import type { UseRegionEditorOptions } from "./useRegionEditor.types";
export type { SpanEditorDraft, TextDirection } from "./useRegionEditor.types";

export function useRegionEditor({
  overlayDocument,
  currentPage,
  copiedBbox,
  isBboxStructuralEditingEnabled,
  isRawTextEditingEnabled,
  anonymizationEntityLabels,
  defaultAnonymizationEntityLabel,
  defaultTextDirection,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: UseRegionEditorOptions) {
  const {
    dialogTextareaRef,
    dialogPreviewRef,
    activeRegionId,
    setActiveRegionId,
    dialogDraftLabel,
    setDialogDraftLabel,
    dialogDraftText,
    setDialogDraftText,
    dialogDraftEntities,
    setDialogDraftEntities,
    dialogDraftBbox,
    setDialogDraftBbox,
    dialogTextDirection,
    setDialogTextDirection,
    pendingSelection,
    setPendingSelection,
    pendingEntity,
    setPendingEntity,
    pickerSelection,
    setPickerSelection,
    spanEditor,
    setSpanEditor,
    entityWarning,
    setEntityWarning,
    resetDraftState
  } = useRegionEditorDraftState({
    defaultAnonymizationEntityLabel,
    defaultTextDirection
  });

  useEffect(() => {
    setActiveRegionId(null);
    resetDraftState();
  }, [currentPage, resetDraftState, setActiveRegionId]);

  useEffect(() => {
    if (!activeRegionId) {
      return;
    }

    const regionStillExists = resolveActiveRegion(overlayDocument, activeRegionId);
    if (regionStillExists) {
      return;
    }

    setActiveRegionId(null);
    resetDraftState();
  }, [activeRegionId, overlayDocument, resetDraftState, setActiveRegionId]);

  const closeAndResetEditor = useCallback(() => {
    setActiveRegionId(null);
    resetDraftState();
  }, [resetDraftState, setActiveRegionId]);

  const activeRegion = useMemo(() => resolveActiveRegion(overlayDocument, activeRegionId), [activeRegionId, overlayDocument]);
  const normalizedDraftEntities = useMemo(() => normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText), [dialogDraftEntities, dialogDraftText]);
  const previewModel = useMemo(() => buildRegionPreviewModel(dialogDraftText, normalizedDraftEntities), [dialogDraftText, normalizedDraftEntities]);

  const previewWarningMessage = useMemo(
    () =>
      previewModel.kind === "html_table" && previewModel.warnings.length > 0
        ? previewModel.warnings[0].message
        : null,
    [previewModel]
  );

  const hasDialogChanges = useMemo(() => {
    if (!activeRegion) {
      return false;
    }

    const nextDraftLabel = isBboxStructuralEditingEnabled ? dialogDraftLabel : activeRegion.label;
    const nextDraftBbox = isBboxStructuralEditingEnabled
      ? dialogDraftBbox ?? activeRegion.bbox
      : activeRegion.bbox;
    const nextDraftText = isRawTextEditingEnabled ? dialogDraftText : activeRegion.text || "";

    return (
      nextDraftLabel !== activeRegion.label ||
      hasBboxChanged(activeRegion.bbox, nextDraftBbox, 0) ||
      nextDraftText !== (activeRegion.text || "") ||
      !areEntitySpansEqual(
        normalizeEntitySpansForText(dialogDraftEntities, nextDraftText),
        normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || "")
      )
    );
  }, [activeRegion, dialogDraftBbox, dialogDraftEntities, dialogDraftLabel, dialogDraftText, isBboxStructuralEditingEnabled, isRawTextEditingEnabled]);

  const canAnonymizeSelection = useMemo(() => {
    if (!pendingSelection) {
      return false;
    }
    if (hasEntityOverlap(normalizedDraftEntities, pendingSelection.start, pendingSelection.end)) {
      return false;
    }
    return canApplySelectionToTablePreview(
      previewModel,
      pendingSelection.start,
      pendingSelection.end
    ).valid;
  }, [normalizedDraftEntities, pendingSelection, previewModel]);

  const dialogLabelOptions = useMemo(
    () => buildRegionLabelOptions(dialogDraftLabel),
    [dialogDraftLabel]
  );

  const dialogLifecycle = useRegionEditorDialogLifecycle({
    activeRegion,
    hasDialogChanges,
    defaultAnonymizationEntityLabel,
    defaultTextDirection,
    closeAndResetEditor,
    setActiveRegionId,
    setDialogDraftLabel,
    setDialogDraftBbox,
    setDialogDraftText,
    setDialogDraftEntities,
    setDialogTextDirection,
    setPendingSelection,
    setPendingEntity,
    setPickerSelection,
    setSpanEditor,
    setEntityWarning
  });

  const documentMutations = useRegionEditorDocumentMutations({
    overlayDocument,
    activeRegion,
    activeRegionId,
    copiedBbox,
    isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled,
    dialogDraftLabel,
    dialogDraftText,
    dialogDraftEntities,
    dialogDraftBbox,
    onOverlayEditStarted,
    onOverlayDocumentSaved,
    setDialogDraftLabel,
    setDialogDraftText,
    setDialogDraftEntities,
    setDialogDraftBbox,
    setPendingSelection,
    setPickerSelection,
    setSpanEditor,
    setEntityWarning,
    closeAndResetEditor
  });

  const anonymization = useRegionEditorAnonymization({
    dialogTextareaRef,
    dialogDraftText,
    dialogDraftEntities,
    normalizedDraftEntities,
    anonymizationEntityLabels,
    previewModel,
    pendingSelection,
    pendingEntity,
    pickerSelection,
    spanEditor,
    isRawTextEditingEnabled,
    commitActiveRegionEdits: documentMutations.commitActiveRegionEdits,
    setDialogDraftText,
    setDialogDraftEntities,
    setPendingSelection,
    setPendingEntity,
    setPickerSelection,
    setSpanEditor,
    setEntityWarning
  });

  useRegionEditorEntityHistorySync({
    activeRegion,
    dialogDraftLabel,
    dialogDraftText,
    dialogDraftEntities,
    dialogDraftBbox,
    isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled,
    isSpanBoundaryDragActive: anonymization.isSpanBoundaryDragActive,
    setDialogDraftEntities,
    setPendingSelection,
    setPickerSelection,
    setSpanEditor: (next) => setSpanEditor(next),
    setEntityWarning
  });

  useEffect(() => {
    if (!spanEditor) {
      return;
    }
    if (!normalizedDraftEntities[spanEditor.index]) {
      setSpanEditor(null);
    }
  }, [normalizedDraftEntities, setSpanEditor, spanEditor]);

  return {
    dialogTextareaRef,
    dialogPreviewRef,
    activeRegion,
    dialogDraftLabel,
    dialogDraftText,
    dialogDraftEntities,
    dialogTextDirection,
    pendingSelection,
    pendingEntity,
    pickerSelection,
    spanEditor,
    entityWarning: entityWarning ?? previewWarningMessage,
    normalizedDraftEntities,
    previewModel,
    canAnonymizeSelection,
    isRawTextEditingEnabled,
    dialogLabelOptions,
    hasDialogChanges,
    canPasteCopiedBboxIntoRegion: documentMutations.canPasteCopiedBboxIntoRegion,
    anonymizationEntityLabels,
    buildEntityPalette: (entity: string) => buildEntityPalette(entity, anonymizationEntityLabels),
    openRegionEditor: dialogLifecycle.openRegionEditor,
    closeRegionEditor: dialogLifecycle.closeRegionEditor,
    handleResetRegionEditor: dialogLifecycle.handleResetRegionEditor,
    handleSaveRegionEditor: documentMutations.handleSaveRegionEditor,
    handlePasteCopiedBboxIntoRegion: documentMutations.handlePasteCopiedBboxIntoRegion,
    handleDeleteRegionEditor: documentMutations.handleDeleteRegionEditor,
    deleteRegionWithCanonicalFlow: documentMutations.deleteRegionWithCanonicalFlow,
    updateRegionLabelWithCanonicalFlow: documentMutations.updateRegionLabelWithCanonicalFlow,
    refreshPendingSelection: anonymization.refreshPendingSelection,
    handleEditorInput: anonymization.handleEditorInput,
    handleEditorKeyUp: (_event: ReactKeyboardEvent<HTMLTextAreaElement>) => anonymization.handleEditorKeyUp(),
    handleAnonymizeSelection: anonymization.handleAnonymizeSelection,
    handlePendingEntityChange: anonymization.handlePendingEntityChange,
    handleApplyPickerEntity: anonymization.handleApplyPickerEntity,
    handleCancelPicker: anonymization.handleCancelPicker,
    handleOpenSpanEditor: anonymization.handleOpenSpanEditor,
    handleSpanEditorEntityChange: anonymization.handleSpanEditorEntityChange,
    handleApplySpanEditor: anonymization.handleApplySpanEditor,
    handleCancelSpanEditor: anonymization.handleCancelSpanEditor,
    handleRemoveSpan: anonymization.handleRemoveSpan,
    spanBoundaryControls: {
      activeBoundaryDrag: anonymization.activeBoundaryDrag,
      getSpanBoundaryStateByIndex: anonymization.getSpanBoundaryStateByIndex,
      handleStartBoundaryDrag: anonymization.handleStartBoundaryDrag,
      handleUpdateBoundaryDrag: anonymization.handleUpdateBoundaryDrag,
      handleEndBoundaryDragCommit: anonymization.handleEndBoundaryDragCommit,
      handleCancelBoundaryDrag: anonymization.handleCancelBoundaryDrag,
      handleAdjustBoundaryStep: anonymization.handleAdjustBoundaryStep
    },
    handleDialogDraftLabelChange: documentMutations.handleDialogDraftLabelChange,
    setDialogTextDirection,
    setPendingEntity,
    setSpanEditor,
    setPickerSelection,
    setEntityWarning,
    coerceEntityLabel: (value: unknown) => coerceEntityLabel(value, anonymizationEntityLabels)
  };
}
