import {
  useCallback,
  useEffect,
  useMemo,
  type ChangeEventHandler,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import {
  buildEntityPalette,
  coerceEntityLabel,
  hasEntityOverlap,
  normalizeEntitySpansForText,
  sortEntitySpans
} from "../../../constants/anonymizationEntities";
import { buildRegionLabelOptions } from "../../../constants/regionLabelOptions";
import type { OverlayDocument, OverlayRegion } from "../../../types/overlay";
import { buildRegionEditsFromBboxClipboardPayload } from "../utils/bboxClipboard";
import { applyRegionEdits, hasBboxChanged, removeRegionFromDocument } from "../utils/overlayDocument";
import {
  areEntitySpansEqual,
  getTextareaSelectionOffsets,
  remapEntitySpansAfterTextChange
} from "../utils/textEntities";
import {
  buildRegionPreviewModel,
  canApplySelectionToTablePreview
} from "../utils/previewModel";
import { useRegionEditorDraftState } from "./useRegionEditorDraftState";
import type { UseRegionEditorOptions } from "./useRegionEditor.types";
export type { SpanEditorDraft, TextDirection } from "./useRegionEditor.types";

function resolveActiveRegion(overlayDocument: OverlayDocument | null, activeRegionId: string | null): OverlayRegion | null {
  if (!activeRegionId || !overlayDocument) {
    return null;
  }

  for (const page of overlayDocument.pages) {
    const region = page.regions.find((item) => item.id === activeRegionId);
    if (region) {
      return region;
    }
  }

  return null;
}

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

  const activeRegion = useMemo(() => {
    return resolveActiveRegion(overlayDocument, activeRegionId);
  }, [activeRegionId, overlayDocument]);

  const normalizedDraftEntities = useMemo(
    () => normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText),
    [dialogDraftEntities, dialogDraftText]
  );

  const previewModel = useMemo(
    () => buildRegionPreviewModel(dialogDraftText, normalizedDraftEntities),
    [dialogDraftText, normalizedDraftEntities]
  );

  const previewWarningMessage = useMemo(() => {
    if (previewModel.kind !== "html_table" || previewModel.warnings.length === 0) {
      return null;
    }
    return previewModel.warnings[0].message;
  }, [previewModel]);

  const hasDialogChanges = useMemo(() => {
    if (!activeRegion) {
      return false;
    }

    const nextDraftBbox = isBboxStructuralEditingEnabled
      ? dialogDraftBbox ?? activeRegion.bbox
      : activeRegion.bbox;
    const nextDraftText = isRawTextEditingEnabled ? dialogDraftText : activeRegion.text || "";

    return (
      dialogDraftLabel !== activeRegion.label ||
      hasBboxChanged(activeRegion.bbox, nextDraftBbox, 0) ||
      nextDraftText !== (activeRegion.text || "") ||
      !areEntitySpansEqual(
        normalizeEntitySpansForText(dialogDraftEntities, nextDraftText),
        normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || "")
      )
    );
  }, [
    activeRegion,
    dialogDraftBbox,
    dialogDraftEntities,
    dialogDraftLabel,
    dialogDraftText,
    isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled
  ]);

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

  const openRegionEditor = useCallback((region: OverlayRegion) => {
    setActiveRegionId(region.id);
    setDialogDraftLabel(region.label);
    setDialogDraftBbox({
      x1: region.bbox.x1,
      y1: region.bbox.y1,
      x2: region.bbox.x2,
      y2: region.bbox.y2
    });
    setDialogDraftText(region.text || "");
    setDialogDraftEntities(normalizeEntitySpansForText(region.entities || [], region.text || ""));
    setDialogTextDirection(defaultTextDirection);
    setPendingSelection(null);
    setPendingEntity(defaultAnonymizationEntityLabel);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [defaultAnonymizationEntityLabel, defaultTextDirection]);

  const closeRegionEditor = useCallback(() => {
    if (hasDialogChanges) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in this region. Discard them?"
      );
      if (!shouldDiscard) {
        return;
      }
    }

    closeAndResetEditor();
  }, [closeAndResetEditor, hasDialogChanges]);

  const handleResetRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }

    setDialogDraftLabel(activeRegion.label);
    setDialogDraftBbox({
      x1: activeRegion.bbox.x1,
      y1: activeRegion.bbox.y1,
      x2: activeRegion.bbox.x2,
      y2: activeRegion.bbox.y2
    });
    setDialogDraftText(activeRegion.text || "");
    setDialogDraftEntities(normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || ""));
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [activeRegion]);

  const handleSaveRegionEditor = useCallback((): boolean => {
    if (!activeRegion) {
      return false;
    }

    const nextLabel = dialogDraftLabel.trim() || activeRegion.label;
    const nextBbox = isBboxStructuralEditingEnabled
      ? dialogDraftBbox ?? activeRegion.bbox
      : activeRegion.bbox;
    const nextText = isRawTextEditingEnabled ? dialogDraftText : activeRegion.text || "";
    const nextEntities = normalizeEntitySpansForText(dialogDraftEntities, nextText);

    if (!overlayDocument || !onOverlayDocumentSaved) {
      return false;
    }

    onOverlayEditStarted?.();
    const nextDocument = applyRegionEdits(overlayDocument, activeRegion.pageNumber, activeRegion.id, {
      bbox: nextBbox,
      label: nextLabel,
      text: nextText,
      entities: nextEntities
    });
    onOverlayDocumentSaved(nextDocument);
    return true;
  }, [
    activeRegion,
    dialogDraftBbox,
    dialogDraftEntities,
    dialogDraftLabel,
    dialogDraftText,
    isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled,
    onOverlayDocumentSaved,
    onOverlayEditStarted,
    overlayDocument
  ]);

  const updateRegionLabelWithCanonicalFlow = useCallback(
    (region: OverlayRegion, nextLabelRaw: string) => {
      if (!overlayDocument || !onOverlayDocumentSaved) {
        return;
      }

      const nextLabel = nextLabelRaw.trim() || region.label;
      if (nextLabel === region.label) {
        if (activeRegionId === region.id) {
          setDialogDraftLabel(nextLabel);
        }
        return;
      }

      const nextDocument = applyRegionEdits(overlayDocument, region.pageNumber, region.id, {
        label: nextLabel
      });
      if (nextDocument === overlayDocument) {
        return;
      }

      onOverlayEditStarted?.();
      onOverlayDocumentSaved(nextDocument);

      if (activeRegionId === region.id) {
        setDialogDraftLabel(nextLabel);
      }
    },
    [activeRegionId, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument, setDialogDraftLabel]
  );

  const canPasteCopiedBboxIntoRegion = useMemo(
    () => Boolean(activeRegion && copiedBbox && isBboxStructuralEditingEnabled),
    [activeRegion, copiedBbox, isBboxStructuralEditingEnabled]
  );

  const handlePasteCopiedBboxIntoRegion = useCallback(() => {
    if (!isBboxStructuralEditingEnabled || !activeRegion || !copiedBbox) {
      return;
    }

    const edits = buildRegionEditsFromBboxClipboardPayload(copiedBbox);
    setDialogDraftLabel(edits.label);
    setDialogDraftBbox(edits.bbox);
    setDialogDraftText(edits.text);
    setDialogDraftEntities(normalizeEntitySpansForText(edits.entities, edits.text));
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [activeRegion, copiedBbox, isBboxStructuralEditingEnabled]);

  const deleteRegionWithCanonicalFlow = useCallback(
    (region: OverlayRegion) => {
      if (!isBboxStructuralEditingEnabled) {
        return;
      }
      if (!overlayDocument || !onOverlayDocumentSaved) {
        return;
      }

      const shouldDelete = window.confirm(
        "Delete this bbox region? This will remove it from generated JSON output."
      );
      if (!shouldDelete) {
        return;
      }

      onOverlayEditStarted?.();
      const nextDocument = removeRegionFromDocument(
        overlayDocument,
        region.pageNumber,
        region.id
      );
      onOverlayDocumentSaved(nextDocument);

      if (activeRegionId === region.id) {
        closeAndResetEditor();
      }
    },
    [
      activeRegionId,
      closeAndResetEditor,
      isBboxStructuralEditingEnabled,
      onOverlayDocumentSaved,
      onOverlayEditStarted,
      overlayDocument
    ]
  );

  const handleDeleteRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }

    deleteRegionWithCanonicalFlow(activeRegion);
  }, [activeRegion, deleteRegionWithCanonicalFlow]);

  const refreshPendingSelection = useCallback(() => {
    const textarea = dialogTextareaRef.current;
    if (!textarea) {
      setPendingSelection(null);
      return;
    }

    const offsets = getTextareaSelectionOffsets(textarea, dialogDraftText);
    setPendingSelection(offsets);
  }, [dialogDraftText]);

  const handleEditorInput: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      if (!isRawTextEditingEnabled) {
        return;
      }
      const nextText = event.currentTarget.value.replace(/\r/g, "");
      const remapResult = remapEntitySpansAfterTextChange(
        dialogDraftText,
        nextText,
        dialogDraftEntities
      );
      setDialogDraftText(nextText);
      setDialogDraftEntities(remapResult.spans);
      setPendingSelection(null);
      setPickerSelection(null);
      setSpanEditor(null);

      if (remapResult.droppedCount > 0) {
        setEntityWarning(
          `${remapResult.droppedCount} anonymized span(s) were removed because they could not be remapped after text edits.`
        );
      } else {
        setEntityWarning(null);
      }
    },
    [dialogDraftEntities, dialogDraftText, isRawTextEditingEnabled]
  );

  const handleEditorKeyUp = useCallback((_event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    refreshPendingSelection();
  }, [refreshPendingSelection]);

  const handleAnonymizeSelection = useCallback(() => {
    const textarea = dialogTextareaRef.current;
    const selectionToUse =
      pendingSelection ?? (textarea ? getTextareaSelectionOffsets(textarea, dialogDraftText) : null);

    if (!selectionToUse) {
      setEntityWarning("Select a continuous text range before anonymizing.");
      return;
    }

    const selectionValidation = canApplySelectionToTablePreview(
      previewModel,
      selectionToUse.start,
      selectionToUse.end
    );
    if (!selectionValidation.valid) {
      setEntityWarning(selectionValidation.warning.message);
      return;
    }

    if (hasEntityOverlap(normalizedDraftEntities, selectionToUse.start, selectionToUse.end)) {
      setEntityWarning("Overlapping anonymized spans are not allowed.");
      return;
    }

    setPendingSelection(selectionToUse);
    setPickerSelection(selectionToUse);
    setPendingEntity("");
    setEntityWarning(null);
  }, [dialogDraftText, normalizedDraftEntities, pendingSelection, previewModel]);

  const handleApplyPickerEntity = useCallback(
    (entityOverride?: string) => {
      if (!pickerSelection) {
        setEntityWarning("Select a continuous text range before anonymizing.");
        return;
      }

      const selectionValidation = canApplySelectionToTablePreview(
        previewModel,
        pickerSelection.start,
        pickerSelection.end
      );
      if (!selectionValidation.valid) {
        setEntityWarning(selectionValidation.warning.message);
        return;
      }

      const pendingEntityTrimmed = (entityOverride ?? pendingEntity).trim();
      if (!pendingEntityTrimmed) {
        setEntityWarning("Choose an entity label.");
        return;
      }
      if (!anonymizationEntityLabels.includes(pendingEntityTrimmed)) {
        setEntityWarning("Choose an entity label.");
        return;
      }
      const nextEntity = coerceEntityLabel(pendingEntityTrimmed);

      if (hasEntityOverlap(normalizedDraftEntities, pickerSelection.start, pickerSelection.end)) {
        setEntityWarning("Overlapping anonymized spans are not allowed.");
        return;
      }

      const nextSpans = sortEntitySpans([
        ...normalizedDraftEntities,
        {
          start: pickerSelection.start,
          end: pickerSelection.end,
          entity: nextEntity
        }
      ]);

      setDialogDraftEntities(nextSpans);
      setPendingSelection(null);
      setPickerSelection(null);
      setEntityWarning(null);
    },
    [anonymizationEntityLabels, normalizedDraftEntities, pendingEntity, pickerSelection, previewModel]
  );

  const handlePendingEntityChange = useCallback(
    (nextEntity: string) => {
      setPendingEntity(nextEntity);
      if (!pickerSelection) {
        return;
      }
      handleApplyPickerEntity(nextEntity);
    },
    [handleApplyPickerEntity, pickerSelection]
  );

  const handleCancelPicker = useCallback(() => {
    setPendingSelection(null);
    setPickerSelection(null);
    setEntityWarning(null);
  }, []);

  const handleOpenSpanEditor = useCallback(
    (index: number, anchorX: number, anchorY: number) => {
      const span = normalizedDraftEntities[index];
      if (!span) {
        return;
      }

      setSpanEditor({
        index,
        entity: coerceEntityLabel(span.entity),
        anchorX,
        anchorY
      });
      setPendingSelection(null);
      setPickerSelection(null);
    },
    [normalizedDraftEntities]
  );

  const handleApplySpanEditor = useCallback(
    (entityOverride?: string) => {
      if (!spanEditor) {
        return;
      }

      if (!normalizedDraftEntities[spanEditor.index]) {
        setEntityWarning("This span no longer exists.");
        setSpanEditor(null);
        return;
      }

      const nextEntityInput = (entityOverride ?? spanEditor.entity).trim();
      if (!anonymizationEntityLabels.includes(nextEntityInput)) {
        setEntityWarning("Choose an entity for the highlighted range.");
        return;
      }
      const nextEntity = coerceEntityLabel(nextEntityInput);

      const nextSpans = normalizedDraftEntities.map((span, index) =>
        index === spanEditor.index
          ? {
              start: span.start,
              end: span.end,
              entity: nextEntity
            }
          : span
      );

      setDialogDraftEntities(sortEntitySpans(nextSpans));
      setSpanEditor(null);
      setEntityWarning(null);
    },
    [anonymizationEntityLabels, normalizedDraftEntities, spanEditor]
  );

  const handleSpanEditorEntityChange = useCallback(
    (nextEntity: string) => {
      setSpanEditor((previous) =>
        previous
          ? {
              ...previous,
              entity: nextEntity
            }
          : previous
      );
      if (!spanEditor) {
        return;
      }
      handleApplySpanEditor(nextEntity);
    },
    [handleApplySpanEditor, spanEditor]
  );

  const handleCancelSpanEditor = useCallback(() => {
    setSpanEditor(null);
    setEntityWarning(null);
  }, []);

  const handleRemoveSpan = useCallback(() => {
    if (!spanEditor) {
      return;
    }

    if (!normalizedDraftEntities[spanEditor.index]) {
      setEntityWarning("This span no longer exists.");
      setSpanEditor(null);
      return;
    }

    setDialogDraftEntities(normalizedDraftEntities.filter((_span, index) => index !== spanEditor.index));
    setSpanEditor(null);
    setEntityWarning(null);
  }, [normalizedDraftEntities, spanEditor]);

  useEffect(() => {
    if (!spanEditor) {
      return;
    }

    if (!normalizedDraftEntities[spanEditor.index]) {
      setSpanEditor(null);
    }
  }, [normalizedDraftEntities, spanEditor]);

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
    canPasteCopiedBboxIntoRegion,
    anonymizationEntityLabels,
    buildEntityPalette: (entity: string) => buildEntityPalette(entity, anonymizationEntityLabels),
    openRegionEditor,
    closeRegionEditor,
    handleResetRegionEditor,
    handleSaveRegionEditor,
    handlePasteCopiedBboxIntoRegion,
    handleDeleteRegionEditor,
    deleteRegionWithCanonicalFlow,
    updateRegionLabelWithCanonicalFlow,
    refreshPendingSelection,
    handleEditorInput,
    handleEditorKeyUp,
    handleAnonymizeSelection,
    handlePendingEntityChange,
    handleApplyPickerEntity,
    handleCancelPicker,
    handleOpenSpanEditor,
    handleSpanEditorEntityChange,
    handleApplySpanEditor,
    handleCancelSpanEditor,
    handleRemoveSpan,
    setDialogDraftLabel,
    setDialogTextDirection,
    setPendingEntity,
    setSpanEditor,
    setPickerSelection,
    setEntityWarning,
    coerceEntityLabel: (value: unknown) => coerceEntityLabel(value, anonymizationEntityLabels)
  };
}
