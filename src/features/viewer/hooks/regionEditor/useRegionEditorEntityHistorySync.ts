import { useEffect } from "react";
import { normalizeEntitySpansForText } from "../../../../constants/anonymizationEntities";
import type { OverlayEntitySpan, OverlayRegion } from "../../../../types/overlay";
import { hasBboxChanged } from "../../utils/overlayDocument";
import { areEntitySpansEqual } from "../../utils/textEntities";

interface UseRegionEditorEntityHistorySyncOptions {
  activeRegion: OverlayRegion | null;
  dialogDraftLabel: string;
  dialogDraftText: string;
  dialogDraftEntities: OverlayEntitySpan[];
  dialogDraftBbox: OverlayRegion["bbox"] | null;
  isBboxStructuralEditingEnabled: boolean;
  isRawTextEditingEnabled: boolean;
  isSpanBoundaryDragActive: boolean;
  setDialogDraftEntities: (nextEntities: OverlayEntitySpan[]) => void;
  setPendingSelection: (next: null) => void;
  setPickerSelection: (next: null) => void;
  setSpanEditor: (next: null) => void;
  setEntityWarning: (next: string | null) => void;
}

export function useRegionEditorEntityHistorySync({
  activeRegion,
  dialogDraftLabel,
  dialogDraftText,
  dialogDraftEntities,
  dialogDraftBbox,
  isBboxStructuralEditingEnabled,
  isRawTextEditingEnabled,
  isSpanBoundaryDragActive,
  setDialogDraftEntities,
  setPendingSelection,
  setPickerSelection,
  setSpanEditor,
  setEntityWarning
}: UseRegionEditorEntityHistorySyncOptions): void {
  useEffect(() => {
    if (!activeRegion) {
      return;
    }
    if (isSpanBoundaryDragActive) {
      return;
    }

    const activeText = activeRegion.text || "";
    const draftBbox = dialogDraftBbox ?? activeRegion.bbox;
    const hasNonEntityDraftChanges =
      (isBboxStructuralEditingEnabled &&
        (dialogDraftLabel !== activeRegion.label || hasBboxChanged(activeRegion.bbox, draftBbox, 0))) ||
      (isRawTextEditingEnabled && dialogDraftText !== activeText);
    if (hasNonEntityDraftChanges) {
      return;
    }

    const normalizedActiveEntities = normalizeEntitySpansForText(activeRegion.entities || [], activeText);
    const normalizedDraftEntities = normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText);
    if (areEntitySpansEqual(normalizedDraftEntities, normalizedActiveEntities)) {
      return;
    }

    setDialogDraftEntities(normalizedActiveEntities);
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [
    activeRegion,
    dialogDraftBbox,
    dialogDraftEntities,
    dialogDraftLabel,
    dialogDraftText,
    isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled,
    isSpanBoundaryDragActive,
    setDialogDraftEntities,
    setEntityWarning,
    setPendingSelection,
    setPickerSelection,
    setSpanEditor
  ]);
}
