import {
  useCallback,
  useEffect,
  useMemo,
  type ChangeEventHandler,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import {
  ANONYMIZATION_ENTITY_LABELS,
  DEFAULT_ANONYMIZATION_ENTITY_LABEL,
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
  buildTextSegments,
  getTextareaSelectionOffsets,
  remapEntitySpansAfterTextChange
} from "../utils/textEntities";
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
  } = useRegionEditorDraftState();

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

  const textSegments = useMemo(
    () => buildTextSegments(dialogDraftText, normalizedDraftEntities),
    [dialogDraftText, normalizedDraftEntities]
  );

  const hasDialogChanges = useMemo(() => {
    if (!activeRegion) {
      return false;
    }

    const nextDraftBbox = dialogDraftBbox ?? activeRegion.bbox;

    return (
      dialogDraftLabel !== activeRegion.label ||
      hasBboxChanged(activeRegion.bbox, nextDraftBbox, 0) ||
      dialogDraftText !== (activeRegion.text || "") ||
      !areEntitySpansEqual(
        normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText),
        normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || "")
      )
    );
  }, [activeRegion, dialogDraftBbox, dialogDraftEntities, dialogDraftLabel, dialogDraftText]);

  const canAnonymizeSelection = useMemo(() => {
    if (!pendingSelection) {
      return false;
    }
    return !hasEntityOverlap(normalizedDraftEntities, pendingSelection.start, pendingSelection.end);
  }, [normalizedDraftEntities, pendingSelection]);

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
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, []);

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
    const nextBbox = dialogDraftBbox ?? activeRegion.bbox;
    const nextText = dialogDraftText;
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
    () => Boolean(activeRegion && copiedBbox),
    [activeRegion, copiedBbox]
  );

  const handlePasteCopiedBboxIntoRegion = useCallback(() => {
    if (!activeRegion || !copiedBbox) {
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
  }, [activeRegion, copiedBbox]);

  const deleteRegionWithCanonicalFlow = useCallback(
    (region: OverlayRegion) => {
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
    [activeRegionId, closeAndResetEditor, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument]
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
    [dialogDraftEntities, dialogDraftText]
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

    if (hasEntityOverlap(normalizedDraftEntities, selectionToUse.start, selectionToUse.end)) {
      setEntityWarning("Overlapping anonymized spans are not allowed.");
      return;
    }

    setPendingSelection(selectionToUse);
    setPickerSelection(selectionToUse);
    setPendingEntity("");
    setEntityWarning(null);
  }, [dialogDraftText, normalizedDraftEntities, pendingSelection]);

  const handleApplyPickerEntity = useCallback(
    (entityOverride?: string) => {
      if (!pickerSelection) {
        setEntityWarning("Select a continuous text range before anonymizing.");
        return;
      }

      const pendingEntityTrimmed = (entityOverride ?? pendingEntity).trim();
      if (!pendingEntityTrimmed) {
        setEntityWarning("Choose an entity label.");
        return;
      }
      const nextEntity = coerceEntityLabel(pendingEntityTrimmed);
      if (nextEntity !== pendingEntityTrimmed) {
        setEntityWarning("Choose an entity label.");
        return;
      }

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
    [normalizedDraftEntities, pendingEntity, pickerSelection]
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

      const nextEntity = coerceEntityLabel((entityOverride ?? spanEditor.entity).trim());
      if (!nextEntity) {
        setEntityWarning("Choose an entity for the highlighted range.");
        return;
      }

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
    [normalizedDraftEntities, spanEditor]
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
    entityWarning,
    normalizedDraftEntities,
    textSegments,
    canAnonymizeSelection,
    dialogLabelOptions,
    hasDialogChanges,
    canPasteCopiedBboxIntoRegion,
    anonymizationEntityLabels: ANONYMIZATION_ENTITY_LABELS,
    buildEntityPalette,
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
    coerceEntityLabel
  };
}
