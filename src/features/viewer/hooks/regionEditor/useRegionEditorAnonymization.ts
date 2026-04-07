import { useCallback, type ChangeEventHandler, type Dispatch, type SetStateAction } from "react";
import {
  coerceEntityLabel,
  hasEntityOverlap,
  sortEntitySpans
} from "../../../../constants/anonymizationEntities";
import type { OverlayEntitySpan } from "../../../../types/overlay";
import {
  getTextareaSelectionOffsets,
  remapEntitySpansAfterTextChange,
  type PendingSelectionRange
} from "../../utils/textEntities";
import {
  canApplySelectionToTablePreview,
  type RegionPreviewModel
} from "../../utils/previewModel";
import type { SpanEditorDraft } from "../useRegionEditor.types";
import { useRegionEditorSpanEditing } from "./useRegionEditorSpanEditing";

interface UseRegionEditorAnonymizationOptions {
  dialogTextareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  dialogDraftText: string;
  dialogDraftEntities: OverlayEntitySpan[];
  normalizedDraftEntities: OverlayEntitySpan[];
  anonymizationEntityLabels: readonly string[];
  previewModel: RegionPreviewModel;
  pendingSelection: PendingSelectionRange | null;
  pendingEntity: string;
  pickerSelection: PendingSelectionRange | null;
  spanEditor: SpanEditorDraft | null;
  isRawTextEditingEnabled: boolean;
  commitActiveRegionEdits: (
    edits: { text?: string; entities?: OverlayEntitySpan[] },
    action?: string
  ) => boolean;
  setDialogDraftText: (nextText: string) => void;
  setDialogDraftEntities: (nextEntities: OverlayEntitySpan[]) => void;
  setPendingSelection: (nextSelection: PendingSelectionRange | null) => void;
  setPendingEntity: (nextEntity: string) => void;
  setPickerSelection: (nextSelection: PendingSelectionRange | null) => void;
  setSpanEditor: Dispatch<SetStateAction<SpanEditorDraft | null>>;
  setEntityWarning: (nextWarning: string | null) => void;
}

interface RegionEditorAnonymizationResult {
  refreshPendingSelection: () => void;
  handleEditorInput: ChangeEventHandler<HTMLTextAreaElement>;
  handleEditorKeyUp: () => void;
  handleAnonymizeSelection: () => void;
  handlePendingEntityChange: (nextEntity: string) => void;
  handleApplyPickerEntity: (entityOverride?: string) => void;
  handleCancelPicker: () => void;
  handleOpenSpanEditor: (index: number, anchorX: number, anchorY: number) => void;
  handleSpanEditorEntityChange: (nextEntity: string) => void;
  handleApplySpanEditor: (entityOverride?: string) => void;
  handleCancelSpanEditor: () => void;
  handleRemoveSpan: () => void;
}

export function useRegionEditorAnonymization({
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
  commitActiveRegionEdits,
  setDialogDraftText,
  setDialogDraftEntities,
  setPendingSelection,
  setPendingEntity,
  setPickerSelection,
  setSpanEditor,
  setEntityWarning
}: UseRegionEditorAnonymizationOptions): RegionEditorAnonymizationResult {
  const refreshPendingSelection = useCallback(() => {
    const textarea = dialogTextareaRef.current;
    if (!textarea) {
      setPendingSelection(null);
      return;
    }

    const offsets = getTextareaSelectionOffsets(textarea, dialogDraftText);
    setPendingSelection(offsets);
  }, [dialogDraftText, dialogTextareaRef, setPendingSelection]);

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
    [
      dialogDraftEntities,
      dialogDraftText,
      isRawTextEditingEnabled,
      setDialogDraftEntities,
      setDialogDraftText,
      setEntityWarning,
      setPendingSelection,
      setPickerSelection,
      setSpanEditor
    ]
  );

  const handleEditorKeyUp = useCallback(() => {
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
  }, [
    dialogDraftText,
    dialogTextareaRef,
    normalizedDraftEntities,
    pendingSelection,
    previewModel,
    setEntityWarning,
    setPendingEntity,
    setPendingSelection,
    setPickerSelection
  ]);

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
      if (!pendingEntityTrimmed || !anonymizationEntityLabels.includes(pendingEntityTrimmed)) {
        setEntityWarning("Choose an entity label.");
        return;
      }

      if (hasEntityOverlap(normalizedDraftEntities, pickerSelection.start, pickerSelection.end)) {
        setEntityWarning("Overlapping anonymized spans are not allowed.");
        return;
      }

      const nextEntity = coerceEntityLabel(pendingEntityTrimmed);
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
      commitActiveRegionEdits(
        {
          text: dialogDraftText,
          entities: nextSpans
        },
        "viewer-region-entity-add"
      );
    },
    [
      anonymizationEntityLabels,
      commitActiveRegionEdits,
      dialogDraftText,
      normalizedDraftEntities,
      pendingEntity,
      pickerSelection,
      previewModel,
      setDialogDraftEntities,
      setEntityWarning,
      setPendingSelection,
      setPickerSelection
    ]
  );

  const handlePendingEntityChange = useCallback(
    (nextEntity: string) => {
      setPendingEntity(nextEntity);
      if (!pickerSelection) {
        return;
      }
      handleApplyPickerEntity(nextEntity);
    },
    [handleApplyPickerEntity, pickerSelection, setPendingEntity]
  );

  const handleCancelPicker = useCallback(() => {
    setPendingSelection(null);
    setPickerSelection(null);
    setEntityWarning(null);
  }, [setEntityWarning, setPendingSelection, setPickerSelection]);

  const {
    handleOpenSpanEditor,
    handleSpanEditorEntityChange,
    handleApplySpanEditor,
    handleCancelSpanEditor,
    handleRemoveSpan
  } = useRegionEditorSpanEditing({
    normalizedDraftEntities,
    anonymizationEntityLabels,
    spanEditor,
    dialogDraftText,
    commitActiveRegionEdits,
    setDialogDraftEntities,
    setPendingSelection: (nextSelection) => {
      setPendingSelection(nextSelection);
    },
    setPickerSelection: (nextSelection) => {
      setPickerSelection(nextSelection);
    },
    setSpanEditor,
    setEntityWarning
  });

  return {
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
    handleRemoveSpan
  };
}
